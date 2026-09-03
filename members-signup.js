(() => {
  const loginCard=document.querySelector('#loginView .login-card');
  if(!loginCard||document.getElementById('signupForm'))return;

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
  const form=document.getElementById('signupForm');
  const msg=document.getElementById('signupMessage');
  const setMsg=(text,type='')=>{msg.textContent=text;msg.className='message'+(type?` ${type}`:'')};

  btn.addEventListener('click',()=>{box.hidden=!box.hidden;btn.textContent=box.hidden?'Create member login':'Hide sign-up'});

  form.addEventListener('submit',async e=>{
    e.preventDefault();
    setMsg('Creating member account…');
    try{
      const cfgResp=await fetch('supabase-config.json',{cache:'no-store'});
      const cfg=await cfgResp.json();
      const url=String(cfg.url||'').replace(/\/$/,'');
      const anonKey=String(cfg.anonKey||'');
      if(!url||!anonKey)throw new Error('Private player is not connected to Supabase yet.');
      const email=document.getElementById('signupEmail').value.trim();
      const password=document.getElementById('signupPassword').value;
      const r=await fetch(`${url}/auth/v1/signup`,{
        method:'POST',
        headers:{apikey:anonKey,'Content-Type':'application/json'},
        body:JSON.stringify({email,password})
      });
      const data=await r.json().catch(()=>({}));
      if(!r.ok){
        const raw=String(data.msg||data.error_description||data.message||'Could not create account.');
        if(/maximum 2|membership is full|database error/i.test(raw))throw new Error('Membership is full. The maximum of 2 login accounts has been reached.');
        throw new Error(raw);
      }
      form.reset();
      setMsg('Account created. Check your email if confirmation is required, then sign in above.','success');
    }catch(err){setMsg(err.message||'Could not create account.','error')}
  });
})();