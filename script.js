const menu=document.querySelector('.menu');
const nav=document.querySelector('.nav nav');
menu?.addEventListener('click',()=>{
  nav.style.display=nav.style.display==='flex'?'none':'flex';
  nav.style.position='absolute';
  nav.style.top='78px';
  nav.style.right='7%';
  nav.style.background='#111';
  nav.style.padding='20px';
  nav.style.flexDirection='column';
  nav.style.gap='18px';
});
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',()=>{if(innerWidth<801)nav.style.display='none'}));

const formatTime=(seconds)=>{
  if(!Number.isFinite(seconds)) return '0:00';
  const m=Math.floor(seconds/60);
  const s=Math.floor(seconds%60).toString().padStart(2,'0');
  return `${m}:${s}`;
};

document.querySelectorAll('.video-frame video').forEach(video=>{
  video.removeAttribute('controls');

  const controls=document.createElement('div');
  controls.className='soxlo-player';
  controls.innerHTML=`
    <button class="soxlo-play" type="button" aria-label="Play">▶</button>
    <span class="soxlo-time"><span class="current">0:00</span> / <span class="duration">0:00</span></span>
    <input class="soxlo-seek" type="range" min="0" max="1000" value="0" aria-label="Seek">
    <button class="soxlo-volume" type="button" aria-label="Mute">🔊</button>
    <button class="soxlo-more" type="button" aria-label="Fullscreen">⋮</button>`;

  video.insertAdjacentElement('afterend',controls);

  const play=controls.querySelector('.soxlo-play');
  const current=controls.querySelector('.current');
  const duration=controls.querySelector('.duration');
  const seek=controls.querySelector('.soxlo-seek');
  const volume=controls.querySelector('.soxlo-volume');
  const more=controls.querySelector('.soxlo-more');

  const updateDuration=()=>duration.textContent=formatTime(video.duration);
  const updateProgress=()=>{
    current.textContent=formatTime(video.currentTime);
    if(Number.isFinite(video.duration)&&video.duration>0){
      seek.value=Math.round((video.currentTime/video.duration)*1000);
      seek.style.setProperty('--progress',`${(video.currentTime/video.duration)*100}%`);
    }
  };

  video.addEventListener('loadedmetadata',updateDuration);
  video.addEventListener('durationchange',updateDuration);
  video.addEventListener('timeupdate',updateProgress);
  video.addEventListener('play',()=>{play.textContent='❚❚';play.setAttribute('aria-label','Pause')});
  video.addEventListener('pause',()=>{play.textContent='▶';play.setAttribute('aria-label','Play')});
  video.addEventListener('ended',()=>{play.textContent='▶';play.setAttribute('aria-label','Play')});

  play.addEventListener('click',()=>video.paused?video.play():video.pause());
  video.addEventListener('click',()=>video.paused?video.play():video.pause());

  seek.addEventListener('input',()=>{
    if(Number.isFinite(video.duration)) video.currentTime=(seek.value/1000)*video.duration;
  });

  volume.addEventListener('click',()=>{
    video.muted=!video.muted;
    volume.textContent=video.muted?'🔇':'🔊';
    volume.setAttribute('aria-label',video.muted?'Unmute':'Mute');
  });

  more.addEventListener('click',()=>{
    if(video.requestFullscreen) video.requestFullscreen();
    else if(video.webkitEnterFullscreen) video.webkitEnterFullscreen();
  });
});
