// Service Worker Básico (sw.js)

// Evento de Instalação: o service worker está sendo instalado.
self.addEventListener('install', event => {
  console.log('Service Worker instalado com sucesso.');
});

// Evento de Ativação: o service worker foi ativado e está controlando a página.
self.addEventListener('activate', event => {
  console.log('Service Worker ativado com sucesso.');
});

// Evento de Fetch: intercepta todas as requisições de rede.
// Por enquanto, apenas repassamos a requisição para a rede.
self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request));
});