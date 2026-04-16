import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);

// Lazily load Firebase Messaging — the static import of 'firebase/messaging'
// throws on iOS Safari (no web push support), crashing the whole app.
// Dynamic import isolates the failure to only code paths that actually need FCM.
export async function requestFcmToken(): Promise<string | null> {
  try {
    if (typeof Notification === 'undefined') return null;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const { getMessaging, getToken } = await import('firebase/messaging');
    const messaging = getMessaging(firebaseApp);
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });
    return token;
  } catch (err) {
    console.warn('FCM token error (not supported in this browser):', err);
    return null;
  }
}

// Returns an unsubscribe function, or a no-op if messaging isn't supported.
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
