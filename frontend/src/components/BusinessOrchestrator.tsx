import type { ComponentType } from 'react';
import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, ArrowRight, Play, Users, Map, FileText, Database, Award,
  Check, Loader2, RefreshCw, AlertTriangle, Eye, ChevronRight, Upload, X, ShieldCheck, GitBranch, History,
} from 'lucide-react';
import { generateAgentResponse } from '../utils/llm';
import type { AgentResult, AgentStatus } from '../types/agents';
import WorkspaceModal from './workspaces/WorkspaceModal';
import { documentContext, loadWorkspace, removeWorkspaceDocument, saveWorkspaceDocument, saveWorkspaceVersion, type WorkspaceDocument, type WorkspaceVersion } from '../lib/workspaceMemory';
import { exportDocx, exportMarkdown, exportPdf, exportPptx } from '../utils/workspaceExport';
import { runResearch } from '../utils/research';

// ─── Agent Definitions ──────────────────────────────────────

interface AgentCard {
  id: string;
  name: string;
  icon: ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  gradient: string;
}

const agents: AgentCard[] = [
  { id: 'research', name: 'Citizen Insights', icon: Users, color: 'text-sky-500', bg: 'bg-sky-50', gradient: 'from-sky-500 to-blue-600' },
  { id: 'strategy', name: 'Dev Planning', icon: Map, color: 'text-blue-500', bg: 'bg-blue-50', gradient: 'from-blue-500 to-primary-600' },
  { id: 'content', name: 'Communication', icon: FileText, color: 'text-rose-500', bg: 'bg-rose-50', gradient: 'from-rose-500 to-pink-600' },
  { id: 'development', name: 'Public Data', icon: Database, color: 'text-emerald-500', bg: 'bg-emerald-50', gradient: 'from-emerald-500 to-teal-600' },
  { id: 'pitch', name: 'Recommendation', icon: Award, color: 'text-purple-500', bg: 'bg-purple-50', gradient: 'from-purple-500 to-violet-600' },
];

// ─── Status Labels ──────────────────────────────────────────

const STATUS_LABELS: Record<AgentStatus, string> = {
  idle: 'Awaiting',
  queued: 'Queued',
  running: 'Generating...',
  completed: 'Output Ready',
  failed: 'Failed',
};

// ─── Component ──────────────────────────────────────────────

interface BusinessOrchestratorProps {
  externalAgentStatuses?: Record<string, AgentStatus>;
  setExternalAgentStatuses?: React.Dispatch<React.SetStateAction<Record<string, AgentStatus>>>;
}

export type { AgentStatus };

export default function BusinessOrchestrator({
  externalAgentStatuses,
  setExternalAgentStatuses,
}: BusinessOrchestratorProps) {
  const [goal, setGoal] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set(agents.map(a => a.id)));
  const [orchestratorStatus, setOrchestratorStatus] = useState<'idle' | 'running' | 'completed'>('idle');

  const [localAgentStatuses, setLocalAgentStatuses] = useState<Record<string, AgentStatus>>(
    agents.reduce((acc, a) => ({ ...acc, [a.id]: 'idle' as AgentStatus }), {} as Record<string, AgentStatus>)
  );

  const agentStatuses = externalAgentStatuses || localAgentStatuses;
  const setAgentStatuses = setExternalAgentStatuses || setLocalAgentStatuses;

  // Output cache — survives re-renders, reopens are instant
  const outputCache = useRef<Record<string, AgentResult<unknown>>>({});
  const [agentOutputs, setAgentOutputs] = useState<Record<string, AgentResult<unknown>>>({});
  const [activeViewOutput, setActiveViewOutput] = useState<string | null>(null);
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>({});
  const initialWorkspace = useRef(loadWorkspace()).current;
  const [documents, setDocuments] = useState<WorkspaceDocument[]>(initialWorkspace.documents);
  const [versions, setVersions] = useState<WorkspaceVersion[]>(initialWorkspace.versions);
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [awaitingApproval, setAwaitingApproval] = useState(false);
  const approvalResolver = useRef<(() => void) | null>(null);

  const toggleAgent = (id: string) => {
    setSelectedAgents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedAgents(new Set(agents.map(a => a.id)));
  const selectNone = () => setSelectedAgents(new Set());

  const addDocument = async (file: File) => {
    const text = await file.text();
    const document: WorkspaceDocument = { id: crypto.randomUUID(), name: file.name, type: file.type || 'text/plain', text, addedAt: new Date().toISOString() };
    setDocuments(saveWorkspaceDocument(document));
  };

  const approveWorkflow = () => {
    setAwaitingApproval(false);
    approvalResolver.current?.();
    approvalResolver.current = null;
  };

  // ─── Run Single Agent ──────────────────────────────────────

  const runSingleAgent = useCallback(async (
    agentId: string,
    goalText: string,
    context?: string,
    research?: { evidencePack?: string; skipResearch?: boolean },
  ) => {
    setAgentStatuses(prev => ({ ...prev, [agentId]: 'running' }));
    setErrorMessages(prev => { const next = { ...prev }; delete next[agentId]; return next; });

    try {
      const result = await generateAgentResponse(agentId, goalText, context, {
        documents: loadWorkspace().documents,
        enableResearch: !research?.skipResearch,
        skipResearch: research?.skipResearch === true,
        evidencePack: research?.evidencePack,
      });

      // Store in cache + state
      outputCache.current[agentId] = result;
      setAgentOutputs(prev => ({ ...prev, [agentId]: result }));

      if (result.success) {
        setAgentStatuses(prev => ({ ...prev, [agentId]: 'completed' }));
      } else {
        // Provider failures are surfaced as failed agents; no synthetic output is shown.
        setAgentStatuses(prev => ({ ...prev, [agentId]: 'failed' }));
        setErrorMessages(prev => ({ ...prev, [agentId]: result.error || 'AI generation failed.' }));
      }
    } catch (error) {
      console.error(`[COMET] Fatal error for ${agentId}:`, error);
      setAgentStatuses(prev => ({ ...prev, [agentId]: 'failed' }));
      setErrorMessages(prev => ({
        ...prev,
        [agentId]: error instanceof Error ? error.message : 'Unknown error occurred',
      }));
    }
  }, [setAgentStatuses]);

  // ─── Run Orchestrator ──────────────────────────────────────

  const runOrchestrator = async () => {
    if (!goal.trim() || selectedAgents.size === 0 || orchestratorStatus === 'running') return;

    setOrchestratorStatus('running');
    setAgentOutputs({});
    setActiveViewOutput(null);
    setErrorMessages({});
    outputCache.current = {};

    // Set all selected to queued
    const initialStatuses = agents.reduce((acc, a) => ({
      ...acc,
      [a.id]: selectedAgents.has(a.id) ? 'queued' as AgentStatus : 'idle' as AgentStatus,
    }), {} as Record<string, AgentStatus>);
    setAgentStatuses(initialStatuses);

    const runOrder = ['research', 'strategy', 'content', 'development', 'pitch'];
    let cumulativeContext = documentContext(documents);

    // One shared real research pass for the workflow (no sample fallback)
    let evidencePack = '';
    try {
      const research = await runResearch({
        prompt: goal,
        agentId: 'research',
        documents,
      });
      evidencePack = research.evidencePack || '';
      if (
        research.classification?.liveResearchRequired
        && research.researchFailed
        && !research.sources?.some(s => s.sourceType === 'uploaded' || s.sourceType === 'user_website')
      ) {
        setOrchestratorStatus('completed');
        setErrorMessages(prev => ({
          ...prev,
          research:
            `Live research could not be completed. ${research.researchError || ''}`.trim() +
            ' Retry or add uploaded sources. Sample research is never shown.',
        }));
        setAgentStatuses(prev => ({ ...prev, research: 'failed' }));
        return;
      }
      if (research.generatedWithoutLiveResearch) {
        evidencePack +=
          '\n\nNOTE: Generated without full live external verification. Do not invent facts.';
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Live research could not be completed.';
      setOrchestratorStatus('completed');
      setErrorMessages(prev => ({ ...prev, research: message }));
      setAgentStatuses(prev => ({ ...prev, research: 'failed' }));
      return;
    }

    for (const agentId of runOrder) {
      if (!selectedAgents.has(agentId)) continue;

      // Inter-agent delay to avoid rate limiting (not fake progress UI)
      if (cumulativeContext) {
        await new Promise(r => setTimeout(r, 800));
      }

      await runSingleAgent(agentId, goal, cumulativeContext || undefined, {
        evidencePack,
        skipResearch: true,
      });

      // Pass each complete, structured result to downstream agents as shared memory.
      const output = outputCache.current[agentId];
      if (output?.success) {
        cumulativeContext += `\n\n### [${agentId.toUpperCase()} AGENT OUTPUT]\n${JSON.stringify(output.data)}`;
        if (output.sources?.length) {
          cumulativeContext += `\n### [${agentId.toUpperCase()} SOURCES]\n${JSON.stringify(
            output.sources.map(s => ({
              sourceId: s.sourceId,
              citationNumber: s.citationNumber,
              title: s.title,
              url: s.url,
              confidence: s.relevanceScore,
              evidenceType: s.verificationStatus,
              retrievedAt: s.retrievedAt,
            })),
          )}`;
        }
      }

      if (approvalRequired && agentId === 'research' && runOrder.some(id => id !== 'research' && selectedAgents.has(id))) {
        setAwaitingApproval(true);
        await new Promise<void>(resolve => { approvalResolver.current = resolve; });
      }
    }

    setOrchestratorStatus('completed');
    setVersions(saveWorkspaceVersion(goal, outputCache.current));
  };

  // ─── Retry Single Agent ────────────────────────────────────

  const retryAgent = async (agentId: string) => {
    if (!goal.trim()) return;
    await runSingleAgent(agentId, goal);
  };

  // ─── Render ────────────────────────────────────────────────

  const completedCount = agents.filter(a => agentStatuses[a.id] === 'completed').length;
  const failedCount = agents.filter(a => agentStatuses[a.id] === 'failed').length;
  const isSetup = orchestratorStatus === 'idle';
  const runningAgent = agents.find(agent => agentStatuses[agent.id] === 'running');
  const progress = Math.round(((completedCount + (runningAgent ? 0.5 : 0)) / Math.max(selectedAgents.size, 1)) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-5 pb-6"
    >
      {/* ── Goal Input Card ── */}
      <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200 p-5 shadow-sm transition-shadow focus-within:shadow-md focus-within:shadow-primary-100">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-[0.15em] block mb-3">
          1. Describe the issue
        </label>
        <Sparkles className="absolute right-7 top-6 h-4 w-4 text-primary-400" aria-hidden="true" />
        <textarea
          value={goal}
          onChange={e => setGoal(e.target.value)}
          disabled={orchestratorStatus === 'running'}
          placeholder="Example: Analyse road repair complaints in Ward 5 and suggest the highest-impact next steps."
          rows={3}
          className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm leading-6 text-slate-700 placeholder:text-slate-400 outline-none focus:bg-white focus:border-primary-400 focus:ring-4 focus:ring-primary-100 resize-none transition-all disabled:opacity-60"
        />
        {!goal && orchestratorStatus === 'idle' && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400">Try an example:</span>
            <button onClick={() => setGoal('Analyze road repair complaints in Ward 5 and recommend the highest-impact projects.')} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700">Ward 5 road repairs</button>
            <button onClick={() => setGoal('Create a development plan to improve water access across rural wards.')} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700">Water access plan</button>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0"><p className="flex items-center gap-2 text-xs font-semibold text-slate-700"><Upload className="h-3.5 w-3.5 text-primary-600" /> Reference files for AI context</p><div className="mt-2 flex flex-wrap gap-1.5">{documents.length ? documents.map(document => <span key={document.id} className="inline-flex max-w-48 items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] text-slate-600 shadow-sm"><span className="truncate">{document.name}</span><button onClick={() => setDocuments(removeWorkspaceDocument(document.id))} aria-label={`Remove ${document.name}`}><X className="h-3 w-3" /></button></span>) : <span className="text-[11px] text-slate-500">Upload a text, Markdown, CSV, or JSON file to ground the plan.</span>}</div></div>
          <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-primary-200 bg-white px-3 py-2 text-xs font-semibold text-primary-700 hover:bg-primary-50"><Upload className="h-3.5 w-3.5" /> Add file<input className="sr-only" type="file" accept=".txt,.md,.csv,.json,text/plain,text/markdown,text/csv,application/json" onChange={event => { const file = event.target.files?.[0]; if (file) void addDocument(file); event.currentTarget.value = ''; }} /></label>
        </div>

        <div className="mt-5 flex flex-col gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-400 font-medium">Agents:</span>
            <button onClick={selectAll} disabled={orchestratorStatus === 'running'}
              className={`text-sm font-semibold transition-all ${selectedAgents.size === agents.length ? 'text-primary' : 'text-slate-400 hover:text-slate-600'} disabled:opacity-50`}>
              All
            </button>
            <label className="ml-1 flex items-center gap-2 text-xs font-medium text-slate-600"><input type="checkbox" checked={approvalRequired} onChange={event => setApprovalRequired(event.target.checked)} disabled={orchestratorStatus === 'running'} className="h-3.5 w-3.5 rounded border-slate-300 text-primary-600" /> Review after research</label>
            <button onClick={selectNone} disabled={orchestratorStatus === 'running'}
              className={`text-sm font-semibold transition-all ${selectedAgents.size === 0 ? 'text-primary' : 'text-slate-400 hover:text-slate-600'} disabled:opacity-50`}>
              None
            </button>
          </div>

          <button onClick={runOrchestrator}
            disabled={!goal.trim() || selectedAgents.size === 0 || orchestratorStatus === 'running'}
            className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-semibold rounded-xl hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary-200 transition-all active:translate-y-0 disabled:bg-slate-300 disabled:cursor-not-allowed">
            {orchestratorStatus === 'running' ? (
              <><Loader2 className="w-4.5 h-4.5 animate-spin" /> Generating...</>
            ) : (
              <><Sparkles className="w-4.5 h-4.5" /> Analyze & Recommend <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" /></>
            )}
          </button>
        </div>
      </div>

      {/* ── Status Summary Bar ── */}
      {orchestratorStatus !== 'idle' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-white rounded-2xl border border-slate-200 px-5 py-4 shadow-sm"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-6 text-sm">
            {completedCount > 0 && (
              <span className="flex items-center gap-1.5 text-green-600 font-medium">
                <Check className="w-4 h-4" /> {completedCount} completed
              </span>
            )}
            {failedCount > 0 && (
              <span className="flex items-center gap-1.5 text-red-500 font-medium">
                <AlertTriangle className="w-4 h-4" /> {failedCount} failed
              </span>
            )}
            {orchestratorStatus === 'running' && (
              <span className="flex items-center gap-1.5 text-primary font-medium">
                <Loader2 className="w-4 h-4 animate-spin" /> In progress
              </span>
            )}
          </div>
          {orchestratorStatus === 'completed' && failedCount > 0 && (
            <button
              onClick={() => {
                agents.filter(a => agentStatuses[a.id] === 'failed').forEach(a => retryAgent(a.id));
              }}
              className="text-sm font-semibold text-primary hover:text-primary-700 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry Failed
            </button>
          )}
           <div className="mt-3 sm:mt-0 sm:min-w-52"><div className="flex items-center justify-between text-xs"><span className="font-medium text-slate-600">{runningAgent ? `${runningAgent.name} is working` : orchestratorStatus === 'completed' ? 'Analysis complete' : 'Preparing agents'}</span><span className="font-semibold text-primary-600">{progress}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full rounded-full bg-primary-500" /></div></div>
          </div>
        </motion.div>
      )}

      {awaitingApproval && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="flex items-center gap-2 text-sm font-semibold text-amber-900"><ShieldCheck className="h-4 w-4" /> Review checkpoint</p><p className="mt-1 text-xs text-amber-800">Research is ready. Approve it to continue the remaining agents with this context.</p></div><button onClick={approveWorkflow} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700"><Check className="h-4 w-4" /> Approve & continue</button></motion.div>}

      {orchestratorStatus === 'completed' && completedCount > 0 && <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="flex items-center gap-2 text-sm font-semibold text-slate-900"><GitBranch className="h-4 w-4 text-primary-600" /> Workflow graph & exports</p><p className="mt-1 text-xs text-slate-500">This version is saved locally. Export the completed business plan in the format you need.</p></div><div className="flex flex-wrap gap-2"><button onClick={() => exportMarkdown(goal, agentOutputs)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Markdown</button><button onClick={() => void exportPdf(goal, agentOutputs)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">PDF</button><button onClick={() => void exportDocx(goal, agentOutputs)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">DOCX</button><button onClick={() => void exportPptx(goal, agentOutputs)} className="rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700">PowerPoint</button></div></div><div className="mt-4 flex items-center gap-1 overflow-x-auto">{agents.filter(agent => selectedAgents.has(agent.id)).map((agent, index) => <div key={agent.id} className="flex items-center gap-1"><button onClick={() => setActiveViewOutput(agent.id)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${agentStatuses[agent.id] === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{agent.name}</button>{index < selectedAgents.size - 1 && <ArrowRight className="h-3.5 w-3.5 text-slate-300" />}</div>)}</div>{versions.length > 0 && <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500"><History className="h-3.5 w-3.5" /> {versions.length} saved plan version{versions.length === 1 ? '' : 's'} in this browser.</p>}</div>}

      {/* ── Agent Cards Grid ── */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-4 px-1 shrink-0">
          <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-400">2. Choose the expertise</p><h3 className="mt-1 text-xl font-semibold text-slate-900">Your specialist team</h3><p className="mt-1 text-sm text-slate-500">Select only the expertise this request needs.</p></div>
          <div className="bg-slate-100 px-3 py-1 rounded-full">
            <span className="text-xs text-slate-500 font-medium">
              {selectedAgents.size} of {agents.length} selected
            </span>
          </div>
        </div>

        <div className={`grid gap-3 ${isSetup ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-5' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
          {agents.map(agent => {
            const Icon = agent.icon;
            const isSelected = selectedAgents.has(agent.id);
            const status = agentStatuses[agent.id];
            const hasOutput = !!agentOutputs[agent.id];
            const isFailed = status === 'failed';
            const errorMsg = errorMessages[agent.id];

            return (
              <motion.div
                key={agent.id}
                whileHover={{ y: -2, scale: 1.01 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className={`bg-white rounded-2xl border transition-all flex flex-col justify-between shadow-sm ${isSetup ? 'min-h-[118px] p-3' : 'min-h-[200px] p-4'} ${
                  status === 'running' ? 'ring-2 ring-primary-200 border-primary-100' :
                  isFailed ? 'border-red-200 bg-red-50/30' :
                  status === 'completed' ? 'border-green-200' :
                  'border-slate-100'
                }`}
              >
                {/* Header */}
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl border border-slate-100 bg-white shadow-sm flex items-center justify-center">
                        {status === 'running' ? (
                          <Loader2 className={`w-4 h-4 animate-spin ${agent.color}`} />
                        ) : (
                          <Icon className={`w-4 h-4 ${agent.color}`} />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-dark leading-tight">{agent.name}</p>
                        <p className={`text-xs mt-1 font-medium ${
                          isFailed ? 'text-red-500' :
                          status === 'completed' ? 'text-green-600' :
                          status === 'running' ? 'text-primary' :
                          'text-slate-400'
                        }`}>
                          {isFailed ? '❌ ' : status === 'completed' ? '✅ ' : ''}
                          {STATUS_LABELS[status]}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleAgent(agent.id)}
                      disabled={orchestratorStatus === 'running'}
                      className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-primary text-white shadow-sm'
                          : 'border-2 border-slate-200 hover:border-slate-300'
                      } disabled:opacity-50`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>
                  </div>

                  {/* Error Message */}
                  <AnimatePresence>
                    {isFailed && errorMsg && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                      >
                        <p className="text-xs text-red-600 font-semibold">Unable to generate output.</p>
                        <p className="mt-1 text-xs leading-5 text-red-600/90 break-words">{errorMsg}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>

                {/* Detailed actions only appear after the analysis starts. */}
                {!isSetup && <div className="space-y-2.5">
                  {/* View Output */}
                  <button
                    onClick={() => setActiveViewOutput(agent.id)}
                    disabled={!hasOutput}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-white hover:bg-slate-50 text-sm font-semibold text-primary rounded-xl transition-all border border-primary-100 disabled:opacity-50 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                  >
                    <Eye className="w-4 h-4" /> View Output <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex gap-2">
                    {/* Retry / Regen */}
                    <button
                      onClick={() => retryAgent(agent.id)}
                      disabled={!goal.trim() || status === 'running' || orchestratorStatus === 'running'}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl transition-all border ${
                        isFailed
                          ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isFailed ? (
                        <><RefreshCw className="w-3 h-3" /> Retry</>
                      ) : (
                        <><Play className="w-3 h-3" /> Regen</>
                      )}
                    </button>

                    {/* Export */}
                    <button
                      disabled={!hasOutput}
                      onClick={() => {
                        const output = agentOutputs[agent.id];
                        if (!output?.data) return;
                        const blob = new Blob([JSON.stringify(output.data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${agent.id}_output.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white text-xs font-medium text-slate-600 rounded-xl transition-all border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ↓ Export
                    </button>
                  </div>
                </div>}
              </motion.div>
            );
          })}
        </div>

        {/* ── Workspace Modal ── */}
        <WorkspaceModal
          isOpen={!!activeViewOutput}
          onClose={() => setActiveViewOutput(null)}
          agentId={activeViewOutput}
          agentName={agents.find(a => a.id === activeViewOutput)?.name || ''}
          agentColor={agents.find(a => a.id === activeViewOutput)?.color || ''}
          agentBg={agents.find(a => a.id === activeViewOutput)?.bg || ''}
          agentGradient={agents.find(a => a.id === activeViewOutput)?.gradient || ''}
          result={activeViewOutput ? agentOutputs[activeViewOutput] : undefined}
        />
      </div>
    </motion.div>
  );
}
