import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useParent } from '../../hooks/useParent';
import { requestFcmToken } from '../../lib/firebase';

interface Session {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  is_my_booking: boolean;
  is_waitlisted: boolean;
}

export default function SlotListPage() {
  const navigate = useNavigate();
  const { parentId } = useParent();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!parentId) return;

    // Silently refresh FCM token if permission already granted
    if (Notification.permission === 'granted') {
      requestFcmToken().then((token) => {
        if (token) {
          fetch(`/api/public/fcm-token/${parentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fcmToken: token }),
          }).catch(() => {});
        }
      });
    }

    async function load() {
      const res = await fetch(`/api/public/slots/${parentId}`);
      if (!res.ok) { setError('Could not load slots.'); setLoading(false); return; }
      const data = await res.json();
      setSessions(data.sessions ?? []);
      setLoading(false);
    }
    load();
  }, [parentId]);

  async function joinWaitlist(sessionId: string) {
    setActionLoading(sessionId);
    await fetch(`/api/public/waitlist/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId }),
    });
    setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, is_waitlisted: true } : s));
    setActionLoading(null);
  }

  async function leaveWaitlist(sessionId: string) {
    setActionLoading(sessionId);
    await fetch(`/api/public/waitlist/${sessionId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId }),
    });
    setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, is_waitlisted: false } : s));
    setActionLoading(null);
  }

  if (!parentId) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4 text-center text-gray-500">
        Ask your coach for the join link to get started.
      </div>
    );
  }

  const openSlots = sessions.filter((s) => s.status === 'open');
  const bookedSlots = sessions.filter((s) => s.status === 'booked');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-primary-600">Available Slots</h1>
        <button onClick={() => navigate('/my-bookings')} className="text-sm text-gray-500 hover:text-gray-700">
          My bookings
        </button>
      </header>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-3">
        {loading && <p className="text-center text-gray-400">Loading slots…</p>}
        {error && <p className="text-center text-red-500">{error}</p>}

        {!loading && openSlots.length === 0 && bookedSlots.length === 0 && (
          <p className="text-center text-gray-400 mt-16">No slots available right now. Check back soon!</p>
        )}

        {openSlots.map((s) => (
          <div key={s.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">{format(parseISO(s.start_time), 'EEEE, MMMM d')}</p>
              <p className="text-sm text-gray-500">
                {format(parseISO(s.start_time), 'h:mm a')} – {format(parseISO(s.end_time), 'h:mm a')}
              </p>
            </div>
            <button
              onClick={() => navigate(`/book/${s.id}`)}
              className="bg-primary-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary-700 transition"
            >
              Book
            </button>
          </div>
        ))}

        {bookedSlots.length > 0 && (
          <>
            {openSlots.length > 0 && <p className="text-xs text-gray-400 pt-2 uppercase tracking-wide">Already booked</p>}
            {bookedSlots.map((s) => (
              <div key={s.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between opacity-80">
                <div>
                  <p className="font-semibold text-gray-700">{format(parseISO(s.start_time), 'EEEE, MMMM d')}</p>
                  <p className="text-sm text-gray-400">
                    {format(parseISO(s.start_time), 'h:mm a')} – {format(parseISO(s.end_time), 'h:mm a')}
                  </p>
                  {s.is_my_booking && <span className="text-xs text-blue-500 font-medium">Your booking</span>}
                </div>
                <div>
                  {s.is_my_booking ? (
                    <button
                      onClick={() => navigate('/my-bookings')}
                      className="text-xs text-blue-500 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition"
                    >
                      View
                    </button>
                  ) : s.is_waitlisted ? (
                    <button
                      onClick={() => leaveWaitlist(s.id)}
                      disabled={actionLoading === s.id}
                      className="border border-gray-300 text-gray-500 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition"
                    >
                      {actionLoading === s.id ? '…' : 'On waitlist ✓'}
                    </button>
                  ) : (
                    <button
                      onClick={() => joinWaitlist(s.id)}
                      disabled={actionLoading === s.id}
                      className="border border-orange-400 text-orange-600 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-orange-50 disabled:opacity-50 transition"
                    >
                      {actionLoading === s.id ? '…' : 'Waitlist'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
