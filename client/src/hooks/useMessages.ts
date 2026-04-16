import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { MessageWithReadStatus } from '@coachbook/shared';

export function useMessages() {
  const [messages, setMessages] = useState<MessageWithReadStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const res = await fetch('/api/messages', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const { messages: data } = await res.json();
      setMessages(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const unreadCount = messages.filter((m) => !m.is_read).length;

  async function markRead(messageId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`/api/messages/${messageId}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, is_read: true } : m));
  }

  return { messages, loading, unreadCount, setMessages, markRead };
}
