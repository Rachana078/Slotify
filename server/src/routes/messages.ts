import { Router, Request, Response } from 'express';
import { requireAuth, requireCoach, requireParent } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import { sendToUser, broadcastToParents } from '../services/fcm';
import type { SendMessageRequest } from '@coachbook/shared';

const router = Router();

// Send a message
router.post('/', requireAuth, requireCoach, async (req: Request, res: Response) => {
  const { parent_id, subject, body } = req.body as SendMessageRequest;
  const coachId = req.user!.id;

  if (!subject || !body) { res.status(400).json({ error: 'subject and body are required' }); return; }

  const { data: message, error } = await supabaseAdmin
    .from('messages')
    .insert({ coach_id: coachId, parent_id: parent_id ?? null, subject, body })
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }

  if (parent_id) {
    const { data: tokens } = await supabaseAdmin.from('fcm_tokens').select('token').eq('user_id', parent_id).eq('user_type', 'parent');
    if (tokens?.length) {
      await Promise.allSettled(tokens.map((t) => sendToUser(t.token, `Message: ${subject}`, body, { url: '/parent/inbox' })));
    }
  } else {
    broadcastToParents(coachId, `Message: ${subject}`, body, { url: '/parent/inbox' }).catch(console.error);
  }

  res.status(201).json({ message });
});

// Get messages
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;

  if (user.role === 'coach') {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*, parent:parents(id, name), reads:message_reads(id)')
      .eq('coach_id', user.id)
      .order('sent_at', { ascending: false });

    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json({ messages: data });
  } else {
    // Parent: get messages for them or broadcast for their coach
    const { data: parentRow } = await supabaseAdmin.from('parents').select('coach_id').eq('id', user.id).single();
    if (!parentRow) { res.status(403).json({ error: 'Parent not found' }); return; }

    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*, reads:message_reads(parent_id)')
      .eq('coach_id', parentRow.coach_id)
      .or(`parent_id.eq.${user.id},parent_id.is.null`)
      .order('sent_at', { ascending: false });

    if (error) { res.status(500).json({ error: error.message }); return; }

    const messages = (data ?? []).map((m: Record<string, unknown>) => ({
      ...m,
      is_read: Array.isArray(m.reads) && m.reads.some((r: Record<string, unknown>) => r.parent_id === user.id),
    }));

    res.json({ messages });
  }
});

// Mark message as read
router.post('/:messageId/read', requireAuth, requireParent, async (req: Request, res: Response) => {
  const { messageId } = req.params;
  await supabaseAdmin
    .from('message_reads')
    .upsert({ message_id: messageId, parent_id: req.user!.id }, { onConflict: 'message_id,parent_id' });
  res.status(204).end();
});

export default router;
