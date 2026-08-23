document.querySelectorAll('.video-frame video').forEach(video=>{
  const frame=video.closest('.video-frame');
  let revealed=false;
  const reveal=()=>{
    if(!revealed && video.currentTime>=0.9){
      revealed=true;
      frame.classList.add('video-started');
    }
  };
  video.addEventListener('play',()=>{
    revealed=false;
    frame.classList.remove('video-started');
  });
  video.addEventListener('timeupdate',reveal);
  video.addEventListener('seeked',()=>{
    if(video.currentTime>=0.9){revealed=true;frame.classList.add('video-started');}
  });
  video.addEventListener('ended',()=>{
    revealed=false;
    frame.classList.remove('video-started');
  });
});