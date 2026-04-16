import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { requestFcmToken, onMessage, messaging } from '../lib/firebase';

export function useFCM(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    async function setup() {
      const token = await requestFcmToken();
      if (!token) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await fetch('/api/fcm-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ token }),
      });
    }

    setup();

    if (!messaging) return;

    const unsubscribe = onMessage(messaging, (payload) => {
      const { title, body } = payload.notification ?? {};
      if (title) {
        new Notification(title, { body, icon: '/icons/icon-192.png' });
      }
    });

    return unsubscribe;
  }, [enabled]);
}
