const SHELL_CACHE  = 'marmite-shell-v1';
const ASSET_CACHE  = 'marmite-assets-v1';
const ALL_CACHES   = [SHELL_CACHE, ASSET_CACHE];

// Pages that form the app shell
const SHELL_URLS = ['/', '/pos', '/kitchen', '/delivery', '/tables', '/admin', '/settings'];

// ── Install: pre-cache app shell ───────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: prune old caches ─────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !ALL_CACHES.includes(k)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: routing strategies ──────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip Supabase API, chrome-extension, and data URIs
  if (
    url.hostname.includes('supabase.co') ||
    url.protocol === 'chrome-extension:' ||
    url.protocol === 'data:'
  ) return;

  // ── Next.js static chunks: cache-first ────────────────────────────────
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(ASSET_CACHE).then(c => c.put(request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // ── Next.js image optimization: cache-first ────────────────────────────
  if (url.pathname.startsWith('/_next/image') || request.destination === 'image') {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(ASSET_CACHE).then(c => c.put(request, clone));
          }
          return res;
        }).catch(() => cached || new Response('', { status: 503 }));
      })
    );
    return;
  }

  // ── Navigation (HTML pages): network-first, fall back to shell ────────
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(SHELL_CACHE).then(c => c.put(request, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(request)
            .then(cached => cached || caches.match('/'))
        )
    );
    return;
  }

  // ── Everything else: network-first with cache fallback ────────────────
  event.respondWith(
    fetch(request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(ASSET_CACHE).then(c => c.put(request, clone));
        }
        return res;
      })
      .catch(() => caches.match(request))
  );
});
