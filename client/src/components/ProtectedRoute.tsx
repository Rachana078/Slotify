import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { UserRole } from '../hooks/useAuth';

interface Props {
  children: ReactNode;
  role: 'coach' | 'parent';
  currentRole: UserRole;
}

function NoProfile() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 max-w-sm w-full text-center">
        <h2 className="text-lg font-bold text-gray-800 mb-2">Account not set up</h2>
        <p className="text-sm text-gray-500">
          You're signed in but don't have a coach or parent profile yet. Ask your coach to add you, or add yourself to the coaches table in Supabase.
        </p>
      </div>
    </div>
  );
}

export default function ProtectedRoute({ children, role, currentRole }: Props) {
  if (currentRole === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        Loading…
      </div>
    );
  }

  if (currentRole === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  if (currentRole === 'no-profile') {
    return <NoProfile />;
  }

  if (currentRole !== role) {
    // Redirect to correct home
    return <Navigate to={currentRole === 'coach' ? '/coach/dashboard' : '/slots'} replace />;
  }

  return <>{children}</>;
}
