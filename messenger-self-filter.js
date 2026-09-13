(()=>{
  'use strict';
  function applySelfFilter(){
    if(typeof loadContacts!=='function'||typeof renderContacts!=='function')return false;
    if(window.__soxloSelfFilterInstalled)return true;
    window.__soxloSelfFilterInstalled=true;
    const originalLoadContacts=loadContacts;
    loadContacts=async function(){
      await originalLoadContacts();
      const uid=typeof userId==='function'?userId():null;
      const ownFps=[];
      if(typeof deviceFingerprint==='string'&&deviceFingerprint)ownFps.push(deviceFingerprint);
      try{
        if(typeof ownDevices==='function'){
          const list=ownDevices()||[];
          for(const d of list){if(d&&d.fp&&ownFps.indexOf(d.fp)===-1)ownFps.push(d.fp)}
        }
      }catch(e){}
      contacts=(contacts||[]).filter(c=>{
        if(uid&&c.id===uid)return false;
        if(Array.isArray(c.devices)){
          for(const d of c.devices){if(d&&d.fp&&ownFps.indexOf(d.fp)!==-1)return false}
        }
        return true;
      });
      if(activeContact&&!contacts.some(c=>c.id===activeContact.id))activeContact=null;
      renderContacts();
    };
    loadContacts().catch(()=>{});
    return true;
  }
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(applySelfFilter()||tries>80)clearInterval(timer);
  },150);
})();
