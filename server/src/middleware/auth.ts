import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';

export interface AuthUser {
  id: string;
  email?: string;
  role: 'coach' | 'parent' | 'unknown';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const userId = data.user.id;

  // Determine role
  const [{ data: coach }, { data: parent }] = await Promise.all([
    supabaseAdmin.from('coaches').select('id').eq('id', userId).maybeSingle(),
    supabaseAdmin.from('parents').select('id').eq('id', userId).maybeSingle(),
  ]);

  const role: AuthUser['role'] = coach ? 'coach' : parent ? 'parent' : 'unknown';

  req.user = { id: userId, email: data.user.email, role };
  next();
}

export function requireCoach(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'coach') {
    res.status(403).json({ error: 'Coach access required' });
    return;
  }
  next();
}

export function requireParent(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'parent') {
    res.status(403).json({ error: 'Parent access required' });
    return;
  }
  next();
}
