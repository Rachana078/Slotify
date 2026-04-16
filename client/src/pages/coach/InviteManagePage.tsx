import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { supabase } from '../../lib/supabase';
import type { CoachInvite } from '@coachbook/shared';

export default function InviteManagePage() {
  const navigate = useNavigate();
  const [invites, setInvites] = useState<CoachInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newLink, setNewLink] = useState('');
  const [error, setError] = useState('');
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      tokenRef.current = session?.access_token ?? null;
      loadInvites(session?.access_token);
    });
  }, []);

  async function authFetch(path: string, options: RequestInit = {}) {
    const token = tokenRef.current;
    return fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers ?? {}),
      },
    });
  }

  async function loadInvites(token?: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/invites', {
        headers: { Authorization: `Bearer ${token ?? tokenRef.current}` },
      });
      const { invites: data } = await res.json();
      setInvites(data ?? []);
    } catch {
      setError('Failed to load invites');
    }
    setLoading(false);
  }

  async function generate() {
    setGenerating(true);
    setError('');
    try {
      const res = await authFetch('/api/invites', { method: 'POST', body: JSON.stringify({}) });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? 'Failed to generate invite');
      } else {
        setNewLink(body.invite_url);
        setInvites((prev) => [body.invite, ...prev]);
      }
    } catch {
      setError('Network error');
    }
    setGenerating(false);
  }

  function inviteStatus(invite: CoachInvite) {
    if (invite.used_at) return { label: 'Used', color: 'text-gray-400' };
    if (new Date(invite.expires_at) < new Date()) return { label: 'Expired', color: 'text-red-400' };
    return { label: 'Active', color: 'text-green-600' };
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/coach/dashboard')} className="text-sm text-primary-600">← Dashboard</button>
        <h1 className="text-lg font-bold text-gray-800">Invite parents</h1>
        <div />
      </header>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <button onClick={generate} disabled={generating}
          className="w-full bg-primary-600 text-white rounded-xl py-3 font-medium hover:bg-primary-700 disabled:opacity-50 transition">
          {generating ? 'Generating…' : '+ Generate invite link'}
        </button>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        {newLink && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm font-medium text-green-800 mb-2">New invite link (valid 7 days):</p>
            <div className="flex gap-2">
              <input readOnly value={newLink} className="flex-1 text-xs border rounded px-2 py-1 bg-white" />
              <button onClick={() => navigator.clipboard.writeText(newLink)}
                className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">Copy</button>
            </div>
          </div>
        )}

        {loading ? <p className="text-center text-gray-400">Loading…</p> : (
          <div className="space-y-2">
            {invites.map((inv) => {
              const status = inviteStatus(inv);
              return (
                <div key={inv.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{inv.email ?? 'Open invite'}</p>
                    <p className="text-xs text-gray-400">Expires {format(parseISO(inv.expires_at), 'MMM d')}</p>
                  </div>
                  <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                </div>
              );
            })}
            {invites.length === 0 && <p className="text-center text-gray-400 mt-8">No invites yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
