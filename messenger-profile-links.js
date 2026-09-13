(()=>{
  'use strict';
  const goProfile=id=>{const u=new URL('messenger-profile.html',location.href);if(id)u.searchParams.set('id',id);location.assign(u.href)};
  function addOwnProfile(){
    const card=document.querySelector('.profile-card');
    if(card&&!document.getElementById('myProfileLink')){
      const b=document.createElement('button');b.id='myProfileLink';b.className='text-btn';b.type='button';b.textContent='My profile';b.addEventListener('click',()=>goProfile());card.appendChild(b);
    }
    const actions=document.querySelector('.head-actions');
    if(actions&&!document.getElementById('myProfileQuickBtn')){
      const b=document.createElement('button');b.id='myProfileQuickBtn';b.className='icon-btn';b.type='button';b.title='My profile';b.setAttribute('aria-label','My profile');b.textContent='👤';b.addEventListener('click',()=>goProfile());actions.prepend(b);
    }
  }
  function addContactProfile(){
    const head=document.querySelector('.chat-head');const video=document.getElementById('videoCallBtn');
    if(!head||!video||document.getElementById('contactProfileBtn'))return;
    const b=document.createElement('button');b.id='contactProfileBtn';b.className='call-btn';b.type='button';b.textContent='Profile';b.disabled=true;
    b.addEventListener('click',()=>{if(activeContact?.id)goProfile(activeContact.id)});video.before(b);
    const baseSelect=selectContact;
    selectContact=async function(id){const out=await baseSelect(id);b.disabled=!activeContact?.id;return out};
  }
  function boot(){addOwnProfile();addContactProfile()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,150));else setTimeout(boot,150);
  setTimeout(boot,1200);
})();