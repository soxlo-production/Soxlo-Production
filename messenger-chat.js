(()=>{
  function openFirstChat(){
    const app=document.getElementById('appView');
    const login=document.getElementById('loginView');
    if(!app || app.hidden || (login && !login.hidden)) return false;
    const first=document.querySelector('#contactsList [data-contact]');
    if(first){ first.click(); return true; }
    return false;
  }

  window.addEventListener('DOMContentLoaded',()=>{
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(openFirstChat() || tries>80) clearInterval(timer);
    },250);
  });
})();
