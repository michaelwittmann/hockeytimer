const CACHE_NAME = 'hockey-timer-v4';
const urlsToCache = [
  './',
  './index.html',
  './css/main.css',
  './css/timer.css',
  './css/controls.css',
  './css/responsive.css',
  './css/theme-stadium.css',
  './js/app.js',
  './js/timer.js',
  './js/audio.js',
  './js/ui.js',
  './js/settings.js',
  './js/constants.js',
  './fonts/lcd-display-mono/lcd-display-mono.otf',
  './sounds/buzzer.mp3',
  './sounds/air_horn.mp3',
  './sounds/braam.mp3',
  './sounds/double_bell.mp3',
  './sounds/triple_bell.mp3',
  './sounds/ship_horn.ogg',
  './icons/icon-192.png',
  './icons/icon-512.png'
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

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        });
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
