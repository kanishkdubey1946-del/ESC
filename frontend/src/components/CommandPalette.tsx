import { useEffect, useMemo, useState } from 'react';
import { Command, FileText, History, LayoutDashboard, Play, Search, Settings, X } from 'lucide-react';

type CommandItem = {
  id: string;
  label: string;
  hint: string;
  icon: typeof Search;
  action: () => void;
};

interface CommandPaletteProps {
  onRun: () => void;
  onOpenWorkspace: () => void;
}

export default function CommandPalette({ onRun, onOpenWorkspace }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(value => !value);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const commands = useMemo<CommandItem[]>(() => [
    { id: 'workspace', label: 'Open agent workspace', hint: 'Navigate to a specialist', icon: LayoutDashboard, action: onOpenWorkspace },
    { id: 'run', label: 'Run orchestration', hint: 'Start the current workflow', icon: Play, action: onRun },
    { id: 'history', label: 'Open execution history', hint: 'Review prior runs', icon: History, action: () => {} },
    { id: 'documents', label: 'Open documents', hint: 'Search workspace knowledge', icon: FileText, action: () => {} },
    { id: 'settings', label: 'Workspace settings', hint: 'Configure this workspace', icon: Settings, action: () => {} },
  ], [onOpenWorkspace, onRun]);

  const results = commands.filter(command => command.label.toLowerCase().includes(query.toLowerCase()));
  const execute = (command: CommandItem) => { command.action(); setOpen(false); setQuery(''); };

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Open command palette" className="hidden lg:flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-400 transition hover:bg-white/[0.08] hover:text-white">
        <Search className="h-3.5 w-3.5" /> Search workspace <kbd className="ml-5 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">Ctrl K</kbd>
      </button>
      {open && <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[16vh] backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
        <section role="dialog" aria-modal="true" aria-label="Command palette" className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-[#18181b] shadow-2xl" onMouseDown={event => event.stopPropagation()}>
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
            <Command className="h-5 w-5 text-primary-300" />
            <input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search commands, projects, and documents..." className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500" />
            <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white" aria-label="Close command palette"><X className="h-4 w-4" /></button>
          </div>
          <div className="p-2">
            <p className="px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Workspace actions</p>
            {results.map(command => { const Icon = command.icon; return <button key={command.id} onClick={() => execute(command)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/[0.07]">
              <span className="rounded-lg bg-primary-500/10 p-2 text-primary-300"><Icon className="h-4 w-4" /></span><span><span className="block text-sm font-medium text-slate-100">{command.label}</span><span className="block text-xs text-slate-500">{command.hint}</span></span>
            </button>; })}
            {!results.length && <p className="px-3 py-8 text-center text-sm text-slate-500">No matching commands.</p>}
          </div>
        </section>
      </div>}
    </>
  );
}
