import { useEffect, useState } from 'react';
import { Session } from '@coachbook/shared';
import { supabase } from '../lib/supabase';

export function useSessions(filters: {
  status?: string;
  date_from?: string;
  date_to?: string;
} = {}) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.date_from) params.set('date_from', filters.date_from);
      if (filters.date_to) params.set('date_to', filters.date_to);

      const res = await fetch(`/api/sessions?${params}`, {
        headers: { Authorization: `Bearer ${authSession.access_token}` },
      });

      if (!res.ok) {
        setError('Failed to load sessions');
        setLoading(false);
        return;
      }

      const { sessions: data } = await res.json();
      setSessions(data);
      setLoading(false);
    }

    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.date_from, filters.date_to]);

  return { sessions, loading, error, setSessions };
}
