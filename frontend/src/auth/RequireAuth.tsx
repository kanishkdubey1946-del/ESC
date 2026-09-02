import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from './AuthProvider';

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="grid min-h-screen place-items-center bg-slate-50"><Loader2 className="h-6 w-6 animate-spin text-primary-600" /></div>;
  return user ? <>{children}</> : <Navigate to="/" replace state={{ from: location.pathname }} />;
}
