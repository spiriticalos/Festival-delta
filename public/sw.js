const CACHE = 'bohemians-v8';
const STATIC = [
  '/',
  '/ro/',
  '/css/style.css?v=20260914b',
  '/js/main.js?v=20260914b',
  '/images/bohemians-festival-crowd-sunflower-stage-night.webp',
  '/images/bohemians-festival-crowd-sunflower-stage-night-mobile.webp',
  '/images/the-bohemians-festival-logo.webp',
  '/images/sun-icon.svg',
  '/images/pwa-icon-192.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API și admin — întotdeauna network
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) {
    return;
  }

  // Pagini HTML (EN / RO) — network first, cache doar ca fallback offline
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match(e.request).then(cached => cached || caches.match(url.pathname.startsWith('/ro') ? '/ro/' : '/'))
      )
    );
    return;
  }

  // Restul — cache first, fallback network
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok && e.request.method === 'GET') {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }))
  );
});
