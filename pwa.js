const PUBLIC_APK_URL='https://github.com/soxlo-production/Soxlo-Production/releases/download/soxlo-player-latest/SOXLO-Player.apk';
const installButton=document.querySelector('#install-soxlo');

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{
      reg.update().catch(()=>{});
      setInterval(()=>reg.update().catch(()=>{}),60*60*1000);
    }).catch(()=>{});
  });
}

// The public website download button now downloads the Android APK directly.
// Do not show the old PWA "Add to Home screen" prompt here.
window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
});

if(installButton){
  installButton.hidden=false;
  installButton.innerHTML='Download SOXLO Player APK <span>↓</span>';
  installButton.addEventListener('click',()=>{
    window.location.href=PUBLIC_APK_URL;
  });
}

const isStandalone=window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone===true;
if(isStandalone) document.documentElement.classList.add('soxlo-app-mode');

// Always expose the private members login directly in the main SOXLO menu.
const soxloNav=document.querySelector('.nav nav');
if(soxloNav && !soxloNav.querySelector('a[href="members.html"]')){
  const loginLink=document.createElement('a');
  loginLink.href='members.html';
  loginLink.textContent='Login / Private Music 🔒';
  loginLink.style.color='#e2ac37';
  loginLink.style.fontWeight='700';
  soxloNav.insertBefore(loginLink,soxloNav.firstChild);
}

// Ensure every public homepage player shows the same animated golden swirling music note
// on the right-side audio button, even if an older cached player script created a speaker icon.
(()=>{
  const style=document.createElement('style');
  style.textContent=`
    .soxlo-volume.soxlo-note-button{position:relative!important;width:46px!important;min-width:46px!important;height:46px!important;padding:0!important;display:grid!important;place-items:center!important;font-size:0!important;overflow:visible!important}
    .soxlo-public-note{position:relative;width:42px;height:42px;display:grid;place-items:center;pointer-events:none;overflow:visible}
    .soxlo-public-note svg{width:30px;height:30px;display:block;filter:drop-shadow(0 0 5px rgba(226,189,91,.95)) drop-shadow(0 0 12px rgba(226,189,91,.42));transform-origin:center;animation:soxloPublicNoteSwirl 4.2s ease-in-out infinite}
    .soxlo-public-note:before{content:"";position:absolute;width:34px;height:18px;border:1.5px solid rgba(246,220,138,.7);border-left-color:transparent;border-bottom-color:transparent;border-radius:50%;animation:soxloPublicNoteRing 4.2s linear infinite}
    .soxlo-public-note:after{content:"✦";position:absolute;right:1px;top:1px;color:#fff0a0;font-size:8px;text-shadow:0 0 7px rgba(255,240,160,.95);animation:soxloPublicNoteSparkle 2.1s ease-in-out infinite}
    .soxlo-volume.is-muted .soxlo-public-note{opacity:.45}
    @keyframes soxloPublicNoteSwirl{0%{transform:translate(0,2px) rotate(-10deg) scale(.96)}25%{transform:translate(4px,-3px) rotate(10deg) scale(1.06)}50%{transform:translate(0,-5px) rotate(20deg) scale(1)}75%{transform:translate(-4px,-2px) rotate(4deg) scale(1.07)}100%{transform:translate(0,2px) rotate(-10deg) scale(.96)}}
    @keyframes soxloPublicNoteRing{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    @keyframes soxloPublicNoteSparkle{0%,100%{opacity:.25;transform:scale(.7) rotate(0deg)}50%{opacity:1;transform:scale(1.35) rotate(90deg)}}
  `;
  document.head.appendChild(style);

  const noteMarkup=`<span class="soxlo-public-note" aria-hidden="true"><svg viewBox="0 0 100 100"><defs><linearGradient id="soxloPublicGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0a0"/><stop offset=".45" stop-color="#e6bd54"/><stop offset="1" stop-color="#a9751d"/></linearGradient></defs><path fill="url(#soxloPublicGold)" d="M65 12v49.5c-3.3-1.7-7.5-2.4-11.8-1.5-8.7 1.8-14.6 8.7-13.2 15.5 1.4 6.8 9.6 10.8 18.3 9 7.3-1.5 12.7-6.6 13.4-12.2.1-.5.1-1 .1-1.5V33.5l19-5.2v26.1c-3.3-1.7-7.5-2.4-11.8-1.5-8.7 1.8-14.6 8.7-13.2 15.5 1.4 6.8 9.6 10.8 18.3 9 7.8-1.6 13.4-7.3 13.5-13.3V8L65 16.8V12z"/></svg></span>`;

  const applyNotes=()=>{
    document.querySelectorAll('.soxlo-volume').forEach(btn=>{
      if(btn.querySelector('.soxlo-public-note')) return;
      btn.classList.add('soxlo-note-button');
      btn.innerHTML=noteMarkup;
    });
  };
  applyNotes();
  new MutationObserver(applyNotes).observe(document.documentElement,{childList:true,subtree:true});
})();
