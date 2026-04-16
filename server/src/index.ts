import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../../.env') });

import app from './app';
import { startReminderScheduler } from './services/reminders';

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`CoachBook server running on http://localhost:${PORT}`);
  startReminderScheduler();
});
