'use strict';

const SUPABASE_URL='https://ovwfqbcxsdfddnfdgopg.supabase.co';
const SUPABASE_KEY='sb_publishable_h5KpewMqq8xOyf6VqFymyg_pgQXB99p';
const SESSION_KEY='soxlo_private_session_v1';
const PENDING_KEY='soxlo_pending_generation_v1';
const DRAFT_KEY='soxlo_studio_draft_v2';

const $=id=>document.getElementById(id);
const refs={
  title:$('songTitle'), prompt:$('songPrompt'), genre:$('genre'), voice:$('voice'), lyrics:$('lyrics'),
  artist:$('artist'), producer:$('producer'), songwriter:$('songwriter'), composer:$('composer'), label:$('label'), year:$('year'), copyright:$('copyright'),
  previewTitle:$('previewTitle'), previewArtist:$('previewArtist'), status:$('status'), loginStatus:$('loginStatus'), engineStatus:$('engineStatus'),
  createBtn:$('createBtn')
};
const styleButtons=[$('topStyleBtn'),$('generateStyleBtn')].filter(Boolean);
const lyricButtons=[$('topLyricsBtn'),$('generateLyricsBtn')].filter(Boolean);
let engineState={checked:false,ok:true,code:'UNKNOWN',message:'Music engine has not been checked yet.'};

function setMessage(text,type=''){
  refs.status.textContent=text;
  refs.status.className='message'+(type?` ${type}`:'');
}
function setCard(el,title,text,type=''){
  if(!el)return;
  el.className='status-card'+(type?` ${type}`:'');
  el.innerHTML=`<strong>${escapeHtml(title)}</strong><span>${escapeHtml(text)}</span>`;
}
function escapeHtml(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function uuid(){
  if(globalThis.crypto?.randomUUID)return crypto.randomUUID();
  const a=crypto.getRandomValues(new Uint8Array(16));
  a[6]=(a[6]&15)|64;a[8]=(a[8]&63)|128;
  const h=[...a].map(x=>x.toString(16).padStart(2,'0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
function getSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
function saveSession(s){localStorage.setItem(SESSION_KEY,JSON.stringify(s));return s}
function expired(s){return !!s?.expires_at&&Date.now()/1000>Number(s.expires_at)-45}
async function refreshSession(s){
  if(!s?.refresh_token)throw new Error('VIP session expired. Sign in again.');
  const r=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refresh_token})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok){localStorage.removeItem(SESSION_KEY);throw new Error('VIP session expired. Sign in again.');}
  d.expires_at=Math.floor(Date.now()/1000)+Number(d.expires_in||3600);
  return saveSession(d);
}
async function currentSession(){let s=getSession();if(s&&expired(s))s=await refreshSession(s);return s}

function updatePreview(){refs.previewTitle.textContent=refs.title.value.trim()||'Untitled Song';refs.previewArtist.textContent=refs.artist.value.trim()||'SOXLO Production';saveDraft();}
function saveDraft(){
  const ids=['songTitle','songPrompt','genre','voice','lyrics','artist','producer','songwriter','composer','label','year','copyright','masterTarget','audioExport'];
  const draft={}; ids.forEach(id=>{const el=$(id);if(el)draft[id]=el.value});
  try{localStorage.setItem(DRAFT_KEY,JSON.stringify(draft))}catch{}
}
function restoreDraft(){
  try{const d=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');if(!d)return;Object.entries(d).forEach(([id,v])=>{const el=$(id);if(el&&typeof v==='string')el.value=v})}catch{}
  updatePreview();
}

function themeWords(text){return [...new Set(String(text||'').toLowerCase().replace(/[^a-z0-9æøå' -]/gi,' ').split(/\s+/).filter(w=>w.length>4))].slice(0,6)}
function localStyle(){
  const title=refs.title.value.trim()||'Untitled Song';
  const description=refs.prompt.value.trim()||'an original, emotionally engaging song with a memorable hook';
  const voice=refs.voice.value.trim()||'expressive lead vocal, intimate verses and a strong emotional chorus';
  const all=`${title} ${description} ${voice}`.toLowerCase();
  let genre='contemporary cinematic R&B / pop'; let bpm='92–108 BPM'; let groove='tight modern groove with punchy drums and warm bass';
  if(/deep house|house|club|dance|edm/.test(all)){genre='luxurious deep house / modern dance';bpm='122–126 BPM';groove='steady four-on-the-floor kick, rolling sub-bass, crisp offbeat percussion and hypnotic club momentum'}
  else if(/reggae|island/.test(all)){genre='warm contemporary reggae / R&B crossover';bpm='84–98 BPM';groove='laid-back one-drop influenced pocket, rounded bass, syncopated guitar and soft percussion'}
  else if(/rock|guitar/.test(all)){genre='modern emotional pop-rock';bpm='96–118 BPM';groove='live-feel drums, driving bass and expressive guitar dynamics'}
  else if(/ballad|piano|slow/.test(all)){genre='cinematic R&B / pop ballad';bpm='68–82 BPM';groove='spacious piano-led pulse, restrained drums and gradual emotional lift'}
  else if(/rap|hip hop|trap/.test(all)){genre='dark melodic hip-hop / R&B';bpm='76–94 BPM';groove='deep 808 bass, crisp hats, spacious kick pattern and cinematic rhythmic tension'}
  return `${genre}, ${bpm}. Theme: ${description}. ${voice}. ${groove}. Build a polished release-ready arrangement with a distinctive opening hook, clear intro / verse / pre-chorus / chorus contrast, memorable topline space, tasteful ear-candy transitions, atmospheric layers and a wide clean stereo image. Keep the low end controlled, percussion detailed, vocals forward and natural, choruses larger than the verses, and repeated sections subtly varied. Avoid muddy frequencies, harsh highs and generic stock sounds. Finish with professional streaming-ready mastering, punch, depth, clarity and emotional impact.`;
}
function localLyrics(){
  const t=refs.title.value.trim()||'This Moment';
  const idea=refs.prompt.value.trim()||'two people holding onto something real while the world keeps changing around them';
  const words=themeWords(idea); const a=words[0]||'midnight',b=words[1]||'heartbeat',c=words[2]||'memory';
  return `[Intro]\n(soft, close-mic)\n${t}...\nI can feel the whole room changing tonight\n\n[Verse 1]\nI was moving through the ${a}, carrying too much on my mind\nThen you looked at me like somehow you could read between the lines\nEvery road I thought was ending started turning back around\nNow the ${b} in my chest is louder than the city sound\n\n[Pre-Chorus]\nNo more waiting for a sign\nNo more wasting borrowed time\nIf the world keeps moving faster\nStay right here and make this moment mine\n\n[Chorus]\n${t}, stay with me now\nWe came too far to turn this feeling down\nWhen the lights go low and the noise disappears\nYou're the one thing I still want near\n${t}, don't let go tonight\nTurn every broken piece into a little light\nWhatever tomorrow is gonna put us through\nRight now, right here, I choose you\n\n[Verse 2]\n${idea}\nWe carried every ${c}, every scar we couldn't hide\nBut the truth keeps getting stronger every time you're by my side\nNo perfect words could ever hold the weight of what we've known\nSo I let the music say it: with you I finally feel at home\n\n[Pre-Chorus]\nNo more waiting for a sign\nNo more wasting borrowed time\nIf the world keeps moving faster\nStay right here and make this moment mine\n\n[Chorus]\n${t}, stay with me now\nWe came too far to turn this feeling down\nWhen the lights go low and the noise disappears\nYou're the one thing I still want near\n${t}, don't let go tonight\nTurn every broken piece into a little light\nWhatever tomorrow is gonna put us through\nRight now, right here, I choose you\n\n[Bridge]\n(strip back, emotional lift)\nLet the silence breathe between us\nLet the truth come through the sound\nWe survived the hardest seasons\nAnd I'm still choosing you right now\n\n[Final Chorus]\n${t}, stay with me now\nMake it bigger, let the whole room feel it now\nThrough the highs and lows, through every unknown road\nYou're the one place my restless heart still knows\n${t}, don't let go tonight\nLet the final chorus open up the sky\nWhatever tomorrow is gonna put us through\nRight now, right here, I choose you\n\n[Outro]\n(soft, intimate)\n${t}...\nI choose you.`;
}

function busy(mode,on){
  const list=mode==='style'?styleButtons:lyricButtons;
  list.forEach((b,i)=>{if(!b)return;b.disabled=on;b.textContent=on?(mode==='style'?'GENERATING…':'WRITING…'):(i===0?(mode==='style'?'GENERATE STYLE PROMPT':'GENERATE LYRICS'):(mode==='style'?'GENERATE STYLE ✦':'GENERATE LYRICS ✦'))});
}
async function serverText(mode){
  const s=await currentSession().catch(()=>null); if(!s?.access_token)return null;
  const ctrl=new AbortController(); const timer=setTimeout(()=>ctrl.abort(),9000);
  try{
    const r=await fetch(`${SUPABASE_URL}/functions/v1/studio-text-generator`,{method:'POST',signal:ctrl.signal,headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({mode,title:refs.title.value.trim(),description:refs.prompt.value.trim(),prompt:refs.prompt.value.trim(),style:refs.genre.value.trim(),voice:refs.voice.value.trim()})});
    const d=await r.json().catch(()=>({})); if(!r.ok)throw new Error(d.error||`Generator returned ${r.status}`); return String(d.text||'').trim()||null;
  }finally{clearTimeout(timer)}
}
async function generate(mode){
  busy(mode,true); setMessage(mode==='style'?'Building your style prompt…':'Writing your lyrics…');
  try{
    let text=null;
    try{text=await serverText(mode)}catch(e){console.warn('SOXLO server text fallback:',e)}
    if(!text)text=mode==='style'?localStyle():localLyrics();
    if(mode==='style')refs.genre.value=text;else refs.lyrics.value=text;
    saveDraft();
    setMessage(mode==='style'?'Style prompt ready.':'Lyrics ready.','success');
    (mode==='style'?refs.genre:refs.lyrics).scrollIntoView({behavior:'smooth',block:'center'});
  }catch(e){setMessage(e?.message||'Could not generate text.','error')}
  finally{busy(mode,false)}
}

async function copyText(value,label){
  const text=String(value||'').trim();if(!text){setMessage(`Nothing to copy from ${label}.`,'error');return}
  try{await navigator.clipboard.writeText(text);setMessage(`${label} copied.`,'success')}
  catch{const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();setMessage(`${label} copied.`,'success')}
}

async function createSongs(){
  refs.createBtn.disabled=true;refs.createBtn.textContent='PREPARING…';
  try{
    const s=await currentSession();
    if(!s?.access_token){setMessage('Sign in on the SOXLO VIP page first, then return to the Studio.','error');setCard(refs.loginStatus,'VIP sign-in required','Open the VIP page and sign in before creating audio.','bad');return}
    const canCreate=await checkEngine(s);
    if(!canCreate){setMessage(engineState.message,'error');return}
    if(!refs.genre.value.trim())refs.genre.value=localStyle();
    if(!refs.prompt.value.trim()&&!refs.lyrics.value.trim())refs.prompt.value='Create an original professional song with a memorable hook and polished modern production.';
    const batchId=uuid();
    const job={
      batchId,title:refs.title.value.trim()||'Untitled Song',prompt:refs.prompt.value.trim(),style:refs.genre.value.trim(),lyrics:refs.lyrics.value.trim(),voice:refs.voice.value.trim(),artist:refs.artist.value.trim()||'SOXLO Production',createdAt:new Date().toISOString(),
      credits:{producer:refs.producer.value.trim(),songwriter:refs.songwriter.value.trim(),composer:refs.composer.value.trim(),label:refs.label.value.trim(),copyright:refs.copyright.value.trim(),year:refs.year.value.trim(),masterTarget:$('masterTarget').value,audioExport:$('audioExport').value}
    };
    localStorage.setItem(PENDING_KEY,JSON.stringify(job)); saveDraft();
    setMessage('Opening SOXLO Songs and creating Version 1 + Version 2…','success');
    location.href=`songs.html?create=1&batch=${encodeURIComponent(batchId)}&v=20260904-7`;
  }catch(e){setMessage(e?.message||'Could not start song generation.','error')}
  finally{refs.createBtn.disabled=false;refs.createBtn.textContent='CREATE 2 SONG VERSIONS'}
}

async function checkEngine(s){
  if(!s?.access_token){engineState={checked:false,ok:false,code:'VIP_SIGNIN_REQUIRED',message:'Sign in to SOXLO VIP before checking the music engine.'};setCard(refs.engineStatus,'Music engine not checked','Sign in to VIP first. Style and lyric tools still work.');return false}
  try{
    const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),8000);
    let r;try{r=await fetch(`${SUPABASE_URL}/functions/v1/studio-music-status`,{method:'GET',signal:ctrl.signal,headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${s.access_token}`}})}finally{clearTimeout(timer)}
    const d=await r.json().catch(()=>({}));
    if(r.status===401){engineState={checked:true,ok:false,code:'VIP_SESSION_EXPIRED',message:'Your VIP session expired. Sign in again.'};setCard(refs.engineStatus,'VIP session expired',engineState.message,'bad');return false}
    if(!r.ok)throw new Error(d.message||`Engine check returned ${r.status}`);
    engineState={checked:true,ok:!!d.ok,code:d.code||'UNKNOWN',message:d.message||''};
    if(d.ok)setCard(refs.engineStatus,'Music engine ready',d.tier?`ElevenLabs ${d.tier} plan connected.`:'ElevenLabs Music API is connected.','ok');
    else setCard(refs.engineStatus,'Music engine needs attention',engineState.message,'bad');
    return !!d.ok;
  }catch(e){engineState={checked:false,ok:true,code:'CHECK_UNAVAILABLE',message:'Could not check the music engine right now. Create will still try the live connection.'};setCard(refs.engineStatus,'Music engine check unavailable',engineState.message);return true}
}

async function checkLogin(){
  try{const s=await currentSession();if(s?.access_token){setCard(refs.loginStatus,'VIP session active','Private SOXLO Studio access is ready.','ok');await checkEngine(s)}else{setCard(refs.loginStatus,'Not signed in','Style and lyric tools work, but audio creation requires VIP sign-in.','bad');setCard(refs.engineStatus,'Music engine not checked','Sign in to VIP first. Style and lyric tools still work.')}}
  catch{setCard(refs.loginStatus,'VIP session expired','Sign in again on the VIP page before creating audio.','bad');setCard(refs.engineStatus,'Music engine not checked','Sign in again to check the audio engine.','bad')}
}

styleButtons.forEach(b=>b?.addEventListener('click',()=>generate('style')));
lyricButtons.forEach(b=>b?.addEventListener('click',()=>generate('lyrics')));
$('copyStyleBtn')?.addEventListener('click',()=>copyText(refs.genre.value,'Style prompt'));
$('copyLyricsBtn')?.addEventListener('click',()=>copyText(refs.lyrics.value,'Lyrics'));
$('clearDraftBtn')?.addEventListener('click',()=>{['songTitle','songPrompt','genre','voice','lyrics','songwriter','composer'].forEach(id=>{const el=$(id);if(el)el.value=''});localStorage.removeItem(DRAFT_KEY);updatePreview();setMessage('Draft cleared.','success')});
refs.createBtn?.addEventListener('click',createSongs);
['songTitle','songPrompt','genre','voice','lyrics','artist','producer','songwriter','composer','label','year','copyright','masterTarget','audioExport'].forEach(id=>$(id)?.addEventListener('input',updatePreview));

restoreDraft();
checkLogin();
