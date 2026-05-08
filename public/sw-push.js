/**
 * sw-push.js
 *
 * Handlers de Web Push para o Service Worker do Soluteg.
 * Este arquivo é importado pelo SW gerado pelo vite-plugin-pwa via importScripts.
 *
 * Dois eventos tratados:
 *   push             → exibe a notificação no sistema operacional
 *   notificationclick → foca janela existente e navega, ou abre nova aba
 */

/* global self, clients */

// ─── Exibir a notificação recebida ───────────────────────────────────────────

self.addEventListener('push', function (event) {
  // Se o servidor não enviou payload, exibe uma notificação genérica
  var data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: 'Soluteg', body: 'Nova notificação' };
  }

  var title = data.title || 'Soluteg';
  var options = {
    body:              data.body || '',
    icon:              data.icon  || '/icon-192.png',
    badge:             data.badge || '/badge-72.png',
    tag:               data.tag   || 'soluteg-default',
    // url fica em data para o notificationclick usar
    data:              { url: data.url || '/' },
    // true = a notificação permanece visível até o usuário interagir
    // (boa prática em alarmes críticos como alarm2)
    requireInteraction: !!data.requireInteraction,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Tratar clique na notificação ────────────────────────────────────────────

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  var url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    // Verifica se já tem uma janela do app aberta
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        // Se já tem janela, foca e envia mensagem para o React navegar via wouter
        if ('focus' in client) {
          client.focus();
          client.postMessage({ type: 'NAVIGATE', url: url });
          return;
        }
      }
      // Sem janela aberta — abre uma nova
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
