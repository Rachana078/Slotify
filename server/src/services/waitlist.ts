import { supabaseAdmin } from '../lib/supabase';
import { sendToUser, broadcastToParents } from './fcm';

export async function promoteWaitlist(sessionId: string, coachId: string): Promise<boolean> {
  // Get next in line
  const { data: next } = await supabaseAdmin
    .from('waitlist')
    .select('*, parent:parents(id, name)')
    .eq('session_id', sessionId)
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!next) {
    // No waitlist — reopen slot and notify all parents
    await supabaseAdmin
      .from('sessions')
      .update({ status: 'open', student_id: null, booked_parent_id: null })
      .eq('id', sessionId);

    broadcastToParents(coachId, 'Slot available!', 'A lesson slot just opened up. Book now!', {
      url: '/slots',
    }).catch(console.error);

    return false;
  }

  // Get parent's first student for this coach
  const { data: students } = await supabaseAdmin
    .from('students')
    .select('id')
    .eq('parent_id', next.parent_id)
    .eq('coach_id', coachId)
    .limit(1);

  const studentId = students?.[0]?.id ?? null;

  // Promote: book for this parent
  await supabaseAdmin
    .from('sessions')
    .update({
      status: 'booked',
      student_id: studentId,
      booked_parent_id: next.parent_id,
    })
    .eq('id', sessionId);

  // Remove from waitlist
  await supabaseAdmin.from('waitlist').delete().eq('id', next.id);

  // Re-number remaining waitlist entries
  const { data: remaining } = await supabaseAdmin
    .from('waitlist')
    .select('id')
    .eq('session_id', sessionId)
    .order('position', { ascending: true });

  if (remaining?.length) {
    await Promise.all(
      remaining.map((r, i) =>
        supabaseAdmin.from('waitlist').update({ position: i + 1 }).eq('id', r.id)
      )
    );
  }

  // Notify promoted parent
  const { data: tokens } = await supabaseAdmin
    .from('fcm_tokens')
    .select('token')
    .eq('user_id', next.parent_id)
    .eq('user_type', 'parent');

  if (tokens?.length) {
    await Promise.allSettled(
      tokens.map((t) =>
        sendToUser(t.token, 'You got the slot!', 'Your waitlisted lesson slot is now confirmed!', {
          url: '/slots',
        })
      )
    );
  }

  return true;
}
