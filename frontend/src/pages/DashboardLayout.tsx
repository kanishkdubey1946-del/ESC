import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, BookOpen, ChevronDown, Menu, Plus, Settings2, X } from 'lucide-react';
import Sidebar, { type WorkspaceView } from '../components/Sidebar';
import SourceLibrary from '../components/SourceLibrary';
import { AIStatus } from '../components/ui/AIStatus';
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
  const view: WorkspaceView = requestedView === 'workspace' ? (mode === 'playground' ? 'specialists' : 'overview') : requestedView in titles ? requestedView as WorkspaceView : 'chat';
  const [recent, setRecent] = useState(() => readConversations(owner, mode));
  const [conversationId, setConversationId] = useState(() => recent[0]?.id || crypto.randomUUID());
  const [initialPrompt, setInitialPrompt] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
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
      if (event.key === 'Escape') { setSourcesOpen(false); setMobileNav(false); setSettingsOpen(false); setModeOpen(false); }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [newChat]);

  useEffect(() => {
    if (!(mobileNav || sourcesOpen || settingsOpen)) return;
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
  }, [mobileNav, sourcesOpen, settingsOpen]);

  const ask = useCallback((prompt: string) => { setInitialPrompt(prompt); changeView('chat'); }, [changeView]);
  const launch = (specialist: MarketplaceSpecialist) => {
    queueSpecialistLaunch(mode, { agentId: specialist.id, prompt: specialist.tryPrompt });
    setConversationId(crypto.randomUUID()); changeView('chat');
  };
  const navProps = { view, onNavigate: changeView, onNewChat: newChat, displayName, onSettings: () => { setMobileNav(false); setSettingsOpen(true); }, recentChats: recent, onOpenChat: (id: string) => { setConversationId(id); changeView('chat'); } };
  const closeOverlays = () => { setMobileNav(false); setSettingsOpen(false); setSourcesOpen(false); };

  return <MotionConfig reducedMotion="user"><div className="esc-workspace dark" data-theme="dark">
    <a href="#esc-main" className="esc-skip-link">Skip to main content</a>
    <div className="hidden lg:flex"><Sidebar {...navProps} /></div>
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="esc-topbar">
        <div className="flex min-w-0 items-center gap-3"><button className="esc-icon-button lg:hidden" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu size={20} /></button><span className="hidden text-[12px] text-[#64626e] sm:inline">My workspace</span><span className="hidden text-[#45434c] sm:inline">/</span><h1 className="truncate text-[12px] font-medium text-[#d5d0df]">{titles[view]}</h1></div>
        <div className="flex items-center gap-3 sm:gap-5">
          <span className="hidden items-center gap-1.5 text-[10px] tracking-wide text-[#9690a2] xl:flex"><span className="h-1 w-1 rounded-full bg-[#c4dca5]" /> YOUR SPACE TO GROW</span>
          <div className="relative"><button className="esc-mode-button" aria-expanded={modeOpen} onClick={() => setModeOpen(!modeOpen)}>{mode === 'student' ? 'Student' : 'Playground'} <ChevronDown size={12} /></button>{modeOpen && <div className="esc-mode-menu">{(['student', 'playground'] as const).map(next => <button key={next} onClick={() => { setParams({ mode: next, view }); setConversationId(readConversations(owner, next)[0]?.id || crypto.randomUUID()); setModeOpen(false); }}>{next === 'student' ? 'Student workspace' : 'Playground'}</button>)}</div>}</div>
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
    <AnimatePresence>{(mobileNav || settingsOpen) && <div className="esc-overlay"><button className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-label="Close dialog" onClick={closeOverlays} /><motion.div ref={overlayRef} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label={mobileNav ? 'Navigation' : 'Workspace settings'} className={mobileNav ? 'esc-mobile-nav' : 'esc-settings'}>
      {mobileNav ? <Sidebar {...navProps} onClose={() => setMobileNav(false)} /> : <><div className="flex items-center justify-between"><span className="esc-eyebrow">MAKE YOURSELF AT HOME</span><button className="esc-icon-button" onClick={() => setSettingsOpen(false)} aria-label="Close settings"><X size={18} /></button></div><h2 className="mt-3 text-xl font-medium">Your workspace</h2><div className="my-6 rounded-xl border border-white/10 p-4"><p className="text-sm">{displayName}</p><p className="mt-1 text-xs text-[#928a9d]">{user?.email}</p></div><p className="text-xs leading-6 text-[#9c94a7]">Your conversations are saved in this browser. Study plans and progress belong to your account. Add sources to keep answers grounded in your own material.</p><div className="mt-6 flex flex-wrap gap-2"><button className="esc-secondary-button" onClick={() => { setSettingsOpen(false); changeView('overview'); }}><BookOpen size={14} /> Study profile</button><button className="esc-secondary-button" onClick={() => { setSettingsOpen(false); newChat(); }}><Plus size={14} /> New conversation</button></div><div className="mt-6 flex justify-between border-t border-white/10 pt-5"><button onClick={() => navigate('/')} className="flex items-center gap-1 text-xs text-[#a59bb6]"><ArrowLeft size={12} /> Homepage</button><button onClick={() => void signOut().then(() => navigate('/'))} className="text-xs text-[#d9a4b3]">Sign out</button></div></>}
    </motion.div></div>}</AnimatePresence>
  </div></MotionConfig>;
}
