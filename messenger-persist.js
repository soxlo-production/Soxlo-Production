(()=>{
  const KEY='soxlo_messenger_session_v3';
  const proto=Storage.prototype;
  const nativeGet=proto.getItem;
  const nativeSet=proto.setItem;
  const nativeRemove=proto.removeItem;
  proto.getItem=function(key){
    if(this===sessionStorage&&key===KEY)return nativeGet.call(localStorage,key);
    return nativeGet.call(this,key);
  };
  proto.setItem=function(key,value){
    if(this===sessionStorage&&key===KEY)return nativeSet.call(localStorage,key,value);
    return nativeSet.call(this,key,value);
  };
  proto.removeItem=function(key){
    if(this===sessionStorage&&key===KEY)return nativeRemove.call(localStorage,key);
    return nativeRemove.call(this,key);
  };

  function addScript(src){
    if(document.querySelector(`script[src^="${src}"]`))return Promise.resolve();
    return new Promise(resolve=>{
      const s=document.createElement('script');
      s.src=`${src}?v=20260913-3`;
      s.onload=resolve;
      s.onerror=resolve;
      document.body.appendChild(s);
    });
  }

  window.addEventListener('DOMContentLoaded',async()=>{
    if(!document.querySelector('link[href^="messenger-enhancements.css"]')){
      const l=document.createElement('link');l.rel='stylesheet';l.href='messenger-enhancements.css?v=20260913-3';document.head.appendChild(l);
    }
    await addScript('messenger-enhancements.js');
    await addScript('messenger-self-filter.js');
    await addScript('messenger-profile-links.js');
  },{once:true});
})();
