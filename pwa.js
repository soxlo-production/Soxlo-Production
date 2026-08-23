let deferredInstallPrompt=null;
const installButton=document.querySelector('#install-soxlo');

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{
      reg.update().catch(()=>{});
      setInterval(()=>reg.update().catch(()=>{}),60*60*1000);
    }).catch(()=>{});
  });
}

window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  deferredInstallPrompt=event;
  if(installButton) installButton.hidden=false;
});

installButton?.addEventListener('click',async()=>{
  if(deferredInstallPrompt){
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt=null;
    installButton.hidden=true;
    return;
  }
  alert('On your phone, open the browser menu and choose “Add to Home screen” or “Install app”.');
});

window.addEventListener('appinstalled',()=>{
  if(installButton) installButton.hidden=true;
});

const isStandalone=window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone===true;
if(isStandalone) document.documentElement.classList.add('soxlo-app-mode');
