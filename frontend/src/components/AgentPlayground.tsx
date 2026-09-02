import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Bot, Loader2, Search, Send, Sparkles } from 'lucide-react';
import { getAgentLibrary, type DynamicAgent } from '../lib/dynamicAgents';
import { generateAgentResponse } from '../utils/llm';
import { loadWorkspace } from '../lib/workspaceMemory';

type ChatAgent = Omit<DynamicAgent, 'selectedBecause'>;
const marketplace = getAgentLibrary().slice(0, 12);
function readable(data: unknown) {
  const value = data as Record<string, unknown>;
  return String(
    value?.executiveSummary || value?.summary || value?.detailedReport || value?.report || value?.problem
    || 'Your specialist has completed the analysis.',
  );
}

export default function AgentPlayground() {
  const [query, setQuery] = useState(''); const [active, setActive] = useState<ChatAgent | null>(null);
  const [input, setInput] = useState(''); const [messages, setMessages] = useState<{ role: 'user' | 'agent'; text: string }[]>([]); const [loading, setLoading] = useState(false);
  const agents = useMemo(() => marketplace.filter(agent => `${agent.name} ${agent.role} ${agent.responsibility}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const launch = (agent: ChatAgent) => { setActive(agent); setMessages([]); setInput(''); };
  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!active || !input.trim() || loading) return;
    const question = input;
    setInput('');
    setMessages(current => [...current, { role: 'user', text: question }]);
    setLoading(true);
    const result = await generateAgentResponse(
      active.id,
      question,
      messages.map(message => `${message.role}: ${message.text}`).join('\n'),
      {
        documents: loadWorkspace().documents,
        enableResearch: true,
        dynamicDefinition: {
          name: active.name,
          responsibility: active.responsibility,
          systemPrompt: active.systemPrompt,
        },
      },
    );
    setMessages(current => [
      ...current,
      {
        role: 'agent',
        text: result.success
          ? readable(result.data)
          : (result.error || 'Unable to complete this request.'),
      },
    ]);
    setLoading(false);
  };
  if (active) return <div className="flex h-full flex-col overflow-hidden bg-slate-50"><div className="border-b border-slate-200 bg-white px-6 py-4"><button onClick={() => setActive(null)} className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft className="h-3.5 w-3.5" /> All agents</button><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-600 text-white"><Bot className="h-5 w-5" /></span><div><h2 className="text-lg font-semibold text-slate-900">{active.name}</h2><p className="text-xs text-slate-500">{active.responsibility}</p></div></div></div><div className="flex-1 overflow-y-auto p-6"><div className="mx-auto max-w-3xl space-y-4">{messages.length === 0 && <div className="rounded-2xl border border-primary-100 bg-primary-50 p-5"><p className="font-semibold text-primary-900">Start a focused conversation</p><p className="mt-1 text-sm text-primary-800">Ask {active.name} for help with {active.role.toLowerCase()}. Your conversation stays dedicated to this specialist.</p></div>}{messages.map((message, index) => <motion.div key={index} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`max-w-2xl rounded-2xl p-4 text-sm leading-6 ${message.role === 'user' ? 'ml-auto bg-primary-600 text-white' : 'border border-slate-200 bg-white text-slate-700 shadow-sm'}`}>{message.text}</motion.div>)}{loading && <div className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm text-slate-500 shadow-sm"><Loader2 className="h-4 w-4 animate-spin text-primary-600" /> {active.name} is thinking…</div>}</div></div><form onSubmit={send} className="border-t border-slate-200 bg-white p-4"><div className="mx-auto flex max-w-3xl gap-2"><input value={input} onChange={event => setInput(event.target.value)} placeholder={`Ask ${active.name}…`} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary-400" /><button disabled={loading || !input.trim()} className="grid h-11 w-11 place-items-center rounded-xl bg-primary-600 text-white disabled:opacity-50"><Send className="h-4 w-4" /></button></div></form></div>;
  return <div className="flex-1 overflow-y-auto bg-slate-50 p-6 sm:p-8"><div className="mx-auto max-w-6xl"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-primary-600"><Sparkles className="h-3.5 w-3.5" /> Agent marketplace</p><h1 className="mt-2 text-3xl font-semibold text-slate-950">Talk to a specialist</h1><p className="mt-2 text-sm text-slate-600">Choose one of 12 focused AI experts for a dedicated conversation.</p><label className="mt-6 flex max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Search agents" /></label><div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{agents.map((agent, index) => <motion.article key={agent.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .03 }} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-50 text-primary-600"><Bot className="h-5 w-5" /></span><div><h2 className="font-semibold text-slate-900">{agent.name}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{agent.responsibility}</p></div></div><div className="mt-4 flex flex-wrap gap-1.5"><span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-600">{agent.role}</span><span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-600">{agent.dependencies.length ? 'Collaborative' : 'Independent'}</span></div><p className="mt-4 text-xs text-slate-500">Try: “Help me create a practical plan for my project.”</p><button onClick={() => launch(agent)} className="mt-4 w-full rounded-xl border border-primary-200 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50">Quick launch</button></motion.article>)}</div></div></div>;
}
