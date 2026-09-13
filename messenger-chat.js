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
    if(!document.querySelector('link[href^="messenger-enhancements.css"]')){
      const l=document.createElement('link');l.rel='stylesheet';l.href='messenger-enhancements.css?v=20260913-2';document.head.appendChild(l);
    }
    if(!document.querySelector('script[src^="messenger-enhancements.js"]')){
      const s=document.createElement('script');s.src='messenger-enhancements.js?v=20260913-2';document.body.appendChild(s);
    }
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(openFirstChat() || tries>80) clearInterval(timer);
    },250);
  });
})();
