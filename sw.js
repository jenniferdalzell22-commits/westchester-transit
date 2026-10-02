// ==========================================
// WESTCHESTER TRANSIT CONNECTION - SERVICE WORKER
// ==========================================
// Filename: sw.js
// Purpose: Handles offline caching for the serverless transit training portal.
// This allows the app to load instantly on iPads and tablets with zero connectivity.

const CACHE_NAME = 'wtc-portal-cache-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// 1. Install Event - Cache all essential assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Pre-caching offline assets...');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// 2. Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting legacy cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. Fetch Event - Cache-first strategy falling back to network
// This ensures the application loads instantly offline using browser storage.
self.addEventListener('fetch', (event) => {
    // Only handle GET requests (prevents CORS and analytics tracking issues)
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // Return cached asset immediately
                    return cachedResponse;
                }

                // If not in cache, fetch from network and cache it dynamically
                return fetch(event.request)
                    .then((networkResponse) => {
                        // Check if valid response
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

                        // Clone response to put in cache
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    })
                    .catch(() => {
                        // Fallback response if network fails and asset is not cached
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }
                    });
            })
    );
});
