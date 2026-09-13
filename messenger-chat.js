(()=>{
  function openFirstChat(){
    const app=document.getElementById('appView');
    const login=document.getElementById('loginView');
    if(!app || app.hidden || (login && !login.hidden)) return false;
    const first=document.querySelector('#contactsList [data-contact]');
    if(first){ first.click(); return true; }
    return false;
  }

  function installSelfFilter(){
    if(typeof loadContacts!=='function'||typeof renderContacts!=='function'||window.__soxloSelfFilterInstalled)return false;
    window.__soxloSelfFilterInstalled=true;
    const original=loadContacts;
    loadContacts=async function(){
      await original();
      const uid=typeof userId==='function'?userId():null;
      const fp=typeof deviceFingerprint==='string'?deviceFingerprint:null;
      contacts=(contacts||[]).filter(c=>!(uid&&c.id===uid)&&!(fp&&Array.isArray(c.devices)&&c.devices.some(d=>d&&d.fp===fp)));
      if(activeContact&&!contacts.some(c=>c.id===activeContact.id))activeContact=null;
      renderContacts();
    };
    loadContacts().catch(()=>{});
    return true;
  }

  window.addEventListener('DOMContentLoaded',()=>{
    if(!document.querySelector('link[href^="messenger-enhancements.css"]')){
      const l=document.createElement('link');l.rel='stylesheet';l.href='messenger-enhancements.css?v=20260913-2';document.head.appendChild(l);
    }
    if(!document.querySelector('script[src^="messenger-enhancements.js"]')){
      const s=document.createElement('script');s.src='messenger-enhancements.js?v=20260913-2';document.body.appendChild(s);
    }
    let filterTries=0;
    const filterTimer=setInterval(()=>{filterTries++;if(installSelfFilter()||filterTries>80)clearInterval(filterTimer)},150);
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(openFirstChat() || tries>80) clearInterval(timer);
    },250);
  });
})();
