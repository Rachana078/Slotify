import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import { sendToUser } from '../services/fcm';
import type { GetSessionsQuery } from '@coachbook/shared';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { status, date_from, date_to } = req.query as GetSessionsQuery;
  const user = req.user!;

  let query = supabaseAdmin
    .from('sessions')
    .select(
      `
      *,
      student:students(id, name),
      availability:availability(date, slot_duration_min)
    `
    )
    .order('start_time', { ascending: true });

  if (user.role === 'coach') {
    query = query.eq('coach_id', user.id);
  } else if (user.role === 'parent') {
    // Parent sees their booked sessions + all open ones for their coach
    const { data: parent } = await supabaseAdmin
      .from('parents')
      .select('id, coach_id')
      .eq('id', user.id)
      .single();

    if (!parent) {
      res.status(403).json({ error: 'Parent record not found' });
      return;
    }

    query = query.eq('coach_id', parent.coach_id);
    // Filter to open + booked by their students
    const { data: students } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('parent_id', user.id);

    const studentIds = students?.map((s) => s.id) ?? [];
    if (studentIds.length > 0) {
      query = query.or(`status.eq.open,student_id.in.(${studentIds.join(',')})`);
    } else {
      query = query.eq('status', 'open');
    }
  }

  if (status) query = query.eq('status', status);
  if (date_from) query = query.gte('start_time', date_from);
  if (date_to) query = query.lte('start_time', date_to);

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ sessions: data });
});

router.delete('/:sessionId', requireAuth, async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { reason } = req.body as { reason?: string };
  const user = req.user!;

  const { data: session } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
  if (session.status !== 'booked') { res.status(400).json({ error: 'Only booked sessions can be cancelled' }); return; }

  if (user.role === 'parent' && session.booked_parent_id !== user.id) {
    res.status(403).json({ error: 'Not your booking' }); return;
  }
  if (user.role === 'coach' && session.coach_id !== user.id) {
    res.status(403).json({ error: 'Not your session' }); return;
  }

  await supabaseAdmin.from('sessions').update({
    status: 'cancelled',
    cancelled_by_role: user.role,
    cancellation_reason: reason ?? null,
  }).eq('id', sessionId);

  // Notify booked parent when coach cancels
  if (user.role === 'coach' && session.booked_parent_id) {
    const startStr = new Date(session.start_time).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    const { data: parentTokens } = await supabaseAdmin
      .from('fcm_tokens').select('token').eq('user_id', session.booked_parent_id).eq('user_type', 'parent');
    if (parentTokens?.length) {
      await Promise.allSettled(
        parentTokens.map((t) => sendToUser(t.token, 'Session cancelled', `Your lesson on ${startStr} was cancelled by your coach.`, { url: '/my-bookings' }))
      );
    }
  }

  const { promoteWaitlist } = await import('../services/waitlist');
  const promoted = await promoteWaitlist(sessionId, session.coach_id);

  res.json({ session: { ...session, status: 'cancelled' }, promoted });
});

export default router;
