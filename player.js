const tracks=[
{title:'You Think You Know Me',src:'videos/1787483448110.mp4'},
{title:'Golden Girl',src:'videos/1785964769490.mp4'},
{title:"Don't Let Me Go",src:'videos/1784533770988.mp4'},
{title:'Easy Like That',src:'videos/1785489211925.mp4'},
{title:'To the Next World',src:'videos/1784294192390.mp4'},
{title:'Dream World',src:'videos/1784395143209.mp4'},
{title:'Beautiful To Me',src:'videos/1783664299498.mp4'},
{title:'You Was The Only One',src:'videos/1783865958258.mp4'},
{title:'My World Is You',src:'videos/1783509565101.mp4'},
{title:'Love & Hate',src:'videos/1782813002003.mp4'}
];
const audio=document.getElementById('audio'),playBtn=document.getElementById('playBtn'),prevBtn=document.getElementById('prevBtn'),nextBtn=document.getElementById('nextBtn'),seek=document.getElementById('seek'),currentTimeEl=document.getElementById('currentTime'),durationEl=document.getElementById('duration'),volume=document.getElementById('volume'),trackTitle=document.getElementById('trackTitle'),artTitle=document.getElementById('artTitle'),trackList=document.getElementById('trackList'),shuffleBtn=document.getElementById('shuffleBtn'),repeatBtn=document.getElementById('repeatBtn');
let index=0,shuffle=false,repeat=false;
const fmt=s=>{if(!Number.isFinite(s))return'0:00';const m=Math.floor(s/60),ss=Math.floor(s%60).toString().padStart(2,'0');return`${m}:${ss}`};
function render(){trackList.innerHTML='';tracks.forEach((t,i)=>{const row=document.createElement('div');row.className='track'+(i===index?' active':'');row.innerHTML=`<div class="track-index">${String(i+1).padStart(2,'0')}</div><div class="thumb">S</div><div><div class="track-title">${t.title}</div><div class="track-artist">SOXLO Production</div></div><div class="track-duration">SOXLO</div><button class="track-play">${i===index&&!audio.paused?'❚❚':'▶'}</button>`;row.addEventListener('click',()=>{if(index===i){audio.paused?audio.play():audio.pause()}else{index=i;loadTrack(true)}});trackList.appendChild(row)});document.getElementById('trackCount').textContent=`${tracks.length} tracks`}
function loadTrack(autoplay=false){audio.src=tracks[index].src;trackTitle.textContent=tracks[index].title;artTitle.textContent=tracks[index].title;seek.value=0;currentTimeEl.textContent='0:00';durationEl.textContent='0:00';render();if(autoplay)audio.play().catch(()=>{})}
function next(){index=shuffle?Math.floor(Math.random()*tracks.length):(index+1)%tracks.length;loadTrack(true)}
function prev(){index=(index-1+tracks.length)%tracks.length;loadTrack(true)}
playBtn.addEventListener('click',()=>audio.paused?audio.play():audio.pause());nextBtn.addEventListener('click',next);prevBtn.addEventListener('click',prev);shuffleBtn.addEventListener('click',()=>{shuffle=!shuffle;shuffleBtn.classList.toggle('active',shuffle)});repeatBtn.addEventListener('click',()=>{repeat=!repeat;repeatBtn.classList.toggle('active',repeat)});volume.addEventListener('input',()=>audio.volume=volume.value);seek.addEventListener('input',()=>{if(Number.isFinite(audio.duration))audio.currentTime=(seek.value/1000)*audio.duration});audio.addEventListener('loadedmetadata',()=>durationEl.textContent=fmt(audio.duration));audio.addEventListener('timeupdate',()=>{currentTimeEl.textContent=fmt(audio.currentTime);if(Number.isFinite(audio.duration)&&audio.duration>0)seek.value=Math.round(audio.currentTime/audio.duration*1000)});audio.addEventListener('play',()=>{playBtn.textContent='❚❚';document.body.classList.add('is-playing');render()});audio.addEventListener('pause',()=>{playBtn.textContent='▶';document.body.classList.remove('is-playing');render()});audio.addEventListener('ended',()=>repeat?(audio.currentTime=0,audio.play()):next());
if('mediaSession'in navigator){navigator.mediaSession.setActionHandler('play',()=>audio.play());navigator.mediaSession.setActionHandler('pause',()=>audio.pause());navigator.mediaSession.setActionHandler('previoustrack',prev);navigator.mediaSession.setActionHandler('nexttrack',next);audio.addEventListener('play',()=>navigator.mediaSession.metadata=new MediaMetadata({title:tracks[index].title,artist:'SOXLO Production',album:'SOXLO Releases'}));}

// Discourage casual downloading/copying of SOXLO media.
audio.setAttribute('controlsList','nodownload noremoteplayback');
audio.setAttribute('oncontextmenu','return false;');
audio.setAttribute('draggable','false');
document.addEventListener('contextmenu',e=>{if(e.target.closest('.app-shell,audio,.track,.artwork'))e.preventDefault()});
document.addEventListener('dragstart',e=>{if(e.target.closest('audio,.artwork'))e.preventDefault()});
document.addEventListener('keydown',e=>{
  const key=e.key.toLowerCase();
  if((e.ctrlKey||e.metaKey)&&(key==='s'||key==='u'))e.preventDefault();
});

loadTrack(false);audio.volume=.9;