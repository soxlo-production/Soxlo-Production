(()=>{
  'use strict';
  function applySelfFilter(){
    if(typeof loadContacts!=='function'||typeof renderContacts!=='function')return false;
    if(window.__soxloSelfFilterInstalled)return true;
    window.__soxloSelfFilterInstalled=true;
    const baseLoadContacts=loadContacts;
    loadContacts=async function(){
      await baseLoadContacts();
      const uid=typeof userId==='function'?userId():null;
      const fp=typeof deviceFingerprint==='string'?deviceFingerprint:null;
      contacts=(contacts||[]).filter(c=>{
        if(uid&&c.id===uid)return false;
        if(fp&&Array.isArray(c.devices)&&c.devices.some(d=>d&&d.fp===fp))return false;
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
