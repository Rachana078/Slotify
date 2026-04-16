import * as admin from 'firebase-admin';
import { supabaseAdmin } from '../lib/supabase';

let initialized = false;

function getApp(): admin.app.App {
  if (!initialized) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Newlines in env vars need to be unescaped
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    initialized = true;
  }
  return admin.app();
}

export async function sendToUser(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  try {
    await getApp().messaging().send({
      token,
      notification: { title, body },
      data,
      webpush: {
        notification: { title, body, icon: '/icons/icon-192.png' },
        fcmOptions: { link: data?.url ?? '/' },
      },
    });
  } catch (err) {
    console.error('FCM send error:', err);
  }
}

export async function broadcastToParents(
  coachId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  // Get all parents for this coach
  const { data: parents, error } = await supabaseAdmin
    .from('parents')
    .select('id')
    .eq('coach_id', coachId);

  if (error || !parents?.length) return;

  const parentIds = parents.map((p) => p.id);

  // Get their FCM tokens
  const { data: tokens } = await supabaseAdmin
    .from('fcm_tokens')
    .select('token')
    .in('user_id', parentIds)
    .eq('user_type', 'parent');

  if (!tokens?.length) return;

  await Promise.allSettled(
    tokens.map((t) => sendToUser(t.token, title, body, data))
  );
}
