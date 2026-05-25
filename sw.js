const CACHE_NAME = 'guitar-suite-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './icon-512.png',
    './apple-touch-icon.png',
    
    // Tone Finder
    './tone-finder/index.html',
    
    // ChromaChord
    './chord-analyzer/index.html',
    './chord-analyzer/styles.css',
    './chord-analyzer/app.js',
    './chord-analyzer/utils/audioAnalyzer.js',
    './chord-analyzer/utils/guitarTab.js',
    './chord-analyzer/utils/musicTheory.js',
    './chord-analyzer/utils/Tone.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Only intercept local GET requests
    if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request).then(fetchRes => {
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request.url, fetchRes.clone());
                        return fetchRes;
                    });
                });
            })
    );
});
