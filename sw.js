// Service Worker — cache-first strategy for offline-first PWA
//
// HOW IT WORKS:
// 1. On 'install': pre-cache all game assets so the app works offline after first visit
// 2. On 'fetch': serve from cache first, fall back to network if not cached
//
// WHY cache-first (not network-first):
// A game has no dynamic server-side data — every asset is static.
// Cache-first means instant load and full offline play after first load.
// Network-first would add latency on every load and fail entirely offline.
//
// COCKTAIL SHAKER NOTE: same SW pattern applies — hospitality app is also a static PWA.

const CACHE_NAME = 'tiltjump-v4'; // Bump on every deploy that changes JS files

// Every JS module file must be listed here or it won't be available offline.
// When you add a new file to the project, add it here too.
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/app.js',
  '/game/engine.js',
  '/game/sensors.js',
  '/game/player.js',
  '/game/platforms.js',
  '/game/renderer.js',
  '/game/score.js',
  '/ui/screens.js',
  '/ui/hud.js',
];

// Install event — runs once when SW is first registered.
// waitUntil() keeps the SW in the 'installing' state until all assets are cached.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting()) // Activate immediately without waiting for old SW to die
  );
});

// Activate event — clean up old cache versions when SW updates.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim()) // Take control of all open tabs immediately
  );
});

// Fetch event — intercept every network request from the game.
// Cache-first: return cached asset if available, otherwise fetch from network.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      // Not in cache — fetch from network (e.g. Google Fonts on first load)
      return fetch(event.request);
    })
  );
});
