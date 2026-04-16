import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../lib/supabase';
import { sendToUser, broadcastToParents } from '../services/fcm';

const router = Router();

// GET /api/public/coach/:coachId
router.get('/coach/:coachId', async (req: Request, res: Response) => {
  const { coachId } = req.params;
  const { data: coach, error } = await supabaseAdmin
    .from('coaches').select('id, name').eq('id', coachId).single();
  if (error || !coach) { res.status(404).json({ error: 'Coach not found' }); return; }
  res.json({ id: coach.id, name: coach.name });
});

// POST /api/public/join/:coachId
router.post('/join/:coachId', async (req: Request, res: Response) => {
  const { coachId } = req.params;
  const { name, studentNames, fcmToken } = req.body;

  // Accept studentNames (array) or legacy studentName (string)
  const childNames: string[] = Array.isArray(studentNames)
    ? studentNames.filter((n: string) => n?.trim())
    : req.body.studentName ? [req.body.studentName] : [];

  if (!name || childNames.length === 0) {
    res.status(400).json({ error: 'name and at least one student name are required' });
    return;
  }

  const { data: coach, error: coachError } = await supabaseAdmin
    .from('coaches').select('id').eq('id', coachId).single();
  if (coachError || !coach) { res.status(404).json({ error: 'Coach not found' }); return; }

  const parentId = randomUUID();

  const { error: parentError } = await supabaseAdmin
    .from('parents').insert({ id: parentId, name, coach_id: coachId, email: null });
  if (parentError) { res.status(500).json({ error: parentError.message }); return; }

  const studentRows = childNames.map((childName) => ({
    id: randomUUID(),
    name: childName,
    parent_id: parentId,
    coach_id: coachId,
  }));

  const { error: studentError } = await supabaseAdmin.from('students').insert(studentRows);
  if (studentError) { res.status(500).json({ error: studentError.message }); return; }

  if (fcmToken) {
    await supabaseAdmin.from('fcm_tokens')
      .upsert({ user_id: parentId, user_type: 'parent', token: fcmToken }, { onConflict: 'user_id' });
  }

  res.status(201).json({ parentId });
});

// PUT /api/public/fcm-token/:parentId — refresh FCM token
router.put('/fcm-token/:parentId', async (req: Request, res: Response) => {
  const { parentId } = req.params;
  const { fcmToken } = req.body;
  if (!fcmToken) { res.status(400).json({ error: 'fcmToken is required' }); return; }

  const { data: parent } = await supabaseAdmin
    .from('parents').select('id').eq('id', parentId).single();
  if (!parent) { res.status(404).json({ error: 'Parent not found' }); return; }

  await supabaseAdmin.from('fcm_tokens')
    .upsert({ user_id: parentId, user_type: 'parent', token: fcmToken }, { onConflict: 'user_id' });

  res.json({ ok: true });
});

// GET /api/public/slots/:parentId — upcoming open+booked sessions with annotations
router.get('/slots/:parentId', async (req: Request, res: Response) => {
  const { parentId } = req.params;

  const { data: parent, error: parentError } = await supabaseAdmin
    .from('parents').select('id, coach_id').eq('id', parentId).single();
  if (parentError || !parent) { res.status(404).json({ error: 'Parent not found' }); return; }

  const now = new Date().toISOString();

  const { data: sessions, error: sessionsError } = await supabaseAdmin
    .from('sessions')
    .select('id, start_time, end_time, status, booked_parent_id')
    .eq('coach_id', parent.coach_id)
    .in('status', ['open', 'booked'])
    .gte('start_time', now)
    .order('start_time', { ascending: true });

  if (sessionsError) { res.status(500).json({ error: sessionsError.message }); return; }

  // Get parent's waitlist entries for booked sessions
  const bookedIds = (sessions ?? []).filter(s => s.status === 'booked').map(s => s.id);
  let waitlistedIds: string[] = [];
  if (bookedIds.length > 0) {
    const { data: wl } = await supabaseAdmin
      .from('waitlist').select('session_id').eq('parent_id', parentId).in('session_id', bookedIds);
    waitlistedIds = wl?.map((w: { session_id: string }) => w.session_id) ?? [];
  }

  const annotated = (sessions ?? []).map(s => ({
    id: s.id,
    start_time: s.start_time,
    end_time: s.end_time,
    status: s.status,
    is_my_booking: s.booked_parent_id === parentId,
    is_waitlisted: waitlistedIds.includes(s.id),
  }));

  res.json({ sessions: annotated });
});

// POST /api/public/book/:sessionId
router.post('/book/:sessionId', async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { parentId } = req.body;
  if (!parentId) { res.status(400).json({ error: 'parentId is required' }); return; }

  const { data: parent, error: parentError } = await supabaseAdmin
    .from('parents').select('id, coach_id').eq('id', parentId).single();
  if (parentError || !parent) { res.status(404).json({ error: 'Parent not found' }); return; }

  const { data: students } = await supabaseAdmin
    .from('students').select('id, name').eq('parent_id', parentId).limit(1);
  if (!students?.length) { res.status(400).json({ error: 'No students found for this parent' }); return; }

  const student = students[0];

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('sessions')
    .update({ status: 'booked', student_id: student.id, booked_parent_id: parentId })
    .eq('id', sessionId)
    .eq('status', 'open')
    .select()
    .single();

  if (updateError || !updated) { res.status(409).json({ error: 'Slot no longer available' }); return; }

  // Notify coach
  const { data: coachTokens } = await supabaseAdmin
    .from('fcm_tokens').select('token').eq('user_id', parent.coach_id).eq('user_type', 'coach');
  if (coachTokens?.length) {
    for (const { token } of coachTokens) {
      sendToUser(token, 'New booking!', `${student.name} booked a session.`, { url: '/coach/dashboard' }).catch(console.error);
    }
  }

  res.json({ session: updated });
});

// DELETE /api/public/book/:sessionId — parent cancels their booking
router.delete('/book/:sessionId', async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { parentId } = req.body;
  if (!parentId) { res.status(400).json({ error: 'parentId is required' }); return; }

  const { data: session, error: fetchError } = await supabaseAdmin
    .from('sessions').select('id, booked_parent_id, status, coach_id').eq('id', sessionId).single();
  if (fetchError || !session) { res.status(404).json({ error: 'Session not found' }); return; }
  if (session.booked_parent_id !== parentId) { res.status(403).json({ error: 'Not your booking' }); return; }
  if (session.status !== 'booked') { res.status(409).json({ error: 'Session is not booked' }); return; }

  const { promoteWaitlist } = await import('../services/waitlist');
  await promoteWaitlist(sessionId, session.coach_id);

  res.json({ ok: true });
});

// GET /api/public/bookings/:parentId — booked sessions for this parent
router.get('/bookings/:parentId', async (req: Request, res: Response) => {
  const { parentId } = req.params;

  const { data: parent } = await supabaseAdmin
    .from('parents').select('id').eq('id', parentId).single();
  if (!parent) { res.status(404).json({ error: 'Parent not found' }); return; }

  const { data: sessions, error } = await supabaseAdmin
    .from('sessions')
    .select('id, start_time, end_time, status, student:students(id, name)')
    .eq('booked_parent_id', parentId)
    .eq('status', 'booked')
    .order('start_time', { ascending: true });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ sessions: sessions ?? [] });
});

// POST /api/public/waitlist/:sessionId — join waitlist
router.post('/waitlist/:sessionId', async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { parentId } = req.body;
  if (!parentId) { res.status(400).json({ error: 'parentId is required' }); return; }

  const { data: parent } = await supabaseAdmin
    .from('parents').select('id').eq('id', parentId).single();
  if (!parent) { res.status(404).json({ error: 'Parent not found' }); return; }

  const { data: session } = await supabaseAdmin
    .from('sessions').select('id, status, start_time').eq('id', sessionId).single();
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
  if (session.status !== 'booked') { res.status(400).json({ error: 'Can only join waitlist for booked slots' }); return; }

  const { data: maxRow } = await supabaseAdmin
    .from('waitlist').select('position').eq('session_id', sessionId)
    .order('position', { ascending: false }).limit(1).maybeSingle();
  const position = (maxRow?.position ?? 0) + 1;

  const { data: entry, error } = await supabaseAdmin
    .from('waitlist').insert({ session_id: sessionId, parent_id: parentId, position }).select().single();

  if (error) {
    if (error.code === '23505') { res.status(409).json({ error: 'Already on waitlist' }); return; }
    res.status(500).json({ error: error.message }); return;
  }

  const startStr = new Date(session.start_time).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  const { data: tokens } = await supabaseAdmin
    .from('fcm_tokens').select('token').eq('user_id', parentId).eq('user_type', 'parent');
  if (tokens?.length) {
    await Promise.allSettled(
      tokens.map((t: { token: string }) =>
        sendToUser(t.token, "You're on the waitlist", `You're #${position} for the ${startStr} slot.`, { url: '/slots' })
      )
    );
  }

  res.status(201).json({ entry, position });
});

// DELETE /api/public/waitlist/:sessionId — leave waitlist
router.delete('/waitlist/:sessionId', async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { parentId } = req.body;
  if (!parentId) { res.status(400).json({ error: 'parentId is required' }); return; }

  await supabaseAdmin.from('waitlist').delete().eq('session_id', sessionId).eq('parent_id', parentId);

  // Re-number remaining entries
  const { data: remaining } = await supabaseAdmin
    .from('waitlist').select('id').eq('session_id', sessionId).order('position', { ascending: true });
  if (remaining?.length) {
    await Promise.all(remaining.map((r: { id: string }, i: number) =>
      supabaseAdmin.from('waitlist').update({ position: i + 1 }).eq('id', r.id)
    ));
  }

  res.status(204).end();
});

export default router;
