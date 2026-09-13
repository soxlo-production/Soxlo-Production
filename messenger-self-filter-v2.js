(()=>{
  'use strict';
  function install(){
    if(typeof loadContacts!=='function'||typeof renderContacts!=='function')return false;
    if(window.__soxloSelfFilterV2Installed)return true;
    window.__soxloSelfFilterV2Installed=true;
    const original=loadContacts;
    loadContacts=async function(){
      await original();
      const uid=typeof userId==='function'?userId():null;
      const mine=[];
      try{
        if(typeof deviceFingerprint==='string'&&deviceFingerprint)mine.push(deviceFingerprint);
        if(typeof ownDevices==='function'){
          for(const d of ownDevices()||[]){
            if(d&&d.fp&&mine.indexOf(d.fp)<0)mine.push(d.fp);
          }
        }
      }catch(e){}
      contacts=(contacts||[]).filter(c=>{
        if(uid&&c.id===uid)return false;
        if(Array.isArray(c.devices)){
          for(const d of c.devices){
            if(d&&d.fp&&mine.indexOf(d.fp)>=0)return false;
          }
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
  const timer=setInterval(()=>{tries++;if(install()||tries>80)clearInterval(timer)},150);
})();
