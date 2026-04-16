import { useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type UserRole = 'coach' | 'parent' | 'loading' | 'unauthenticated' | 'no-profile';

interface AuthState {
  user: User | null;
  session: Session | null;
  role: UserRole;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    role: 'loading',
  });

  useEffect(() => {
    let mounted = true;
    let resolved = false;

    async function resolve(session: Session | null) {
      if (!mounted || resolved) return;
      resolved = true;
      if (session) {
        const role = await resolveRole(session.user.id);
        if (mounted) setState({ user: session.user, session, role });
      } else {
        if (mounted) setState({ user: null, session: null, role: 'unauthenticated' });
      }
    }

    // getSession() reads directly from localStorage — reliable on hard refresh
    supabase.auth.getSession().then(({ data: { session } }) => resolve(session));

    // onAuthStateChange handles sign-in via magic link and sign-out
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        resolved = false; // allow re-resolution on auth changes
        resolve(session);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}

async function resolveRole(userId: string): Promise<UserRole> {
  const [{ data: coach }, { data: parent }] = await Promise.all([
    supabase.from('coaches').select('id').eq('id', userId).maybeSingle(),
    supabase.from('parents').select('id').eq('id', userId).maybeSingle(),
  ]);
  if (coach) return 'coach';
  if (parent) return 'parent';
  return 'no-profile';
}
