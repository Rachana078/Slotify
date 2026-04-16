import { Router, Request, Response } from 'express';
import { requireAuth, requireParent } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import { sendToUser } from '../services/fcm';
import type { BookSessionRequest } from '@coachbook/shared';

const router = Router();

router.post('/:sessionId', requireAuth, requireParent, async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { student_id } = req.body as BookSessionRequest;
  const parentId = req.user!.id;

  if (!student_id) {
    res.status(400).json({ error: 'student_id is required' });
    return;
  }

  // Verify the student belongs to this parent
  const { data: student } = await supabaseAdmin
    .from('students')
    .select('id, name, coach_id')
    .eq('id', student_id)
    .eq('parent_id', parentId)
    .single();

  if (!student) {
    res.status(403).json({ error: 'Student not found or does not belong to you' });
    return;
  }

  // Atomic optimistic-lock update: only update if status = 'open'
  const { data: session, error } = await supabaseAdmin
    .from('sessions')
    .update({ status: 'booked', student_id })
    .eq('id', sessionId)
    .eq('status', 'open') // conflict check
    .select()
    .single();

  if (error || !session) {
    res.status(409).json({ error: 'Slot is no longer available' });
    return;
  }

  // Send confirmation push to parent
  const { data: tokens } = await supabaseAdmin
    .from('fcm_tokens')
    .select('token')
    .eq('user_id', parentId)
    .eq('user_type', 'parent');

  const startStr = new Date(session.start_time).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  if (tokens?.length) {
    await Promise.allSettled(
      tokens.map((t) =>
        sendToUser(
          t.token,
          'Booking confirmed!',
          `${student.name}'s lesson on ${startStr} is booked.`,
          { url: '/parent/slots' }
        )
      )
    );
  }

  // Notify coach
  const { data: coachTokens } = await supabaseAdmin
    .from('fcm_tokens')
    .select('token')
    .eq('user_id', student.coach_id)
    .eq('user_type', 'coach');

  const { data: parent } = await supabaseAdmin
    .from('parents')
    .select('name')
    .eq('id', parentId)
    .single();

  if (coachTokens?.length) {
    await Promise.allSettled(
      coachTokens.map((t) =>
        sendToUser(
          t.token,
          'New booking',
          `${student.name} (${parent?.name ?? 'parent'}) booked the ${startStr} slot.`,
          { url: '/coach/dashboard' }
        )
      )
    );
  }

  res.json({ session });
});

export default router;
