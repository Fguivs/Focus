// Define um nome e uma versão para o nosso cache
const CACHE_NAME = 'grupo-epicos-cache-v1.5'; // IMPORTANTE: Mude a versão (v1.4, v1.5, etc.) a cada nova atualização

// Lista de arquivos essenciais para o funcionamento offline
const urlsToCache = [
  '/',
  '/index.html',
  '/estilos.css',
  '/logica.js',
  '/manifest.json',
  // Adicione aqui outros arquivos importantes, como imagens que não mudam
  'https://i.ibb.co/Ps4yK7xy/Picsart-25-02-25-14-28-21-078.jpg',
  'https://assets.mixkit.co/sfx/preview/mixkit-unlock-game-notification-253.mp3',
  'https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.mp3'
];

// Evento de Instalação: Ocorre quando o Service Worker é registrado pela primeira vez
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Abrindo cache e adicionando arquivos essenciais');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Força o novo Service Worker a se tornar ativo imediatamente
  );
});

// Evento de Ativação: Ocorre quando o novo Service Worker substitui o antigo
self.addEventListener('activate', event => {
  console.log('[Service Worker] Ativando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Se o nome do cache for diferente do atual, ele é antigo e será deletado
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Limpando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Torna o SW ativo o controlador de todas as abas abertas
  );
});

// Evento Fetch: Intercepta todas as requisições de rede da página
self.addEventListener('fetch', event => {
  // Estratégia: "Network Falling Back to Cache"
  // 1. Tenta buscar o recurso na rede primeiro.
  // 2. Se a rede falhar (offline), busca no cache.
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Se a busca na rede funcionou, clona a resposta e guarda no cache para uso futuro
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // Se a rede falhou, tenta encontrar o recurso no cache
        return caches.match(event.request);
      })
  );
});


