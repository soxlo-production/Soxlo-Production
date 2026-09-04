'use strict';

const SUPABASE_URL='https://ovwfqbcxsdfddnfdgopg.supabase.co';
const SUPABASE_KEY='sb_publishable_h5KpewMqq8xOyf6VqFymyg_pgQXB99p';
const SESSION_KEY='soxlo_private_session_v1';
const ENDPOINT=`${SUPABASE_URL}/functions/v1/studio-voice-generator`;

const $=id=>document.getElementById(id);
const refs={
  loginStatus:$('loginStatus'),engineStatus:$('engineStatus'),text:$('voiceText'),charCount:$('charCount'),search:$('voiceSearch'),
  voice:$('voiceSelect'),voiceMeta:$('voiceMeta'),previewBtn:$('previewVoiceBtn'),previewAudio:$('voicePreviewAudio'),
  model:$('modelSelect'),modelHelp:$('modelHelp'),language:$('languageSelect'),format:$('formatSelect'),
  stability:$('stability'),similarity:$('similarity'),style:$('style'),speed:$('speed'),speakerBoost:$('speakerBoost'),
  stabilityVal:$('stabilityVal'),similarityVal:$('similarityVal'),styleVal:$('styleVal'),speedVal:$('speedVal'),
  generate:$('generateBtn'),message:$('message'),outputCard:$('outputCard'),outputAudio:$('outputAudio'),outputTitle:$('outputTitle'),download:$('downloadBtn'),regenerate:$('regenerateBtn'),history:$('historyList')
};

let voices=[];
let history=[];

function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));}
function setMessage(text,type=''){refs.message.textContent=text;refs.message.className='message'+(type?` ${type}`:'');}
function setCard(el,title,text,type=''){
  el.className='status-card'+(type?` ${type}`:'');
  el.innerHTML=`<strong>${esc(title)}</strong><span>${esc(text)}</span>`;
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

function modelLimit(){return refs.model.value==='eleven_v3'?5000:10000}
function updateCounter(){
  const limit=modelLimit();
  refs.charCount.textContent=`${refs.text.value.length.toLocaleString()} / ${limit.toLocaleString()}`;
  refs.charCount.style.color=refs.text.value.length>limit?'#eea28b':'';
}
function updateModelHelp(){
  const m=refs.model.value;
  refs.modelHelp.textContent=m==='eleven_v3'?'Eleven v3 is the most expressive model and supports up to 5,000 characters per generation.':m==='eleven_flash_v2_5'?'Flash v2.5 is fast and lower-cost. SOXLO currently limits one generation to 10,000 characters.':'Multilingual v2 is stable for longer narration. SOXLO currently limits one generation to 10,000 characters.';
  updateCounter();
}
function updateSliders(){
  refs.stabilityVal.textContent=`${Math.round(Number(refs.stability.value)*100)}%`;
  refs.similarityVal.textContent=`${Math.round(Number(refs.similarity.value)*100)}%`;
  refs.styleVal.textContent=`${Math.round(Number(refs.style.value)*100)}%`;
  refs.speedVal.textContent=`${Number(refs.speed.value).toFixed(2)}×`;
}

function voiceLabel(v){
  const bits=[v.name];
  const l=v.labels||{};
  if(l.gender)bits.push(l.gender);
  if(l.accent)bits.push(l.accent);
  return bits.filter(Boolean).join(' · ');
}
function filteredVoices(){
  const q=refs.search.value.trim().toLowerCase();
  if(!q)return voices;
  return voices.filter(v=>`${v.name} ${v.category} ${v.description} ${Object.values(v.labels||{}).join(' ')}`.toLowerCase().includes(q));
}
function renderVoices(preserve=true){
  const old=preserve?refs.voice.value:'';
  const list=filteredVoices();
  refs.voice.innerHTML=list.length?list.map(v=>`<option value="${esc(v.voice_id)}">${esc(voiceLabel(v))}</option>`).join(''):'<option value="">No matching voices</option>';
  if(old&&list.some(v=>v.voice_id===old))refs.voice.value=old;
  updateVoiceMeta();
}
function selectedVoice(){return voices.find(v=>v.voice_id===refs.voice.value)||null}
function updateVoiceMeta(){
  const v=selectedVoice();
  if(!v){refs.voiceMeta.textContent='Choose a voice to see its details.';return}
  const l=v.labels||{};
  const labelBits=[v.category,l.gender,l.age,l.accent,l.use_case].filter(Boolean);
  refs.voiceMeta.textContent=[labelBits.join(' · '),v.description].filter(Boolean).join(' — ')||'SOXLO voice ready.';
}

async function loadVoices(s){
  refs.voice.innerHTML='<option>Loading voices…</option>';
  refs.voice.disabled=true;
  try{
    const r=await fetch(`${ENDPOINT}?action=voices`,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${s.access_token}`},cache:'no-store'});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.error||`Voice service returned ${r.status}`);
    voices=Array.isArray(d.voices)?d.voices:[];
    if(!voices.length)throw new Error('No voices are available on the connected ElevenLabs account.');
    refs.voice.disabled=false;
    renderVoices(false);
    setCard(refs.engineStatus,'Voice engine ready',`${voices.length} ElevenLabs voices available through SOXLO.`,'ok');
  }catch(e){
    refs.voice.innerHTML='<option value="">Voice list unavailable</option>';
    refs.voice.disabled=true;
    setCard(refs.engineStatus,'Voice engine needs attention',e?.message||'Could not load voices.','bad');
    setMessage(e?.message||'Could not load voices.','error');
  }
}

async function init(){
  updateSliders();updateModelHelp();updateCounter();
  try{
    const s=await currentSession();
    if(!s?.access_token){
      setCard(refs.loginStatus,'VIP sign-in required','Open the VIP page and sign in before using SOXLO Voice Studio.','bad');
      setCard(refs.engineStatus,'Voice engine locked','Sign in to VIP to load your ElevenLabs voices.');
      refs.generate.disabled=true;refs.previewBtn.disabled=true;
      setMessage('Sign in on the SOXLO VIP page first, then return here.','error');
      return;
    }
    setCard(refs.loginStatus,'VIP session active','Private SOXLO Voice Studio access is ready.','ok');
    await loadVoices(s);
  }catch(e){
    setCard(refs.loginStatus,'VIP session expired','Sign in again on the SOXLO VIP page.','bad');
    setCard(refs.engineStatus,'Voice engine locked','A valid VIP session is required.');
    refs.generate.disabled=true;refs.previewBtn.disabled=true;
    setMessage(e?.message||'Sign in again.','error');
  }
}

function previewVoice(){
  const v=selectedVoice();
  if(!v){setMessage('Choose a voice first.','error');return}
  if(!v.preview_url){setMessage('This voice does not include a preview clip.','error');return}
  refs.previewAudio.src=v.preview_url;
  refs.previewAudio.play().then(()=>setMessage(`Previewing ${v.name}.`,'success')).catch(()=>setMessage('The voice preview could not be played.','error'));
}

function safeFileName(v){return String(v||'soxlo-voice').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,70)||'soxlo-voice'}
function setOutput(blob,voiceName,format,model){
  const objectUrl=URL.createObjectURL(blob);
  refs.outputAudio.src=objectUrl;
  refs.outputTitle.textContent=`${voiceName} · SOXLO Voice`;
  const ext=format.startsWith('wav_')?'wav':'mp3';
  const filename=`${safeFileName(voiceName)}-SOXLO-${Date.now()}.${ext}`;
  refs.download.href=objectUrl;
  refs.download.download=filename;
  refs.outputCard.classList.add('show');
  history.unshift({url:objectUrl,name:voiceName,format,model,filename,created:new Date()});
  while(history.length>8){const old=history.pop();try{URL.revokeObjectURL(old.url)}catch{}}
  renderHistory();
  refs.outputCard.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function renderHistory(){
  if(!history.length){refs.history.innerHTML='<div class="voice-meta">Your generated clips will appear here.</div>';return}
  refs.history.innerHTML=history.map((h,i)=>`<div class="history-item"><div><strong>${esc(h.name)}</strong><small>${esc(h.model.replace('eleven_','').replaceAll('_',' '))} · ${esc(h.created.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}))}</small></div><button type="button" data-play="${i}">PLAY ▶</button></div>`).join('');
  refs.history.querySelectorAll('[data-play]').forEach(b=>b.onclick=()=>{const h=history[Number(b.dataset.play)];if(!h)return;refs.outputAudio.src=h.url;refs.outputTitle.textContent=`${h.name} · SOXLO Voice`;refs.download.href=h.url;refs.download.download=h.filename;refs.outputCard.classList.add('show');refs.outputAudio.play().catch(()=>{});});
}

async function generate(){
  const text=refs.text.value.trim();
  const v=selectedVoice();
  const limit=modelLimit();
  if(!text){setMessage('Enter text first.','error');return}
  if(text.length>limit){setMessage(`This model allows up to ${limit.toLocaleString()} characters in SOXLO Voice Studio.`,'error');return}
  if(!v){setMessage('Choose a voice first.','error');return}

  refs.generate.disabled=true;refs.generate.textContent='GENERATING VOICE…';
  setMessage('Creating your SOXLO voice audio…');
  try{
    const s=await currentSession();
    if(!s?.access_token)throw new Error('VIP session expired. Sign in again.');
    const payload={
      action:'generate',text,voice_id:v.voice_id,model_id:refs.model.value,language_code:refs.language.value,output_format:refs.format.value,
      stability:Number(refs.stability.value),similarity_boost:Number(refs.similarity.value),style:Number(refs.style.value),speed:Number(refs.speed.value),use_speaker_boost:refs.speakerBoost.checked
    };
    const r=await fetch(ENDPOINT,{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const ct=r.headers.get('content-type')||'';
    if(!r.ok){
      let msg=`Voice generation returned ${r.status}`;
      if(ct.includes('application/json')){const d=await r.json().catch(()=>({}));msg=d.error||msg}else msg=(await r.text().catch(()=>''))||msg;
      throw new Error(msg);
    }
    const blob=await r.blob();
    if(!blob.size)throw new Error('The voice engine returned an empty audio file.');
    setOutput(blob,v.name,refs.format.value,refs.model.value);
    setMessage(`Voice ready — ${v.name}.`,'success');
  }catch(e){setMessage(e?.message||'Voice generation failed.','error')}
  finally{refs.generate.disabled=false;refs.generate.textContent='GENERATE SOXLO VOICE'}
}

refs.text.addEventListener('input',updateCounter);
refs.search.addEventListener('input',()=>renderVoices(true));
refs.voice.addEventListener('change',updateVoiceMeta);
refs.previewBtn.addEventListener('click',previewVoice);
refs.model.addEventListener('change',updateModelHelp);
[refs.stability,refs.similarity,refs.style,refs.speed].forEach(el=>el.addEventListener('input',updateSliders));
refs.generate.addEventListener('click',generate);
refs.regenerate.addEventListener('click',generate);
window.addEventListener('beforeunload',()=>{history.forEach(h=>{try{URL.revokeObjectURL(h.url)}catch{}})});

document.addEventListener('DOMContentLoaded',init);
