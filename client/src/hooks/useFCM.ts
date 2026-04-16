import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { requestFcmToken, setupForegroundMessaging } from '../lib/firebase';

export function useFCM(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    async function setup() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Request permission + save token so server can push to this coach
      const token = await requestFcmToken();
      if (token) {
        fetch('/api/notifications/fcm-tokens', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ token }),
        }).catch(console.error);
      }

      // Set up foreground notifications (shows banner when app is open)
      const unsub = await setupForegroundMessaging((title, body) => {
        if (typeof Notification !== 'undefined') {
          new Notification(title, { body, icon: '/icons/icon-192.png' });
        }
      });

      return unsub;
    }

    let cleanup: (() => void) | undefined;
    setup().then((unsub) => { cleanup = unsub; });

    return () => { cleanup?.(); };
  }, [enabled]);
}
