const CACHE_NAME = 'vantage-v2';
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json'
];

// Install - cache new files
self.addEventListener('install', event => {
    // Force the new service worker to become active immediately
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching new files');
                return cache.addAll(urlsToCache);
            })
    );
});

// Activate - delete old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Take control of all pages immediately
            return self.clients.claim();
        })
    );
});

// Fetch - network first, then cache
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Clone the response and cache it
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // If network fails, try cache
                return caches.match(event.request);
            })
    );
});
