const CACHE='gesturelab-v1';
const ASSETS=['./','./index.html','./design.css','./core.js','./app.js','./manifest.json','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(clients.claim());});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{
    if(r.ok&&new URL(e.request.url).origin===location.origin){const cl=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cl));}
    return r;
  }).catch(()=>caches.match('./index.html'))));
});
