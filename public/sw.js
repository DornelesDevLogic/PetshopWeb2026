/**
 * PetShop PWA — Service Worker
 * Estratégias:
 *  • /_next/static/  → Cache First (assets imutáveis com hash)
 *  • /api/           → Network First (dados frescos; fallback para cache)
 *  • Navegação       → Network First; offline → /offline
 */

const CACHE_VERSION   = 'v1.0';
const STATIC_CACHE    = `ps-static-${CACHE_VERSION}`;
const PAGES_CACHE     = `ps-pages-${CACHE_VERSION}`;
const API_CACHE       = `ps-api-${CACHE_VERSION}`;

const PRECACHE_URLS = ['/offline'];

// ─── Skip Waiting (atualização imediata) ─────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.endsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições não-GET, cross-origin e extensões de browser
  if (request.method !== 'GET')        return;
  if (url.origin !== location.origin)  return;
  if (url.pathname.startsWith('/_next/webpack-hmr')) return;

  // ── Assets imutáveis (_next/static) ─────────────────────────────────────
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // ── Ícones e manifest ────────────────────────────────────────────────────
  if (
    url.pathname.startsWith('/api/pwa-icon') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/favicon.ico'
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // ── API do backend ────────────────────────────────────────────────────────
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE, 4000));
    return;
  }

  // ── Navegação de páginas ─────────────────────────────────────────────────
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOffline(request));
    return;
  }

  // ── Demais recursos ───────────────────────────────────────────────────────
  event.respondWith(networkFirst(request, PAGES_CACHE, 5000));
});

// ─── Estratégias de cache ─────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Recurso não disponível offline.', { status: 503 });
  }
}

async function networkFirst(request, cacheName, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    clearTimeout(timer);
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function networkFirstWithOffline(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(PAGES_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match('/offline');
    return offline ?? new Response('<h1>Sem conexão</h1>', {
      headers: { 'Content-Type': 'text/html' },
    });
  }
}
