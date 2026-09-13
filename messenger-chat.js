(()=>{
  function openFirstChat(){const app=document.getElementById('appView');const login=document.getElementById('loginView');if(!app||app.hidden||(login&&!login.hidden))return false;const first=document.querySelector('#contactsList [data-contact]');if(first){first.click();return true}return false}
  function addScript(src){if(document.querySelector(`script[src^="${src}"]`))return Promise.resolve();return new Promise(resolve=>{const s=document.createElement('script');s.src=`${src}?v=20260913-5`;s.onload=resolve;s.onerror=resolve;document.body.appendChild(s)})}
  window.addEventListener('DOMContentLoaded',async()=>{
    if(!document.querySelector('link[href^="messenger-enhancements.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='messenger-enhancements.css?v=20260913-5';document.head.appendChild(l)}
    await addScript('messenger-enhancements.js');
    await addScript('messenger-performance-hotfix.js');
    await addScript('messenger-self-filter-v2.js');
    await addScript('messenger-profile-links.js');
    let tries=0;const timer=setInterval(()=>{tries++;if(openFirstChat()||tries>80)clearInterval(timer)},250);
  });
})();