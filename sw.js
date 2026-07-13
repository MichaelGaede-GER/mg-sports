// Bei jeder inhaltlichen Änderung diese Versionsnummer erhöhen — das sorgt dafür, dass
// alte Caches beim nächsten Seitenaufruf zuverlässig verworfen werden.
const CACHE_NAME = 'mg-sports-v2';

// WICHTIG: Die Hauptdatei heißt auf GitHub Pages "index.html" (nicht mehr
// "mg-sports-event-management.html"). Ein falscher Dateiname hier lässt cache.addAll()
// fehlschlagen, wodurch die Installation des Service Workers insgesamt scheitert und der
// Browser für immer bei der letzten erfolgreich installierten (alten!) Version hängen
// bleibt — genau das war der Bug.
const ASSETS = [
  './index.html',
];

// Install - cache core assets
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    }).catch(function(err) {
      // Selbst wenn das Vor-Caching aus irgendeinem Grund fehlschlägt, soll die
      // Installation trotzdem durchlaufen (skipWaiting), statt für immer auf der
      // alten Version stehen zu bleiben.
      console.error('SW install precache failed:', err);
    })
  );
  self.skipWaiting();
});

// Activate - clean old caches and take control immediately
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch - network first (always fresh when online), fallback to cache only when offline.
// Caches any of this app's own HTML pages (not just one hardcoded filename), so future
// renamed/added pages keep working for the offline fallback too.
self.addEventListener('fetch', function(e) {
  // Skip Supabase API calls - always network, never cache
  if (e.request.url.includes('supabase.co')) return;

  var isHtmlPage = e.request.mode === 'navigate' || e.request.destination === 'document' || e.request.url.endsWith('.html');

  e.respondWith(
    fetch(e.request, { cache: 'no-store' })
      .then(function(response) {
        if (isHtmlPage && response && response.ok) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      })
      .catch(function() {
        // Offline fallback: serve the last successfully cached version, if any
        return caches.match(e.request);
      })
  );
});
