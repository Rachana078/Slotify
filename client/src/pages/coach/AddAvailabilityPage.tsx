import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function AddAvailabilityPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    date: '',
    start_time: '',
    end_time: '',
    slot_duration_min: 60,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ sessions_created: number } | null>(null);

  function set(field: string, value: string | number) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    // Send ISO strings for correct UTC slot generation; keep HH:MM for storage
    const startISO = new Date(`${form.date}T${form.start_time}:00`).toISOString();
    const endISO = new Date(`${form.date}T${form.end_time}:00`).toISOString();

    const res = await fetch('/api/availability', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ ...form, start_iso: startISO, end_iso: endISO }),
    });

    const body = await res.json();
    if (!res.ok) {
      setError(body.error ?? 'Failed to create availability');
    } else {
      setResult({ sessions_created: body.sessions_created });
    }
    setLoading(false);
  }

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-md p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Slots created!</h2>
          <p className="text-gray-500 mb-6">
            {result.sessions_created} slots are now open. Parents have been notified.
          </p>
          <button
            onClick={() => navigate('/coach/dashboard')}
            className="w-full bg-primary-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-700 transition"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => navigate('/coach/dashboard')}
          className="text-sm text-primary-600 mb-6 inline-flex items-center gap-1"
        >
          ← Dashboard
        </button>
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h1 className="text-xl font-bold text-gray-800 mb-6">Add availability</h1>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start time</label>
                <input
                  type="time"
                  required
                  value={form.start_time}
                  onChange={(e) => set('start_time', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End time</label>
                <input
                  type="time"
                  required
                  value={form.end_time}
                  onChange={(e) => set('end_time', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slot duration (minutes)
              </label>
              <select
                value={form.slot_duration_min}
                onChange={(e) => set('slot_duration_min', Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
              >
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
                <option value={90}>90 min</option>
              </select>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition"
            >
              {loading ? 'Creating slots…' : 'Create slots & notify parents'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
