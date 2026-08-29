const CACHE_NAME = 'hockey-timer-v1';
const urlsToCache = [
  './',
  './index.html',
  './css/main.css',
  './css/timer.css',
  './css/controls.css',
  './css/responsive.css',
  './js/app.js',
  './js/timer.js',
  './js/audio.js',
  './js/ui.js',
  './js/settings.js',
  './js/constants.js',
  './sounds/buzzer.mp3',
  './sounds/air_horn.mp3',
  './sounds/braam.mp3',
  './sounds/double_bell.mp3',
  './sounds/triple_bell.mp3',
  './sounds/ship_horn.ogg'
];

// Install service worker and cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Update service worker and clear old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
