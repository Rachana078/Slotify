import { Router, Request, Response } from 'express';
import { requireAuth, requireCoach } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import type { RedeemInviteRequest } from '@coachbook/shared';

const router = Router();

// Coach generates an invite link
router.post('/', requireAuth, requireCoach, async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };
  const coachId = req.user!.id;

  const { data: invite, error } = await supabaseAdmin
    .from('coach_invites')
    .insert({ coach_id: coachId, email: email ?? null })
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }

  const inviteUrl = `${process.env.CLIENT_URL}/invite/${invite.token}`;
  res.status(201).json({ invite, invite_url: inviteUrl });
});

// Public: validate token and get coach info
router.get('/:token', async (req: Request, res: Response) => {
  const { token } = req.params;

  const { data: invite } = await supabaseAdmin
    .from('coach_invites')
    .select('*, coach:coaches(id, name)')
    .eq('token', token)
    .maybeSingle();

  if (!invite) { res.status(404).json({ error: 'Invite not found' }); return; }
  if (invite.used_at) { res.status(410).json({ error: 'Invite already used' }); return; }
  if (new Date(invite.expires_at) < new Date()) { res.status(410).json({ error: 'Invite expired' }); return; }

  res.json({ valid: true, coach: invite.coach, email: invite.email });
});

// Authenticated parent redeems invite
router.post('/:token/redeem', requireAuth, async (req: Request, res: Response) => {
  const { token } = req.params;
  const { name, student_name } = req.body as RedeemInviteRequest;
  const userId = req.user!.id;
  const userEmail = req.user!.email;

  if (!name || !student_name) { res.status(400).json({ error: 'name and student_name are required' }); return; }

  const { data: invite } = await supabaseAdmin
    .from('coach_invites')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (!invite || invite.used_at || new Date(invite.expires_at) < new Date()) {
    res.status(410).json({ error: 'Invalid or expired invite' }); return;
  }

  // Check not already a parent
  const { data: existing } = await supabaseAdmin
    .from('parents')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (existing) { res.status(409).json({ error: 'You already have a parent profile' }); return; }

  // Create parent
  const { data: parent, error: parentError } = await supabaseAdmin
    .from('parents')
    .insert({ id: userId, name, email: userEmail, coach_id: invite.coach_id })
    .select()
    .single();

  if (parentError) { res.status(500).json({ error: parentError.message }); return; }

  // Create student
  const { data: student, error: studentError } = await supabaseAdmin
    .from('students')
    .insert({ name: student_name, parent_id: userId, coach_id: invite.coach_id })
    .select()
    .single();

  if (studentError) { res.status(500).json({ error: studentError.message }); return; }

  // Mark invite used
  await supabaseAdmin.from('coach_invites').update({ used_at: new Date().toISOString() }).eq('id', invite.id);

  res.status(201).json({ parent, student });
});

// Coach lists their invites
router.get('/', requireAuth, requireCoach, async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('coach_invites')
    .select('*')
    .eq('coach_id', req.user!.id)
    .order('created_at', { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ invites: data });
});

export default router;
