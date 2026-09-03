(() => {
  const SESSION_KEY='soxlo_private_session_v1';
  const NOTICE_KEY='soxlo_private_auth_notice_v1';
  const SUPABASE_URL='https://ovwfqbcxsdfddnfdgopg.supabase.co';
  const SUPABASE_ANON_KEY='sb_publishable_h5KpewMqq8xOyf6VqFymyg_pgQXB99p';

  const cleanUrl=()=>{
    const clean=location.pathname+location.search;
    history.replaceState({},document.title,clean);
  };

  const showStoredNotice=()=>{
    const notice=sessionStorage.getItem(NOTICE_KEY);
    if(!notice)return;
    sessionStorage.removeItem(NOTICE_KEY);
    const show=()=>{
      const el=document.getElementById('loginMessage');
      if(!el)return;
      el.textContent=notice;
      el.className='message error';
    };
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});
    else show();
  };

  const params=new URLSearchParams(location.hash.replace(/^#/,''));
  const accessToken=params.get('access_token');
  const refreshToken=params.get('refresh_token');
  const authError=params.get('error_description')||params.get('error');

  if(authError){
    sessionStorage.setItem(NOTICE_KEY,decodeURIComponent(authError));
    cleanUrl();
    showStoredNotice();
    return;
  }

  if(!accessToken){
    showStoredNotice();
    return;
  }

  (async()=>{
    try{
      const userResp=await fetch(`${SUPABASE_URL}/auth/v1/user`,{
        headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${accessToken}`}
      });
      const user=await userResp.json().catch(()=>({}));
      if(!userResp.ok||!user?.id)throw new Error('The confirmation link could not be completed. Please sign in again.');

      const expiresIn=Number(params.get('expires_in')||3600);
      const expiresAt=Number(params.get('expires_at')||0)||Math.floor(Date.now()/1000)+expiresIn;
      const session={access_token:accessToken,refresh_token:refreshToken||'',expires_in:expiresIn,expires_at:expiresAt,token_type:params.get('token_type')||'bearer',user};
      localStorage.setItem(SESSION_KEY,JSON.stringify(session));
      cleanUrl();
      location.reload();
    }catch(err){
      sessionStorage.setItem(NOTICE_KEY,err?.message||'Could not complete membership confirmation.');
      cleanUrl();
      location.reload();
    }
  })();
})();