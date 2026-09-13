(()=>{
  'use strict';
  const SUPABASE_URL='https://ovwfqbcxsdfddnfdgopg.supabase.co';
  const SUPABASE_KEY='sb_publishable_h5KpewMqq8xOyf6VqFymyg_pgQXB99p';
  const SESSION_KEY='soxlo_messenger_session_v3';
  const $=id=>document.getElementById(id);
  let session=null,targetId=null,isOwner=false,profile=null;

  function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function initials(name='?'){return String(name).trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()||'').join('')||'?'}
  function loadSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||sessionStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
  async function refresh(){
    if(!session?.refresh_token)throw new Error('Session expired.');
    const r=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});
    const d=await r.json();if(!r.ok)throw new Error('Session expired.');d.expires_at=Math.floor(Date.now()/1000)+Number(d.expires_in||3600);session=d;localStorage.setItem(SESSION_KEY,JSON.stringify(d));return d;
  }
  async function authHeaders(extra={}){
    if(!session?.access_token)throw new Error('Sign in to Messenger first.');
    if(!session.expires_at||Date.now()/1000>Number(session.expires_at)-45)await refresh();
    return{apikey:SUPABASE_KEY,Authorization:`Bearer ${session.access_token}`,...extra};
  }
  async function api(path,options={}){return fetch(`${SUPABASE_URL}${path}`,{...options,headers:await authHeaders(options.headers||{}),cache:'no-store',credentials:'omit'})}
  function setAvatar(data,name){const el=$('profileAvatar');if(data&&/^data:image\/(jpeg|png|webp);base64,/i.test(data))el.innerHTML=`<img src="${esc(data)}" alt="">`;else el.textContent=initials(name)}
  function msg(text,type=''){const el=$('profileMessage');el.textContent=text||'';el.className='message '+type}

  async function loadProfile(){
    const r=await api(`/rest/v1/messenger_profiles?select=id,display_name,bio,avatar_data&id=eq.${encodeURIComponent(targetId)}&limit=1`);if(!r.ok)throw new Error('Could not load profile.');
    profile=(await r.json())?.[0];if(!profile)throw new Error('Member profile not found.');
    $('profileName').textContent=profile.display_name;$('profileBio').textContent=profile.bio||'No bio yet.';setAvatar(profile.avatar_data,profile.display_name);
    if(isOwner){$('editSection').hidden=false;$('postForm').hidden=false;$('nameInput').value=profile.display_name;$('bioInput').value=profile.bio||''}
  }

  async function saveProfile(){
    const display_name=$('nameInput').value.trim().slice(0,40),bio=$('bioInput').value.trim().slice(0,300);
    if(!display_name)return msg('Display name is required.','error');
    const r=await api(`/rest/v1/messenger_profiles?id=eq.${encodeURIComponent(session.user.id)}`,{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({display_name,bio})});
    if(!r.ok)return msg('Could not save profile.','error');
    profile=(await r.json())?.[0]||{...profile,display_name,bio};$('profileName').textContent=display_name;$('profileBio').textContent=bio||'No bio yet.';setAvatar(profile.avatar_data,display_name);msg('Profile saved.','success');
  }

  function readPhoto(file){
    if(!/^image\/(jpeg|png|webp)$/i.test(file.type))return msg('Choose a JPG, PNG, or WebP image.','error');
    if(file.size>6*1024*1024)return msg('Choose an image under 6 MB.','error');
    const fr=new FileReader();fr.onload=()=>{const img=new Image();img.onload=async()=>{const c=document.createElement('canvas'),size=256;c.width=size;c.height=size;const x=c.getContext('2d');const scale=Math.max(size/img.width,size/img.height),w=img.width*scale,h=img.height*scale;x.drawImage(img,(size-w)/2,(size-h)/2,w,h);await savePhoto(c.toDataURL('image/jpeg',.82))};img.src=fr.result};fr.readAsDataURL(file)
  }
  async function savePhoto(data){
    const r=await api(`/rest/v1/messenger_profiles?id=eq.${encodeURIComponent(session.user.id)}`,{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({avatar_data:data})});
    if(!r.ok)return msg('Could not save profile photo.','error');profile={...profile,...((await r.json())?.[0]||{}),avatar_data:data};setAvatar(data,profile.display_name);msg(data?'Profile photo saved.':'Profile photo removed.','success');
  }

  async function loadPosts(){
    const r=await api(`/rest/v1/messenger_daily_posts?select=id,user_id,body,created_at&user_id=eq.${encodeURIComponent(targetId)}&order=created_at.desc&limit=100`);if(!r.ok)throw new Error('Could not load posts.');
    const rows=await r.json();const box=$('postsList');if(!rows.length){box.innerHTML='<div class="empty">No daily posts yet.</div>';return}
    box.innerHTML=rows.map(p=>`<article class="post"><div class="post-body">${esc(p.body)}</div><div class="post-meta"><span>${new Date(p.created_at).toLocaleString([], {dateStyle:'medium',timeStyle:'short'})}</span>${isOwner?`<button class="delete-post" data-delete="${esc(p.id)}" type="button">Delete</button>`:''}</div></article>`).join('');
    box.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>deletePost(b.dataset.delete)));
  }
  async function createPost(e){
    e.preventDefault();const body=$('postInput').value.trim();if(!body)return;
    const r=await api('/rest/v1/messenger_daily_posts',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({user_id:session.user.id,body})});
    if(!r.ok)return;$('postInput').value='';$('postCount').textContent='0 / 1000';await loadPosts();
  }
  async function deletePost(id){const r=await api(`/rest/v1/messenger_daily_posts?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(session.user.id)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});if(r.ok)await loadPosts()}

  async function boot(){
    try{
      session=loadSession();if(!session?.user?.id)throw new Error('Please sign in to SOXLO Messenger first.');
      targetId=new URLSearchParams(location.search).get('id')||session.user.id;isOwner=targetId===session.user.id;
      await loadProfile();await loadPosts();$('loadingCard').hidden=true;$('profileCard').hidden=false;
      if(isOwner){$('saveProfileBtn').addEventListener('click',saveProfile);$('photoInput').addEventListener('change',e=>{const f=e.target.files?.[0];if(f)readPhoto(f)});$('removePhotoBtn').addEventListener('click',()=>savePhoto(null));$('postForm').addEventListener('submit',createPost);$('postInput').addEventListener('input',e=>$('postCount').textContent=`${e.target.value.length} / 1000`)}
    }catch(e){$('loadingCard').textContent=e.message||'Could not open profile.'}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();