const CACHE='couples-connect-v8-production-features';
const ASSETS=['./','./index.html?v=8','./styles.css?v=8','./app.js?v=8','./manifest.json?v=8','./icon.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS.map(a=>a.replace('?v=8','')))).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>e.respondWith(fetch(e.request).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html')))));
self.addEventListener('push',e=>{let data={title:'Couples Connect',body:'You have an update.'};try{data=e.data.json()}catch{} e.waitUntil(self.registration.showNotification(data.title||'Couples Connect',{body:data.body||'You have an update.',icon:'icon.png'}));});
