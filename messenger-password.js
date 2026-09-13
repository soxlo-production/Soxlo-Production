(()=>{
  const SUPABASE_URL='https://ovwfqbcxsdfddnfdgopg.supabase.co';
  const SUPABASE_KEY='sb_publishable_h5KpewMqq8xOyf6VqFymyg_pgQXB99p';
  const SESSION_KEY='soxlo_messenger_session_v3';
  const $=id=>document.getElementById(id);
  const setMsg=(text,type='')=>{const el=$('passwordChangeMessage');if(!el)return;el.textContent=text;el.className='message'+(type?` ${type}`:'');};

  function readSession(){
    try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null')}catch{return null}
  }
  function saveSession(s){sessionStorage.setItem(SESSION_KEY,JSON.stringify(s))}
  async function currentSession(){
    let s=readSession();
    if(!s?.access_token)throw new Error('Your Messenger session is not active. Sign in to Messenger again first.');
    const expired=!s.expires_at||Date.now()/1000>Number(s.expires_at)-45;
    if(!expired)return s;
    if(!s.refresh_token)throw new Error('Your Messenger session has expired. Sign in again first.');
    const r=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{
      method:'POST',headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({refresh_token:s.refresh_token}),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(data.msg||data.error_description||'Your Messenger session has expired. Sign in again first.');
    data.expires_at=Math.floor(Date.now()/1000)+Number(data.expires_in||3600);saveSession(data);return data;
  }
  function close(){const modal=$('passwordChangeModal');if(modal)modal.hidden=true;setMsg('');$('passwordChangeForm')?.reset();}

  window.addEventListener('DOMContentLoaded',()=>{
    const openBtn=$('changePasswordBtn'),closeBtn=$('closePasswordChangeBtn'),modal=$('passwordChangeModal'),form=$('passwordChangeForm');
    openBtn?.addEventListener('click',()=>{if(modal){modal.hidden=false;$('newAccountPassword')?.focus();}});
    closeBtn?.addEventListener('click',close);
    modal?.addEventListener('click',e=>{if(e.target===modal)close();});
    form?.addEventListener('submit',async e=>{
      e.preventDefault();
      const password=$('newAccountPassword')?.value||'';
      const confirm=$('confirmAccountPassword')?.value||'';
      if(password.length<12){setMsg('Use at least 12 characters.','error');return;}
      if(password!==confirm){setMsg('The two passwords do not match.','error');return;}
      const submit=form.querySelector('button[type="submit"]');if(submit)submit.disabled=true;
      setMsg('Changing your SOXLO password…');
      try{
        const s=await currentSession();
        const r=await fetch(`${SUPABASE_URL}/auth/v1/user`,{
          method:'PUT',
          headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json'},
          body:JSON.stringify({password}),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'
        });
        const data=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(data.msg||data.error_description||data.message||'Could not change password.');
        form.reset();
        setMsg('Password changed. You can now use this new password on the SOXLO VIP login.','success');
      }catch(err){setMsg(err?.message||'Could not change password.','error');}
      finally{if(submit)submit.disabled=false;}
    });
  });
})();
