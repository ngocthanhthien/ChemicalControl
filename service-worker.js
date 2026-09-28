// service-worker.js — app-shell precache + cache-first offline strategy.
'use strict';

const CACHE_NAME = 'qa-stock-cache-v10';
// Deliberately does NOT precache './' — with the app renamed off index.html, a bare '/' request
// resolves to the static server's directory listing, not the app; caching that would mean every
// later load of the bare origin serves a stale file list. Always open the file by name.
const PRECACHE_URLS = [
  './QA_Stock_Management.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      }).catch(() => cached || caches.match('./QA_Stock_Management.html'));
      return cached || networkFetch;
    })
  );
});
