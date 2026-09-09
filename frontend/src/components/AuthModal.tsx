import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { OrbLoader } from './ui/OrbLoader';
import { SignInPage, type SignInMode } from './ui/sign-in-flow-1';
import { localAuth } from '../lib/localAuth';
import { useAuth } from '../auth/AuthProvider';
import '../styles/auth.css';

interface AuthModalProps {
  mode: SignInMode;
  onClose: () => void;
  onSuccess: () => void;
}

type AuthStage = 'email' | 'credentials';

const passwordRules = (value: string) => value.length >= 8;

export default function AuthModal({ mode: initialMode, onClose, onSuccess }: AuthModalProps) {
  const { refreshUser } = useAuth();
  const [currentMode, setCurrentMode] = useState<SignInMode>(initialMode);
  const [stage, setStage] = useState<AuthStage>('email');
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const isSignup = currentMode === 'signup';

  useEffect(() => {
    setCurrentMode(initialMode);
    setStage('email');
    setError('');
  }, [initialMode]);

  const changeMode = (nextMode: SignInMode) => {
    if (loading || nextMode === currentMode) return;
    setCurrentMode(nextMode);
    setStage('email');
    setPassword('');
    setConfirmation('');
    setShowPassword(false);
    setError('');
  };

  const continueWithEmail = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setError('');
    setStage('credentials');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (isSignup && !name.trim()) { setError('Enter your full name.'); return; }
    if (!passwordRules(password)) { setError('Use a password with at least 8 characters.'); return; }
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
      setError(reason instanceof Error ? reason.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const heading = stage === 'email'
    ? (isSignup ? 'Study with more direction.' : 'Welcome back.')
    : (isSignup ? 'Make the workspace yours.' : 'Continue where you left off.');
  const description = stage === 'email'
    ? (isSignup
      ? 'Create one secure space for your sources, web research, specialist agents, and study plan.'
      : 'Sign in to return to your conversations, sources, progress, and study plan.')
    : (isSignup
      ? `Create the secure password for ${email.trim()}.`
      : `Enter the password connected to ${email.trim()}.`);

  return (
    <SignInPage
      mode={currentMode}
      onModeChange={changeMode}
      onClose={onClose}
      heading={heading}
      description={description}
      viewKey={`${currentMode}-${stage}`}
      busy={loading}
      footer={(
        <p className="esc-auth-security-note">
          <CheckCircle2 size={14} aria-hidden="true" />
          Your password is salted and hashed by ESC. Only the session is kept in this tab.
        </p>
      )}
    >
      {stage === 'email' ? (
        <>
          <form className="esc-auth-email-form" onSubmit={continueWithEmail}>
            <label className="sr-only" htmlFor="esc-auth-email">Email address</label>
            <div className="esc-auth-email-row">
              <input
                id="esc-auth-email"
                data-auth-autofocus
                required
                type="email"
                name="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
              />
              <button type="submit" aria-label="Continue with this email">
                <ArrowRight size={19} aria-hidden="true" />
              </button>
            </div>
          </form>

          <div className="esc-auth-divider"><span>secure email access</span></div>
          <button type="button" className="esc-auth-mode-link" onClick={() => changeMode(isSignup ? 'signin' : 'signup')}>
            {isSignup ? 'Already have an account? Sign in' : 'New to ESC? Create your account'}
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            className="esc-auth-email-back"
            onClick={() => { setStage('email'); setError(''); }}
            disabled={loading}
          >
            <ArrowLeft size={14} aria-hidden="true" />
            <span>{email.trim()}</span>
          </button>

          <form className="esc-auth-credentials" onSubmit={submit}>
            <input
              className="esc-auth-username-proxy"
              type="email"
              name="email"
              value={email}
              autoComplete="username"
              readOnly
              tabIndex={-1}
              aria-hidden="true"
            />
            {isSignup && (
              <label>
                <span>Full name</span>
                <input
                  data-auth-autofocus
                  required
                  minLength={2}
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  placeholder="Your full name"
                  disabled={loading}
                />
              </label>
            )}

            <label>
              <span>Password</span>
              <div className="esc-auth-password-field">
                <input
                  data-auth-autofocus={!isSignup ? true : undefined}
                  required
                  minLength={8}
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  placeholder={isSignup ? 'Create a password' : 'Your password'}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                </button>
              </div>
            </label>

            {isSignup && (
              <>
                <p className={`esc-auth-password-hint ${password && !passwordRules(password) ? 'is-warning' : ''}`}>
                  Use at least 8 characters.
                </p>
                <label>
                  <span>Confirm password</span>
                  <input
                    required
                    type="password"
                    minLength={8}
                    name="password-confirmation"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    disabled={loading}
                  />
                </label>
              </>
            )}

            {error && <p role="alert" className="esc-auth-error">{error}</p>}

            <button type="submit" className="esc-auth-submit" disabled={loading}>
              {loading
                ? <><OrbLoader className="size-5" state="working" /> <span>{isSignup ? 'Creating your workspace' : 'Signing you in'}</span></>
                : <><span>{isSignup ? 'Create secure account' : 'Sign in securely'}</span> <ArrowRight size={18} aria-hidden="true" /></>}
            </button>
          </form>
        </>
      )}
    </SignInPage>
  );
}
