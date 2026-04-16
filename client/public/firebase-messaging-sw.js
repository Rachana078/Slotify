// Firebase Cloud Messaging service worker
// This file must be at the root so FCM can find it.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Config will be injected at runtime via query param or you can hardcode VITE_ values here
// after running `vite build` — for now we read from self.__WB_MANIFEST or a config endpoint.
// Simple approach: the app posts the config via postMessage after SW registration.

let messaging;

self.addEventListener('message', (event) => {
  if (event.data?.type === 'FIREBASE_CONFIG') {
    const config = event.data.config;
    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }
    messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const { title = 'CoachBook', body = '' } = payload.notification ?? {};
      self.registration.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        data: payload.data,
      });
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(clients.openWindow(url));
});
