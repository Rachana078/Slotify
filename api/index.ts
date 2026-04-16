import { config } from 'dotenv';
config(); // no-op in production (Vercel injects env vars); loads .env for `vercel dev`

import app from '../server/src/app';
import { sendDueReminders } from '../server/src/services/reminders';

// Cron endpoint called by Vercel Cron Jobs every hour
app.get('/api/cron/reminders', async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  await sendDueReminders();
  res.json({ ok: true });
});

export default app;
