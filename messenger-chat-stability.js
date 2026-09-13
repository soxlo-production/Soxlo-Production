(()=>{
  'use strict';
  function install(){
    if(typeof sendMessage!=='function'||typeof decryptMessageRow!=='function')return false;
    if(window.__soxloChatStabilityInstalled)return true;
    window.__soxloChatStabilityInstalled=true;

    const baseSend=sendMessage;
    sendMessage=async function(){
      const selectedId=activeContact?.id;
      if(selectedId){
        try{
          await loadContacts();
          activeContact=(contacts||[]).find(c=>c.id===selectedId)||activeContact;
          if(typeof updateSecurityState==='function')updateSecurityState();
        }catch{}
      }
      return baseSend();
    };

    const baseDecrypt=decryptMessageRow;
    decryptMessageRow=async function(m){
      const out=await baseDecrypt(m);
      if(!out?.error)return out;
      const text=String(out.plain||'');
      if(text.includes('Encrypted for another device')||text.includes('sender device key is unavailable')||text.includes('Could not decrypt message on this device')){
        return {plain:'Older encrypted message is unavailable on this device.',error:false,legacy:false};
      }
      return out;
    };

    if(typeof renderMessages==='function'&&Array.isArray(messages)&&messages.length)renderMessages(false).catch(()=>{});
    return true;
  }
  let tries=0;
  const timer=setInterval(()=>{tries++;if(install()||tries>80)clearInterval(timer)},100);
})();
