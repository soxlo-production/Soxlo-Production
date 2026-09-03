(() => {
  const SESSION_KEY='soxlo_private_session_v1';
  const loginCard=document.querySelector('#loginView .login-card');
  if(!loginCard)return;

  let form=document.getElementById('signupForm');
  let msg=document.getElementById('signupMessage');

  if(!form){
    const wrap=document.createElement('div');
    wrap.style.marginTop='22px';
    wrap.style.paddingTop='20px';
    wrap.style.borderTop='1px solid #5c4317';
    wrap.innerHTML=`
      <button id="showSignupBtn" class="ghost" type="button">Create member login</button>
      <div id="signupBox" hidden style="margin-top:16px">
        <p class="eyebrow">LIMITED MEMBERSHIP</p>
        <h2 style="margin:6px 0 8px">Create Login</h2>
        <p class="muted">Only 2 SOXLO Private Player accounts can exist.</p>
        <form id="signupForm">
          <label>Email<input id="signupEmail" type="email" autocomplete="email" required></label>
          <label>Password<input id="signupPassword" type="password" autocomplete="new-password" minlength="6" required></label>
          <button class="gold-btn" type="submit">Create Member Account</button>
        </form>
        <p id="signupMessage" class="message" aria-live="polite"></p>
      </div>`;
    loginCard.appendChild(wrap);

    const btn=document.getElementById('showSignupBtn');
    const box=document.getElementById('signupBox');
    if(btn&&box){
      btn.addEventListener('click',()=>{
        box.hidden=!box.hidden;
        btn.textContent=box.hidden?'Create member login':'Hide sign-up';
      });
    }

    form=document.getElementById('signupForm');
    msg=document.getElementById('signupMessage');
  }

  if(!form||!msg)return;

  const setMsg=(text,type='')=>{
    msg.textContent=text;
    msg.className='message'+(type?` ${type}`:'');
  };

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
      const cfgResp=await fetch('supabase-config.json',{cache:'no-store'});
      if(!cfgResp.ok)throw new Error('Private player configuration is missing.');

      const cfg=await cfgResp.json();
      const url=String(cfg.url||'').replace(/\/$/,'');
      const anonKey=String(cfg.anonKey||'');
      if(!url||!anonKey)throw new Error('Private player is not connected to Supabase yet.');

      const email=document.getElementById('signupEmail').value.trim();
      const password=document.getElementById('signupPassword').value;
      const confirmUrl=new URL('members.html',location.href).href.split('#')[0];

      const r=await fetch(`${url}/auth/v1/signup?redirect_to=${encodeURIComponent(confirmUrl)}`,{
        method:'POST',
        headers:{apikey:anonKey,'Content-Type':'application/json'},
        body:JSON.stringify({email,password})
      });

      const data=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(friendlyError(data.msg||data.error_description||data.message||data.error));

      if(data.access_token&&data.user){
        data.expires_at=Number(data.expires_at||0)||Math.floor(Date.now()/1000)+Number(data.expires_in||3600);
        localStorage.setItem(SESSION_KEY,JSON.stringify(data));
        setMsg('Membership created. Opening your Private Player…','success');
        location.reload();
        return;
      }

      const loginEmail=document.getElementById('email');
      if(loginEmail)loginEmail.value=email;
      form.reset();
      setMsg('Membership created. Check your email and tap the confirmation link. It will return you to the Private Player automatically.','success');
    }catch(err){
      setMsg(friendlyError(err?.message),'error');
    }finally{
      if(submit)submit.disabled=false;
    }
  });
})();