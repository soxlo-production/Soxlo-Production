const SUPABASE_URL='https://ovwfqbcxsdfddnfdgopg.supabase.co';
const SUPABASE_KEY='sb_publishable_h5KpewMqq8xOyf6VqFymyg_pgQXB99p';
const SESSION_KEY='soxlo_messenger_session_v3';
const TRUST_PREFIX='soxlo_messenger_trust_v3:';
const CRYPTO_DB='soxlo_messenger_security_v3';
const POLL_MS=1400;
const SIGNAL_MS=800;
const MAX_MESSAGE=4000;

let session=null,contacts=[],activeContact=null,messages=[],ownProfile=null;
let messagePoll=null,contactPoll=null,signalPoll=null;
let deviceKey=null,devicePublicJwk=null,deviceId=null,deviceFingerprint=null;
let peer=null,localStream=null,currentCallId=null,currentCallPeer=null,currentCallPeerDevice=null,currentCallTargets=[];
let lastCallSignalId=0,pendingOffer=null,lastIncomingOfferId=0,signalReady=false,pendingLocalIce=[],pendingRemoteIce=[];

const $=id=>document.getElementById(id);
const loginView=$('loginView'),appView=$('appView'),loginForm=$('loginForm'),loginMessage=$('loginMessage');
const contactsList=$('contactsList'),displayName=$('displayName'),profileMessage=$('profileMessage'),messageList=$('messageList');
const chatName=$('chatName'),chatStatus=$('chatStatus'),emptyState=$('emptyState'),chatView=$('chatView'),messageForm=$('messageForm'),messageInput=$('messageInput');
const securityStatus=$('securityStatus'),verifyDevicesBtn=$('verifyDevicesBtn'),mySecurityCode=$('mySecurityCode');
const verifyModal=$('verifyModal'),verifyContactName=$('verifyContactName'),verifyDeviceList=$('verifyDeviceList');
const incomingModal=$('incomingModal'),incomingName=$('incomingName'),callOverlay=$('callOverlay'),callName=$('callName'),callState=$('callState');
const localVideo=$('localVideo'),remoteVideo=$('remoteVideo');

const te=new TextEncoder();
const td=new TextDecoder();

function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function showMessage(el,text,type=''){if(!el)return;el.textContent=text||'';el.classList.remove('error','success');if(type)el.classList.add(type)}
function toB64(bytes){const u=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode(...u.subarray(i,i+0x8000));return btoa(s)}
function fromB64(s){const raw=atob(s),u=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)u[i]=raw.charCodeAt(i);return u}
function hex(bytes){return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('').toUpperCase()}
function safetyCode(fp=''){return (fp.match(/.{1,4}/g)||[]).join(' ')}
function canonicalJwk(jwk){return JSON.stringify({kty:jwk.kty,crv:jwk.crv,x:jwk.x,y:jwk.y})}
async function sha256(value){return crypto.subtle.digest('SHA-256',typeof value==='string'?te.encode(value):value)}
async function fingerprintJwk(jwk){return hex(await sha256(canonicalJwk(jwk)))}
function saveSession(s){session=s;sessionStorage.setItem(SESSION_KEY,JSON.stringify(s))}
function loadSession(){try{session=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null')}catch{session=null}}
function clearSession(){session=null;sessionStorage.removeItem(SESSION_KEY)}
function tokenExpired(){return !session?.access_token||!session?.expires_at||Date.now()/1000>Number(session.expires_at)-45}
async function refreshSession(){
  if(!session?.refresh_token)throw new Error('Session expired. Please sign in again.');
  const r=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token}),cache:'no-store',credentials:'omit'});
  const data=await r.json().catch(()=>({}));
  if(!r.ok){clearSession();throw new Error(data.msg||'Session expired. Please sign in again.')}
  data.expires_at=Math.floor(Date.now()/1000)+Number(data.expires_in||3600);saveSession(data);return data;
}
async function headers(extra={}){if(tokenExpired())await refreshSession();return{apikey:SUPABASE_KEY,Authorization:`Bearer ${session.access_token}`,...extra}}
async function api(path,options={}){
  const h=await headers(options.headers||{});
  let r=await fetch(`${SUPABASE_URL}${path}`,{...options,headers:h,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
  if(r.status===401&&session?.refresh_token){await refreshSession();h.Authorization=`Bearer ${session.access_token}`;r=await fetch(`${SUPABASE_URL}${path}`,{...options,headers:h,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'})}
  return r;
}
async function signIn(email,password){
  const r=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password}),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(data.error_description||data.msg||'Could not sign in.');
  data.expires_at=Math.floor(Date.now()/1000)+Number(data.expires_in||3600);saveSession(data);
}
function userId(){return session?.user?.id}
function defaultName(){return (session?.user?.email||'SOXLO User').split('@')[0].replace(/[._-]+/g,' ').replace(/\b\w/g,m=>m.toUpperCase()).slice(0,40)}
function deviceLabel(){return navigator.userAgent.includes('SOXLO-Messenger-Android')?'SOXLO Messenger Android':'SOXLO secure web'}

function openCryptoDb(){
  return new Promise((resolve,reject)=>{const req=indexedDB.open(CRYPTO_DB,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('keys'))req.result.createObjectStore('keys',{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
}
async function cryptoDbGet(id){const db=await openCryptoDb();return new Promise((resolve,reject)=>{const tx=db.transaction('keys','readonly'),req=tx.objectStore('keys').get(id);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close()})}
async function cryptoDbPut(value){const db=await openCryptoDb();return new Promise((resolve,reject)=>{const tx=db.transaction('keys','readwrite');tx.objectStore('keys').put(value);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
async function loadOrCreateDeviceKey(){
  const saved=await cryptoDbGet('identity');
  if(saved?.privateKey&&saved?.publicJwk&&saved?.deviceId&&saved?.fingerprint){deviceKey=saved.privateKey;devicePublicJwk=saved.publicJwk;deviceId=saved.deviceId;deviceFingerprint=saved.fingerprint;return}
  const pair=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
  const publicJwk=await crypto.subtle.exportKey('jwk',pair.publicKey),privateJwk=await crypto.subtle.exportKey('jwk',pair.privateKey);
  const protectedPrivate=await crypto.subtle.importKey('jwk',privateJwk,{name:'ECDH',namedCurve:'P-256'},false,['deriveBits']);
  const fp=await fingerprintJwk(publicJwk),id=crypto.randomUUID();
  await cryptoDbPut({id:'identity',deviceId:id,publicJwk,fingerprint:fp,privateKey:protectedPrivate,createdAt:new Date().toISOString()});
  deviceKey=protectedPrivate;devicePublicJwk=publicJwk;deviceId=id;deviceFingerprint=fp;
}

function normalizeRegistry(value){
  if(value&&value.v===3&&Array.isArray(value.devices))return{v:3,devices:value.devices.filter(d=>d&&d.id&&d.jwk&&d.fp)};
  return{v:3,devices:[]};
}
async function registryHash(registry){return hex(await sha256(registry.devices.map(d=>d.fp).sort().join('|')))}
function ownDevices(){return normalizeRegistry(ownProfile?.public_key_jwk).devices}
async function ensureProfile(){
  await loadOrCreateDeviceKey();
  const r=await api(`/rest/v1/messenger_profiles?select=id,display_name,public_key_jwk,key_fingerprint,key_updated_at&id=eq.${encodeURIComponent(userId())}&limit=1`);
  if(!r.ok)throw new Error('Could not open Messenger profile.');
  const rows=await r.json();let row=rows?.[0]||null;
  const registry=normalizeRegistry(row?.public_key_jwk);const now=new Date().toISOString();
  const idx=registry.devices.findIndex(d=>d.id===deviceId);
  const device={id:deviceId,label:deviceLabel(),jwk:devicePublicJwk,fp:deviceFingerprint,created_at:idx>=0?(registry.devices[idx].created_at||now):now};
  if(idx>=0)registry.devices[idx]=device;else registry.devices.push(device);
  const regFp=await registryHash(registry);const name=row?.display_name||defaultName();
  if(!row){
    const add=await api('/rest/v1/messenger_profiles',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({id:userId(),display_name:name,public_key_jwk:registry,key_fingerprint:regFp,key_updated_at:now})});
    if(!add.ok)throw new Error('Could not create secure Messenger profile.');row=(await add.json())?.[0];
  }else{
    const update=await api(`/rest/v1/messenger_profiles?id=eq.${encodeURIComponent(userId())}`,{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({public_key_jwk:registry,key_fingerprint:regFp,key_updated_at:now})});
    if(!update.ok)throw new Error('Could not register this secure device.');row=(await update.json())?.[0]||{...row,public_key_jwk:registry,key_fingerprint:regFp,key_updated_at:now};
  }
  ownProfile=row;displayName.value=row.display_name||name;mySecurityCode.textContent=safetyCode(deviceFingerprint);
}
async function saveProfile(){
  const name=displayName.value.trim().slice(0,40);if(!name)return;
  const r=await api(`/rest/v1/messenger_profiles?id=eq.${encodeURIComponent(userId())}`,{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({display_name:name})});
  if(!r.ok){showMessage(profileMessage,'Could not save name.','error');return}
  const rows=await r.json();if(rows?.[0])ownProfile={...ownProfile,...rows[0]};showMessage(profileMessage,'Saved.','success');await loadContacts();
}
async function removeOtherDevices(){
  const registry={v:3,devices:ownDevices().filter(d=>d.id===deviceId)};const regFp=await registryHash(registry);
  const r=await api(`/rest/v1/messenger_profiles?id=eq.${encodeURIComponent(userId())}`,{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({public_key_jwk:registry,key_fingerprint:regFp,key_updated_at:new Date().toISOString()})});
  if(r.ok){ownProfile=(await r.json())?.[0]||{...ownProfile,public_key_jwk:registry,key_fingerprint:regFp};showMessage(profileMessage,'Other Messenger devices were removed from future encryption.','success')}
  else showMessage(profileMessage,'Could not remove other devices.','error');
}

function loadTrust(){try{return JSON.parse(localStorage.getItem(TRUST_PREFIX+userId())||'{}')}catch{return{}}}
function saveTrust(v){localStorage.setItem(TRUST_PREFIX+userId(),JSON.stringify(v))}
function trustedFingerprints(contactId){return new Set(loadTrust()[contactId]||[])}
function trustCurrentDevices(contact){const trust=loadTrust();trust[contact.id]=contact.devices.map(d=>d.fp);saveTrust(trust)}
function isDeviceTrusted(contactId,fp){return trustedFingerprints(contactId).has(fp)}
function initials(name='?'){return name.trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()||'').join('')||'?'}
function contactDevices(row){return normalizeRegistry(row.public_key_jwk).devices}
async function loadContacts(){
  const r=await api('/rest/v1/messenger_profiles?select=id,display_name,created_at,public_key_jwk,key_fingerprint&order=display_name.asc');if(!r.ok)return;
  contacts=(await r.json()).filter(x=>x.id!==userId()).map(x=>({...x,devices:contactDevices(x)}));
  if(activeContact){activeContact=contacts.find(c=>c.id===activeContact.id)||null;if(activeContact)updateSecurityState()}
  renderContacts();
}
function renderContacts(){
  if(!contacts.length){contactsList.innerHTML='<p class="muted contacts-empty">No other Messenger users yet. They appear here after signing in once.</p>';return}
  contactsList.innerHTML=contacts.map(c=>{const trusted=c.devices.length>0&&c.devices.every(d=>isDeviceTrusted(c.id,d.fp));const sub=!c.devices.length?'No secure device':trusted?'Verified E2EE':'Verify encryption keys';return`<button class="contact ${activeContact?.id===c.id?'active':''}" data-contact="${esc(c.id)}" type="button"><span class="avatar">${esc(initials(c.display_name))}</span><span class="contact-copy"><span class="contact-name">${esc(c.display_name)}</span><span class="contact-sub ${trusted?'secure':''}">${trusted?'🔒 ':''}${esc(sub)}</span></span></button>`}).join('');
  contactsList.querySelectorAll('[data-contact]').forEach(b=>b.addEventListener('click',()=>selectContact(b.dataset.contact)));
}
function updateSecurityState(){
  if(!activeContact)return;
  const devices=activeContact.devices||[],trusted=devices.filter(d=>isDeviceTrusted(activeContact.id,d.fp)),allTrusted=devices.length>0&&trusted.length===devices.length;
  $('videoCallBtn').disabled=!allTrusted;messageInput.disabled=!allTrusted;$('sendBtn').disabled=!allTrusted;
  verifyDevicesBtn.hidden=allTrusted||!devices.length;
  if(!devices.length){securityStatus.textContent='Encryption unavailable: this contact has no registered secure device.';securityStatus.className='security-status warn';chatStatus.textContent='Waiting for secure device registration'}
  else if(!allTrusted){securityStatus.textContent=`Security check required: ${devices.length-trusted.length} unverified device${devices.length-trusted.length===1?'':'s'}.`;securityStatus.className='security-status warn';chatStatus.textContent='E2EE locked until devices are verified'}
  else{securityStatus.textContent=`🔒 End-to-end encrypted • ${devices.length} verified device${devices.length===1?'':'s'}`;securityStatus.className='security-status secure';chatStatus.textContent='End-to-end encrypted'}
}
async function selectContact(id){
  activeContact=contacts.find(c=>c.id===id)||null;if(!activeContact)return;
  renderContacts();chatName.textContent=activeContact.display_name;emptyState.hidden=true;chatView.hidden=false;appView.classList.add('chat-open');updateSecurityState();await loadMessages(true);
}
function openVerifyModal(){
  if(!activeContact)return;verifyContactName.textContent=activeContact.display_name;
  verifyDeviceList.innerHTML=activeContact.devices.map(d=>`<div class="device-code"><strong>${esc(d.label||'SOXLO device')}</strong><code>${esc(safetyCode(d.fp))}</code></div>`).join('');
  verifyModal.hidden=false;
}
function confirmTrust(){if(!activeContact)return;trustCurrentDevices(activeContact);verifyModal.hidden=true;renderContacts();updateSecurityState();loadMessages(true).catch(()=>{})}

async function derivePairKey(peerJwk,sourceDeviceId,targetDeviceId){
  const pub=await crypto.subtle.importKey('jwk',peerJwk,{name:'ECDH',namedCurve:'P-256'},false,[]);
  const shared=await crypto.subtle.deriveBits({name:'ECDH',public:pub},deviceKey,256);
  const hkdf=await crypto.subtle.importKey('raw',shared,'HKDF',false,['deriveKey']);
  const salt=new Uint8Array(await sha256('SOXLO Messenger E2EE v3 wrap salt'));
  return crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt,info:te.encode(`soxlo-wrap-v3|${sourceDeviceId}|${targetDeviceId}`)},hkdf,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
function findOwnDevice(id){return ownDevices().find(d=>d.id===id)||null}
function findContactDevice(contact,id){return contact?.devices?.find(d=>d.id===id)||null}
async function encryptMessage(plain,contact){
  const trusted=contact.devices.filter(d=>isDeviceTrusted(contact.id,d.fp));
  if(!trusted.length||trusted.length!==contact.devices.length)throw new Error('Verify this contact’s devices before sending.');
  const mid=crypto.randomUUID(),contentBytes=crypto.getRandomValues(new Uint8Array(32)),contentKey=await crypto.subtle.importKey('raw',contentBytes,{name:'AES-GCM'},false,['encrypt','decrypt']);
  const iv=crypto.getRandomValues(new Uint8Array(12)),aad=te.encode(`message|${mid}|${userId()}|${contact.id}|v3`);
  const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad},contentKey,te.encode(plain));
  const targets=[...ownDevices().map(d=>({...d,owner:userId()})),...trusted.map(d=>({...d,owner:contact.id}))];
  const seen=new Set(),keys=[];
  for(const target of targets){
    if(seen.has(target.id))continue;seen.add(target.id);
    const wrap=await derivePairKey(target.jwk,deviceId,target.id),wiv=crypto.getRandomValues(new Uint8Array(12)),waad=te.encode(`keywrap|${mid}|${deviceId}|${target.id}`);
    const wrapped=await crypto.subtle.encrypt({name:'AES-GCM',iv:wiv,additionalData:waad},wrap,contentBytes);
    keys.push({device_id:target.id,owner_id:target.owner,fp:target.fp,iv:toB64(wiv),ct:toB64(wrapped)});
  }
  return JSON.stringify({v:3,alg:'P256-HKDF-SHA256-AES256GCM',mid,origin_device:deviceId,origin_fp:deviceFingerprint,origin_jwk:devicePublicJwk,iv:toB64(iv),ct:toB64(ct),keys});
}
async function decryptMessageRow(m){
  let packet;try{packet=JSON.parse(m.body)}catch{return{plain:m.body,legacy:true}}
  if(packet?.v!==3||!packet.mid||!packet.origin_device||!Array.isArray(packet.keys))return{plain:'[Unsupported encrypted message]',error:true};
  const entry=packet.keys.find(k=>k.device_id===deviceId);if(!entry)return{plain:'[Encrypted for another device]',error:true};
  const fromMe=m.sender_id===userId(),peerContact=fromMe?contacts.find(c=>c.id===m.recipient_id):contacts.find(c=>c.id===m.sender_id);
  const source=fromMe?(findOwnDevice(packet.origin_device)||(packet.origin_jwk&&packet.origin_fp?{id:packet.origin_device,jwk:packet.origin_jwk,fp:packet.origin_fp}:null)):findContactDevice(peerContact,packet.origin_device);
  if(!source||source.fp!==packet.origin_fp)return{plain:'[Security check failed: sender device key is unavailable]',error:true};
  if(!fromMe&&!isDeviceTrusted(peerContact.id,source.fp))return{plain:'[Blocked message from an unverified device]',error:true};
  try{
    const wrap=await derivePairKey(source.jwk,packet.origin_device,deviceId),waad=te.encode(`keywrap|${packet.mid}|${packet.origin_device}|${deviceId}`);
    const rawKey=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(entry.iv),additionalData:waad},wrap,fromB64(entry.ct));
    const contentKey=await crypto.subtle.importKey('raw',rawKey,{name:'AES-GCM'},false,['decrypt']),aad=te.encode(`message|${packet.mid}|${m.sender_id}|${m.recipient_id}|v3`);
    const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(packet.iv),additionalData:aad},contentKey,fromB64(packet.ct));
    return{plain:td.decode(plain),legacy:false};
  }catch{return{plain:'[Could not decrypt message on this device]',error:true}}
}
async function loadMessages(scroll=false){
  if(!activeContact)return;const a=userId(),b=activeContact.id;
  const filter=encodeURIComponent(`(and(sender_id.eq.${a},recipient_id.eq.${b}),and(sender_id.eq.${b},recipient_id.eq.${a}))`);
  const r=await api(`/rest/v1/messenger_messages?select=id,sender_id,recipient_id,body,created_at,read_at&or=${filter}&order=created_at.asc&limit=300`);if(!r.ok)return;
  const next=await r.json(),changed=next.length!==messages.length||next.at(-1)?.id!==messages.at(-1)?.id;messages=next;if(changed)await renderMessages(scroll||true);await markRead();
}
async function renderMessages(scroll=true){
  const rendered=[];for(const m of messages)rendered.push({...m,...await decryptMessageRow(m)});
  messageList.innerHTML=rendered.map(m=>`<div class="msg ${m.sender_id===userId()?'mine':''} ${m.error?'crypto-error':''}">${esc(m.plain)}${m.legacy?'<span class="legacy-badge">Legacy unencrypted</span>':''}<time>${new Date(m.created_at).toLocaleString([], {hour:'2-digit',minute:'2-digit',month:'short',day:'numeric'})}</time></div>`).join('');if(scroll)messageList.scrollTop=messageList.scrollHeight;
}
async function markRead(){if(!activeContact)return;await api(`/rest/v1/messenger_messages?recipient_id=eq.${encodeURIComponent(userId())}&sender_id=eq.${encodeURIComponent(activeContact.id)}&read_at=is.null`,{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({read_at:new Date().toISOString()})}).catch(()=>{})}
async function sendMessage(){
  const plain=messageInput.value.trim();if(!plain||!activeContact||plain.length>MAX_MESSAGE)return;
  try{const body=await encryptMessage(plain,activeContact);messageInput.value='';const r=await api('/rest/v1/messenger_messages',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({sender_id:userId(),recipient_id:activeContact.id,body})});if(!r.ok)throw new Error('Message was not accepted by the secure server.');await loadMessages(true)}catch(e){showMessage(profileMessage,e.message||'Could not send encrypted message.','error')}
}

async function encryptSignalPayload(payload,type,callId,target){
  const sid=crypto.randomUUID(),key=await derivePairKey(target.jwk,deviceId,target.id),iv=crypto.getRandomValues(new Uint8Array(12)),aad=te.encode(`signal|${callId}|${type}|${sid}|${deviceId}|${target.id}|v3`);
  const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad},key,te.encode(JSON.stringify(payload||{})));
  return{v:3,sid,source_device_id:deviceId,source_fp:deviceFingerprint,target_device_id:target.id,target_fp:target.fp,iv:toB64(iv),ct:toB64(ct)};
}
async function decryptSignalPayload(row,sourceDevice){
  const p=row.payload;if(!p||p.v!==3||p.target_device_id!==deviceId||p.source_device_id!==sourceDevice.id||p.source_fp!==sourceDevice.fp)return null;
  const key=await derivePairKey(sourceDevice.jwk,p.source_device_id,deviceId),aad=te.encode(`signal|${row.call_id}|${row.signal_type}|${p.sid}|${p.source_device_id}|${deviceId}|v3`);
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(p.iv),additionalData:aad},key,fromB64(p.ct));return JSON.parse(td.decode(plain));
}
async function sendSignalToDevice(type,payload,target,recipientId=currentCallPeer?.id){
  if(!currentCallId||!target||!recipientId)return;const encrypted=await encryptSignalPayload(payload,type,currentCallId,target);
  const r=await api('/rest/v1/messenger_call_signals',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({call_id:currentCallId,sender_id:userId(),recipient_id:recipientId,signal_type:type,payload:encrypted})});if(!r.ok)throw new Error('Encrypted call signaling failed.');
}
async function sendSignal(type,payload){
  const targets=currentCallPeerDevice?[currentCallPeerDevice]:currentCallTargets;if(!targets.length)return;
  await Promise.allSettled(targets.map(t=>sendSignalToDevice(type,payload,t)));
}
async function openMedia(){if(localStream)return localStream;localStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720}},audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});localVideo.srcObject=localStream;return localStream}
function createPeer(){
  signalReady=false;pendingLocalIce=[];pendingRemoteIce=[];peer=new RTCPeerConnection({iceServers:[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302']}],bundlePolicy:'max-bundle'});
  localStream.getTracks().forEach(t=>peer.addTrack(t,localStream));peer.ontrack=e=>{remoteVideo.srcObject=e.streams[0];callState.textContent='Secure call connected'};
  peer.onicecandidate=e=>{if(!e.candidate)return;const c=e.candidate.toJSON();if(signalReady)sendSignal('ice',c).catch(()=>{});else pendingLocalIce.push(c)};
  peer.onconnectionstatechange=()=>{if(!peer)return;const s=peer.connectionState;callState.textContent=s==='connected'?'Secure call connected':s==='failed'?'Connection failed':s==='disconnected'?'Reconnecting…':'Connecting securely…';if(['failed','closed'].includes(s))endCall(false)};
}
async function flushLocalIce(){signalReady=true;const queued=pendingLocalIce.splice(0);for(const c of queued){try{await sendSignal('ice',c)}catch{}}}
async function flushRemoteIce(){if(!peer?.remoteDescription)return;const queued=pendingRemoteIce.splice(0);for(const c of queued){try{await peer.addIceCandidate(c)}catch{}}}
async function startCall(){
  if(!activeContact)return;const targets=activeContact.devices.filter(d=>isDeviceTrusted(activeContact.id,d.fp));if(!targets.length||targets.length!==activeContact.devices.length){openVerifyModal();return}
  try{currentCallId=crypto.randomUUID();currentCallPeer=activeContact;currentCallTargets=targets;currentCallPeerDevice=null;lastCallSignalId=0;callName.textContent=activeContact.display_name;callState.textContent='Starting protected camera…';callOverlay.hidden=false;await openMedia();createPeer();const offer=await peer.createOffer({offerToReceiveAudio:true,offerToReceiveVideo:true});await peer.setLocalDescription(offer);await sendSignal('offer',peer.localDescription.toJSON());await flushLocalIce();callState.textContent='Calling verified devices…'}catch(e){callState.textContent=e.message||'Could not start secure call';setTimeout(()=>endCall(false),1400)}
}
async function pollIncomingOffers(){
  if(currentCallId||pendingOffer)return;const recent=encodeURIComponent(new Date(Date.now()-60000).toISOString());
  const r=await api(`/rest/v1/messenger_call_signals?select=id,call_id,sender_id,recipient_id,signal_type,payload,created_at&recipient_id=eq.${encodeURIComponent(userId())}&signal_type=eq.offer&id=gt.${lastIncomingOfferId}&created_at=gte.${recent}&order=id.asc&limit=20`);if(!r.ok)return;const rows=await r.json();if(!rows.length)return;lastIncomingOfferId=Math.max(lastIncomingOfferId,...rows.map(x=>Number(x.id)||0));
  for(const offer of rows){if(offer.payload?.target_device_id!==deviceId)continue;const c=contacts.find(x=>x.id===offer.sender_id);if(!c)continue;const source=findContactDevice(c,offer.payload?.source_device_id);if(!source||!isDeviceTrusted(c.id,source.fp))continue;try{const decoded=await decryptSignalPayload(offer,source);if(!decoded)continue;pendingOffer={...offer,decoded,sourceDevice:source,contact:c};incomingName.textContent=`${c.display_name} • verified device`;incomingModal.hidden=false;break}catch{}}
}
async function acceptIncoming(){
  if(!pendingOffer)return;try{const offer=pendingOffer;pendingOffer=null;incomingModal.hidden=true;currentCallId=offer.call_id;currentCallPeer=offer.contact;currentCallPeerDevice=offer.sourceDevice;currentCallTargets=[offer.sourceDevice];lastCallSignalId=Number(offer.id)||0;callName.textContent=currentCallPeer.display_name;callState.textContent='Starting protected camera…';callOverlay.hidden=false;await openMedia();createPeer();await peer.setRemoteDescription(offer.decoded);await flushRemoteIce();const answer=await peer.createAnswer();await peer.setLocalDescription(answer);await sendSignal('answer',peer.localDescription.toJSON());await flushLocalIce();callState.textContent='Connecting securely…'}catch(e){callState.textContent=e.message||'Could not answer securely';setTimeout(()=>endCall(false),1400)}
}
async function declineIncoming(){if(!pendingOffer)return;currentCallId=pendingOffer.call_id;currentCallPeer=pendingOffer.contact;currentCallPeerDevice=pendingOffer.sourceDevice;currentCallTargets=[pendingOffer.sourceDevice];pendingOffer=null;incomingModal.hidden=true;try{await sendSignal('hangup',{reason:'declined'})}catch{}finally{currentCallId=null;currentCallPeer=null;currentCallPeerDevice=null;currentCallTargets=[]}}
async function pollCallSignals(){
  if(!currentCallId||!currentCallPeer||!peer)return;const r=await api(`/rest/v1/messenger_call_signals?select=id,call_id,sender_id,recipient_id,signal_type,payload,created_at&call_id=eq.${encodeURIComponent(currentCallId)}&id=gt.${lastCallSignalId}&order=id.asc&limit=100`);if(!r.ok)return;const rows=await r.json();
  for(const s of rows){lastCallSignalId=Math.max(lastCallSignalId,Number(s.id)||0);if(s.sender_id===userId()||s.payload?.target_device_id!==deviceId)continue;const source=findContactDevice(currentCallPeer,s.payload?.source_device_id);if(!source||!isDeviceTrusted(currentCallPeer.id,source.fp))continue;if(currentCallPeerDevice&&source.id!==currentCallPeerDevice.id)continue;let decoded;try{decoded=await decryptSignalPayload(s,source)}catch{continue}if(!decoded)continue;
    if(s.signal_type==='answer'&&!peer.currentRemoteDescription){currentCallPeerDevice=source;currentCallTargets=[source];await peer.setRemoteDescription(decoded);await flushRemoteIce()}
    else if(s.signal_type==='ice'){if(peer.remoteDescription){try{await peer.addIceCandidate(decoded)}catch{}}else pendingRemoteIce.push(decoded)}
    else if(s.signal_type==='hangup'){endCall(false);break}
  }
}
async function endCall(notify=true){
  const finishedCallId=currentCallId;if(notify&&currentCallId&&currentCallPeer){try{await sendSignal('hangup',{reason:'ended'})}catch{}}
  if(peer){peer.onicecandidate=null;peer.ontrack=null;peer.close();peer=null}if(localStream){localStream.getTracks().forEach(t=>t.stop());localStream=null}localVideo.srcObject=null;remoteVideo.srcObject=null;callOverlay.hidden=true;incomingModal.hidden=true;currentCallId=null;currentCallPeer=null;currentCallPeerDevice=null;currentCallTargets=[];lastCallSignalId=0;signalReady=false;pendingLocalIce=[];pendingRemoteIce=[];
  if(finishedCallId)setTimeout(()=>api(`/rest/v1/messenger_call_signals?call_id=eq.${encodeURIComponent(finishedCallId)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}}).catch(()=>{}),10000);
}
function toggleTrack(kind,button){const track=localStream?.getTracks().find(t=>t.kind===kind);if(!track)return;track.enabled=!track.enabled;button.textContent=kind==='audio'?(track.enabled?'Mic on':'Mic off'):(track.enabled?'Camera on':'Camera off')}
function startTimers(){stopTimers();messagePoll=setInterval(()=>{if(activeContact&&!document.hidden)loadMessages(false).catch(()=>{})},POLL_MS);contactPoll=setInterval(()=>{if(!document.hidden)loadContacts().catch(()=>{})},12000);signalPoll=setInterval(()=>{if(!document.hidden){pollIncomingOffers().catch(()=>{});pollCallSignals().catch(()=>{})}},SIGNAL_MS)}
function stopTimers(){clearInterval(messagePoll);clearInterval(contactPoll);clearInterval(signalPoll)}
async function showApp(){loginView.hidden=true;appView.hidden=false;await ensureProfile();await loadContacts();startTimers()}
function showLogin(){stopTimers();appView.hidden=true;loginView.hidden=false}

loginForm.addEventListener('submit',async e=>{e.preventDefault();showMessage(loginMessage,'Signing in securely…');try{await signIn($('email').value.trim(),$('password').value);$('password').value='';showMessage(loginMessage,'');await showApp()}catch(err){showMessage(loginMessage,err.message,'error')}});
$('logoutBtn').addEventListener('click',async()=>{await endCall(false);clearSession();activeContact=null;messages=[];showLogin()});
$('saveProfileBtn').addEventListener('click',()=>saveProfile());$('refreshContactsBtn').addEventListener('click',()=>loadContacts());$('removeOtherDevicesBtn').addEventListener('click',()=>removeOtherDevices());
$('videoCallBtn').addEventListener('click',()=>startCall());$('hangupBtn').addEventListener('click',()=>endCall(true));$('acceptCallBtn').addEventListener('click',()=>acceptIncoming());$('declineCallBtn').addEventListener('click',()=>declineIncoming());
$('toggleMicBtn').addEventListener('click',e=>toggleTrack('audio',e.currentTarget));$('toggleCameraBtn').addEventListener('click',e=>toggleTrack('video',e.currentTarget));$('mobileBackBtn').addEventListener('click',()=>appView.classList.remove('chat-open'));
verifyDevicesBtn.addEventListener('click',openVerifyModal);$('closeVerifyBtn').addEventListener('click',()=>verifyModal.hidden=true);$('confirmTrustBtn').addEventListener('click',confirmTrust);
messageForm.addEventListener('submit',e=>{e.preventDefault();sendMessage()});messageInput.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();messageForm.requestSubmit()}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&session){loadContacts().catch(()=>{});if(activeContact)loadMessages(false).catch(()=>{})}});window.addEventListener('beforeunload',()=>{if(peer)localStream?.getTracks().forEach(t=>t.stop())});

(async()=>{if(!window.isSecureContext||!crypto?.subtle||!indexedDB){showMessage(loginMessage,'This device does not provide the secure browser features required for SOXLO Messenger.','error');loginForm.querySelector('button').disabled=true;return}loadSession();if(session){try{if(tokenExpired())await refreshSession();await showApp()}catch(e){clearSession();showLogin();showMessage(loginMessage,e.message||'Please sign in again.','error')}}else showLogin()})();
