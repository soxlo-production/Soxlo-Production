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
})();
