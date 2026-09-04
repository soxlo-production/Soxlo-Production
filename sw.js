const CACHE='soxlo-player-v5-20260904-1210';
const SHELL=['./','./index.html','./style.css','./posters.css','./script.js','./poster-fix.js','./pwa.js','./manifest.webmanifest','./members.html','./members.css','./vip-menu.css','./members.js','./members.webmanifest','./studio.html','./studio.js','./songs.html','./supabase-config.json','./soxlo-app-icon.svg'];
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
  if(req.mode==='navigate' || ['document','script','style','manifest'].includes(req.destination)){
    event.respondWith(fetch(req,{cache:'no-store'}).then(res=>{
      if(res.ok){const copy=res.clone();caches.open(CACHE).then(cache=>cache.put(req,copy));}
      return res;
    }).catch(()=>caches.match(req).then(r=>r||caches.match('./members.html')||caches.match('./index.html'))));
    return;
  }
  if(req.destination==='video' || req.destination==='audio' || url.pathname.includes('/videos/') || url.pathname.includes('/storage/v1/')){
    event.respondWith(fetch(req));
    return;
  }
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{
    if(res.ok){const copy=res.clone();caches.open(CACHE).then(cache=>cache.put(req,copy));}
    return res;
  })));
});
