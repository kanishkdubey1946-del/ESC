import { ArrowUpRight, BookOpen, CalendarDays, ChartNoAxesCombined, ChevronLeft, CircleHelp, LayoutGrid, MessageCircle, Plus, Sparkles, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { AIStatus } from './ui/AIStatus';
import BrandMark from './ui/BrandMark';

export type WorkspaceView = 'chat' | 'overview' | 'planner' | 'analytics' | 'sources' | 'specialists' | 'studio';

const navigation = [
  { id: 'chat', label: 'AI companion', icon: MessageCircle },
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'planner', label: 'Study planner', icon: CalendarDays },
  { id: 'analytics', label: 'My progress', icon: ChartNoAxesCombined },
  { id: 'sources', label: 'My library', icon: BookOpen },
] as const;

export default function Sidebar({ view, onNavigate, onNewChat, displayName, onSettings, onClose, recentChats = [], onOpenChat }: {
  view: WorkspaceView;
  onNavigate: (view: WorkspaceView) => void;
  onNewChat: () => void;
  displayName: string;
  onSettings: () => void;
  onClose?: () => void;
  recentChats?: { id: string; title: string }[];
  onOpenChat?: (id: string) => void;
}) {
  return <aside className="esc-sidebar">
    <div className="flex items-center justify-between px-5 pb-8 pt-7">
      <button className="flex items-center gap-3" onClick={() => onNavigate('chat')} aria-label="ESC AI companion home">
        <span className="esc-brand-mark"><BrandMark className="esc-brand-mark-image" /></span>
        <span className="text-[22px] font-semibold tracking-[-.06em] text-[#f0edf5]">esc<span className="text-[#b8a3ed]">.</span></span>
      </button>
      {onClose ? <button className="esc-icon-button lg:hidden" onClick={onClose} aria-label="Close navigation"><X size={18} /></button> : <ChevronLeft size={15} className="text-[#5f606b]" />}
    </div>
    <div className="px-4">
      <button onClick={onNewChat} className="esc-new-chat"><Plus size={16} /> New conversation <span className="ml-auto text-[10px] text-[#72717d]">⌘ K</span></button>
      <div className="mb-3 mt-8 px-3 text-[10px] font-medium uppercase tracking-[.16em] text-[#656570]">Your workspace</div>
      <nav className="space-y-1" aria-label="Main navigation">
        {navigation.map(item => <button key={item.id} onClick={() => { onNavigate(item.id); onClose?.(); }} className={`esc-nav-item ${view === item.id ? 'is-active' : ''}`} aria-current={view === item.id ? 'page' : undefined}>
          {view === item.id && <motion.span layoutId="nav-active" className="esc-nav-active" transition={{ duration: .2 }} />}
          <item.icon size={17} strokeWidth={1.6} className="relative" /><span className="relative">{item.label}</span>
          {item.id === 'chat' && <span className="relative ml-auto h-1.5 w-1.5 rounded-full bg-[#c2aff1]" />}
        </button>)}
        <button onClick={() => { onNavigate('specialists'); onClose?.(); }} className={`esc-nav-item ${view === 'specialists' || view === 'studio' ? 'is-active' : ''}`} aria-current={view === 'specialists' ? 'page' : undefined}><Sparkles size={17} strokeWidth={1.6} /> Specialists <span className="ml-auto rounded border border-white/10 px-1.5 text-[9px] text-[#87818f]">12</span></button>
      </nav>
    </div>
    <div className="min-h-0 flex-1 overflow-auto px-7 pt-8">
      <p className="mb-4 text-[10px] font-medium uppercase tracking-[.16em] text-[#656570]">Recent conversations</p>
      {recentChats.length ? recentChats.slice(0, 5).map(chat => <button key={chat.id} onClick={() => { onOpenChat?.(chat.id); onClose?.(); }} className="mb-3 flex w-full items-center gap-2 text-left text-[12px] text-[#93919e] transition hover:text-white"><span className="h-1 w-1 shrink-0 rounded-full bg-[#50505b]" /><span className="truncate">{chat.title}</span></button>) : <p className="text-xs leading-6 text-[#696975]">Your next discovery starts with a question.</p>}
    </div>
    <div className="px-4 pb-4 pt-6">
      <div className="esc-sidebar-note">
        <AIStatus state="listening" label="A little progress, every day." size={20} compact />
        <p className="mt-2 text-[11px] leading-5 text-[#8d899a]">Big goals begin with one small step.</p>
        <button onClick={() => onNavigate('planner')} className="mt-3 flex items-center gap-2 text-xs text-[#c3b0ed]">Find your next step <ArrowUpRight size={13} /></button>
      </div>
      <button onClick={onSettings} className="mt-5 flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/[.03]">
        <span className="grid h-8 w-8 place-items-center rounded-full border border-[#c1aeef]/20 bg-[#b9a0eb]/10 text-xs text-[#cfb9fa]">{displayName.slice(0, 1).toUpperCase()}</span>
        <span className="min-w-0 flex-1"><span className="block truncate text-[12px] text-[#d6d3df]">{displayName}</span><span className="block text-[10px] text-[#71707d]">Personal workspace</span></span>
        <CircleHelp size={15} className="text-[#666472]" />
      </button>
    </div>
  </aside>;
}
