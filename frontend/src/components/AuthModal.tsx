import { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, X } from 'lucide-react';
import { localAuth } from '../lib/localAuth';
import { useAuth } from '../auth/AuthProvider';

interface AuthModalProps { mode: 'signin' | 'signup'; onClose: () => void; onSuccess: () => void; }
const passwordRules = (value: string) => value.length >= 8;

export default function AuthModal({ mode: initialMode, onClose, onSuccess }: AuthModalProps) {
  const { refreshUser } = useAuth();
  const [currentMode, setCurrentMode] = useState<'signin' | 'signup'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  const isSignup = currentMode === 'signup';

  useEffect(() => { setCurrentMode(initialMode); }, [initialMode]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (isSignup && !passwordRules(password)) { setError('Use a password with at least 8 characters.'); return; }
    if (isSignup && password !== confirmation) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      if (isSignup) {
        await localAuth.register({ email: email.trim(), password, name: name.trim() });
      } else {
        await localAuth.signIn({ email: email.trim(), password });
      }
      await refreshUser();
      onSuccess();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Something went wrong. Please try again.';
      setError(message);
    }
    finally { setLoading(false); }
  };

  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm" onMouseDown={onClose}>
    <section role="dialog" aria-modal="true" aria-labelledby="auth-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl" onMouseDown={event => event.stopPropagation()}>
      <div className="flex items-start justify-between">
        <div>
          <span className="inline-flex rounded-full bg-primary-50 px-3 py-1 text-[11px] font-semibold tracking-wide text-primary-700">SECURE LOCAL ACCESS</span>
          <h2 id="auth-title" className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">{isSignup ? 'Create your ESC account' : 'Sign in to ESC'}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{isSignup ? 'Your workspace is protected by your email and password.' : 'Access your secured workspace.'}</p>
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <form onSubmit={submit} className="mt-7 space-y-4">
        {isSignup && (
          <label className="block text-sm font-medium text-slate-700">
            Full name
            <input required minLength={2} value={name} onChange={event => setName(event.target.value)} autoComplete="name" placeholder="Your full name" className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-50" />
          </label>
        )}
        <label className="block text-sm font-medium text-slate-700">
          Work email
          <input required type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" placeholder="you@organization.com" className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-50" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Password
          <div className="relative mt-1.5">
            <input required minLength={8} type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} autoComplete={isSignup ? 'new-password' : 'current-password'} placeholder={isSignup ? 'Create a password' : 'Your password'} className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-11 text-sm outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-50" />
            <button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-2 top-2 rounded-md p-1.5 text-slate-400 hover:text-slate-700" aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>
        {isSignup && (
          <>
            <p className={`text-xs ${password && !passwordRules(password) ? 'text-amber-700' : 'text-slate-500'}`}>Use at least 8 characters.</p>
            <label className="block text-sm font-medium text-slate-700">
              Confirm password
              <input required type="password" minLength={8} value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="new-password" placeholder="Repeat your password" className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-50" />
            </label>
          </>
        )}
        
        {error && <p role="alert" className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-[13px] leading-5 text-rose-700">{error}</p>}
        
        <button disabled={loading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-primary-400">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{isSignup ? 'Create secure account' : 'Sign in securely'} <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>
      
      <div className="mt-6 flex flex-col items-center gap-4">
        <button 
          type="button" 
          onClick={() => { setError(''); setCurrentMode(isSignup ? 'signin' : 'signup'); }} 
          className="text-sm font-medium text-slate-600 hover:text-primary-700 transition"
        >
          {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Secure local authentication
        </p>
      </div>
    </section>
  </div>;
}
