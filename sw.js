// My Day Planner — Service Worker
const CACHE_NAME = 'day-planner-v1';

// Core app shell files to cache for offline use
const APP_SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/tokens.css',
  '/tokens.js',
  '/app.js',
  '/firebase-config.js',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png'
];

// Google Fonts to cache on first load
const FONT_ORIGIN = 'https://fonts.googleapis.com';
const FONT_STATIC = 'https://fonts.gstatic.com';

// Install: cache the app shell
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

// Activate: clean old caches
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) {
          return key !== CACHE_NAME;
        }).map(function (key) {
          return caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// Fetch: network-first for API/sync, cache-first for app shell and fonts
self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip Firebase/Google API calls — let them go to network (they handle their own offline)
  if (url.hostname.includes('firestore.googleapis.com') ||
      url.hostname.includes('identitytoolkit.googleapis.com') ||
      url.hostname.includes('securetoken.googleapis.com') ||
      url.hostname.includes('googleapis.com/calendar') ||
      url.hostname.includes('firebase') ||
      url.hostname.includes('gstatic.com/firebasejs')) {
    return;
  }

  // Google Fonts: cache-first (they're immutable)
  if (url.origin === FONT_ORIGIN || url.origin === FONT_STATIC) {
    event.respondWith(
      caches.match(event.request).then(function (cached) {
        if (cached) return cached;
        return fetch(event.request).then(function (response) {
          if (response.ok) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, clone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // App shell: stale-while-revalidate (serve cached, update in background)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(function (cached) {
        var fetchPromise = fetch(event.request).then(function (response) {
          if (response.ok) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, clone);
            });
          }
          return response;
        }).catch(function () {
          // Network failed, cached version already returned above
          return cached;
        });

        // Return cached immediately if available, otherwise wait for network
        return cached || fetchPromise;
      })
    );
    return;
  }
});
