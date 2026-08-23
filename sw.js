const CACHE='soxlo-player-v1';
const SHELL=['./','./index.html','./style.css','./posters.css','./script.js','./poster-fix.js','./pwa.js','./manifest.webmanifest','./soxlo-app-icon.svg'];
self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL).catch(()=>{})));
});
self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==location.origin) return;

  // Always check the network first for pages and app code so new songs/releases appear automatically.
  if(req.mode==='navigate' || ['document','script','style','manifest'].includes(req.destination)){
    event.respondWith(fetch(req,{cache:'no-store'}).then(res=>{
      const copy=res.clone();
      caches.open(CACHE).then(cache=>cache.put(req,copy));
      return res;
    }).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html'))));
    return;
  }

  // Stream music/video from the network; don't trap old releases in the service-worker cache.
  if(req.destination==='video' || req.destination==='audio' || url.pathname.includes('/videos/')){
    event.respondWith(fetch(req));
    return;
  }

  event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{
    const copy=res.clone();
    caches.open(CACHE).then(cache=>cache.put(req,copy));
    return res;
  })));
});