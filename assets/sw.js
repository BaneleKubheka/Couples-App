const CACHE='couples-connect-gallery-location-20260617-11-syntax-signinfix';
const ASSETS=['/','/index.html','/styles.css','/app.js','/manifest.json','/icon.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(e.request.method!=='GET' || url.hostname.includes('supabase.co')) return;
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{ const copy=resp.clone(); if(resp.ok && url.origin===location.origin) caches.open(CACHE).then(c=>c.put(e.request,copy)); return resp; }).catch(()=>caches.match('/index.html'))));
});
self.addEventListener('push',e=>{
  let data={title:'Couples Connect',body:'New update received.'};
  try{ data=e.data.json(); }catch{}
  e.waitUntil(self.registration.showNotification(data.title||'Couples Connect',{body:data.body||'New update received.',icon:'/icon.png',badge:'/icon.png'}));
});
