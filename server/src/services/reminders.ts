import cron from 'node-cron';
import { supabaseAdmin } from '../lib/supabase';
import { sendToUser } from './fcm';

export function startReminderScheduler(): void {
  cron.schedule('*/5 * * * *', async () => {
    await sendDueReminders();
  });
  console.log('Reminder scheduler started');
}

async function sendDueReminders(): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() + 23.5 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(now.getTime() + 24.5 * 60 * 60 * 1000).toISOString();

  // Get sessions in window not already reminded
  const { data: loggedIds } = await supabaseAdmin
    .from('reminder_log')
    .select('session_id');

  const excludeIds = loggedIds?.map((r: { session_id: string }) => r.session_id) ?? [];

  let query = supabaseAdmin
    .from('sessions')
    .select('id, start_time, coach_id, student:students(id, name, parent_id)')
    .eq('status', 'booked')
    .gte('start_time', windowStart)
    .lte('start_time', windowEnd);

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data: sessions } = await query;
  if (!sessions?.length) return;

  for (const session of sessions) {
    const student = session.student as unknown as { id: string; name: string; parent_id: string } | null;
    if (!student) continue;

    const startStr = new Date(session.start_time).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const [{ data: parentTokens }, { data: coachTokens }] = await Promise.all([
      supabaseAdmin.from('fcm_tokens').select('token').eq('user_id', student.parent_id).eq('user_type', 'parent'),
      supabaseAdmin.from('fcm_tokens').select('token').eq('user_id', session.coach_id).eq('user_type', 'coach'),
    ]);

    await Promise.allSettled([
      ...(parentTokens ?? []).map((t: { token: string }) =>
        sendToUser(t.token, 'Lesson tomorrow!', `${student.name}'s lesson is tomorrow at ${startStr}.`, { url: '/slots' })
      ),
      ...(coachTokens ?? []).map((t: { token: string }) =>
        sendToUser(t.token, 'Lesson tomorrow!', `${student.name}'s lesson is tomorrow at ${startStr}.`, { url: '/coach/dashboard' })
      ),
    ]);

    await supabaseAdmin.from('reminder_log').insert({ session_id: session.id });
  }
}
