import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { localAuth } from '../lib/localAuth';
import { setWorkspaceOwner } from '../lib/workspaceMemory';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    setLoading(true);
    try {
      if (!localAuth.getToken()) { setWorkspaceOwner(null); setUser(null); return; }
      const currentUser = await localAuth.getCurrentUser();
      setWorkspaceOwner(currentUser.id);
      setUser(currentUser);
    } catch {
      await localAuth.signOut();
      setWorkspaceOwner(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refreshUser(); }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    refreshUser,
    signOut: async () => {
      try { await localAuth.signOut(); }
      finally { setWorkspaceOwner(null); setUser(null); }
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
