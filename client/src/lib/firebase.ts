import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);

async function getSwRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!('serviceWorker' in navigator)) return undefined;
  try {
    // Use the vite-plugin-pwa SW (sw.js) which has Firebase properly initialized.
    // Fall back to any active registration if sw.js isn't registered yet.
    return (
      (await navigator.serviceWorker.getRegistration('/sw.js')) ??
      (await navigator.serviceWorker.ready)
    );
  } catch {
    return undefined;
  }
}

export async function requestFcmToken(): Promise<string | null> {
  try {
    if (typeof Notification === 'undefined') return null;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const { getMessaging, getToken } = await import('firebase/messaging');
    const messaging = getMessaging(firebaseApp);
    const serviceWorkerRegistration = await getSwRegistration();
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration,
    });
    return token;
  } catch (err) {
    console.warn('FCM token error:', err);
    return null;
  }
}

export async function setupForegroundMessaging(
  onNotification: (title: string, body: string) => void
): Promise<() => void> {
  try {
    const { getMessaging, onMessage } = await import('firebase/messaging');
    const messaging = getMessaging(firebaseApp);
    return onMessage(messaging, (payload) => {
      const { title = '', body = '' } = payload.notification ?? {};
      if (title) onNotification(title, body);
    });
  } catch {
    return () => {};
  }
}
