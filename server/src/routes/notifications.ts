import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import type { SaveFcmTokenRequest } from '@coachbook/shared';

const router = Router();

// Save / refresh FCM token
router.post('/fcm-tokens', requireAuth, async (req: Request, res: Response) => {
  const { token } = req.body as SaveFcmTokenRequest;
  const user = req.user!;

  if (!token) {
    res.status(400).json({ error: 'token is required' });
    return;
  }

  const userType = user.role === 'coach' ? 'coach' : 'parent';

  const { error } = await supabaseAdmin.from('fcm_tokens').upsert(
    { user_id: user.id, user_type: userType, token },
    { onConflict: 'user_id,token' }
  );

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(204).end();
});

export default router;
