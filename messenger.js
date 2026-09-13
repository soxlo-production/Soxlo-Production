const SUPABASE_URL='https://ovwfqbcxsdfddnfdgopg.supabase.co';
const SUPABASE_KEY='sb_publishable_h5KpewMqq8xOyf6VqFymyg_pgQXB99p';
const SESSION_KEY='soxlo_private_session_v1';
const POLL_MS=1200;
const SIGNAL_MS=700;

let session=null,contacts=[],activeContact=null,messages=[],messagePoll=null,contactPoll=null,signalPoll=null;
let peer=null,localStream=null,currentCallId=null,currentCallPeer=null,lastCallSignalId=0,pendingOffer=null,lastIncomingOfferId=0;

const $=id=>document.getElementById(id);
const loginView=$('loginView'),appView=$('appView'),loginForm=$('loginForm'),loginMessage=$('loginMessage');
const contactsList=$('contactsList'),displayName=$('displayName'),profileMessage=$('profileMessage'),messageList=$('messageList');
const chatName=$('chatName'),chatStatus=$('chatStatus'),emptyState=$('emptyState'),chatView=$('chatView'),messageForm=$('messageForm'),messageInput=$('messageInput');
const incomingModal=$('incomingModal'),incomingName=$('incomingName'),callOverlay=$('callOverlay'),callName=$('callName'),callState=$('callState');
const localVideo=$('localVideo'),remoteVideo=$('remoteVideo');

function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function showMessage(el,text,type=''){el.textContent=text||'';el.style.color=type==='error'?'#e67878':type==='success'?'#d8ae52':''}
function saveSession(s){session=s;localStorage.setItem(SESSION_KEY,JSON.stringify(s))}
function loadSession(){try{session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{session=null}}
function clearSession(){session=null;localStorage.removeItem(SESSION_KEY)}
function tokenExpired(){return !session?.access_token||!session?.expires_at||Date.now()/1000>Number(session.expires_at)-45}
async function refreshSession(){
  if(!session?.refresh_token)throw new Error('Session expired. Please sign in again.');
  const r=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok){clearSession();throw new Error(data.msg||'Session expired. Please sign in again.')}
  data.expires_at=Math.floor(Date.now()/1000)+Number(data.expires_in||3600);saveSession(data);return data;
}
async function headers(extra={}){
  if(tokenExpired())await refreshSession();
  return {apikey:SUPABASE_KEY,Authorization:`Bearer ${session.access_token}`,...extra};
}
async function api(path,options={}){
  const h=await headers(options.headers||{});
  let r=await fetch(`${SUPABASE_URL}${path}`,{...options,headers:h});
  if(r.status===401&&session?.refresh_token){await refreshSession();h.Authorization=`Bearer ${session.access_token}`;r=await fetch(`${SUPABASE_URL}${path}`,{...options,headers:h})}
  return r;
}
async function signIn(email,password){
  const r=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(data.error_description||data.msg||'Could not sign in.');
  data.expires_at=Math.floor(Date.now()/1000)+Number(data.expires_in||3600);saveSession(data);
}
function userId(){return session?.user?.id}
function defaultName(){return (session?.user?.email||'SOXLO User').split('@')[0].replace(/[._-]+/g,' ').replace(/\b\w/g,m=>m.toUpperCase()).slice(0,40)}
async function ensureProfile(){
  const existing=await api(`/rest/v1/messenger_profiles?select=id,display_name&id=eq.${encodeURIComponent(userId())}&limit=1`);
  if(existing.ok){
    const rows=await existing.json();
    if(rows?.[0]){displayName.value=rows[0].display_name;return}
  }
  const name=defaultName();
  const r=await api('/rest/v1/messenger_profiles',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({id:userId(),display_name:name})});
  if(!r.ok)throw new Error('Could not open Messenger profile.');
  const rows=await r.json();displayName.value=rows?.[0]?.display_name||name;
}
async function saveProfile(){
  const name=displayName.value.trim().slice(0,40);if(!name)return;
  const r=await api(`/rest/v1/messenger_profiles?id=eq.${encodeURIComponent(userId())}`,{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({display_name:name})});
  if(!r.ok){showMessage(profileMessage,'Could not save name.','error');return}
  showMessage(profileMessage,'Saved.','success');await loadContacts();
}
async function loadContacts(){
  const r=await api('/rest/v1/messenger_profiles?select=id,display_name,created_at&order=display_name.asc');
  if(!r.ok)return;
  contacts=(await r.json()).filter(x=>x.id!==userId());
  renderContacts();
}
function initials(name='?'){return name.trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()||'').join('')||'?'}
function renderContacts(){
  if(!contacts.length){contactsList.innerHTML='<p class="muted" style="padding:12px">No other Messenger users yet. They appear here after signing in once.</p>';return}
  contactsList.innerHTML=contacts.map(c=>`<button class="contact ${activeContact?.id===c.id?'active':''}" data-contact="${esc(c.id)}" type="button"><span class="avatar">${esc(initials(c.display_name))}</span><span class="contact-copy"><span class="contact-name">${esc(c.display_name)}</span><span class="contact-sub">SOXLO contact</span></span></button>`).join('');
  contactsList.querySelectorAll('[data-contact]').forEach(b=>b.addEventListener('click',()=>selectContact(b.dataset.contact)));
}
async function selectContact(id){
  activeContact=contacts.find(c=>c.id===id)||null;if(!activeContact)return;
  renderContacts();chatName.textContent=activeContact.display_name;chatStatus.textContent='Private SOXLO chat';$('videoCallBtn').disabled=false;
  emptyState.hidden=true;chatView.hidden=false;appView.classList.add('chat-open');await loadMessages(true);
}
async function loadMessages(scroll=false){
  if(!activeContact)return;
  const a=userId(),b=activeContact.id;
  const filter=encodeURIComponent(`(and(sender_id.eq.${a},recipient_id.eq.${b}),and(sender_id.eq.${b},recipient_id.eq.${a}))`);
  const r=await api(`/rest/v1/messenger_messages?select=id,sender_id,recipient_id,body,created_at,read_at&or=${filter}&order=created_at.asc&limit=300`);
  if(!r.ok)return;
  const next=await r.json(),changed=next.length!==messages.length||next.at(-1)?.id!==messages.at(-1)?.id;
  messages=next;if(changed)renderMessages(scroll||true);
  await markRead();
}
function renderMessages(scroll=true){
  messageList.innerHTML=messages.map(m=>`<div class="msg ${m.sender_id===userId()?'mine':''}">${esc(m.body)}<time>${new Date(m.created_at).toLocaleString([], {hour:'2-digit',minute:'2-digit',month:'short',day:'numeric'})}</time></div>`).join('');
  if(scroll)messageList.scrollTop=messageList.scrollHeight;
}
async function markRead(){
  if(!activeContact)return;
  await api(`/rest/v1/messenger_messages?recipient_id=eq.${encodeURIComponent(userId())}&sender_id=eq.${encodeURIComponent(activeContact.id)}&read_at=is.null`,{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({read_at:new Date().toISOString()})}).catch(()=>{});
}
async function sendMessage(){
  const body=messageInput.value.trim();if(!body||!activeContact)return;
  messageInput.value='';
  const r=await api('/rest/v1/messenger_messages',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({sender_id:userId(),recipient_id:activeContact.id,body})});
  if(!r.ok){messageInput.value=body;return}
  await loadMessages(true);
}
function startTimers(){
  stopTimers();
  messagePoll=setInterval(()=>{if(activeContact&&!document.hidden)loadMessages(false).catch(()=>{})},POLL_MS);
  contactPoll=setInterval(()=>{if(!document.hidden)loadContacts().catch(()=>{})},10000);
  signalPoll=setInterval(()=>{if(!document.hidden){pollIncomingOffers().catch(()=>{});pollCallSignals().catch(()=>{})}},SIGNAL_MS);
}
function stopTimers(){clearInterval(messagePoll);clearInterval(contactPoll);clearInterval(signalPoll)}
async function showApp(){
  loginView.hidden=true;appView.hidden=false;
  await ensureProfile();await loadContacts();startTimers();
}
function showLogin(){stopTimers();appView.hidden=true;loginView.hidden=false}
async function sendSignal(type,payload,recipient=currentCallPeer?.id){
  if(!currentCallId||!recipient)return;
  const r=await api('/rest/v1/messenger_call_signals',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({call_id:currentCallId,sender_id:userId(),recipient_id:recipient,signal_type:type,payload:payload||{}})});
  if(!r.ok)throw new Error('Call signaling failed.');
}
async function openMedia(){
  if(localStream)return localStream;
  localStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:true});
  localVideo.srcObject=localStream;return localStream;
}
function createPeer(){
  peer=new RTCPeerConnection({iceServers:[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302']}]});
  localStream.getTracks().forEach(t=>peer.addTrack(t,localStream));
  peer.ontrack=e=>{remoteVideo.srcObject=e.streams[0];callState.textContent='Connected'};
  peer.onicecandidate=e=>{if(e.candidate)sendSignal('ice',e.candidate.toJSON()).catch(()=>{})};
  peer.onconnectionstatechange=()=>{if(!peer)return;const s=peer.connectionState;callState.textContent=s==='connected'?'Connected':s==='failed'?'Connection failed':s==='disconnected'?'Reconnecting…':'Connecting…';if(['failed','closed'].includes(s))endCall(false)};
}
async function startCall(){
  if(!activeContact)return;
  try{
    currentCallId=crypto.randomUUID();currentCallPeer=activeContact;lastCallSignalId=0;
    callName.textContent=activeContact.display_name;callState.textContent='Starting camera…';callOverlay.hidden=false;
    await openMedia();createPeer();
    const offer=await peer.createOffer({offerToReceiveAudio:true,offerToReceiveVideo:true});await peer.setLocalDescription(offer);
    await sendSignal('offer',peer.localDescription.toJSON());callState.textContent='Calling…';
  }catch(e){callState.textContent=e.message||'Could not start call';setTimeout(()=>endCall(false),1200)}
}
async function pollIncomingOffers(){
  if(currentCallId||pendingOffer)return;
  const r=await api(`/rest/v1/messenger_call_signals?select=id,call_id,sender_id,recipient_id,signal_type,payload,created_at&recipient_id=eq.${encodeURIComponent(userId())}&signal_type=eq.offer&id=gt.${lastIncomingOfferId}&order=id.asc&limit=5`);
  if(!r.ok)return;const rows=await r.json();if(!rows.length)return;
  const offer=rows.at(-1);lastIncomingOfferId=Math.max(lastIncomingOfferId,...rows.map(x=>Number(x.id)||0));pendingOffer=offer;
  const c=contacts.find(x=>x.id===offer.sender_id)||{id:offer.sender_id,display_name:'SOXLO contact'};incomingName.textContent=c.display_name;incomingModal.hidden=false;
}
async function acceptIncoming(){
  if(!pendingOffer)return;
  try{
    const offer=pendingOffer;pendingOffer=null;incomingModal.hidden=true;
    currentCallId=offer.call_id;currentCallPeer=contacts.find(x=>x.id===offer.sender_id)||{id:offer.sender_id,display_name:'SOXLO contact'};lastCallSignalId=Number(offer.id)||0;
    callName.textContent=currentCallPeer.display_name;callState.textContent='Starting camera…';callOverlay.hidden=false;
    await openMedia();createPeer();await peer.setRemoteDescription(offer.payload);
    const answer=await peer.createAnswer();await peer.setLocalDescription(answer);await sendSignal('answer',peer.localDescription.toJSON());
    callState.textContent='Connecting…';
  }catch(e){callState.textContent=e.message||'Could not answer';setTimeout(()=>endCall(false),1200)}
}
async function declineIncoming(){
  if(!pendingOffer)return;
  currentCallId=pendingOffer.call_id;currentCallPeer=contacts.find(x=>x.id===pendingOffer.sender_id)||{id:pendingOffer.sender_id,display_name:'SOXLO contact'};
  pendingOffer=null;incomingModal.hidden=true;try{await sendSignal('hangup',{reason:'declined'})}catch{}finally{currentCallId=null;currentCallPeer=null}
}
async function pollCallSignals(){
  if(!currentCallId||!currentCallPeer)return;
  const r=await api(`/rest/v1/messenger_call_signals?select=id,call_id,sender_id,recipient_id,signal_type,payload,created_at&call_id=eq.${encodeURIComponent(currentCallId)}&id=gt.${lastCallSignalId}&order=id.asc&limit=50`);
  if(!r.ok)return;const rows=await r.json();
  for(const s of rows){
    lastCallSignalId=Math.max(lastCallSignalId,Number(s.id)||0);if(s.sender_id===userId())continue;
    if(s.signal_type==='answer'&&peer&&!peer.currentRemoteDescription){await peer.setRemoteDescription(s.payload)}
    else if(s.signal_type==='ice'&&peer){try{await peer.addIceCandidate(s.payload)}catch{}}
    else if(s.signal_type==='hangup'){endCall(false);break}
  }
}
async function endCall(notify=true){
  if(notify&&currentCallId&&currentCallPeer){try{await sendSignal('hangup',{reason:'ended'})}catch{}}
  if(peer){peer.onicecandidate=null;peer.ontrack=null;peer.close();peer=null}
  if(localStream){localStream.getTracks().forEach(t=>t.stop());localStream=null}
  localVideo.srcObject=null;remoteVideo.srcObject=null;callOverlay.hidden=true;incomingModal.hidden=true;currentCallId=null;currentCallPeer=null;lastCallSignalId=0;
}
function toggleTrack(kind,button){
  const track=localStream?.getTracks().find(t=>t.kind===kind);if(!track)return;
  track.enabled=!track.enabled;button.textContent=kind==='audio'?(track.enabled?'Mic on':'Mic off'):(track.enabled?'Camera on':'Camera off');
}
loginForm.addEventListener('submit',async e=>{e.preventDefault();showMessage(loginMessage,'Signing in…');try{await signIn($('email').value.trim(),$('password').value);showMessage(loginMessage,'');await showApp()}catch(err){showMessage(loginMessage,err.message,'error')}});
$('logoutBtn').addEventListener('click',async()=>{await endCall(false);clearSession();activeContact=null;messages=[];showLogin()});
$('saveProfileBtn').addEventListener('click',()=>saveProfile());
$('refreshContactsBtn').addEventListener('click',()=>loadContacts());
$('videoCallBtn').addEventListener('click',()=>startCall());
$('hangupBtn').addEventListener('click',()=>endCall(true));
$('acceptCallBtn').addEventListener('click',()=>acceptIncoming());
$('declineCallBtn').addEventListener('click',()=>declineIncoming());
$('toggleMicBtn').addEventListener('click',e=>toggleTrack('audio',e.currentTarget));
$('toggleCameraBtn').addEventListener('click',e=>toggleTrack('video',e.currentTarget));
$('mobileBackBtn').addEventListener('click',()=>appView.classList.remove('chat-open'));
messageForm.addEventListener('submit',e=>{e.preventDefault();sendMessage()});
messageInput.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();messageForm.requestSubmit()}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&session){loadContacts().catch(()=>{});if(activeContact)loadMessages(false).catch(()=>{})}});
window.addEventListener('beforeunload',()=>{if(peer)localStream?.getTracks().forEach(t=>t.stop())});

(async()=>{loadSession();if(session){try{if(tokenExpired())await refreshSession();await showApp()}catch{clearSession();showLogin()}}else showLogin()})();
