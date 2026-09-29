self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Para que o Chrome reconheça como PWA válido e dispare o beforeinstallprompt,
  // é obrigatório ter um event listener de fetch, mesmo que apenas passe reto.
  // Aqui, nós apenas fazemos o fetch normal da requisição.
  e.respondWith(
    fetch(e.request).catch(() => {
      // Offline fallback opcional (retorna a página ou algo simples em caso de erro)
      return new Response('Offline. Verifique sua conexão com a internet.', {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    })
  );
});
