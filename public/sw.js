const CACHE_NAME = 'presisi-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://lh3.googleusercontent.com/d/1bogOVmwNoBbtXh1uTqC7ccDdTRYKw1fd'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
