import { Router, Request, Response } from 'express';
import { requireAuth, requireParent } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import { sendToUser } from '../services/fcm';

const router = Router();

// Get my waitlist entries (parent)
router.get('/my', requireAuth, requireParent, async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('waitlist')
    .select('*')
    .eq('parent_id', req.user!.id);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ entries: data });
});

// Join waitlist
router.post('/:sessionId', requireAuth, requireParent, async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const parentId = req.user!.id;

  const { data: session } = await supabaseAdmin
    .from('sessions')
    .select('id, status, start_time, coach_id')
    .eq('id', sessionId)
    .single();

  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
  if (session.status !== 'booked') { res.status(400).json({ error: 'Can only join waitlist for booked slots' }); return; }

  const { data: maxRow } = await supabaseAdmin
    .from('waitlist')
    .select('position')
    .eq('session_id', sessionId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = (maxRow?.position ?? 0) + 1;

  const { data: entry, error } = await supabaseAdmin
    .from('waitlist')
    .insert({ session_id: sessionId, parent_id: parentId, position })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { res.status(409).json({ error: 'Already on waitlist' }); return; }
    res.status(500).json({ error: error.message }); return;
  }

  const startStr = new Date(session.start_time).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

  const { data: tokens } = await supabaseAdmin
    .from('fcm_tokens').select('token').eq('user_id', parentId).eq('user_type', 'parent');

  if (tokens?.length) {
    await Promise.allSettled(
      tokens.map((t) => sendToUser(t.token, "You're on the waitlist", `You're #${position} for the ${startStr} slot.`, { url: '/parent/slots' }))
    );
  }

  res.status(201).json({ entry, position });
});

// Leave waitlist
router.delete('/:sessionId', requireAuth, requireParent, async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const parentId = req.user!.id;

  await supabaseAdmin.from('waitlist').delete().eq('session_id', sessionId).eq('parent_id', parentId);

  // Re-number
  const { data: remaining } = await supabaseAdmin
    .from('waitlist').select('id').eq('session_id', sessionId).order('position', { ascending: true });

  if (remaining?.length) {
    await Promise.all(remaining.map((r, i) => supabaseAdmin.from('waitlist').update({ position: i + 1 }).eq('id', r.id)));
  }

  res.status(204).end();
});

// Get waitlist for a session (coach sees all, parent sees own)
router.get('/:sessionId', requireAuth, async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const user = req.user!;

  if (user.role === 'coach') {
    const { data } = await supabaseAdmin
      .from('waitlist').select('*, parent:parents(id, name)').eq('session_id', sessionId).order('position');
    res.json({ entries: data });
  } else {
    const { data } = await supabaseAdmin
      .from('waitlist').select('*').eq('session_id', sessionId).eq('parent_id', user.id).maybeSingle();
    res.json({ entry: data });
  }
});

export default router;
