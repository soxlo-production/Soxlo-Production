(()=>{
  'use strict';
  const baseUpdateSecurityState=updateSecurityState;
  const baseStartCall=startCall;
  const basePollIncomingOffers=pollIncomingOffers;
  const baseAcceptIncoming=acceptIncoming;
  const baseEndCall=endCall;
  const baseShowApp=showApp;
  const baseShowLogin=showLogin;

  let incomingCursor=null;
  let seenIncoming=new Set();
  let unreadBySender={};
  window.__soxloCallMode='video';

  function safeAvatarData(value){
    if(typeof value!=='string'||value.length>350000)return'';
    return /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(value)?value:'';
  }
  function avatarHtml(c,cls='avatar'){
    const name=c?.display_name||'?';
    const photo=safeAvatarData(c?.avatar_data);
    if(photo)return `<span class="${cls} photo"><img src="${esc(photo)}" alt=""></span>`;
    return `<span class="${cls}">${esc(initials(name))}</span>`;
  }

  loadContacts=async function(){
    const r=await api('/rest/v1/messenger_profiles?select=id,display_name,created_at,public_key_jwk,key_fingerprint,avatar_data&order=display_name.asc');
    if(!r.ok)return;
    contacts=(await r.json())
      .filter(x=>x.id!==userId())
      .map(x=>({...x,devices:contactDevices(x)}));
    if(activeContact){activeContact=contacts.find(c=>c.id===activeContact.id)||null;if(activeContact)updateSecurityState()}
    await refreshUnreadCounts();
    renderContacts();
  };

  renderContacts=function(){
    if(!contacts.length){contactsList.innerHTML='<p class="muted contacts-empty">No other Messenger users yet.</p>';return}
    contactsList.innerHTML=contacts.map(c=>{
      const trusted=c.devices.length>0&&c.devices.every(d=>isDeviceTrusted(c.id,d.fp));
      const sub=!c.devices.length?'No secure device':trusted?'Verified E2EE':'Verify encryption keys';
      const unread=unreadBySender[c.id]||0;
      return `<button class="contact ${activeContact?.id===c.id?'active':''}" data-contact="${esc(c.id)}" type="button">${avatarHtml(c)}<span class="contact-copy"><span class="contact-name">${esc(c.display_name)}</span><span class="contact-sub ${trusted?'secure':''}">${trusted?'🔒 ':''}${esc(sub)}</span></span>${unread?`<span class="unread-badge">${unread>99?'99+':unread}</span>`:''}</button>`;
    }).join('');
    contactsList.querySelectorAll('[data-contact]').forEach(b=>b.addEventListener('click',()=>selectContact(b.dataset.contact)));
  };

  selectContact=async function(id){
    activeContact=contacts.find(c=>c.id===id)||null;if(!activeContact)return;
    unreadBySender[id]=0;
    renderContacts();chatName.textContent=activeContact.display_name;emptyState.hidden=true;chatView.hidden=false;appView.classList.add('chat-open');
    const old=document.querySelector('.chat-head .chat-avatar');
    if(old)old.outerHTML=avatarHtml(activeContact,'chat-avatar');
    updateSecurityState();await loadMessages(true);await refreshUnreadCounts();renderContacts();
  };

  updateSecurityState=function(){
    baseUpdateSecurityState();
    const audioBtn=document.getElementById('audioCallBtn');
    if(audioBtn)audioBtn.disabled=document.getElementById('videoCallBtn').disabled;
  };

  openMedia=async function(){
    if(localStream)return localStream;
    const video=window.__soxloCallMode==='video'?{facingMode:'user',width:{ideal:1280},height:{ideal:720}}:false;
    localStream=await navigator.mediaDevices.getUserMedia({video,audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    localVideo.srcObject=localStream;
    callOverlay.dataset.mode=window.__soxloCallMode;
    return localStream;
  };

  startCall=function(){
    window.__soxloCallMode='video';
    callOverlay.dataset.mode='video';
    return baseStartCall();
  };

  async function startAudioCall(){
    if(!activeContact)return;
    const targets=activeContact.devices.filter(d=>isDeviceTrusted(activeContact.id,d.fp));
    if(!targets.length||targets.length!==activeContact.devices.length){openVerifyModal();return}
    try{
      window.__soxloCallMode='audio';
      currentCallId=crypto.randomUUID();currentCallPeer=activeContact;currentCallTargets=targets;currentCallPeerDevice=null;lastCallSignalId=0;
      callName.textContent=activeContact.display_name;callState.textContent='Starting protected microphone…';callOverlay.dataset.mode='audio';callOverlay.hidden=false;
      await openMedia();createPeer();
      const offer=await peer.createOffer({offerToReceiveAudio:true,offerToReceiveVideo:false});
      await peer.setLocalDescription(offer);await sendSignal('offer',peer.localDescription.toJSON());await flushLocalIce();
      callState.textContent='Calling verified devices…';
    }catch(e){callState.textContent=e.message||'Could not start secure voice call';setTimeout(()=>endCall(false),1400)}
  }

  pollIncomingOffers=async function(){
    const before=pendingOffer?.id;
    await basePollIncomingOffers();
    if(pendingOffer&&pendingOffer.id!==before){
      window.__soxloCallMode=(pendingOffer.decoded?.sdp||'').includes('m=video')?'video':'audio';
      const h=incomingModal.querySelector('h2');if(h)h.textContent=window.__soxloCallMode==='video'?'Incoming encrypted video call':'Incoming encrypted voice call';
      notifyUser('SOXLO Messenger',`${pendingOffer.contact?.display_name||'Contact'} is calling you`);
    }
  };
  acceptIncoming=function(){
    window.__soxloCallMode=(pendingOffer?.decoded?.sdp||'').includes('m=video')?'video':'audio';
    callOverlay.dataset.mode=window.__soxloCallMode;
    return baseAcceptIncoming();
  };
  endCall=async function(notify=true){
    try{return await baseEndCall(notify)}finally{window.__soxloCallMode='video';callOverlay.dataset.mode='video'}
  };

  function injectUi(){
    if(!document.getElementById('audioCallBtn')){
      const v=document.getElementById('videoCallBtn');
      if(v){
        const b=document.createElement('button');b.id='audioCallBtn';b.className='call-btn';b.type='button';b.disabled=true;b.textContent='Audio call';
        b.addEventListener('click',()=>startAudioCall());v.before(b);
        v.textContent='Video call';
      }
    }
    const profile=document.querySelector('.profile-card');
    if(profile&&!document.getElementById('avatarInput')){
      const box=document.createElement('div');box.className='avatar-upload';
      box.innerHTML='<div id="myAvatarPreview" class="profile-avatar">S</div><label class="small-btn avatar-pick">Profile photo<input id="avatarInput" type="file" accept="image/png,image/jpeg,image/webp" hidden></label><button id="removeAvatarBtn" class="text-btn" type="button">Remove photo</button><button id="enableNotificationsBtn" class="text-btn" type="button">Enable message notifications</button>';
      profile.prepend(box);
      document.getElementById('avatarInput').addEventListener('change',e=>{const f=e.target.files?.[0];if(f)saveAvatarFile(f)});
      document.getElementById('removeAvatarBtn').addEventListener('click',()=>saveAvatarData(null));
      document.getElementById('enableNotificationsBtn').addEventListener('click',enableNotifications);
    }
  }

  async function saveAvatarData(data){
    const r=await api(`/rest/v1/messenger_profiles?id=eq.${encodeURIComponent(userId())}`,{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({avatar_data:data})});
    if(!r.ok){showMessage(profileMessage,'Could not save profile photo.','error');return}
    const row=(await r.json())?.[0];if(row)ownProfile={...ownProfile,...row};
    updateOwnAvatar(data);showMessage(profileMessage,data?'Profile photo saved.':'Profile photo removed.','success');await loadContacts();
  }

  function saveAvatarFile(file){
    if(!/^image\/(?:jpeg|png|webp)$/i.test(file.type)){showMessage(profileMessage,'Choose a JPG, PNG, or WebP photo.','error');return}
    if(file.size>6*1024*1024){showMessage(profileMessage,'Profile photo is too large. Choose one under 6 MB.','error');return}
    const reader=new FileReader();reader.onload=()=>{
      const img=new Image();img.onload=()=>{
        const c=document.createElement('canvas'),size=256;c.width=size;c.height=size;const ctx=c.getContext('2d');
        const scale=Math.max(size/img.width,size/img.height),w=img.width*scale,h=img.height*scale;ctx.drawImage(img,(size-w)/2,(size-h)/2,w,h);
        saveAvatarData(c.toDataURL('image/jpeg',.82));
      };img.src=reader.result;
    };reader.readAsDataURL(file);
  }

  function updateOwnAvatar(data){
    const el=document.getElementById('myAvatarPreview');if(!el)return;
    const photo=safeAvatarData(data);el.innerHTML=photo?`<img src="${esc(photo)}" alt="">`:esc(initials(ownProfile?.display_name||displayName.value||'S'));
  }
  async function loadOwnAvatar(){
    const r=await api(`/rest/v1/messenger_profiles?select=avatar_data&id=eq.${encodeURIComponent(userId())}&limit=1`);if(!r.ok)return;
    const row=(await r.json())?.[0];if(row){ownProfile={...ownProfile,...row};updateOwnAvatar(row.avatar_data)}
  }

  async function enableNotifications(){
    const b=document.getElementById('enableNotificationsBtn');
    if(window.SoxloAndroid?.notify){if(b)b.textContent='App notifications enabled';notifyUser('SOXLO Messenger','Notifications are enabled');return}
    if('Notification' in window){
      try{const p=await Notification.requestPermission();if(b)b.textContent=p==='granted'?'Notifications enabled':'Notifications blocked';return}catch{}
    }
    if(b)b.textContent='Notifications unavailable';
  }

  function softBeep(){try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;const a=new A(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);g.gain.setValueAtTime(.04,a.currentTime);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+.18);o.frequency.value=880;o.start();o.stop(a.currentTime+.18)}catch{}}
  function notifyUser(title,body){
    if(window.SoxloAndroid?.notify){try{window.SoxloAndroid.notify(title,body);return}catch{}}
    if('Notification' in window&&Notification.permission==='granted'&&document.hidden){try{new Notification(title,{body,tag:'soxlo-messenger'})}catch{}}
    else softBeep();
  }

  async function refreshUnreadCounts(){
    if(!session)return;
    const r=await api(`/rest/v1/messenger_messages?select=sender_id&recipient_id=eq.${encodeURIComponent(userId())}&read_at=is.null&limit=500`);if(!r.ok)return;
    const next={};for(const row of await r.json())next[row.sender_id]=(next[row.sender_id]||0)+1;unreadBySender=next;
  }

  async function initIncomingCursor(){
    seenIncoming.clear();
    const r=await api(`/rest/v1/messenger_messages?select=id,created_at&recipient_id=eq.${encodeURIComponent(userId())}&order=created_at.desc&limit=1`);
    if(r.ok){const rows=await r.json();incomingCursor=rows?.[0]?.created_at||new Date().toISOString();if(rows?.[0]?.id)seenIncoming.add(rows[0].id)}
    else incomingCursor=new Date().toISOString();
    await refreshUnreadCounts();renderContacts();
  }
  async function pollNewIncoming(){
    if(!session||!incomingCursor)return;
    const since=encodeURIComponent(incomingCursor);
    const r=await api(`/rest/v1/messenger_messages?select=id,sender_id,recipient_id,body,created_at,read_at&recipient_id=eq.${encodeURIComponent(userId())}&created_at=gte.${since}&order=created_at.asc&limit=100`);if(!r.ok)return;
    const rows=await r.json();if(!rows.length)return;
    let newest=incomingCursor;
    for(const m of rows){
      if(m.created_at>newest)newest=m.created_at;
      if(seenIncoming.has(m.id))continue;
      seenIncoming.add(m.id);if(seenIncoming.size>500)seenIncoming=new Set(Array.from(seenIncoming).slice(-250));
      const c=contacts.find(x=>x.id===m.sender_id);if(!c)continue;
      unreadBySender[c.id]=(unreadBySender[c.id]||0)+1;
      let text='New encrypted message';try{const d=await decryptMessageRow(m);if(!d.error&&d.plain)text=d.plain.slice(0,120)}catch{}
      if(!(activeContact?.id===c.id&&!document.hidden))notifyUser(c.display_name||'SOXLO Messenger',text);
      if(activeContact?.id===c.id)await loadMessages(false);
    }
    incomingCursor=newest;await refreshUnreadCounts();renderContacts();
  }

  startTimers=function(){
    stopTimers();
    messagePoll=setInterval(()=>{if(activeContact)loadMessages(false).catch(()=>{});pollNewIncoming().catch(()=>{})},1200);
    contactPoll=setInterval(()=>loadContacts().catch(()=>{}),8000);
    signalPoll=setInterval(()=>{pollIncomingOffers().catch(()=>{});pollCallSignals().catch(()=>{})},SIGNAL_MS);
  };

  showApp=async function(){await baseShowApp();injectUi();await loadOwnAvatar();await initIncomingCursor();startTimers()};
  showLogin=function(){return baseShowLogin()};

  const boot=()=>{injectUi();if(session&&appView&&!appView.hidden){loadOwnAvatar().catch(()=>{});initIncomingCursor().then(()=>startTimers()).catch(()=>{})}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
