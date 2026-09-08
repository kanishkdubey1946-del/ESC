import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { ArrowLeft, ArrowUpRight, Bell, BookOpen, ChevronDown, Home, Menu, MessageCircle, Plus, Settings2, User, X } from 'lucide-react';
import Sidebar, { type WorkspaceView } from '../components/Sidebar';
import SourceLibrary from '../components/SourceLibrary';
import { AIStatus } from '../components/ui/AIStatus';
import { GlowMenuBar, type GlowMenuItem } from '../components/ui/glow-menu';
import ThemeToggle from '../components/ui/theme-toggle';
import { useAuth } from '../auth/AuthProvider';
import { queueSpecialistLaunch, type MarketplaceSpecialist, type WorkspaceMode } from '../lib/modeAgents';
import { readConversations } from '../lib/assistantMemory';
import '../styles/workspace.css';

const AssistantChat = lazy(() => import('../components/AssistantChat'));
const EscDashboard = lazy(() => import('../components/esc/EscDashboard'));
const AgentPlayground = lazy(() => import('../components/AgentPlayground'));
const DynamicOrchestrator = lazy(() => import('../components/DynamicOrchestrator'));
const titles: Record<WorkspaceView, string> = { chat: 'AI companion', overview: 'Your overview', planner: 'Study planner', analytics: 'My progress', sources: 'My library', specialists: 'Learning specialists', studio: 'Specialist studio' };

export default function DashboardLayout() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const owner = user?.id || 'local';
  const displayName = user?.name || 'Learner';
  const mode: WorkspaceMode = params.get('mode') === 'playground' ? 'playground' : 'student';
  const requestedView = params.get('view') || 'chat';
  const view: WorkspaceView = requestedView === 'workspace' ? (mode === 'playground' ? 'specialists' : 'overview') : Object.hasOwn(titles, requestedView) ? requestedView as WorkspaceView : 'chat';
  const [recent, setRecent] = useState(() => readConversations(owner, mode));
  const [conversationId, setConversationId] = useState(() => recent[0]?.id || crypto.randomUUID());
  const [initialPrompt, setInitialPrompt] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const overlayRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const changeView = useCallback((next: WorkspaceView) => { setParams({ mode, view: next }); setMobileNav(false); }, [mode, setParams]);
  const newChat = useCallback(() => { setConversationId(crypto.randomUUID()); setInitialPrompt(''); changeView('chat'); }, [changeView]);
  const consumePrompt = useCallback(() => setInitialPrompt(''), []);

  useEffect(() => {
    const refresh = () => setRecent(readConversations(owner, mode));
    refresh();
    window.addEventListener('esc-conversations-updated', refresh);
    return () => window.removeEventListener('esc-conversations-updated', refresh);
  }, [owner, mode]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); newChat(); }
      if (event.key === 'Escape') { setSourcesOpen(false); setMobileNav(false); setSettingsOpen(false); setNotificationsOpen(false); setProfileOpen(false); setModeOpen(false); }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [newChat]);

  useEffect(() => {
    if (!(mobileNav || sourcesOpen || settingsOpen || notificationsOpen || profileOpen)) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    const container = overlayRef.current;
    const focusables = () => Array.from(container?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input, textarea, select, [tabindex="0"]') || []).filter(element => element.getClientRects().length);
    focusables()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const elements = focusables();
      if (!elements.length) return;
      if (event.shiftKey && document.activeElement === elements[0]) { event.preventDefault(); elements.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === elements.at(-1)) { event.preventDefault(); elements[0].focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => { document.removeEventListener('keydown', trap); previousFocusRef.current?.focus(); };
  }, [mobileNav, sourcesOpen, settingsOpen, notificationsOpen, profileOpen]);

  const ask = useCallback((prompt: string) => { setInitialPrompt(prompt); changeView('chat'); }, [changeView]);
  const launch = (specialist: MarketplaceSpecialist) => {
    queueSpecialistLaunch(mode, { agentId: specialist.id, prompt: specialist.tryPrompt });
    setConversationId(crypto.randomUUID()); changeView('chat');
  };
  const navProps = { view, onNavigate: changeView, onNewChat: newChat, displayName, onSettings: () => { setMobileNav(false); setSettingsOpen(true); }, recentChats: recent, onOpenChat: (id: string) => { setConversationId(id); changeView('chat'); } };
  const closeOverlays = () => { setMobileNav(false); setSettingsOpen(false); setSourcesOpen(false); setNotificationsOpen(false); setProfileOpen(false); };
  const dockItems: GlowMenuItem[] = [
    { key: 'home', icon: <Home className="h-4 w-4" strokeWidth={1.6} />, label: 'Overview', onSelect: () => changeView('overview'), active: view === 'overview' },
    { key: 'notifications', icon: <Bell className="h-4 w-4" strokeWidth={1.6} />, label: 'Updates', onSelect: () => { closeOverlays(); setNotificationsOpen(true); } },
    { key: 'settings', icon: <Settings2 className="h-4 w-4" strokeWidth={1.6} />, label: 'Settings', onSelect: () => { closeOverlays(); setSettingsOpen(true); } },
    { key: 'profile', icon: <User className="h-4 w-4" strokeWidth={1.6} />, label: 'Profile', onSelect: () => { closeOverlays(); setProfileOpen(true); } },
  ];

  return <MotionConfig reducedMotion="user"><div className={`esc-workspace ${isDark ? 'dark' : ''}`} data-theme={isDark ? 'dark' : 'light'}>
    <a href="#esc-main" className="esc-skip-link">Skip to main content</a>
    <div className="hidden lg:flex"><Sidebar {...navProps} /></div>
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="esc-topbar">
        <div className="esc-topbar-dock"><GlowMenuBar items={dockItems} /></div>
        <div className="flex min-w-0 items-center gap-3"><button className="esc-icon-button lg:hidden" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu size={20} /></button><span className="hidden text-[12px] text-[#64626e] sm:inline">My workspace</span><span className="hidden text-[#45434c] sm:inline">/</span><h1 className="truncate text-[12px] font-medium text-[#d5d0df]">{titles[view]}</h1></div>
        <div className="flex items-center gap-3 sm:gap-5">
          <span className="hidden items-center gap-1.5 text-[10px] tracking-wide text-[#9690a2] xl:flex"><span className="h-1 w-1 rounded-full bg-[#c4dca5]" /> YOUR SPACE TO GROW</span>
          <div className="relative"><button className="esc-mode-button" aria-expanded={modeOpen} onClick={() => setModeOpen(!modeOpen)}>{mode === 'student' ? 'Student' : 'Playground'} <ChevronDown size={12} /></button>{modeOpen && <div className="esc-mode-menu">{(['student', 'playground'] as const).map(next => <button key={next} onClick={() => { setParams({ mode: next, view }); setConversationId(readConversations(owner, next)[0]?.id || crypto.randomUUID()); setModeOpen(false); }}>{next === 'student' ? 'Student workspace' : 'Playground'}</button>)}</div>}</div>
          <ThemeToggle />
          <button className="esc-icon-button" aria-label="Workspace settings" onClick={() => setSettingsOpen(true)}><Settings2 size={16} /></button>
        </div>
      </header>
      <main id="esc-main" className="relative flex min-h-0 min-w-0 flex-1" tabIndex={-1}>
        <Suspense fallback={<div className="grid flex-1 place-items-center"><AIStatus state="working" label="Preparing your space" size={64} /></div>}>
          <div className={view === 'chat' ? 'flex min-h-0 min-w-0 flex-1' : 'hidden'}><AssistantChat key={`${mode}-${conversationId}`} owner={owner} mode={mode} conversationId={conversationId} displayName={displayName} initialPrompt={initialPrompt} onPromptConsumed={consumePrompt} onOpenSources={() => setSourcesOpen(true)} onAskPlanner={() => changeView('planner')} /></div>
          {(view === 'overview' || view === 'planner' || view === 'analytics') && <EscDashboard view={view} onAsk={ask} displayName={displayName} />}
          {view === 'specialists' && <div className="flex min-w-0 flex-1 flex-col"><div className="flex items-center justify-between border-b border-white/[.06] px-6 py-3 text-[11px] text-[#92909d]"><span>Twelve perspectives. One learning companion.</span><button onClick={() => changeView('studio')} className="flex items-center gap-1 text-[#c1aeef]">Open report studio <ArrowUpRight size={13} /></button></div><AgentPlayground mode={mode} onQuickLaunch={launch} /></div>}
          {view === 'studio' && <div className="esc-legacy flex min-w-0 flex-1 gap-4 overflow-hidden p-3"><DynamicOrchestrator mode={mode} /></div>}
        </Suspense>
        <div className={view === 'sources' && !sourcesOpen ? 'esc-library-page' : sourcesOpen ? 'esc-library-drawer' : 'hidden'} ref={sourcesOpen ? overlayRef : undefined} role={sourcesOpen ? 'dialog' : undefined} aria-modal={sourcesOpen || undefined} aria-label="Source library">
          {sourcesOpen && <div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><span className="text-sm font-medium">Your learning context</span><button className="esc-icon-button" onClick={() => setSourcesOpen(false)} aria-label="Close source library"><X size={18} /></button></div>}
          {view === 'sources' && !sourcesOpen && <div className="mb-8"><p className="esc-eyebrow">YOUR KNOWLEDGE, CONNECTED</p><h1 className="mt-3 text-3xl font-medium tracking-tight">Good context. Better conversations.</h1><p className="mt-3 text-sm text-[#908c9c]">Bring your notes, papers, and ideas together. ESC learns from what you share.</p></div>}
          <div className="esc-legacy flex min-h-0 flex-1 flex-col"><SourceLibrary /></div>
        </div>
        {sourcesOpen && <button className="esc-drawer-backdrop" onClick={() => setSourcesOpen(false)} aria-label="Dismiss source library" />}
      </main>
    </div>
    <AnimatePresence>{(mobileNav || settingsOpen || notificationsOpen || profileOpen) && <div className="esc-overlay"><button className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-label="Close dialog" onClick={closeOverlays} /><motion.div ref={overlayRef} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label={mobileNav ? 'Navigation' : notificationsOpen ? 'Notifications' : profileOpen ? 'Profile' : 'Workspace settings'} className={mobileNav ? 'esc-mobile-nav' : 'esc-settings'}>
      {mobileNav ? <Sidebar {...navProps} onClose={() => setMobileNav(false)} /> : notificationsOpen ? <><div className="flex items-center justify-between"><span className="esc-eyebrow">STAY IN THE LOOP</span><button className="esc-icon-button" onClick={() => setNotificationsOpen(false)} aria-label="Close notifications"><X size={18} /></button></div><h2 className="mt-3 text-xl font-medium">Notifications</h2>{recent.length ? <ul className="my-6 flex flex-col gap-2">{recent.slice(0, 8).map(chat => <li key={chat.id}><button className="flex w-full items-center gap-3 rounded-xl border border-white/10 p-3 text-left transition hover:border-[#b7a1f8]/40" onClick={() => { setNotificationsOpen(false); setConversationId(chat.id); changeView('chat'); }}><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#b7a1f8]/10 text-[#cab5ee]"><MessageCircle size={15} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm">{chat.title}</span><span className="mt-0.5 block text-[11px] text-[#96949f]">Conversation update — tap to continue</span></span><ArrowUpRight size={14} className="text-[#96949f]" /></button></li>)}</ul> : <p className="mt-6 text-xs leading-6 text-[#9c94a7]">You're all caught up. Updates from your conversations and study plan will land here.</p>}<div className="mt-6 border-t border-white/10 pt-5"><button className="esc-secondary-button" onClick={() => { setNotificationsOpen(false); newChat(); }}><Plus size={14} /> Start a new conversation</button></div></> : profileOpen ? <><div className="flex items-center justify-between"><span className="esc-eyebrow">YOUR SPACE</span><button className="esc-icon-button" onClick={() => setProfileOpen(false)} aria-label="Close profile"><X size={18} /></button></div><div className="mt-5 flex items-center gap-4"><span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-[#c1aeef]/25 bg-[#b7a1f8]/10 text-lg font-semibold text-[#cfb9fa]">{displayName.slice(0, 1).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-lg font-medium">{displayName}</p><p className="mt-0.5 truncate text-xs text-[#928a9d]">{user?.email || 'Local workspace'}</p></div></div><div className="my-6 rounded-xl border border-white/10 p-4"><p className="text-sm">{displayName}</p><p className="mt-1 text-xs text-[#928a9d]">Personal workspace · {mode === 'student' ? 'Student' : 'Playground'} mode</p></div><div className="flex flex-wrap gap-2"><button className="esc-secondary-button" onClick={() => { setProfileOpen(false); changeView('overview'); }}><BookOpen size={14} /> Study profile</button><button className="esc-secondary-button" onClick={() => { setProfileOpen(false); changeView('analytics'); }}>My progress</button><button className="esc-secondary-button" onClick={() => { setProfileOpen(false); newChat(); }}><Plus size={14} /> New conversation</button></div><div className="mt-6 flex justify-between border-t border-white/10 pt-5"><button onClick={() => navigate('/')} className="flex items-center gap-1 text-xs text-[#a59bb6]"><ArrowLeft size={12} /> Homepage</button><button onClick={() => void signOut().then(() => navigate('/'))} className="text-xs text-[#d9a4b3]">Sign out</button></div></> : <><div className="flex items-center justify-between"><span className="esc-eyebrow">MAKE YOURSELF AT HOME</span><button className="esc-icon-button" onClick={() => setSettingsOpen(false)} aria-label="Close settings"><X size={18} /></button></div><h2 className="mt-3 text-xl font-medium">Your workspace</h2><div className="my-6 rounded-xl border border-white/10 p-4"><p className="text-sm">{displayName}</p><p className="mt-1 text-xs text-[#928a9d]">{user?.email}</p></div><p className="text-xs leading-6 text-[#9c94a7]">Your conversations are saved in this browser. Study plans and progress belong to your account. Add sources to keep answers grounded in your own material.</p><div className="mt-6 flex flex-wrap gap-2"><button className="esc-secondary-button" onClick={() => { setSettingsOpen(false); changeView('overview'); }}><BookOpen size={14} /> Study profile</button><button className="esc-secondary-button" onClick={() => { setSettingsOpen(false); newChat(); }}><Plus size={14} /> New conversation</button></div><div className="mt-6 flex justify-between border-t border-white/10 pt-5"><button onClick={() => navigate('/')} className="flex items-center gap-1 text-xs text-[#a59bb6]"><ArrowLeft size={12} /> Homepage</button><button onClick={() => void signOut().then(() => navigate('/'))} className="text-xs text-[#d9a4b3]">Sign out</button></div></>}
    </motion.div></div>}</AnimatePresence>
  </div></MotionConfig>;
}
