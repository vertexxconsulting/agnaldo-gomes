/**
 * Service Worker — Studio Agnaldo Gomes
 * Estratégia:
 *  - Cache-First  → assets estáticos (_next/static/, imagens, fontes, ícones)
 *  - SWR           → páginas HTML (serve cache e revalida em background)
 *  - Network-Only  → rotas de API (/api/)
 *  - Offline page  → /offline  (fallback quando rede e cache falham)
 */

const CACHE_VERSION = 'v3';
const STATIC_CACHE  = `static-${CACHE_VERSION}`;
const PAGES_CACHE   = `pages-${CACHE_VERSION}`;
const IMAGE_CACHE   = `images-${CACHE_VERSION}`;

// Recursos essenciais pré-cacheados no install
const PRECACHE_URLS = [
  '/',
  '/offline',
  '/agendamento',
  '/manifest.webmanifest',
  '/theme-init.js',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// ─── INSTALL ───────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(PRECACHE_URLS.map((url) => new Request(url, { cache: 'reload' })))
        .catch((err) => console.warn('[SW] Pré-cache parcial, alguns recursos falharam:', err))
    )
  );
});

// ─── ACTIVATE ──────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, PAGES_CACHE, IMAGE_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── HELPERS ───────────────────────────────────────────────────────────────
function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/') ||
         url.pathname.match(/\.(woff2?|ttf|otf|eot)(\?.*)?$/) ||
         url.pathname === '/theme-init.js' ||
         url.pathname.match(/\/(icon-|logo|favicon)/);
}

function isImageRequest(url) {
  return url.pathname.match(/\.(png|jpg|jpeg|webp|gif|svg|ico|avif)(\?.*)?$/i);
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isHTMLRequest(request) {
  return request.headers.get('Accept')?.includes('text/html');
}

// ─── FETCH ─────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Apenas requisições do mesmo origin (ignora analytics, supabase, etc.)
  if (url.origin !== self.location.origin) return;

  // API — Network-Only (nunca cacheia dados dinâmicos)
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline', message: 'Sem conexão com internet' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // Assets estáticos — Cache-First
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      })
    );
    return;
  }

  // Imagens — Cache-First com expiração via tamanho máximo
  if (isImageRequest(url)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const response = await fetch(event.request);
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        } catch {
          return new Response('', { status: 408 });
        }
      })
    );
    return;
  }

  // Páginas HTML — Stale-While-Revalidate
  if (isHTMLRequest(event.request)) {
    event.respondWith(
      caches.open(PAGES_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);

        const networkFetch = fetch(event.request)
          .then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => null);

        if (cached) {
          // Revalida em background e retorna cache imediatamente
          event.waitUntil(networkFetch);
          return cached;
        }

        // Sem cache: aguarda rede
        const response = await networkFetch;
        if (response) return response;

        // Fallback: página /offline
        const offlinePage = await caches.match('/offline');
        return offlinePage || new Response('<h1>Sem conexão</h1>', { headers: { 'Content-Type': 'text/html' } });
      })
    );
    return;
  }

  // Demais recursos — Network com fallback de cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// ─── MENSAGENS DO CLIENTE ───────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }

  // Cache manual de páginas extras solicitadas pelo app
  if (event.data?.type === 'CACHE_URLS') {
    const urls = event.data.urls || [];
    caches.open(PAGES_CACHE).then((cache) =>
      Promise.all(urls.map((url) => fetch(url).then((r) => r.ok && cache.put(url, r)).catch(() => {})))
    );
  }
});
