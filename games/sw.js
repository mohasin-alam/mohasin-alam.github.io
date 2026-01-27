const CACHE_NAME = 'neon-games-hub-v1';
const urlsToCache = [
  './',
  './index.html',
  './2048/',
  './Minesweeper/',
  './connect-4/',
  './snake/',
  './space/',
  './word/',
  './run/',
  './hub/'
];

// Install service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => 
      Promise.all(keyList.map((key) => {
        if(key !== CACHE_NAME) return caches.delete(key);
      }))
    )
  );
  return self.clients.claim();
});

// Fetch files
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request)
          .catch(() => caches.match('./index.html'));
      })
  );
});
