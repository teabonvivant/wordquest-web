/* Cache only this app's static shell and explicitly installed OCR. Never cache API responses or backups. */
'use strict';
const BASE=new URL('./',self.location.href),SHELL='wordquest-r3-shell-'+encodeURIComponent(BASE.pathname)+'-3.1.0',CONFIG='wordquest-r3-config',POINTER=new URL('ocr-active.json',BASE).href;
self.addEventListener('install',e=>e.waitUntil((async()=>{const c=await caches.open(SHELL);await c.addAll([new URL('index.html',BASE).href]);})()));
// No skipWaiting: a running old page is not forced onto a different worker mid-session.
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{const req=e.request,u=new URL(req.url);if(req.method!=='GET'||u.origin!==BASE.origin||!u.pathname.startsWith(BASE.pathname)||u.pathname.includes('/api/'))return;
 if(u.pathname.startsWith(new URL('vendor/tesseract/',BASE).pathname)){e.respondWith((async()=>{const cfg=await caches.open(CONFIG),ptr=await cfg.match(POINTER);if(ptr){const p=await ptr.json();if(p.cacheName?.startsWith('wordquest-r3-ocr-')){const c=await caches.open(p.cacheName),r=await c.match(req,{ignoreSearch:true});if(r)return r;}}return fetch(req);})());return;}
 if(u.pathname===new URL('index.html',BASE).pathname||u.pathname===BASE.pathname){e.respondWith((async()=>{const c=await caches.open(SHELL);try{const r=await fetch(req);if(r.ok&&r.headers.get('content-type')?.includes('text/html'))await c.put(new URL('index.html',BASE),r.clone());return r;}catch(err){const saved=await c.match(new URL('index.html',BASE));if(saved)return saved;throw err;}})());}
});
