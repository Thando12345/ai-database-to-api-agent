const CACHE_NAME = 'ai-database-agent-v1';
const urlsToCache = [
    '/',
    '/simple.html',
    '/mcp-test.html',
    '/mobile-styles.css',
    'https://cdn.tailwindcss.com',
    'https://cdn.socket.io/4.7.4/socket.io.min.js'
];

// Install service worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                return response || fetch(event.request).catch(() => {
                    // If both cache and network fail, return offline page
                    if (event.request.destination === 'document') {
                        return caches.match('/offline.html');
                    }
                });
            })
    );
});

// Activate service worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});