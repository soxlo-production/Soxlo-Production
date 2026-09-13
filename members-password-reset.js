(() => {
  const RECOVERY_KEY='soxlo_private_recovery_v1';
  const SESSION_KEY='soxlo_private_session_v1';
  const SUPABASE_URL='https://ovwfqbcxsdfddnfdgopg.supabase.co';
  const SUPABASE_ANON_KEY='sb_publishable_h5KpewMqq8xOyf6VqFymyg_pgQXB99p';
  const RESET_RETURN_URL='https://soxlo-production.github.io/Soxlo-Production/members.html';

  let recovery=null;
  try{recovery=JSON.parse(sessionStorage.getItem(RECOVERY_KEY)||'null')}catch{recovery=null}
  window.SOXLO_PASSWORD_RECOVERY_ACTIVE=!!recovery;

  const $=id=>document.getElementById(id);
  const setMessage=(el,text,type='')=>{if(!el)return;el.textContent=text;el.className='message'+(type?` ${type}`:'');};
  const friendlyError=raw=>{
    const text=String(raw||'Could not complete password recovery.');
    if(/expired|invalid.*token|jwt/i.test(text))return 'This reset link has expired. Request a new password reset link.';
    if(/rate limit|too many requests/i.test(text))return 'Too many attempts. Please wait a little and try again.';
    return text;
  };

  const init=()=>{
    const loginView=$('loginView');
    const appView=$('appView');
    const resetView=$('resetView');
    const loginMessage=$('loginMessage');
    const forgotBtn=$('forgotPasswordBtn');
    const forgotForm=$('forgotForm');
    const forgotEmail=$('forgotEmail');
    const loginEmail=$('email');
    const resetForm=$('resetForm');
    const resetMessage=$('resetMessage');

    forgotBtn?.addEventListener('click',()=>{
      if(!forgotForm)return;
      forgotForm.hidden=!forgotForm.hidden;
      if(!forgotForm.hidden&&forgotEmail){forgotEmail.value=loginEmail?.value||'';forgotEmail.focus();}
      setMessage(loginMessage,'');
    });

    forgotForm?.addEventListener('submit',async e=>{
      e.preventDefault();
      const email=forgotEmail?.value.trim();
      if(!email)return;
      const submit=forgotForm.querySelector('button[type="submit"]');
      if(submit)submit.disabled=true;
      setMessage(loginMessage,'Sending secure reset email…');
      try{
        const r=await fetch(`${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(RESET_RETURN_URL)}`,{
          method:'POST',
          headers:{apikey:SUPABASE_ANON_KEY,'Content-Type':'application/json'},
          body:JSON.stringify({email})
        });
        const data=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(data.error_description||data.msg||data.message||data.error||'Could not send reset email.');
        setMessage(loginMessage,'Reset link sent. Check your email (and spam folder), then tap the SOXLO password reset link.','success');
      }catch(err){setMessage(loginMessage,friendlyError(err?.message),'error');}
      finally{if(submit)submit.disabled=false;}
    });

    if(!recovery)return;
    if(loginView)loginView.hidden=true;
    if(appView)appView.hidden=true;
    if(resetView)resetView.hidden=false;
    const logoutBtn=$('logoutBtn');if(logoutBtn)logoutBtn.hidden=true;

    resetForm?.addEventListener('submit',async e=>{
      e.preventDefault();
      const password=$('newPassword')?.value||'';
      const confirm=$('confirmPassword')?.value||'';
      if(password.length<12){setMessage(resetMessage,'Use at least 12 characters for your new password.','error');return;}
      if(password!==confirm){setMessage(resetMessage,'The two passwords do not match.','error');return;}
      const submit=resetForm.querySelector('button[type="submit"]');
      if(submit)submit.disabled=true;
      setMessage(resetMessage,'Saving your new password…');
      try{
        const r=await fetch(`${SUPABASE_URL}/auth/v1/user`,{
          method:'PUT',
          headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${recovery.access_token}`,'Content-Type':'application/json'},
          body:JSON.stringify({password})
        });
        const data=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(data.error_description||data.msg||data.message||data.error||'Could not change password.');
        sessionStorage.removeItem(RECOVERY_KEY);
        localStorage.removeItem(SESSION_KEY);
        recovery=null;
        window.SOXLO_PASSWORD_RECOVERY_ACTIVE=false;
        resetForm.reset();
        if(resetView)resetView.hidden=true;
        if(loginView)loginView.hidden=false;
        setMessage(loginMessage,'Password changed successfully. Sign in with your new password.','success');
        loginEmail?.focus();
      }catch(err){setMessage(resetMessage,friendlyError(err?.message),'error');}
      finally{if(submit)submit.disabled=false;}
    });
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();