import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isFuture } from 'date-fns';
import { useParent } from '../../hooks/useParent';

interface BookedSession {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  student: { id: string; name: string } | null;
}

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const { parentId } = useParent();
  const [sessions, setSessions] = useState<BookedSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!parentId) return;
    async function load() {
      const res = await fetch(`/api/public/bookings/${parentId}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions ?? []);
      }
      setLoading(false);
    }
    load();
  }, [parentId]);

  async function cancel(sessionId: string) {
    if (!confirm('Cancel this booking?')) return;
    const res = await fetch(`/api/public/book/${sessionId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId }),
    });
    if (res.ok) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    }
  }

  if (!parentId) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4 text-center text-gray-500">
        Ask your coach for the join link to get started.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/slots')} className="text-sm text-primary-600">← Slots</button>
        <h1 className="text-lg font-bold text-gray-800">My bookings</h1>
        <div />
      </header>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-3">
        {loading && <p className="text-center text-gray-400">Loading…</p>}
        {!loading && sessions.length === 0 && (
          <p className="text-center text-gray-400 mt-16">No bookings yet.</p>
        )}
        {sessions.map((s) => (
          <div key={s.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">{format(parseISO(s.start_time), 'EEEE, MMMM d')}</p>
              <p className="text-sm text-gray-500">
                {format(parseISO(s.start_time), 'h:mm a')} – {format(parseISO(s.end_time), 'h:mm a')}
              </p>
              {s.student && <p className="text-xs text-gray-400 mt-0.5">{s.student.name}</p>}
            </div>
            {isFuture(parseISO(s.start_time)) && (
              <button
                onClick={() => cancel(s.id)}
                className="text-sm text-red-500 hover:text-red-700 border border-red-200 rounded-lg px-3 py-1.5 transition"
              >
                Cancel
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
