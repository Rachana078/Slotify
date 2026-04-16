import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { useSessions } from '../../hooks/useSession';
import { useFCM } from '../../hooks/useFCM';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Session } from '@coachbook/shared';

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7am–7pm
const DAYS = 7;

function sessionColor(status: Session['status']) {
  switch (status) {
    case 'open': return 'bg-green-100 text-green-800 border-green-200';
    case 'booked': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
    case 'blocked': return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const { sessions, loading, setSessions } = useSessions({
    date_from: weekStart.toISOString(),
    date_to: addDays(weekStart, 7).toISOString(),
  });
  const [selected, setSelected] = useState<Session | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { user } = useAuth();

  useFCM(true);

  const joinUrl = user ? `${window.location.origin}/join/${user.id}` : '';

  const weekDays = Array.from({ length: DAYS }, (_, i) => addDays(weekStart, i));

  function sessionsForDayHour(day: Date, hour: number) {
    return sessions.filter((s) => {
      const start = parseISO(s.start_time);
      return isSameDay(start, day) && start.getHours() === hour;
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-primary-600">CoachBook</h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/coach/availability/new')}
            className="bg-primary-600 text-white text-sm rounded-lg px-3 py-1.5 hover:bg-primary-700 transition"
          >
            + Add availability
          </button>
          <button onClick={() => setShowQR((v) => !v)} className="text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">
            QR Code
          </button>
          <button onClick={() => navigate('/coach/history')} className="text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">
            History
          </button>
          <button
            onClick={signOut}
            className="text-sm text-gray-500 hover:text-gray-700 px-2"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* QR panel */}
      {showQR && joinUrl && (
        <div className="bg-white border-b px-4 py-6 flex flex-col items-center gap-4">
          <p className="text-sm font-medium text-gray-700">Share this with parents so they can join your roster:</p>
          <QRCodeSVG value={joinUrl} size={160} />
          <div className="flex items-center gap-2 w-full max-w-sm">
            <input
              readOnly
              value={joinUrl}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 bg-gray-50 select-all"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={() => navigator.clipboard.writeText(joinUrl)}
              className="text-xs text-primary-600 border border-primary-200 rounded-lg px-3 py-1.5 hover:bg-primary-50 transition"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Week nav */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <button
          onClick={() => setWeekStart((d) => addDays(d, -7))}
          className="text-gray-500 hover:text-gray-800 text-sm"
        >
          ← Prev
        </button>
        <span className="text-sm font-medium text-gray-700">
          {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </span>
        <button
          onClick={() => setWeekStart((d) => addDays(d, 7))}
          className="text-gray-500 hover:text-gray-800 text-sm"
        >
          Next →
        </button>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>
        ) : (
          <table className="min-w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="w-12 bg-gray-50 border-b border-r" />
                {weekDays.map((d) => (
                  <th
                    key={d.toISOString()}
                    className="border-b border-r p-2 text-center font-medium text-gray-500 bg-gray-50"
                  >
                    <div>{format(d, 'EEE')}</div>
                    <div
                      className={`text-lg font-bold ${
                        isSameDay(d, new Date()) ? 'text-primary-600' : 'text-gray-800'
                      }`}
                    >
                      {format(d, 'd')}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map((hour) => (
                <tr key={hour} className="h-16">
                  <td className="border-r border-b px-2 text-gray-400 align-top pt-1 text-right w-12">
                    {format(new Date().setHours(hour, 0), 'ha')}
                  </td>
                  {weekDays.map((day) => {
                    const slots = sessionsForDayHour(day, hour);
                    return (
                      <td key={day.toISOString()} className="border-r border-b p-1 h-16">
                        <div className="flex flex-col gap-0.5 h-full">
                        {slots.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setSelected(s)}
                            className={`w-full flex-1 text-left rounded px-1 py-0.5 border ${sessionColor(s.status)} hover:opacity-80 transition`}
                          >
                            <div className="font-medium">
                              {format(parseISO(s.start_time), 'h:mm a')}
                            </div>
                            {s.student && (
                              <div className="truncate">{s.student.name}</div>
                            )}
                          </button>
                        ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Session detail modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-800 mb-4">Session details</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Date</dt>
                <dd className="font-medium">{format(parseISO(selected.start_time), 'PPP')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Time</dt>
                <dd className="font-medium">
                  {format(parseISO(selected.start_time), 'h:mm a')} –{' '}
                  {format(parseISO(selected.end_time), 'h:mm a')}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Status</dt>
                <dd>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${sessionColor(selected.status)}`}
                  >
                    {selected.status}
                  </span>
                </dd>
              </div>
              {selected.student && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Student</dt>
                  <dd className="font-medium">{selected.student.name}</dd>
                </div>
              )}
              {selected.parent && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Parent</dt>
                  <dd className="font-medium">{selected.parent.name}</dd>
                </div>
              )}
            </dl>
            {selected.status !== 'cancelled' && selected.status !== 'blocked' && (
              <button
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  const { data: { session: auth } } = await supabase.auth.getSession();
                  if (!auth) { setDeleting(false); return; }
                  const res = await fetch(`/api/sessions/${selected.id}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.access_token}` },
                    body: JSON.stringify({}),
                  });
                  if (res.ok) {
                    setSessions((prev) => prev.filter((s) => s.id !== selected.id));
                  }
                  setSelected(null);
                  setDeleting(false);
                }}
                className="mt-4 w-full border border-red-300 text-red-600 rounded-lg py-2 text-sm hover:bg-red-50 disabled:opacity-50 transition"
              >
                {deleting ? 'Deleting…' : selected.status === 'booked' ? 'Cancel session' : 'Delete slot'}
              </button>
            )}
            <button
              onClick={() => setSelected(null)}
              className="mt-6 w-full border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
