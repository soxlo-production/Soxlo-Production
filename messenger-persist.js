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

  window.addEventListener('DOMContentLoaded',()=>{
    if(!document.querySelector('link[href^="messenger-enhancements.css"]')){
      const l=document.createElement('link');l.rel='stylesheet';l.href='messenger-enhancements.css?v=20260913-2';document.head.appendChild(l);
    }
    if(!document.querySelector('script[src^="messenger-enhancements.js"]')){
      const s=document.createElement('script');s.src='messenger-enhancements.js?v=20260913-2';document.body.appendChild(s);
    }
  },{once:true});
})();
