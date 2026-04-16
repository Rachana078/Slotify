import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { requestFcmToken } from '../../lib/firebase';
import { useParent } from '../../hooks/useParent';

type Step = 'loading' | 'form' | 'error';

export default function JoinPage() {
  const { coachId } = useParams<{ coachId: string }>();
  const navigate = useNavigate();
  const { parentId, saveParent } = useParent();
  const [step, setStep] = useState<Step>('loading');
  const [coachName, setCoachName] = useState('');
  const [name, setName] = useState('');
  const [studentNames, setStudentNames] = useState(['']);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (parentId) { navigate('/slots', { replace: true }); return; }
    async function loadCoach() {
      try {
        const res = await fetch(`/api/public/coach/${coachId}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setCoachName(data.name);
        setStep('form');
      } catch {
        setStep('error');
      }
    }
    if (coachId) loadCoach();
  }, [coachId, parentId, navigate]);

  function updateChild(index: number, value: string) {
    setStudentNames((prev) => prev.map((n, i) => i === index ? value : n));
  }

  function addChild() {
    setStudentNames((prev) => [...prev, '']);
  }

  function removeChild(index: number) {
    setStudentNames((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    const fcmToken = await requestFcmToken();
    const filledNames = studentNames.filter((n) => n.trim());

    const res = await fetch(`/api/public/join/${coachId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, studentNames: filledNames, fcmToken }),
    });

    const body = await res.json();
    if (!res.ok) {
      setErrorMsg(body.error ?? 'Something went wrong');
      setSubmitting(false);
      return;
    }

    saveParent(body.parentId);
    navigate('/slots', { replace: true });
  }

  if (step === 'loading') {
    return <div className="flex items-center justify-center min-h-screen text-gray-400">Loading…</div>;
  }

  if (step === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <p className="text-red-500 text-center">Invalid link. Ask your coach for a new QR code.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-6 max-w-sm w-full">
        <h1 className="text-xl font-bold text-gray-800 mb-1">Join {coachName}'s roster</h1>
        <p className="text-sm text-gray-500 mb-6">You'll get push notifications when new slots open.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
              placeholder="Jane Smith"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {studentNames.length === 1 ? "Child's name" : "Children's names"}
            </label>
            <div className="space-y-2">
              {studentNames.map((childName, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text" value={childName} onChange={(e) => updateChild(i, e.target.value)} required
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                    placeholder="Alex Smith"
                  />
                  {studentNames.length > 1 && (
                    <button type="button" onClick={() => removeChild(i)}
                      className="text-gray-400 hover:text-red-500 px-2 transition">✕</button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addChild}
              className="mt-2 text-sm text-primary-600 hover:text-primary-700">
              + Add another child
            </button>
          </div>

          {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}

          <button type="submit" disabled={submitting}
            className="w-full bg-primary-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition">
            {submitting ? 'Signing up…' : 'Sign up & allow notifications'}
          </button>
        </form>
      </div>
    </div>
  );
}
