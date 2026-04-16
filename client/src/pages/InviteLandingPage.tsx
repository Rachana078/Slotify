import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface InviteInfo {
  coach: { id: string; name: string };
  email?: string;
}

type Step = 'loading' | 'invalid' | 'enter-email' | 'check-email' | 'enter-name' | 'done';

export default function InviteLandingPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('loading');
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/invites/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.valid) { setStep('invalid'); return; }
        setInvite(data);
        setEmail(data.email ?? '');
        setStep('enter-email');
      })
      .catch(() => setStep('invalid'));
  }, [token]);

  // After magic link redirect, user is now authenticated — redeem invite
  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session && step === 'check-email') {
        setStep('enter-name');
      }
    });
  }, [step]);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/invite/${token}` },
    });
    if (error) { setError(error.message); } else { setStep('check-email'); }
    setLoading(false);
  }

  async function redeemInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError('Not authenticated'); setLoading(false); return; }

    const res = await fetch(`/api/invites/${token}/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ name, student_name: studentName }),
    });

    const body = await res.json();
    if (!res.ok) { setError(body.error); } else { navigate('/parent/slots'); }
    setLoading(false);
  }

  if (step === 'loading') return <div className="flex items-center justify-center min-h-screen text-gray-400">Loading…</div>;

  if (step === 'invalid') return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 max-w-sm w-full text-center">
        <h2 className="text-xl font-bold text-red-600 mb-2">Invalid invite</h2>
        <p className="text-gray-500">This invite link is invalid, expired, or already used.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 max-w-sm w-full">
        <h1 className="text-2xl font-bold text-primary-600 mb-1 text-center">CoachBook</h1>
        {invite && <p className="text-center text-gray-500 text-sm mb-6">You've been invited by <strong>{invite.coach.name}</strong></p>}

        {step === 'enter-email' && (
          <form onSubmit={sendMagicLink} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600" />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-primary-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition">
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}

        {step === 'check-email' && (
          <div className="text-center">
            <p className="text-green-600 font-medium">Check your email!</p>
            <p className="text-sm text-gray-500 mt-2">Click the magic link to continue setting up your account.</p>
          </div>
        )}

        {step === 'enter-name' && (
          <form onSubmit={redeemInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student's name</label>
              <input type="text" required value={studentName} onChange={(e) => setStudentName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600" />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-primary-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition">
              {loading ? 'Setting up…' : 'Complete sign up'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
