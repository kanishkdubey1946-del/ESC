import { Navigate, useLocation } from 'react-router-dom';
import { AIStatus } from '../components/ui/AIStatus';
import { useAuth } from './AuthProvider';

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="grid min-h-screen place-items-center bg-[#101114]"><AIStatus state="working" size={64} label="Opening your study space" /></div>;
  return user ? <>{children}</> : <Navigate to="/" replace state={{ from: location.pathname }} />;
}
