import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useMessages } from '../../hooks/useMessages';

export default function InboxPage() {
  const navigate = useNavigate();
  const { messages, loading, markRead } = useMessages();
  const [expanded, setExpanded] = useState<string | null>(null);

  function toggle(id: string) {
    setExpanded((prev) => (prev === id ? null : id));
    markRead(id);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/parent/slots')} className="text-sm text-primary-600">← Slots</button>
        <h1 className="text-lg font-bold text-gray-800">Inbox</h1>
        <div />
      </header>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-2">
        {loading && <p className="text-center text-gray-400">Loading…</p>}
        {!loading && messages.length === 0 && <p className="text-center text-gray-400 mt-16">No messages yet.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${!m.is_read ? 'border-primary-600' : 'border-gray-100'}`}>
            <button onClick={() => toggle(m.id)} className="w-full text-left px-4 py-3 flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${!m.is_read ? 'text-primary-600' : 'text-gray-800'}`}>{m.subject}</p>
                <p className="text-xs text-gray-400">{format(parseISO(m.sent_at), 'MMM d, h:mm a')}</p>
              </div>
              {!m.is_read && <span className="w-2 h-2 rounded-full bg-primary-600 flex-shrink-0" />}
            </button>
            {expanded === m.id && (
              <div className="px-4 pb-4 text-sm text-gray-700 border-t border-gray-100 pt-3 whitespace-pre-wrap">{m.body}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
