import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useParent } from '../../hooks/useParent';

interface SessionInfo {
  id: string;
  start_time: string;
  end_time: string;
}

interface Student {
  id: string;
  name: string;
}

export default function BookingConfirmPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { parentId } = useParent();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    if (!parentId) return;
    async function load() {
      const [slotsRes, studentsRes] = await Promise.all([
        fetch(`/api/public/slots/${parentId}`),
        fetch(`/api/public/students/${parentId}`),
      ]);
      if (slotsRes.ok) {
        const data = await slotsRes.json();
        const found = (data.sessions ?? []).find((s: SessionInfo) => s.id === sessionId);
        setSession(found ?? null);
      }
      if (studentsRes.ok) {
        const data = await studentsRes.json();
        setStudents(data.students ?? []);
        if (data.students?.length === 1) setSelectedStudentId(data.students[0].id);
      }
      setLoading(false);
    }
    load();
  }, [parentId, sessionId]);

  async function handleBook() {
    if (!parentId) return;
    if (students.length > 1 && !selectedStudentId) {
      setError('Please select which child this booking is for.');
      return;
    }
    setBooking(true);
    setError('');

    const res = await fetch(`/api/public/book/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId, studentId: selectedStudentId || undefined }),
    });

    const body = await res.json();
    if (!res.ok) {
      setError(body.error ?? 'Booking failed');
    } else {
      setBooked(true);
    }
    setBooking(false);
  }

  if (!parentId) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4 text-center text-gray-500">
        Ask your coach for the join link to get started.
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-gray-400">Loading…</div>;
  }

  if (booked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-md p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Booking confirmed!</h2>
          <p className="text-gray-500 mb-6">Your lesson is booked. You'll get a reminder before it starts.</p>
          <button
            onClick={() => navigate('/slots')}
            className="w-full bg-primary-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-700 transition"
          >
            Back to slots
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => navigate('/slots')}
          className="text-sm text-primary-600 mb-6 inline-flex items-center gap-1"
        >
          ← Back to slots
        </button>
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h1 className="text-xl font-bold text-gray-800 mb-6">Confirm booking</h1>

          {session ? (
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="font-semibold text-gray-800">
                {format(parseISO(session.start_time), 'EEEE, MMMM d')}
              </p>
              <p className="text-sm text-gray-500">
                {format(parseISO(session.start_time), 'h:mm a')} –{' '}
                {format(parseISO(session.end_time), 'h:mm a')}
              </p>
            </div>
          ) : (
            <p className="text-sm text-red-500 mb-6">
              This slot is no longer available.
            </p>
          )}

          {students.length > 1 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Which child is this for?
              </label>
              <div className="space-y-2">
                {students.map((s) => (
                  <label
                    key={s.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      selectedStudentId === s.id
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="student"
                      value={s.id}
                      checked={selectedStudentId === s.id}
                      onChange={() => setSelectedStudentId(s.id)}
                      className="accent-primary-600"
                    />
                    <span className="text-sm font-medium text-gray-800">{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <button
            onClick={handleBook}
            disabled={booking || !session}
            className="w-full bg-primary-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition"
          >
            {booking ? 'Booking…' : 'Confirm booking'}
          </button>
        </div>
      </div>
    </div>
  );
}
