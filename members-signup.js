(() => {
  const SESSION_KEY='soxlo_private_session_v1';
  const SUPABASE_URL='https://ovwfqbcxsdfddnfdgopg.supabase.co';
  const SUPABASE_ANON_KEY='sb_publishable_h5KpewMqq8xOyf6VqFymyg_pgQXB99p';
  const loginCard=document.querySelector('#loginView .login-card');
  if(!loginCard)return;
  const form=document.getElementById('signupForm');
  const msg=document.getElementById('signupMessage');
  if(!form||!msg)return;
  const setMsg=(text,type='')=>{msg.textContent=text;msg.className='message'+(type?` ${type}`:'');};
  const friendlyError=raw=>{
    const text=String(raw||'Could not create account.');
    if(/maximum 2|membership is full|database error/i.test(text))return 'Membership is full. The maximum of 2 login accounts has been reached.';
    if(/already registered|user already exists/i.test(text))return 'That email already has a membership. Use the login box above.';
    if(/rate limit|too many requests/i.test(text))return 'Too many attempts. Please try again a little later.';
    return text;
  };
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const submit=form.querySelector('button[type="submit"]');
    if(submit)submit.disabled=true;
    setMsg('Creating member account…');
    try{
      const email=document.getElementById('signupEmail').value.trim();
      const password=document.getElementById('signupPassword').value;
      const confirmUrl='https://soxlo-production.github.io/Soxlo-Production/members.html';
      const r=await fetch(`${SUPABASE_URL}/auth/v1/signup?redirect_to=${encodeURIComponent(confirmUrl)}`,{
        method:'POST',headers:{apikey:SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})
      });
      const data=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(friendlyError(data.msg||data.error_description||data.message||data.error));
      if(data.access_token&&data.user){
        data.expires_at=Number(data.expires_at||0)||Math.floor(Date.now()/1000)+Number(data.expires_in||3600);
        localStorage.setItem(SESSION_KEY,JSON.stringify(data));
        setMsg('Membership created. Opening your Private Player…','success');
        location.reload();return;
      }
      const loginEmail=document.getElementById('email');if(loginEmail)loginEmail.value=email;
      form.reset();setMsg('Membership created. Check your email and tap the confirmation link.','success');
    }catch(err){setMsg(friendlyError(err?.message),'error');}
    finally{if(submit)submit.disabled=false;}
  });
})();