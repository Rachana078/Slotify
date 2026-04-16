import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { setupForegroundMessaging } from '../lib/firebase';

export function useFCM(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    async function setup() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Set up foreground notifications (no-op if FCM not supported)
      const unsub = await setupForegroundMessaging((title, body) => {
        new Notification(title, { body, icon: '/icons/icon-192.png' });
      });

      return unsub;
    }

    let cleanup: (() => void) | undefined;
    setup().then((unsub) => { cleanup = unsub; });

    return () => { cleanup?.(); };
  }, [enabled]);
}
