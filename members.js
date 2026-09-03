const BUCKET='special-songs';
const SESSION_KEY='soxlo_private_session_v1';
const SUPABASE_URL='https://ovwfqbcxsdfddnfdgopg.supabase.co';
const SUPABASE_ANON_KEY='sb_publishable_h5KpewMqq8xOyf6VqFymyg_pgQXB99p';
let cfg=null,session=null,isAdmin=false,tracks=[],currentId=null,deferredInstallPrompt=null;

const $=id=>document.getElementById(id);
const loginView=$('loginView'),appView=$('appView'),loginForm=$('loginForm'),loginMessage=$('loginMessage'),logoutBtn=$('logoutBtn'),trackList=$('trackList'),trackCount=$('trackCount'),libraryMessage=$('libraryMessage'),audio=$('audio'),trackTitle=$('trackTitle'),nowTitle=$('nowTitle'),adminPanel=$('adminPanel'),uploadForm=$('uploadForm'),uploadMessage=$('uploadMessage'),refreshBtn=$('refreshBtn'),installBtn=$('installBtn');
const mainPlayBtn=$('mainPlayBtn'),prevBtn=$('prevBtn'),nextBtn=$('nextBtn'),seekBar=$('seekBar'),currentTimeEl=$('currentTime'),durationEl=$('duration'),playerCard=$('playerCard');

function message(el,text,type=''){if(!el)return;el.textContent=text;el.className='message'+(type?` ${type}`:'')}
function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function encodePath(path){return String(path).split('/').map(encodeURIComponent).join('/')}
function fmtTime(value){const n=Number(value);if(!Number.isFinite(n)||n<0)return'0:00';const m=Math.floor(n/60),s=Math.floor(n%60);return`${m}:${String(s).padStart(2,'0')}`}

async function loadConfig(){cfg={url:SUPABASE_URL,anonKey:SUPABASE_ANON_KEY}}
function saveSession(s){session=s;localStorage.setItem(SESSION_KEY,JSON.stringify(s))}
function clearSession(){session=null;isAdmin=false;localStorage.removeItem(SESSION_KEY)}
function loadSavedSession(){try{session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{session=null}}
function tokenExpired(){if(!session?.expires_at)return false;return Date.now()/1000>Number(session.expires_at)-45}

async function refreshSession(){
  if(!session?.refresh_token)throw new Error('Session expired. Please sign in again.');
  const r=await fetch(`${cfg.url}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:cfg.anonKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});
  if(!r.ok){clearSession();throw new Error('Session expired. Please sign in again.')}
  const data=await r.json();data.expires_at=Math.floor(Date.now()/1000)+Number(data.expires_in||3600);saveSession(data);return data;
}

async function authHeaders(){if(tokenExpired())await refreshSession();return{apikey:cfg.anonKey,Authorization:`Bearer ${session.access_token}`}}
async function api(url,options={}){
  const headers={...(await authHeaders()),...(options.headers||{})};
  let r=await fetch(url,{...options,headers});
  if(r.status===401&&session?.refresh_token){await refreshSession();headers.Authorization=`Bearer ${session.access_token}`;r=await fetch(url,{...options,headers})}
  return r;
}

async function signIn(email,password){
  const r=await fetch(`${cfg.url}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:cfg.anonKey,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(data.error_description||data.msg||'Could not sign in.');
  data.expires_at=Math.floor(Date.now()/1000)+Number(data.expires_in||3600);saveSession(data);
}

async function getRole(){
  const userId=session?.user?.id;if(!userId)return'member';
  const r=await api(`${cfg.url}/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(userId)}&limit=1`);
  if(!r.ok)return'member';const rows=await r.json();return rows?.[0]?.role||'member';
}

async function getSignedUrl(path,expiresIn=3600){
  const r=await api(`${cfg.url}/storage/v1/object/sign/${BUCKET}/${encodePath(path)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expiresIn})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(data.message||data.error||'Could not open this song.');
  const signed=data.signedURL||data.signedUrl;
  if(!signed)throw new Error('No signed media link was returned.');
  if(/^https?:\/\//i.test(signed))return signed;
  if(signed.startsWith('/storage/v1/'))return`${cfg.url}${signed}`;
  if(signed.startsWith('/object/'))return`${cfg.url}/storage/v1${signed}`;
  return`${cfg.url}/storage/v1/${signed.replace(/^\/+/, '')}`;
}

async function loadTracks(silent=false){
  if(!silent)message(libraryMessage,'Updating private library…');
  const r=await api(`${cfg.url}/rest/v1/special_tracks?select=id,title,storage_path,created_at&order=created_at.desc`);
  if(!r.ok){message(libraryMessage,'Could not load the private library.','error');return}
  tracks=await r.json();renderTracks();message(libraryMessage,tracks.length?'VIP library is up to date.':'No special songs have been published yet.',tracks.length?'success':'');
}

function renderTracks(){
  trackCount.textContent=`${tracks.length} track${tracks.length===1?'':'s'}`;
  trackList.innerHTML=tracks.map((t,i)=>{
    const active=String(t.id)===String(currentId),icon=active&&!audio.paused?'❚❚':'▶';
    return`<div class="track ${active?'active':''}" data-id="${esc(t.id)}"><div class="track-num">${String(i+1).padStart(2,'0')}</div><div class="track-copy"><div class="track-title">${esc(t.title)}</div><div class="track-meta">SOXLO VIP Private Release</div></div><button class="play" type="button" aria-label="Play ${esc(t.title)}" data-play="${esc(t.id)}">${icon}</button><button class="download" type="button" data-download="${esc(t.id)}">Download ↓</button></div>`
  }).join('');
  trackList.querySelectorAll('[data-play]').forEach(btn=>btn.addEventListener('click',()=>playTrack(btn.dataset.play,true)));
  trackList.querySelectorAll('[data-download]').forEach(btn=>btn.addEventListener('click',()=>downloadTrack(btn.dataset.download,btn)));
}

async function playTrack(id,toggleSame=false){
  const t=tracks.find(x=>String(x.id)===String(id));if(!t)return;
  if(toggleSame&&String(currentId)===String(t.id)&&audio.src){if(audio.paused)await audio.play();else audio.pause();return}
  try{
    message(libraryMessage,'Opening secure VIP audio…');
    const url=await getSignedUrl(t.storage_path,3600);
    currentId=t.id;trackTitle.textContent=t.title;nowTitle.textContent=t.title;
    audio.src=url;audio.load();renderTracks();
    await audio.play();message(libraryMessage,'Playing secure private release.','success');
  }catch(e){message(libraryMessage,e.message||'Could not play this song.','error')}
}

async function playAdjacent(delta){
  if(!tracks.length)return;
  let index=tracks.findIndex(t=>String(t.id)===String(currentId));
  if(index<0)index=delta>0?-1:0;
  const next=(index+delta+tracks.length)%tracks.length;
  await playTrack(tracks[next].id,false);
}

async function downloadTrack(id,btn){
  const t=tracks.find(x=>String(x.id)===String(id));if(!t)return;
  const old=btn.textContent;btn.disabled=true;btn.textContent='Preparing…';
  try{const url=await getSignedUrl(t.storage_path,300);const a=document.createElement('a');a.href=url;a.download=t.title;a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove()}catch(e){message(libraryMessage,e.message,'error')}finally{btn.disabled=false;btn.textContent=old}
}

async function uploadSong(){
  const title=$('songTitle').value.trim(),file=$('songFile').files[0];if(!title||!file)return;
  const safe=(file.name||'song').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'');
  const path=`${Date.now()}-${crypto.randomUUID?.()||Math.random().toString(36).slice(2)}-${safe}`;
  message(uploadMessage,'Uploading private song…');
  const upload=await api(`${cfg.url}/storage/v1/object/${BUCKET}/${encodePath(path)}`,{method:'POST',headers:{'Content-Type':file.type||'audio/mpeg','x-upsert':'false'},body:file});
  if(!upload.ok){const e=await upload.json().catch(()=>({}));throw new Error(e.message||e.error||'Upload failed.')}
  const add=await api(`${cfg.url}/rest/v1/special_tracks`,{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({title,storage_path:path,uploaded_by:session.user.id})});
  if(!add.ok){const e=await add.json().catch(()=>({}));throw new Error(e.message||e.details||'Song uploaded, but catalog publishing failed.')}
  uploadForm.reset();message(uploadMessage,'Published to the VIP playlist.','success');await loadTracks(true);
}

function showLogin(){loginView.hidden=false;appView.hidden=true;logoutBtn.hidden=true}
async function showApp(){loginView.hidden=true;appView.hidden=false;logoutBtn.hidden=false;isAdmin=(await getRole())==='admin';adminPanel.hidden=!isAdmin;await loadTracks()}

loginForm.addEventListener('submit',async e=>{e.preventDefault();message(loginMessage,'Signing in…');try{await signIn($('email').value.trim(),$('password').value);message(loginMessage,'');await showApp()}catch(err){message(loginMessage,err.message,'error')}});
logoutBtn.addEventListener('click',()=>{audio.pause();audio.removeAttribute('src');audio.load();currentId=null;clearSession();showLogin()});
refreshBtn.addEventListener('click',()=>loadTracks());
uploadForm.addEventListener('submit',async e=>{e.preventDefault();if(!isAdmin)return;try{await uploadSong()}catch(err){message(uploadMessage,err.message,'error')}});

mainPlayBtn?.addEventListener('click',async()=>{if(!currentId){if(tracks[0])await playTrack(tracks[0].id)}else if(audio.paused){try{await audio.play()}catch(e){message(libraryMessage,e.message,'error')}}else audio.pause()});
prevBtn?.addEventListener('click',()=>playAdjacent(-1));
nextBtn?.addEventListener('click',()=>playAdjacent(1));
seekBar?.addEventListener('input',()=>{if(Number.isFinite(audio.duration)&&audio.duration>0)audio.currentTime=(Number(seekBar.value)/100)*audio.duration});

audio.addEventListener('loadedmetadata',()=>{durationEl.textContent=fmtTime(audio.duration);seekBar.disabled=false});
audio.addEventListener('durationchange',()=>{durationEl.textContent=fmtTime(audio.duration)});
audio.addEventListener('timeupdate',()=>{currentTimeEl.textContent=fmtTime(audio.currentTime);if(Number.isFinite(audio.duration)&&audio.duration>0)seekBar.value=String((audio.currentTime/audio.duration)*100)});
audio.addEventListener('play',()=>{mainPlayBtn.textContent='❚❚';mainPlayBtn.setAttribute('aria-label','Pause');playerCard?.classList.add('is-playing');renderTracks()});
audio.addEventListener('pause',()=>{mainPlayBtn.textContent='▶';mainPlayBtn.setAttribute('aria-label','Play');playerCard?.classList.remove('is-playing');renderTracks()});
audio.addEventListener('ended',()=>{playerCard?.classList.remove('is-playing');if(tracks.length>1)playAdjacent(1)});
audio.addEventListener('error',()=>{playerCard?.classList.remove('is-playing');message(libraryMessage,'This private audio could not be loaded. Refresh the page and try again.','error')});

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;installBtn.hidden=false});
installBtn.addEventListener('click',async()=>{if(deferredInstallPrompt){deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;installBtn.hidden=true}else alert('Open your browser menu and choose “Install app” or “Add to Home screen”.')});
window.addEventListener('appinstalled',()=>installBtn.hidden=true);

if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(r=>r.update()).catch(()=>{}));
setInterval(()=>{if(session&&!document.hidden)loadTracks(true).catch(()=>{})},5*60*1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&session)loadTracks(true).catch(()=>{})});

(async()=>{try{await loadConfig();loadSavedSession();if(session){try{if(tokenExpired())await refreshSession();await showApp()}catch{clearSession();showLogin()}}else showLogin()}catch(e){showLogin();message(loginMessage,e.message,'error')}})();