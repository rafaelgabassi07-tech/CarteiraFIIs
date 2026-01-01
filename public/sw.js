const CACHE_NAME = 'investfiis-pwa-stable-v2'; // Updated cache name to force update for all users

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// Listens for a message from the UI to activate the new SW when the user confirms an update
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'INVESTFIIS_SKIP_WAITING') {
    console.log('SW: Received SKIP_WAITING message. Activating new worker.');
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(), // Take control of all open pages
      caches.keys().then((keys) => {
        // Delete all old caches that don't match the current CACHE_NAME
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              console.log('SW: Deleting obsolete cache:', key);
              return caches.delete(key);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Bypass non-GET requests and all requests to external origins.
  // This is CRITICAL to prevent interference with API calls (Supabase, Brapi, etc.).
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    // Let the browser handle the request as usual.
    return;
  }

  // 2. For navigation (HTML document requests), use a "Network first" strategy.
  // This ensures users get the latest version of the app's entry point if they are online.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        // If the network fails, fall back to the cached index.html.
        return caches.match('./index.html');
      })
    );
    return;
  }

  // 3. For local assets (JS, CSS, etc.), use a "Stale-While-Revalidate" strategy.
  // This serves assets from cache instantly for speed, then updates the cache in the background.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // If the network request is successful, update the cache with the new version.
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });

      // Return the cached response immediately if it exists, otherwise wait for the network.
      return cachedResponse || fetchPromise;
    })
  );
});