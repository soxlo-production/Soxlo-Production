(()=>{
  'use strict';
  function addOwnProfile(){
    const card=document.querySelector('.profile-card');
    if(!card||document.getElementById('myProfileLink'))return;
    const a=document.createElement('a');a.id='myProfileLink';a.className='text-btn';a.href='messenger-profile.html';a.textContent='My profile';card.appendChild(a);
  }
  function addContactProfile(){
    const head=document.querySelector('.chat-head');
    const video=document.getElementById('videoCallBtn');
    if(!head||!video||document.getElementById('contactProfileBtn'))return;
    const b=document.createElement('button');b.id='contactProfileBtn';b.className='call-btn';b.type='button';b.textContent='Profile';b.disabled=true;
    b.addEventListener('click',()=>{if(activeContact?.id)location.href=`messenger-profile.html?id=${encodeURIComponent(activeContact.id)}`});
    video.before(b);
    const baseSelect=selectContact;
    selectContact=async function(id){const out=await baseSelect(id);b.disabled=!activeContact?.id;return out};
  }
  function boot(){addOwnProfile();addContactProfile()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,300));else setTimeout(boot,300);
})();