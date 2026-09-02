import { Activity, CheckCircle2, Clock3, Database, Loader2, Sparkles } from 'lucide-react';
import type { AgentStatus } from '../types/agents';

const timeline = [
  { agent: 'Research', detail: 'Citizen evidence and recurring issues', id: 'research' },
  { agent: 'Strategy', detail: 'Priorities and implementation plan', id: 'strategy' },
  { agent: 'Content', detail: 'Public-facing communications', id: 'content' },
  { agent: 'Data', detail: 'Public datasets and signals', id: 'development' },
  { agent: 'Recommendations', detail: 'Ranked interventions', id: 'pitch' },
];

export default function ActivityPanel({ statuses }: { statuses: Record<string, AgentStatus> }) {
  const completed = Object.values(statuses).filter(value => value === 'completed').length;
  return <aside className="hidden w-72 shrink-0 flex-col border-l border-slate-200 bg-white xl:flex">
    <div className="border-b border-slate-200 p-5"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-slate-900">Execution activity</p><p className="mt-1 text-xs text-slate-500">Track each step in your request</p></div><Activity className="h-4 w-4 text-primary-600" /></div></div>
    <div className="flex-1 overflow-y-auto p-5">
      <div className="mb-6 rounded-xl border border-primary-100 bg-primary-50 p-3"><div className="flex items-center gap-2 text-xs font-medium text-primary-700"><Sparkles className="h-3.5 w-3.5" /> Workspace context</div><p className="mt-1.5 text-[11px] leading-relaxed text-slate-600">Agent outputs are shared automatically as the workflow progresses.</p></div>
      <div className="mb-3 flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Agent timeline</p><span className="text-[10px] text-slate-500">{completed}/5 complete</span></div>
      <ol className="space-y-1">{timeline.map(item => { const status = statuses[item.id] ?? 'idle'; const running = status === 'running'; const done = status === 'completed'; return <li key={item.id} className="relative flex gap-3 rounded-xl px-2 py-3 hover:bg-slate-50"><span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${done ? 'bg-emerald-50 text-emerald-600' : running ? 'bg-primary-50 text-primary-600' : 'bg-slate-100 text-slate-400'}`}>{done ? <CheckCircle2 className="h-3.5 w-3.5" /> : running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock3 className="h-3.5 w-3.5" />}</span><span className="min-w-0"><span className="block text-xs font-medium text-slate-700">{item.agent}</span><span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">{done ? 'Output ready to review' : running ? 'Working on your request…' : status === 'queued' ? 'Waiting for context' : item.detail}</span></span></li>; })}</ol>
    </div>
    <div className="border-t border-slate-200 p-4"><div className="flex items-center gap-2 text-[11px] text-slate-500"><Database className="h-3.5 w-3.5 text-primary-600" /> Knowledge sources <span className="ml-auto text-slate-400">0 files</span></div></div>
  </aside>;
}
