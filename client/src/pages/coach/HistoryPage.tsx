import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { supabase } from '../../lib/supabase';

interface Session {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  cancelled_by_role: string | null;
  student: { name: string } | null;
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session: auth } } = await supabase.auth.getSession();
      if (!auth) return;

      const params = new URLSearchParams({ status: 'booked' });
      const [bookedRes, cancelledRes] = await Promise.all([
        fetch(`/api/sessions?${new URLSearchParams({ status: 'booked' })}`, {
          headers: { Authorization: `Bearer ${auth.access_token}` },
        }),
        fetch(`/api/sessions?${new URLSearchParams({ status: 'cancelled' })}`, {
          headers: { Authorization: `Bearer ${auth.access_token}` },
        }),
      ]);

      const [bookedData, cancelledData] = await Promise.all([
        bookedRes.json(),
        cancelledRes.json(),
      ]);

      const now = new Date().toISOString();
      const past = [
        ...(bookedData.sessions ?? []),
        ...(cancelledData.sessions ?? []),
      ]
        .filter((s: Session) => s.start_time < now)
        .sort((a: Session, b: Session) => b.start_time.localeCompare(a.start_time));

      setSessions(past);
      setLoading(false);
    }
    load();
  }, []);

  function statusBadge(s: Session) {
    if (s.status === 'cancelled') {
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
          Cancelled{s.cancelled_by_role ? ` by ${s.cancelled_by_role}` : ''}
        </span>
      );
    }
    return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">Completed</span>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/coach/dashboard')} className="text-sm text-primary-600">← Dashboard</button>
        <h1 className="text-lg font-bold text-gray-800">Session history</h1>
        <div />
      </header>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-3">
        {loading && <p className="text-center text-gray-400">Loading…</p>}
        {!loading && sessions.length === 0 && (
          <p className="text-center text-gray-400 mt-16">No past sessions yet.</p>
        )}
        {sessions.map((s) => (
          <div key={s.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-800">{format(parseISO(s.start_time), 'EEEE, MMMM d, yyyy')}</p>
                <p className="text-sm text-gray-500">
                  {format(parseISO(s.start_time), 'h:mm a')} – {format(parseISO(s.end_time), 'h:mm a')}
                </p>
                {s.student && <p className="text-sm text-gray-600 mt-0.5">{s.student.name}</p>}
              </div>
              <div>{statusBadge(s)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
