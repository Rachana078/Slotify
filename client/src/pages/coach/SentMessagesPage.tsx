import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useMessages } from '../../hooks/useMessages';

export default function SentMessagesPage() {
  const navigate = useNavigate();
  const { messages, loading } = useMessages();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/coach/dashboard')} className="text-sm text-primary-600">← Dashboard</button>
        <h1 className="text-lg font-bold text-gray-800">Messages</h1>
        <button onClick={() => navigate('/coach/messages/new')}
          className="text-sm bg-primary-600 text-white rounded-lg px-3 py-1.5 hover:bg-primary-700">
          + New
        </button>
      </header>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-2">
        {loading && <p className="text-center text-gray-400">Loading…</p>}
        {!loading && messages.length === 0 && <p className="text-center text-gray-400 mt-16">No messages sent yet.</p>}
        {messages.map((m) => (
          <div key={m.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button onClick={() => setExpanded((p) => p === m.id ? null : m.id)} className="w-full text-left px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">{m.subject}</p>
                <p className="text-xs text-gray-400">
                  To: {m.parent ? m.parent.name : 'All parents'} · {format(parseISO(m.sent_at), 'MMM d')}
                </p>
              </div>
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
