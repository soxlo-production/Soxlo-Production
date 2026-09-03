const PUBLIC_APK_URL='https://github.com/soxlo-production/Soxlo-Production/releases/download/soxlo-player-latest/SOXLO-Player.apk';

// Remove the old homepage "Watch videos" hero button even if an older cached HTML shell is shown.
const removeWatchVideosButton=()=>{
  document.querySelectorAll('.hero-actions a,.hero-actions button').forEach(el=>{
    const text=(el.textContent||'').trim().toLowerCase();
    if(text.startsWith('watch videos')) el.remove();
  });
};
removeWatchVideosButton();
new MutationObserver(removeWatchVideosButton).observe(document.documentElement,{childList:true,subtree:true});

const installButton=document.querySelector('#install-soxlo');
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('./sw.js?v=20260903-0608',{updateViaCache:'none'}).then(reg=>reg.update().catch(()=>{})).catch(()=>{});
  });
}

window.addEventListener('beforeinstallprompt',event=>event.preventDefault());
if(installButton){
  installButton.hidden=false;
  installButton.innerHTML='Download SOXLO Player APK <span>↓</span>';
  installButton.addEventListener('click',()=>{window.location.href=PUBLIC_APK_URL;});
}

const isStandalone=window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone===true;
if(isStandalone) document.documentElement.classList.add('soxlo-app-mode');

const soxloNav=document.querySelector('.nav nav');
if(soxloNav && !soxloNav.querySelector('a[href="members.html"]')){
  const loginLink=document.createElement('a');
  loginLink.href='members.html';
  loginLink.textContent='Login / Private Music 🔒';
  loginLink.style.color='#e2ac37';
  loginLink.style.fontWeight='700';
  soxloNav.insertBefore(loginLink,soxloNav.firstChild);
}
