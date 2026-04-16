import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Parent } from '@coachbook/shared';

export default function ComposeMessagePage() {
  const navigate = useNavigate();
  const [parents, setParents] = useState<Parent[]>([]);
  const [parentId, setParentId] = useState<string>('all');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadParents() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: coach } = await supabase.from('coaches').select('id').eq('id', session.user.id).single();
      if (!coach) return;
      const { data } = await supabase.from('parents').select('id, name, email, coach_id, phone, created_at').eq('coach_id', coach.id);
      setParents(data ?? []);
    }
    loadParents();
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ parent_id: parentId === 'all' ? undefined : parentId, subject, body }),
    });

    const data = await res.json();
    if (!res.ok) { setError(data.error); } else { navigate('/coach/messages'); }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/coach/messages')} className="text-sm text-primary-600">← Messages</button>
        <h1 className="text-lg font-bold text-gray-800">New message</h1>
        <div />
      </header>
      <div className="max-w-lg mx-auto px-4 py-6">
        <form onSubmit={handleSend} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <select value={parentId} onChange={(e) => setParentId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600">
              <option value="all">All parents</option>
              {parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input type="text" required value={subject} onChange={(e) => setSubject(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea required rows={6} value={body} onChange={(e) => setBody(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-primary-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition">
            {loading ? 'Sending…' : 'Send message'}
          </button>
        </form>
      </div>
    </div>
  );
}
