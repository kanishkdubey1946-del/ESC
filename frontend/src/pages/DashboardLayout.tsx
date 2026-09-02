import { Suspense, lazy, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, ChevronDown, CircleHelp, GraduationCap,
  Layers, Loader2, RotateCcw, Settings, UserRound,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../auth/AuthProvider';
import EscDashboard from '../components/esc/EscDashboard';

const DynamicOrchestrator = lazy(() => import('../components/DynamicOrchestrator'));

type WorkspaceMode = 'business' | 'student' | 'playground';

const MODES: { id: WorkspaceMode; label: string; icon: typeof Briefcase }[] = [
  { id: 'student', label: 'Student', icon: GraduationCap },
];

function DashboardLoadingState() {
  return (
    <div className="grid flex-1 place-items-center bg-slate-50">
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
        <p className="text-sm font-medium text-slate-600">Preparing your workspace…</p>
      </div>
    </div>
  );
}

function ProfileMenu({
  displayName,
  email,
  onHome,
  onResetSession,
  onSignOut,
}: {
  displayName: string;
  email?: string;
  onHome: () => void;
  onResetSession: () => void;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<'menu' | 'profile' | 'settings' | 'help'>('menu');
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setPanel('menu');
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const initial = (displayName || 'C').slice(0, 1).toUpperCase();

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open profile menu"
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2 text-slate-700 shadow-sm transition hover:border-primary-200 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
          {initial}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label="Profile menu"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 w-72 origin-top-right overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
          >
            {panel === 'menu' && (
              <>
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                  {email && <p className="truncate text-xs text-slate-500">{email}</p>}
                </div>
                <div className="p-1.5">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => setPanel('profile')}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
                  >
                    <UserRound className="h-4 w-4 text-slate-400" /> Profile
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => setPanel('settings')}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
                  >
                    <Settings className="h-4 w-4 text-slate-400" /> Settings
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => setPanel('help')}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
                  >
                    <CircleHelp className="h-4 w-4 text-slate-400" /> Help & Support
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { close(); onResetSession(); }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                  >
                    <RotateCcw className="h-4 w-4" /> Reset Session
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { close(); onSignOut(); }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                  >
                    <UserRound className="h-4 w-4" /> Sign out
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { close(); onHome(); }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
                  >
                    Back to homepage
                  </button>
                </div>
              </>
            )}

            {panel === 'profile' && (
              <div className="p-4">
                <button type="button" className="mb-3 text-xs font-semibold text-primary-700" onClick={() => setPanel('menu')}>← Back</button>
                <p className="text-sm font-semibold text-slate-900">Profile</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  You are using COMET without a required account. Session data stays in this browser only.
                </p>
                <dl className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3 text-xs">
                  <div><dt className="text-slate-500">Name</dt><dd className="font-medium text-slate-800">{displayName}</dd></div>
                  {email && <div><dt className="text-slate-500">Email</dt><dd className="font-medium text-slate-800">{email}</dd></div>}
                  <div><dt className="text-slate-500">Access</dt><dd className="font-medium text-slate-800">Local guest session</dd></div>
                </dl>
              </div>
            )}

            {panel === 'settings' && (
              <div className="p-4">
                <button type="button" className="mb-3 text-xs font-semibold text-primary-700" onClick={() => setPanel('menu')}>← Back</button>
                <p className="text-sm font-semibold text-slate-900">Settings</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  Workspace mode preference is saved automatically when you switch Business, Student, or Playground.
                  Agent outputs and chat history are stored per mode in this browser.
                </p>
                <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <li>• Default mode restores from your last selection</li>
                  <li>• Sources live in the left panel (shared workspace memory)</li>
                  <li>• Use Reset Session to clear mode-scoped runs</li>
                </ul>
              </div>
            )}

            {panel === 'help' && (
              <div className="p-4">
                <button type="button" className="mb-3 text-xs font-semibold text-primary-700" onClick={() => setPanel('menu')}>← Back</button>
                <p className="text-sm font-semibold text-slate-900">Help & Support</p>
                <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600">
                  <li>1. Add sources from the left panel or the + menu in chat.</li>
                  <li>2. Describe your goal in the composer and press Enter.</li>
                  <li>3. Open agent reports from Studio → View.</li>
                  <li>4. Switch modes from the centered navbar control anytime.</li>
                </ul>
                <button
                  type="button"
                  onClick={() => { close(); onHome(); }}
                  className="mt-4 w-full rounded-xl bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700"
                >
                  Visit homepage guide
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DashboardLayout() {
  const [activeTab, setActiveTab] = useState<WorkspaceMode>('student');
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  useEffect(() => {
    try {
      localStorage.setItem('comet.activeMode', 'student');
    } catch {
      // ignore
    }
  }, []);

  const switchMode = (next: WorkspaceMode) => {
    setActiveTab(next);
    try {
      localStorage.setItem('comet.activeMode', next);
    } catch {
      // ignore
    }
  };

  const resetSession = () => {
    try {
      ['business', 'student', 'playground'].forEach(mode => {
        localStorage.removeItem(`comet.session.${mode}.v1`);
      });
      localStorage.removeItem('comet.session.v1');
      localStorage.setItem('comet.activeMode', 'student');
    } catch {
      // ignore
    }
    setActiveTab('student');
    window.location.reload();
  };

  const onModeKeyDown = (e: { key: string; preventDefault: () => void }, _id: WorkspaceMode, index: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const next = MODES[(index + dir + MODES.length) % MODES.length];
      switchMode(next.id);
      const el = document.getElementById(`mode-tab-${next.id}`);
      el?.focus();
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F0F4F8] text-slate-900">
      {/* 3-column grid keeps mode selector true viewport-center */}
      <header className="relative grid h-16 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-slate-200/70 bg-white/80 px-3 backdrop-blur-md sm:px-5">
        {/* LEFT */}
        <div className="flex min-w-0 items-center gap-2.5 justify-self-start">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex min-w-0 items-center gap-2.5 rounded-xl p-1 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
            aria-label="COMET home"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-600 shadow-sm shadow-primary-200">
              <Layers className="h-4 w-4 text-white" />
            </span>
            <span className="min-w-0 text-left">
              <span className="block truncate text-sm font-semibold tracking-wide text-slate-900">ESC</span>
              <span className="hidden truncate text-[10px] font-medium tracking-wide text-slate-500 sm:block">
                Enhanced Study Companion
              </span>
            </span>
          </button>
        </div>

        {/* CENTER — mode segmented control */}
        <nav
          className="justify-self-center max-w-[min(100vw-8rem,28rem)] overflow-x-auto no-scrollbar"
          aria-label="Workspace mode"
          role="tablist"
        >
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100/90 p-1 shadow-inner">
            {MODES.map((mode, index) => {
              const Icon = mode.icon;
              const selected = activeTab === mode.id;
              return (
                <button
                  key={mode.id}
                  id={`mode-tab-${mode.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => switchMode(mode.id)}
                  onKeyDown={e => onModeKeyDown(e, mode.id, index)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 sm:px-4 sm:text-sm ${
                    selected
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {mode.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* RIGHT */}
        <div className="flex items-center justify-end justify-self-end">
          <ProfileMenu
            displayName={user?.name || 'COMET User'}
            email={user?.email}
            onHome={() => navigate('/')}
            onResetSession={resetSession}
            onSignOut={() => { void signOut().then(() => navigate('/')); }}
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden p-3 sm:gap-4 sm:p-4">
        {activeTab !== 'student' && <Sidebar />}
        <Suspense fallback={<DashboardLoadingState />}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="flex min-w-0 flex-1 gap-4"
            >
              {activeTab === 'student' ? <EscDashboard /> : <DynamicOrchestrator mode={activeTab} />}
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </div>
    </div>
  );
}
