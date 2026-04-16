import { Router, Request, Response } from 'express';
import { requireAuth, requireCoach } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import { generateSlots } from '../services/slots';
import { broadcastToParents } from '../services/fcm';
import type { CreateAvailabilityRequest } from '@coachbook/shared';

const router = Router();

router.post('/', requireAuth, requireCoach, async (req: Request, res: Response) => {
  const { date, start_time, end_time, slot_duration_min = 60, start_iso, end_iso } =
    req.body as CreateAvailabilityRequest & { start_iso?: string; end_iso?: string };

  if (!date || !start_time || !end_time) {
    res.status(400).json({ error: 'date, start_time, and end_time are required' });
    return;
  }

  const coachId = req.user!.id;

  // Insert availability window
  const { data: availability, error: availError } = await supabaseAdmin
    .from('availability')
    .insert({ coach_id: coachId, date, start_time, end_time, slot_duration_min })
    .select()
    .single();

  if (availError) {
    res.status(500).json({ error: availError.message });
    return;
  }

  // Use ISO strings (with correct timezone) when provided by client
  const slots = generateSlots(date, start_iso ?? start_time, end_iso ?? end_time, slot_duration_min);

  if (slots.length === 0) {
    res.status(400).json({ error: 'No slots fit within the given time window' });
    return;
  }

  const sessionRows = slots.map((s) => ({
    coach_id: coachId,
    availability_id: availability.id,
    start_time: s.start_time,
    end_time: s.end_time,
    status: 'open',
  }));

  const { error: sessionError } = await supabaseAdmin
    .from('sessions')
    .insert(sessionRows);

  if (sessionError) {
    res.status(500).json({ error: sessionError.message });
    return;
  }

  // Broadcast push notification to all parents
  broadcastToParents(
    coachId,
    'New slots available!',
    `${slots.length} new lesson slots are open on ${date}. Book your spot!`,
    { url: '/slots', date }
  ).catch(console.error);

  res.status(201).json({ availability, sessions_created: slots.length });
});

export default router;
