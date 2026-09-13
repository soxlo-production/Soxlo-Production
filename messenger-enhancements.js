(()=>{
  'use strict';
  const baseLoadContacts=loadContacts;
  const baseRenderContacts=renderContacts;
  const baseSelectContact=selectContact;
  const baseUpdateSecurityState=updateSecurityState;
  const baseStartCall=startCall;
  const basePollIncomingOffers=pollIncomingOffers;
  const baseAcceptIncoming=acceptIncoming;
  const baseShowApp=showApp;
  const baseShowLogin=showLogin;

  let incomingCursor=null;
  let notifTimer=null;
  let unreadBySender={};
  window.__soxloCallMode='video';

  function avatarHtml(c,cls='avatar'){
    const name=c?.display_name||'?';
    if(c?.avatar_data) return `<span class="${cls} photo"><img src="${esc(c.avatar_data)}" alt=""></span>`;
    return `<span class="${cls}">${esc(initials(name))}</span>`;
  }

  loadContacts=async function(){
    const r=await api('/rest/v1/messenger_profiles?select=id,display_name,created_at,public_key_jwk,key_fingerprint,avatar_data&order=display_name.asc');
    if(!r.ok)return;
    contacts=(await r.json())
      .filter(x=>x.id!==userId())
      .map(x=>({...x,devices:contactDevices(x)}))
      .filter(x=>!x.devices.some(d=>d.fp===deviceFingerprint));
    if(activeContact){activeContact=contacts.find(c=>c.id===activeContact.id)||null;if(activeContact)updateSecurityState()}
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
    if(old) old.outerHTML=avatarHtml(activeContact,'chat-avatar');
    updateSecurityState();await loadMessages(true);
  };

  updateSecurityState=function(){
    baseUpdateSecurityState();
    const audioBtn=document.getElementById('audioCallBtn');
    if(audioBtn) audioBtn.disabled=document.getElementById('videoCallBtn').disabled;
  };

  openMedia=async function(){
    if(localStream)return localStream;
    const video=window.__soxloCallMode==='video'?{facingMode:'user',width:{ideal:1280},height:{ideal:720}}:false;
    localStream=await navigator.mediaDevices.getUserMedia({video,audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    localVideo.srcObject=localStream;
    callOverlay.dataset.mode=window.__soxloCallMode;
    return localStream;
  };

  startCall=function(){window.__soxloCallMode='video';return baseStartCall();};
  pollIncomingOffers=async function(){
    const before=pendingOffer?.id;
    await basePollIncomingOffers();
    if(pendingOffer && pendingOffer.id!==before){
      window.__soxloCallMode=(pendingOffer.decoded?.sdp||'').includes('m=video')?'video':'audio';
      const h=incomingModal.querySelector('h2');if(h)h.textContent=window.__soxloCallMode==='video'?'Incoming encrypted video call':'Incoming encrypted voice call';
      notifyUser('SOXLO Messenger',`${pendingOffer.contact?.display_name||'Contact'} is calling you`);
    }
  };
  acceptIncoming=function(){window.__soxloCallMode=(pendingOffer?.decoded?.sdp||'').includes('m=video')?'video':'audio';return baseAcceptIncoming();};

  function injectUi(){
    if(!document.getElementById('audioCallBtn')){
      const v=document.getElementById('videoCallBtn');
      if(v){const b=document.createElement('button');b.id='audioCallBtn';b.className='call-btn';b.type='button';b.disabled=true;b.textContent='Call';b.addEventListener('click',()=>{window.__soxloCallMode='audio';baseStartCall()});v.before(b)}
    }
    const profile=document.querySelector('.profile-card');
    if(profile&&!document.getElementById('avatarInput')){
      const box=document.createElement('div');box.className='avatar-upload';box.innerHTML='<div id="myAvatarPreview" class="profile-avatar">S</div><label class="small-btn avatar-pick">Profile photo<input id="avatarInput" type="file" accept="image/*" hidden></label><button id="removeAvatarBtn" class="text-btn" type="button">Remove photo</button><button id="enableNotificationsBtn" class="text-btn" type="button">Enable message notifications</button>';
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
    if(!file.type.startsWith('image/'))return;
    const reader=new FileReader();reader.onload=()=>{
      const img=new Image();img.onload=()=>{
        const c=document.createElement('canvas'),size=256;c.width=size;c.height=size;const ctx=c.getContext('2d');
        const scale=Math.max(size/img.width,size/img.height),w=img.width*scale,h=img.height*scale;ctx.drawImage(img,(size-w)/2,(size-h)/2,w,h);
        saveAvatarData(c.toDataURL('image/jpeg',.82));
      };img.src=reader.result;
    };reader.readAsDataURL(file);
  }

  function updateOwnAvatar(data){const el=document.getElementById('myAvatarPreview');if(!el)return;el.innerHTML=data?`<img src="${esc(data)}" alt="">`:esc(initials(ownProfile?.display_name||displayName.value||'S'))}
  async function loadOwnAvatar(){
    const r=await api(`/rest/v1/messenger_profiles?select=avatar_data&id=eq.${encodeURIComponent(userId())}&limit=1`);if(!r.ok)return;
    const row=(await r.json())?.[0];if(row){ownProfile={...ownProfile,...row};updateOwnAvatar(row.avatar_data)}
  }

  async function enableNotifications(){
    const b=document.getElementById('enableNotificationsBtn');
    if('Notification' in window){
      try{const p=await Notification.requestPermission();if(b)b.textContent=p==='granted'?'Notifications enabled':'Notifications blocked';return}catch{}
    }
    if(b)b.textContent='Notifications active in app';
  }

  function softBeep(){try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;const a=new A(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);g.gain.setValueAtTime(.04,a.currentTime);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+.18);o.frequency.value=880;o.start();o.stop(a.currentTime+.18)}catch{}}
  function notifyUser(title,body){
    if(window.SoxloAndroid?.notify){try{window.SoxloAndroid.notify(title,body);return}catch{}}
    if('Notification' in window&&Notification.permission==='granted'&&document.hidden){try{new Notification(title,{body,tag:'soxlo-messenger'})}catch{}}
    else softBeep();
  }

  async function initIncomingCursor(){
    const r=await api(`/rest/v1/messenger_messages?select=created_at&recipient_id=eq.${encodeURIComponent(userId())}&order=created_at.desc&limit=1`);if(r.ok){const rows=await r.json();incomingCursor=rows?.[0]?.created_at||new Date().toISOString()}else incomingCursor=new Date().toISOString();
  }
  async function pollNewIncoming(){
    if(!session||!incomingCursor)return;
    const since=encodeURIComponent(incomingCursor);
    const r=await api(`/rest/v1/messenger_messages?select=id,sender_id,recipient_id,body,created_at,read_at&recipient_id=eq.${encodeURIComponent(userId())}&created_at=gt.${since}&order=created_at.asc&limit=50`);if(!r.ok)return;
    const rows=await r.json();if(!rows.length)return;
    for(const m of rows){
      incomingCursor=m.created_at;
      const c=contacts.find(x=>x.id===m.sender_id);if(!c)continue;
      unreadBySender[c.id]=(unreadBySender[c.id]||0)+1;
      let text='New encrypted message';try{const d=await decryptMessageRow(m);if(!d.error&&d.plain)text=d.plain.slice(0,120)}catch{}
      if(!(activeContact?.id===c.id&&!document.hidden))notifyUser(c.display_name||'SOXLO Messenger',text);
      if(activeContact?.id===c.id)await loadMessages(false);
    }
    renderContacts();
  }

  startTimers=function(){
    stopTimers();
    messagePoll=setInterval(()=>{if(activeContact)loadMessages(false).catch(()=>{});pollNewIncoming().catch(()=>{})},1200);
    contactPoll=setInterval(()=>loadContacts().catch(()=>{}),8000);
    signalPoll=setInterval(()=>{pollIncomingOffers().catch(()=>{});pollCallSignals().catch(()=>{})},SIGNAL_MS);
  };

  showApp=async function(){
    await baseShowApp();injectUi();await loadOwnAvatar();await initIncomingCursor();startTimers();
  };
  showLogin=function(){if(notifTimer){clearInterval(notifTimer);notifTimer=null}return baseShowLogin();};

  const boot=()=>{injectUi();if(session&&appView&&!appView.hidden){loadOwnAvatar().catch(()=>{});initIncomingCursor().then(()=>startTimers()).catch(()=>{})}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
