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
