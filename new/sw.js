const CACHE_NAME = 'ghost-shell-v3-cache';
const ASSETS_TO_CACHE = [
    '/new/',
    '/new/index.html',
    '/new/manifest.json',
    'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js',
    'https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js'
];

// Service Worker Install হলে ফাইলগুলো ক্যাশ করবে
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Caching assets...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// পুরনো ক্যাশ ডিলিট করার জন্য (ভার্সন আপডেট হলে)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
});

// নেটওয়ার্ক না থাকলে ক্যাশ থেকে ফাইল সার্ভ করবে
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
