import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Check, ChevronDown, ChevronUp, Copy, Eye, Loader2, MapPin, Mic, Plus, RefreshCw, Search, FileText, BarChart3, Code2, Repeat, Pin, X, Layers3, Globe, Type, FileVideo, Image as ImageIcon, UploadCloud, ArrowUp } from 'lucide-react';
import { generateAgentResponse } from '../utils/llm';
import type { AgentResult } from '../types/agents';
import type { ResearchEvent, SourceRecord } from '../types/sources';
import { documentContext, loadWorkspace, saveWorkspaceVersion } from '../lib/workspaceMemory';
import { mergeSources, runResearch } from '../utils/research';
import { ResearchActivityTimeline } from './research/ResearchActivity';
import { agentOutputToText, copyTextToClipboard } from '../utils/agentOutput';
import AgentOutputModal from './AgentOutputModal';
import {
  agentsForMode,
  resolveAgentIdForApi,
  sessionStorageKey,
  type WorkspaceMode,
} from '../lib/modeAgents';
import { getAgentLibrary } from '../lib/dynamicAgents';

const STUDENT_TOOLS = [
  { id: 'graphical', name: 'Graphical Understanding', icon: BarChart3, description: 'Visual explanations for math & science' },
  { id: 'summariser', name: 'PDF & Notes Summariser', icon: FileText, description: 'Convert study documents into summaries' },
  { id: 'revision', name: 'Revision Tool', icon: Repeat, description: 'Active recall and spaced repetition' },
  { id: 'formula', name: 'Formula Cheat Sheet', icon: Code2, description: 'Quick access to academic formulas' },
  { id: 'mindmaps', name: 'Short Notes & Mind Maps', icon: Layers3, description: 'Visual learning resources' },
];

// ─── Mode-scoped persistence (Business / Student / Playground never share state) ─

function saveSession(mode: WorkspaceMode, data: Record<string, unknown>) {
  try { localStorage.setItem(sessionStorageKey(mode), JSON.stringify({ ...data, mode })); } catch {}
}

function loadSession(mode: WorkspaceMode): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(sessionStorageKey(mode));
    if (raw) return JSON.parse(raw) as Record<string, unknown>;
    // Migration: legacy shared key only if mode matches
    const legacy = localStorage.getItem('comet.session.v1');
    if (legacy) {
      const parsed = JSON.parse(legacy) as Record<string, unknown>;
      if (parsed.mode === mode) return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Extended Status ─────────────────────────────────────────

type ExtendedStatus = 'ready' | 'selected' | 'queued' | 'waiting' | 'running' | 'completed' | 'failed';

const STATUS_LABELS: Record<ExtendedStatus, string> = {
  ready: 'Ready',
  selected: 'Selected',
  queued: 'Queued',
  waiting: 'Waiting for dependency',
  running: 'Working',
  completed: 'Completed',
  failed: 'Failed',
};

const STATUS_COLORS: Record<ExtendedStatus, string> = {
  ready: 'text-slate-400',
  selected: 'text-primary-600',
  queued: 'text-amber-600',
  waiting: 'text-orange-500',
  running: 'text-primary-600',
  completed: 'text-emerald-600',
  failed: 'text-rose-600',
};

// ─── Component ───────────────────────────────────────────────

export default function DynamicOrchestrator({ mode = 'business' }: { mode?: WorkspaceMode }) {
  const agents = agentsForMode(mode);
  
  const [prompt, setPrompt] = useState('');
  const [orchestrationMode, setOrchestrationMode] = useState<'automatic' | 'manual'>('automatic');
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(() => new Set(agentsForMode(mode).map(a => a.id)));
  const [statuses, setStatuses] = useState<Record<string, ExtendedStatus>>(() =>
    Object.fromEntries(agentsForMode(mode).map(a => [a.id, 'ready' as ExtendedStatus]))
  );
  const [outputs, setOutputs] = useState<Record<string, AgentResult<unknown>>>({});
  const [running, setRunning] = useState(false);
  const [selectedOutput, setSelectedOutput] = useState<string | null>(null);
  const [marketLocation, setMarketLocation] = useState('');
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [locating, setLocating] = useState(false);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const marketLocationRef = useRef('');
  const [researchEvents, setResearchEvents] = useState<ResearchEvent[]>([]);
  const [sharedSources, setSharedSources] = useState<SourceRecord[]>([]);
  const [researchRunning, setResearchRunning] = useState(false);
  const [researchMeta, setResearchMeta] = useState<{
    failed?: boolean;
    error?: string;
    withoutLive?: boolean;
    classification?: string;
    retrievedAt?: string;
    evidencePack?: string;
  }>({});
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [plusOpen, setPlusOpen] = useState(false);
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'processing' | 'denied'>('idle');
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentThreads, setCommentThreads] = useState<Record<string, Array<{ role: 'user' | 'agent'; text: string; pendingData?: unknown }>>>({});
  const [outputBackups, setOutputBackups] = useState<Record<string, AgentResult<unknown>>>({});
  const [chatLog, setChatLog] = useState<Array<{ id: string; role: 'user' | 'status' | 'system'; text: string }>>([]);
  const [stickToBottom, setStickToBottom] = useState(true);
  const [showJumpLatest, setShowJumpLatest] = useState(false);
  const continueWithoutResearchRef = useRef(false);
  const skipLocationRef = useRef(false);
  const lastSubmittedPromptRef = useRef('');
  const centerScrollRef = useRef<HTMLDivElement>(null);
  const outputTopRef = useRef<HTMLDivElement>(null);
  const plusRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<{ stop: () => void; abort?: () => void } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const pushStatus = useCallback((text: string) => {
    setChatLog(prev => [...prev, { id: crypto.randomUUID(), role: 'status', text }]);
  }, []);

  // Tool states for Student mode
  const [pinnedTools, setPinnedTools] = useState<string[]>([]);
  const [hiddenTools, setHiddenTools] = useState<string[]>([]);
  const [toolsExpanded, setToolsExpanded] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('comet.student.tools');
      if (stored) {
        const { pinned, hidden } = JSON.parse(stored);
        if (pinned) setPinnedTools(pinned);
        if (hidden) setHiddenTools(hidden);
      }
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem('comet.student.tools', JSON.stringify({ pinned: pinnedTools, hidden: hiddenTools }));
  }, [pinnedTools, hiddenTools]);

  // Mode-scoped bootstrap: never leak Business ↔ Student ↔ Playground state
  useEffect(() => {
    const modeAgents = agentsForMode(mode);
    const session = loadSession(mode);
    const sessionOutputs = (session?.outputs && typeof session.outputs === 'object')
      ? session.outputs as Record<string, AgentResult<unknown>>
      : {};
    // Only restore outputs whose agent ids belong to this mode
    const allowed = new Set(modeAgents.map(a => a.id));
    const filteredOutputs = Object.fromEntries(
      Object.entries(sessionOutputs).filter(([id]) => allowed.has(id)),
    );
    const filteredStatuses = Object.fromEntries(
      modeAgents.map(a => {
        const s = (session?.statuses as Record<string, ExtendedStatus> | undefined)?.[a.id];
        return [a.id, s && filteredOutputs[a.id] ? s : 'ready' as ExtendedStatus];
      }),
    );
    setStatuses(filteredStatuses);
    setSelectedAgents(new Set(
      Array.isArray(session?.selectedAgents)
        ? (session.selectedAgents as string[]).filter(id => allowed.has(id))
        : modeAgents.map(a => a.id),
    ));
    setOutputs(filteredOutputs);
    setSelectedOutput(null);
    setRunning(false);
    setResearchEvents([]);
    setSharedSources([]);
    setResearchMeta({});
    setChatLog(Array.isArray(session?.chatLog) ? session.chatLog as typeof chatLog : []);
    setPrompt(''); // never restore stale composer text
    lastSubmittedPromptRef.current = typeof session?.lastSubmitted === 'string' ? session.lastSubmitted : '';
    const loc = typeof session?.marketLocation === 'string' ? session.marketLocation : '';
    setMarketLocation(loc);
    marketLocationRef.current = loc;
    setShowLocationPrompt(false);
    setLocationInput('');
    setLocating(false);
    continueWithoutResearchRef.current = false;
    skipLocationRef.current = false;
  }, [mode]);

  // Save mode-scoped session (never cross-write other modes)
  useEffect(() => {
    if (Object.keys(outputs).length === 0 && chatLog.length === 0) return;
    saveSession(mode, {
      mode,
      lastSubmitted: lastSubmittedPromptRef.current,
      statuses,
      outputs,
      selectedAgents: Array.from(selectedAgents),
      chatLog,
      marketLocation,
      orchestrationMode,
    });
  }, [outputs, statuses, mode, selectedAgents, chatLog, marketLocation, orchestrationMode]);

  const toggleAgent = (id: string) => {
    setSelectedAgents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setStatuses(prev => ({
      ...prev,
      [id]: prev[id] === 'selected' ? 'ready' : 'selected',
    }));
  };

  // ─── Run a single agent through backend proxy ─────────────

  const runSingleAgent = useCallback(async (
    agentId: string,
    goalText: string,
    context: string,
    research?: {
      evidencePack?: string;
      sources?: SourceRecord[];
      skipResearch?: boolean;
      forceResearch?: boolean | null;
    },
  ): Promise<AgentResult<unknown>> => {
    setStatuses(prev => ({ ...prev, [agentId]: 'running' }));

    const docs = loadWorkspace().documents;
    const apiId = resolveAgentIdForApi(mode, agentId);
    const agentDef = getAgentLibrary().find(a => a.id === apiId);
    const studio = agents.find(a => a.id === agentId);
    const result = await generateAgentResponse(apiId, goalText, context, {
      documents: docs,
      enableResearch: !research?.skipResearch,
      skipResearch: research?.skipResearch === true,
      forceResearch: research?.forceResearch ?? null,
      evidencePack: research?.evidencePack,
      sources: research?.sources,
      dynamicDefinition: agentDef
        ? { name: agentDef.name, responsibility: agentDef.responsibility, systemPrompt: agentDef.systemPrompt }
        : studio
          ? { name: studio.name, responsibility: studio.responsibility, systemPrompt: studio.responsibility }
          : undefined,
    });

    if (result.sources?.length) {
      setSharedSources(prev => mergeSources(prev, result.sources));
    }
    if (result.researchEvents?.length) {
      setResearchEvents(prev => {
        const ids = new Set(prev.map(e => e.id));
        return [...prev, ...result.researchEvents!.filter(e => !ids.has(e.id))];
      });
    }

    setOutputs(prev => ({ ...prev, [agentId]: result }));
    setStatuses(prev => ({ ...prev, [agentId]: result.success ? 'completed' : 'failed' }));
    return result;
  }, [mode, agents]);

  // ─── Orchestrate with dependencies ─────────────────────────

  const run = useCallback(async (overrideText?: string) => {
    const submitted = (overrideText ?? prompt).trim();
    if (!submitted || running) return;

    // Location-aware gate for local market analysis (business only)
    const activeLocation = marketLocationRef.current || marketLocation;
    const needsLocation = mode === 'business' && /local|nearby|in my (city|area|town)|competitor|gym in|store in|shop in|delhi|mumbai|bangalore|bangaluru|location|nearby market/i.test(submitted);
    if (needsLocation && !activeLocation && !skipLocationRef.current) {
      setShowLocationPrompt(true);
      // Keep composer text until location is resolved so the user does not lose work
      return;
    }

    // Capture submission then clear composer immediately (Part 1)
    lastSubmittedPromptRef.current = submitted;
    setPrompt('');
    setShowLocationPrompt(false);
    window.requestAnimationFrame(() => textareaRef.current?.focus());

    const agentsToRun = agentsForMode(mode);
    const locationContext = activeLocation
      ? `\n\nTARGET MARKET LOCATION (user-approved): ${activeLocation}\nUse this for local demand, competitors, pricing, and regulation when evidence allows. Do not invent local statistics.`
      : '';
    const researchPrompt = `${submitted}${locationContext}`;
    
    let activeAgents = orchestrationMode === 'automatic' 
      ? [...agentsToRun] 
      : agentsToRun.filter(a => selectedAgents.has(a.id));
      
    // Intelligent selection in Automatic mode — only relevant agents for THIS mode
    if (orchestrationMode === 'automatic') {
      const lower = submitted.toLowerCase();
      const selectedIds = new Set<string>();
      const addDeps = (id: string) => {
        const agent = agentsToRun.find(a => a.id === id);
        if (agent) agent.dependencies.forEach(dep => { selectedIds.add(dep); addDeps(dep); });
      };

      if (mode === 'student') {
        selectedIds.add('guideminds');
        if (/math|calculus|equation|geometry|solve|problem|physics|code|debug/i.test(lower)) selectedIds.add('specialisthub');
        if (/plan|schedule|timetable|exam in|days left|routine/i.test(lower)) selectedIds.add('successarchitect');
        if (/exam|syllabus|previous paper|priority|weightage/i.test(lower)) selectedIds.add('examinsight');
        if (/summary|pdf|notes|chapter|document|revise|revision/i.test(lower)) selectedIds.add('studyvault');
        if (selectedIds.size === 1) selectedIds.add('specialisthub');
      } else if (mode === 'playground') {
        // Dynamic specialist pick from playground registry only
        const picked = getAgentLibrary().slice(0, 12);
        selectedIds.add('pg_research');
        if (/product|app|software|mvp/i.test(lower)) { selectedIds.add('pg_product'); selectedIds.add('pg_frontend'); selectedIds.add('pg_backend'); }
        if (/market|competitor|startup|business/i.test(lower)) { selectedIds.add('pg_strategy'); selectedIds.add('pg_market'); }
        if (/brand|campaign|seo|content/i.test(lower)) { selectedIds.add('pg_marketing'); selectedIds.add('pg_brand'); }
        if (selectedIds.size === 1) selectedIds.add('pg_strategy');
        // Ensure only ids that exist in playground list
        const allowed = new Set(picked.map(p => `pg_${p.id}`));
        Array.from(selectedIds).forEach(id => { if (!allowed.has(id)) selectedIds.delete(id); });
      } else {
        // Business: start from intent, avoid running every agent
        selectedIds.add('research');
        if (/strateg|business model|gtm|go-to-market|positioning|roadmap|launch|startup|opportunity|plan/i.test(lower)) {
          selectedIds.add('strategy');
        }
        if (/market|competitor|demand|tam|sam|som|pricing|segment/i.test(lower)) selectedIds.add('market');
        if (/finance|cost|revenue|pricing|budget|unit economics|break-even/i.test(lower)) selectedIds.add('finance');
        if (/market(ing)?|campaign|content|caption|social|copy|brand|launch plan/i.test(lower)) {
          selectedIds.add('marketing');
          selectedIds.add('content');
        }
        if (/app|software|platform|api|website|mvp|tech|stack|architect|product/i.test(lower)) {
          selectedIds.add('development');
        }
        if (/pitch|deck|investor|presentation|recommend/i.test(lower)) selectedIds.add('pitch');
        if (selectedIds.size === 1 && /fitness|gym|business|startup|open|launch|idea/i.test(lower)) {
          selectedIds.add('strategy');
        }
        if (selectedIds.size === 1) selectedIds.add('strategy');
      }

      Array.from(selectedIds).forEach(addDeps);
      activeAgents = agentsToRun.filter(a => selectedIds.has(a.id));
      setSelectedAgents(new Set(activeAgents.map(a => a.id)));
    }
    
    if (activeAgents.length === 0) {
      // Restore prompt if nothing to run
      setPrompt(submitted);
      return;
    }
    
    setRunning(true);
    setOutputs({});
    setSelectedOutput(null);
    setResearchEvents([]);
    setSharedSources([]);
    setResearchMeta({});
    setChatLog(prev => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', text: submitted },
      { id: crypto.randomUUID(), role: 'status', text: 'COMET is understanding your request…' },
    ]);
    setStickToBottom(true);
    window.dispatchEvent(new CustomEvent('comet-web-sources', { detail: { query: submitted, status: 'searching', sources: [] } }));
    
    // Set initial statuses
    const initialStatuses: Record<string, ExtendedStatus> = {};
    agentsToRun.forEach(a => {
      if (activeAgents.find(aa => aa.id === a.id)) {
        const hasDeps = a.dependencies.some(dep => activeAgents.find(aa => aa.id === dep));
        initialStatuses[a.id] = hasDeps ? 'waiting' : 'queued';
      } else {
        initialStatuses[a.id] = 'ready';
      }
    });
    setStatuses(initialStatuses);
    pushStatus(`Selected agents: ${activeAgents.map(a => a.name).join(', ')}`);

    const docs = loadWorkspace().documents;
    let cumulativeContext = documentContext(docs);
    const resultMap: Record<string, AgentResult<unknown>> = {};

    // Shared research pass (real retrieval) before agents — no fake progress
    setResearchRunning(true);
    pushStatus('Analyzing intent and retrieving trusted sources…');
    let evidencePack = '';
    let sources: SourceRecord[] = [];
    let withoutLive = false;
    try {
      const leadAgent = activeAgents.find(a => a.id === 'research')?.id
        || activeAgents.find(a => a.id === 'studyvault')?.id
        || activeAgents[0].id;
      const research = await runResearch({
        prompt: researchPrompt,
        agentId: leadAgent,
        documents: docs,
        forceResearch: continueWithoutResearchRef.current ? false : null,
        onEvent: (event) => {
          setResearchEvents(prev => {
            if (prev.some(e => e.id === event.id)) {
              return prev.map(e => (e.id === event.id ? event : e));
            }
            return [...prev, event];
          });
          if (event.message && (event.status === 'active' || event.status === 'completed')) {
            pushStatus(event.message);
          }
        },
      });
      evidencePack = research.evidencePack || '';
      sources = research.sources || [];
      setSharedSources(sources);
      // Prefer streamed events; fill from final result if stream was empty
      setResearchEvents(prev => (prev.length ? prev : research.events || []));
      withoutLive = Boolean(research.generatedWithoutLiveResearch || research.researchFailed);
      setResearchMeta({
        failed: research.researchFailed,
        error: research.researchError || undefined,
        withoutLive,
        classification: research.classification?.classification,
        retrievedAt: research.retrievedAt,
        evidencePack,
      });
      const st = (research as { stats?: { sourcesFound?: number; sourcesUsed?: number; crossCheckedClaims?: number } }).stats;
      window.dispatchEvent(new CustomEvent('comet-web-sources', {
        detail: {
          query: submitted,
          sources: sources.filter(s => s.url?.startsWith('http')),
          stats: st || {
            sourcesFound: sources.filter(s => s.url?.startsWith('http')).length,
            sourcesUsed: sources.filter(s => s.url?.startsWith('http')).length,
            crossCheckedClaims: sources.reduce((n, s) => n + (s.evidenceSnippets?.length || 0), 0),
          },
        },
      }));
      if (sources.length) {
        pushStatus(`Sources ready: ${sources.filter(s => s.url?.startsWith('http')).length} web source(s) accepted.`);
      }

      // Soft-continue when research fails: still run agents, clearly labeled
      if (
        research.classification?.liveResearchRequired
        && research.researchFailed
        && !sources.some(s => s.sourceType === 'uploaded' || s.sourceType === 'user_website')
      ) {
        withoutLive = true;
        if (!evidencePack) {
          evidencePack =
            'EVIDENCE PACK\nLive external research could not be completed.\n' +
            `Error: ${research.researchError || 'No reliable sources retrieved.'}\n` +
            'You MUST NOT invent statistics, competitors, URLs, or citations.\n' +
            'Label the output: Generated without live external verification.\n';
        }
        setResearchMeta(prev => ({
          ...prev,
          failed: true,
          error: research.researchError || 'Live research could not be completed.',
          withoutLive: true,
          evidencePack,
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Live research could not be completed.';
      setResearchMeta({ failed: true, error: message, withoutLive: true });
      withoutLive = true;
      evidencePack =
        'EVIDENCE PACK\nLive research failed.\n' +
        'You MUST NOT invent external facts. Label output: Generated without live external verification.\n';
    }
    setResearchRunning(false);
    continueWithoutResearchRef.current = false;

    // Build execution layers (dependency-aware)
    const completed = new Set<string>();
    const toRun = new Set(activeAgents.map(a => a.id));
    let stagger = 0;
    
    while (toRun.size > 0) {
      // Find agents whose dependencies are all completed (or not in toRun set)
      const readyNow = activeAgents.filter(a => 
        toRun.has(a.id) && 
        a.dependencies.every(dep => completed.has(dep) || !toRun.has(dep))
      );
      
      if (readyNow.length === 0) {
        // Prevent infinite loop — run remaining agents anyway
        const remaining = activeAgents.filter(a => toRun.has(a.id));
        readyNow.push(...remaining);
      }

      // Run this batch in parallel (reuse shared evidence; skip per-agent re-search)
      const promises = readyNow.map(async (agent) => {
        setStatuses(prev => ({ ...prev, [agent.id]: 'queued' }));
        pushStatus(`${agent.name} is generating…`);
        // Deterministic small stagger to reduce provider rate limits (not fake progress)
        const delay = stagger * 200;
        stagger += 1;
        if (delay) await new Promise(r => setTimeout(r, delay));
        
        const result = await runSingleAgent(
          agent.id,
          researchPrompt,
          cumulativeContext || 'No prior agent output available.',
          {
            evidencePack,
            sources,
            skipResearch: true,
            forceResearch: null,
          },
        );
        resultMap[agent.id] = result;
        
        if (result.success) {
          pushStatus(`${agent.name} completed — open View in Studio to read the full report.`);
          // Preserve structured evidence metadata for downstream agents
          const claims = (result.data as { claims?: unknown } | undefined)?.claims;
          cumulativeContext += `\n\n### [${agent.id.toUpperCase()} AGENT OUTPUT]\n${JSON.stringify(result.data)}`;
          if (claims) {
            cumulativeContext += `\n### [${agent.id.toUpperCase()} EVIDENCE CLAIMS]\n${JSON.stringify(claims)}`;
          }
          if (result.sources?.length) {
            cumulativeContext += `\n### [${agent.id.toUpperCase()} SOURCE IDS]\n${JSON.stringify(result.sources.map(s => ({ sourceId: s.sourceId, citationNumber: s.citationNumber, title: s.title, url: s.url })))}`;
          }
        } else {
          pushStatus(`${agent.name} failed: ${result.error || 'Unable to generate output.'}`);
        }
        
        completed.add(agent.id);
        toRun.delete(agent.id);
      });
      
      await Promise.all(promises);
    }
    
    saveWorkspaceVersion(submitted, resultMap);
    const done = Object.values(resultMap).filter(r => r.success).length;
    pushStatus(
      done > 0
        ? `Workflow complete — ${done} agent output(s) ready. Open them from Studio with View.`
        : 'Workflow finished. No agent outputs were generated successfully.',
    );
    setRunning(false);
  }, [prompt, running, orchestrationMode, selectedAgents, mode, marketLocation, runSingleAgent, pushStatus]);

  const openAgentView = useCallback((agentId: string) => {
    setRegenError(null);
    setCommentOpen(false);
    setSelectedOutput(agentId); // opens AgentOutputModal only — not inline in chat
  }, []);

  const closeAgentView = useCallback(() => {
    setSelectedOutput(null);
    setCommentOpen(false);
  }, []);

  const regenerateAgent = useCallback(async (agentId: string) => {
    const goal = (lastSubmittedPromptRef.current || prompt).trim();
    if (!goal || regenerating) return;
    const previous = outputs[agentId];
    if (previous?.success) {
      setOutputBackups(prev => ({ ...prev, [agentId]: previous }));
    }
    setRegenerating(true);
    setRegenError(null);
    pushStatus(`Regenerating ${agents.find(a => a.id === agentId)?.name || agentId}…`);
    const docs = loadWorkspace().documents;
    const locLabel = marketLocationRef.current || marketLocation;
    const loc = locLabel ? `\n\nTARGET MARKET LOCATION (user-approved): ${locLabel}` : '';
    const context = `${documentContext(docs)}${loc}`;
    const result = await runSingleAgent(agentId, `${goal}${loc}`, context, {
      evidencePack: researchMeta.evidencePack,
      sources: sharedSources,
      skipResearch: Boolean(researchMeta.evidencePack),
    });
    setRegenerating(false);
    if (!result.success) {
      if (previous?.success) {
        setOutputs(prev => ({ ...prev, [agentId]: previous }));
        setStatuses(prev => ({ ...prev, [agentId]: 'completed' }));
      }
      setRegenError('Regeneration failed. Your previous output has been preserved.');
      pushStatus('Regeneration failed. Previous output preserved.');
    } else {
      pushStatus('Regeneration complete. Open View to review the updated report.');
    }
  }, [prompt, regenerating, outputs, runSingleAgent, researchMeta.evidencePack, sharedSources, marketLocation, agents, pushStatus]);

  const copyOutput = async (agentId: string) => {
    const output = outputs[agentId];
    const agentName = agents.find(a => a.id === agentId)?.name || agentId;
    if (!output?.success || !output.data) return;
    const text = agentOutputToText(agentName, output.data, {
      generatedAt: output.timestamp,
      sources: mergeSources(sharedSources, output.sources),
    });
    await copyTextToClipboard(text);
  };

  const openSourceMenu = (view: 'menu' | 'upload' | 'website' | 'text' | 'youtube' | 'image') => {
    setPlusOpen(false);
    window.dispatchEvent(new CustomEvent('open-source-modal', { detail: { view } }));
  };

  const startVoice = () => {
    // Browser SpeechRecognition (optional — no hard dependency)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setVoiceState('denied');
      window.setTimeout(() => setVoiceState('idle'), 3000);
      return;
    }
    try {
      const recognition = new SR();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognitionRef.current = recognition;
      setVoiceState('listening');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setPrompt(prev => (prev ? `${prev.trim()} ${transcript.trim()}` : transcript.trim()));
        }
      };
      recognition.onerror = () => {
        setVoiceState('denied');
        window.setTimeout(() => setVoiceState('idle'), 3000);
      };
      recognition.onend = () => {
        setVoiceState(prev => (prev === 'listening' ? 'idle' : prev));
        recognitionRef.current = null;
      };
      recognition.start();
    } catch {
      setVoiceState('denied');
      window.setTimeout(() => setVoiceState('idle'), 3000);
    }
  };

  const stopVoice = () => {
    recognitionRef.current?.stop?.();
    setVoiceState('idle');
  };

  const sendComment = async () => {
    if (!selectedOutput || !commentText.trim() || commentLoading) return;
    const agentId = selectedOutput;
    const agentName = agents.find(a => a.id === agentId)?.name || agentId;
    const current = outputs[agentId];
    const userMsg = commentText.trim();
    setCommentText('');
    setCommentLoading(true);
    setCommentThreads(prev => ({
      ...prev,
      [agentId]: [...(prev[agentId] || []), { role: 'user', text: userMsg }],
    }));

    const priorThread = (commentThreads[agentId] || [])
      .map(m => `${m.role}: ${m.text}`)
      .join('\n');
    const original = lastSubmittedPromptRef.current || prompt;
    const context = [
      documentContext(loadWorkspace().documents),
      `ORIGINAL USER REQUEST:\n${original}`,
      marketLocation ? `TARGET MARKET LOCATION: ${marketLocation}` : '',
      `CURRENT ${agentName.toUpperCase()} OUTPUT:\n${JSON.stringify(current?.data ?? {})}`,
      priorThread ? `PREVIOUS COMMENTS:\n${priorThread}` : '',
      researchMeta.evidencePack || '',
    ].filter(Boolean).join('\n\n');

    const result = await generateAgentResponse(agentId, userMsg, context, {
      documents: loadWorkspace().documents,
      skipResearch: true,
      evidencePack: researchMeta.evidencePack,
      sources: sharedSources,
      enableResearch: false,
    });

    setCommentLoading(false);
    if (result.success && result.data) {
      const summary = String(
        (result.data as Record<string, unknown>).executiveSummary
        || (result.data as Record<string, unknown>).detailedReport
        || 'I prepared an update based on your comment.',
      );
      setCommentThreads(prev => ({
        ...prev,
        [agentId]: [
          ...(prev[agentId] || []),
          { role: 'agent', text: summary, pendingData: result.data },
        ],
      }));
    } else {
      setCommentThreads(prev => ({
        ...prev,
        [agentId]: [
          ...(prev[agentId] || []),
          { role: 'agent', text: result.error || 'Unable to respond. Please try again.' },
        ],
      }));
    }
  };

  const applyCommentUpdate = (agentId: string, data: unknown) => {
    const previous = outputs[agentId];
    if (previous?.success) setOutputBackups(prev => ({ ...prev, [agentId]: previous }));
    setOutputs(prev => ({
      ...prev,
      [agentId]: {
        success: true,
        data,
        timestamp: new Date().toISOString(),
        sources: prev[agentId]?.sources,
        evidencePack: prev[agentId]?.evidencePack,
        retrievedAt: prev[agentId]?.retrievedAt,
        provider: prev[agentId]?.provider,
      },
    }));
  };

  const undoOutput = (agentId: string) => {
    const backup = outputBackups[agentId];
    if (!backup) return;
    setOutputs(prev => ({ ...prev, [agentId]: backup }));
  };

  // Close + menu on outside click / Escape
  useEffect(() => {
    if (!plusOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (plusRef.current && !plusRef.current.contains(e.target as Node)) setPlusOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPlusOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [plusOpen]);

  // Auto-resize composer textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [prompt]);

  // Intelligent auto-scroll: follow new content only when user is near bottom
  useEffect(() => {
    if (!stickToBottom) return;
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog, stickToBottom, researchRunning, running]);

  const selected = selectedOutput
    ? (outputs[selectedOutput]
      // Fallbacks if ids were stored with/without prefixes in session
      || (selectedOutput.startsWith('pg_') ? outputs[selectedOutput.slice(3)] : outputs[`pg_${selectedOutput}`]))
    : undefined;
  const isStudent = mode === 'student';
  const isPlayground = mode === 'playground';
  const completedCount = agents.filter(a => statuses[a.id] === 'completed' || outputs[a.id]?.success).length;
  
  const title = isStudent 
    ? 'Create Study Guides and Research overviews from your documents' 
    : isPlayground 
      ? 'Explore agents and build workflows from your data' 
      : 'Create AI Overviews and Plans from your workspace';
      
  const composerPlaceholder = 'Ask anything…';
  const selectedAgentMeta = agents.find(a => a.id === selectedOutput);
  const thread = selectedOutput ? commentThreads[selectedOutput] || [] : [];

  const applyLocationAndRun = (location: string, skip = false) => {
    if (skip) {
      skipLocationRef.current = true;
    } else if (location.trim()) {
      const cleaned = location.trim();
      marketLocationRef.current = cleaned;
      setMarketLocation(cleaned);
      skipLocationRef.current = false;
    }
    setShowLocationPrompt(false);
    setLocating(false);
    // Continue orchestration only when a prompt is still waiting in the composer
    if (prompt.trim()) {
      window.setTimeout(() => void run(), 0);
    }
  };

  const requestCurrentLocation = () => {
    if (!navigator.geolocation) {
      setShowLocationPrompt(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // City-level label only — never persist precise coordinates in the UI
        let label = 'Current area';
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { Accept: 'application/json' } },
          );
          if (res.ok) {
            const data = await res.json() as { address?: { city?: string; town?: string; state?: string; country?: string }; display_name?: string };
            const city = data.address?.city || data.address?.town;
            const parts = [city, data.address?.state, data.address?.country].filter(Boolean);
            if (parts.length) label = parts.join(', ');
            else if (data.display_name) label = data.display_name.split(',').slice(0, 3).join(',').trim();
          }
        } catch {
          // keep generic label
        }
        applyLocationAndRun(label);
      },
      () => {
        setLocating(false);
        // Permission denied — keep modal open for manual entry
        setShowLocationPrompt(true);
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 },
    );
  };

  return (
    <>
      {/* Center Panel */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="text-[15px] font-semibold text-slate-900 capitalize">{mode} Chat</h2>
            {isStudent && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-violet-600">ACADEMIC</span>}
            {isPlayground && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-600">SANDBOX</span>}
            {marketLocation && mode === 'business' && (
              <button
                type="button"
                title="Edit market location"
                onClick={() => { setLocationInput(marketLocation); setShowLocationPrompt(true); }}
                className="inline-flex max-w-[160px] items-center gap-1 truncate rounded-full border border-primary-100 bg-primary-50 px-2 py-0.5 text-[10px] font-semibold text-primary-700"
              >
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{marketLocation}</span>
              </button>
            )}
          </div>
          {/* Compact Automatic / Manual — top-right of Business Chat */}
          <div
            className="flex shrink-0 items-center rounded-full border border-slate-200 bg-slate-100 p-0.5"
            role="group"
            aria-label="Agent selection mode"
          >
            <button
              type="button"
              title="COMET automatically selects the most relevant agents."
              onClick={() => setOrchestrationMode('automatic')}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition duration-150 sm:px-3 ${
                orchestrationMode === 'automatic'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Automatic
            </button>
            <button
              type="button"
              title="Choose the agents you want to run."
              onClick={() => setOrchestrationMode('manual')}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition duration-150 sm:px-3 ${
                orchestrationMode === 'manual'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Manual
            </button>
          </div>
        </div>
        
        <div
          ref={centerScrollRef}
          className="relative flex-1 overflow-y-auto p-4 sm:p-8"
          onScroll={() => {
            const el = centerScrollRef.current;
            if (!el) return;
            const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            setStickToBottom(nearBottom);
            setShowJumpLatest(!nearBottom && chatLog.length > 0);
          }}
        >
          <div className="mx-auto max-w-3xl space-y-4 pb-8">
            <div ref={outputTopRef} />

            {/* Empty welcome — conversation only (reports open in modal) */}
            {chatLog.length === 0 && !running && completedCount === 0 && (
              <div className="mt-6">
                <h1 className="text-center text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  {title.split('from').map((part, i) => i === 0 ? <span key={i}>{part}<br/>from <span className="bg-gradient-to-r from-primary-500 to-emerald-500 bg-clip-text text-transparent">your workspace</span></span> : null)}
                </h1>
                <div className="mx-auto mt-6 flex justify-center">
                  <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('open-source-modal'))} className="rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
                    + Add sources
                  </button>
                </div>
              </div>
            )}

            {/* Live research activity (compact, not full report) */}
            {(researchRunning || researchEvents.length > 0) && (
              <ResearchActivityTimeline
                events={researchEvents}
                running={researchRunning}
                collapsedDefault={!researchRunning && completedCount > 0}
              />
            )}

            {/* Conversation + live status stream */}
            {chatLog.length > 0 && (
              <div className="space-y-3">
                {chatLog.map(msg => (
                  <div
                    key={msg.id}
                    className={
                      msg.role === 'user'
                        ? 'ml-auto max-w-[90%] rounded-2xl bg-primary-600 px-4 py-3 text-sm leading-relaxed text-white shadow-sm'
                        : msg.role === 'system'
                          ? 'rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600'
                          : 'flex items-start gap-2 rounded-xl border border-primary-100 bg-primary-50/50 px-3 py-2 text-xs text-primary-900'
                    }
                  >
                    {msg.role === 'status' && (running || researchRunning) && (
                      <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-primary-600" />
                    )}
                    {msg.role === 'status' && !running && !researchRunning && (
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    )}
                    <span className={msg.role === 'status' ? 'leading-relaxed' : ''}>{msg.text}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            )}

            {completedCount > 0 && !running && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-center text-sm text-emerald-900">
                <p className="font-medium">{completedCount} agent{completedCount !== 1 ? 's' : ''} ready</p>
                <p className="mt-0.5 text-xs text-emerald-800">Open full reports from the Studio panel with <strong>View</strong> — they open in a dedicated report modal.</p>
              </div>
            )}

            {researchMeta.failed && !running && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm font-semibold text-rose-900">Live research could not be completed.</p>
                <p className="mt-1 text-xs text-rose-800">{researchMeta.error || 'No reliable sources were retrieved.'}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void run(lastSubmittedPromptRef.current || prompt)}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Retry
                  </button>
                  <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('open-source-modal'))} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">Add Source Manually</button>
                </div>
              </div>
            )}
          </div>

          {showJumpLatest && (
            <button
              type="button"
              onClick={() => {
                setStickToBottom(true);
                setShowJumpLatest(false);
                chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-primary-700 shadow-md hover:bg-primary-50"
            >
              Jump to latest
            </button>
          )}
        </div>

        {/* ChatGPT-style Business Chat composer */}
        <div className="border-t border-slate-100 p-3 sm:p-4">
          <div className="mx-auto max-w-3xl">
            {orchestrationMode === 'manual' && (
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-[11px] font-medium text-slate-500">Selected agents: {selectedAgents.size}</span>
                <button
                  type="button"
                  onClick={() => void run()}
                  disabled={selectedAgents.size === 0 || !prompt.trim() || running}
                  className="rounded-lg bg-primary-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-primary-700 disabled:bg-slate-300"
                >
                  {running ? 'Running…' : 'Run Selected'}
                </button>
              </div>
            )}

            <div className="relative rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition focus-within:border-primary-300 focus-within:ring-2 focus-within:ring-primary-100">
              <div className="flex items-end gap-1 px-2 py-2 sm:gap-2 sm:px-3 sm:py-2.5">
                {/* + source menu */}
                <div className="relative shrink-0" ref={plusRef}>
                  <button
                    type="button"
                    aria-label="Add source"
                    aria-expanded={plusOpen}
                    onClick={() => setPlusOpen(v => !v)}
                    className={`grid h-9 w-9 place-items-center rounded-full transition ${plusOpen ? 'bg-primary-100 text-primary-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
                  >
                    <Plus className={`h-5 w-5 transition ${plusOpen ? 'rotate-45' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {plusOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-full left-0 z-30 mb-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-lg"
                        role="menu"
                      >
                        {[
                          { view: 'upload' as const, label: 'Upload files', icon: UploadCloud },
                          { view: 'image' as const, label: 'Upload image', icon: ImageIcon },
                          { view: 'website' as const, label: 'Add website', icon: Globe },
                          { view: 'text' as const, label: 'Paste text', icon: Type },
                          { view: 'youtube' as const, label: 'Add YouTube link', icon: FileVideo },
                        ].map(item => (
                          <button
                            key={item.view}
                            type="button"
                            role="menuitem"
                            onClick={() => openSourceMenu(item.view)}
                            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-primary-50 hover:text-primary-800"
                          >
                            <item.icon className="h-4 w-4 text-slate-400" />
                            {item.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder={composerPlaceholder}
                  rows={1}
                  aria-label="Ask anything"
                  className="max-h-40 min-h-[36px] flex-1 resize-none bg-transparent py-2 text-sm leading-5 text-slate-900 outline-none placeholder:text-slate-400"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (prompt.trim() && !running && (orchestrationMode === 'automatic' || selectedAgents.size > 0)) {
                        void run();
                      }
                    }
                  }}
                />

                <div className="flex shrink-0 items-center gap-0.5 pb-0.5">
                  <button
                    type="button"
                    aria-label={voiceState === 'listening' ? 'Stop voice input' : 'Start voice input'}
                    onClick={() => (voiceState === 'listening' ? stopVoice() : startVoice())}
                    className={`grid h-9 w-9 place-items-center rounded-full transition ${
                      voiceState === 'listening'
                        ? 'bg-rose-100 text-rose-600'
                        : voiceState === 'denied'
                          ? 'bg-amber-50 text-amber-600'
                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    {voiceState === 'listening' ? (
                      <span className="flex items-end gap-0.5">
                        <span className="h-2 w-0.5 animate-pulse rounded-full bg-rose-500" />
                        <span className="h-3 w-0.5 animate-pulse rounded-full bg-rose-500 [animation-delay:100ms]" />
                        <span className="h-2.5 w-0.5 animate-pulse rounded-full bg-rose-500 [animation-delay:200ms]" />
                      </span>
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label="Send message"
                    onClick={() => void run()}
                    disabled={!prompt.trim() || running || (orchestrationMode === 'manual' && selectedAgents.size === 0)}
                    className="grid h-9 w-9 place-items-center rounded-full bg-primary-600 text-white transition hover:bg-primary-700 disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {voiceState === 'denied' && (
              <p className="mt-2 text-center text-[11px] text-amber-700">Microphone access is required for voice input.</p>
            )}
            {voiceState === 'listening' && (
              <p className="mt-2 text-center text-[11px] text-rose-600">Listening… speak now</p>
            )}
            <p className="mt-2 text-center text-[11px] text-slate-400">COMET can be inaccurate; please double-check its responses.</p>
          </div>
        </div>
      </div>

      {/* Right Studio Panel */}
      <aside className="hidden h-full w-[300px] shrink-0 flex-col overflow-y-auto rounded-2xl border border-slate-200/90 bg-slate-50/90 shadow-sm xl:flex 2xl:w-[320px]">
        <div className="sticky top-0 z-[1] flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3.5 backdrop-blur sm:px-5">
          <h2 className="text-[15px] font-semibold text-slate-900 capitalize">{mode} Studio</h2>
          <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[10px] font-semibold text-primary-700">
            {completedCount}/{agents.length} ready
          </span>
        </div>
        
        <div className="flex-1 p-3 space-y-2">
          {/* Header info */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-[13px] font-semibold text-slate-900">COMET AI Team</p>
            <p className="mt-1 text-[11px] text-slate-500">{agents.length} specialists • {orchestrationMode} mode</p>
            {orchestrationMode === 'manual' && (
              <div className="mt-2 flex gap-2">
                <button onClick={() => setSelectedAgents(new Set(agents.map(a => a.id)))} className="text-[10px] font-semibold text-primary-600 hover:text-primary-700">Select All</button>
                <button onClick={() => setSelectedAgents(new Set())} className="text-[10px] font-semibold text-slate-400 hover:text-slate-600">Clear</button>
              </div>
            )}
          </div>

          {/* Agent cards — always visible */}
          {agents.map((agent, index) => {
            const Icon = agent.icon;
            const currentStatus = statuses[agent.id] || 'ready';
            const hasOutput = !!outputs[agent.id]?.success;
            const isExpanded = expandedAgent === agent.id;
            const isSelected = selectedAgents.has(agent.id);
            const hasFailed = currentStatus === 'failed';
            const errorMsg = outputs[agent.id]?.error;
            
            return (
              <motion.div 
                key={agent.id}
                initial={{ opacity: 0, y: 8 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: index * 0.04 }}
                className={`rounded-xl border p-3 transition-all ${
                  currentStatus === 'running' ? 'border-primary-300 bg-primary-50 ring-1 ring-primary-100' :
                  currentStatus === 'completed' ? 'border-emerald-200 bg-emerald-50/50' :
                  hasFailed ? 'border-rose-200 bg-rose-50/50' :
                  currentStatus === 'queued' || currentStatus === 'waiting' ? 'border-amber-200 bg-amber-50/30' :
                  isSelected && orchestrationMode === 'manual' ? 'border-primary-200 bg-primary-50/30' :
                  'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border shadow-sm ${
                    currentStatus === 'completed' ? 'border-emerald-100 bg-emerald-50' :
                    currentStatus === 'running' ? 'border-primary-100 bg-primary-50' :
                    'border-slate-100 bg-white'
                  }`}>
                    {currentStatus === 'completed' ? <Check className="h-4 w-4 text-emerald-600" /> :
                     currentStatus === 'running' ? <Loader2 className="h-4 w-4 animate-spin text-primary-600" /> :
                     hasFailed ? <AlertCircle className="h-4 w-4 text-rose-500" /> :
                     <Icon className="h-4 w-4 text-slate-500" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] font-semibold text-slate-800 truncate">{agent.name}</p>
                      {orchestrationMode === 'manual' && !running && (
                        <button 
                          onClick={() => toggleAgent(agent.id)}
                          className={`ml-1 h-5 w-5 shrink-0 rounded flex items-center justify-center transition ${
                            isSelected ? 'bg-primary-600 text-white' : 'border border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </button>
                      )}
                    </div>
                    <p className={`text-[10px] font-medium mt-0.5 ${STATUS_COLORS[currentStatus]}`}>
                      {STATUS_LABELS[currentStatus]}
                      {currentStatus === 'waiting' && agent.dependencies.length > 0 && (
                        <span className="text-[9px] ml-1 opacity-70">({agent.dependencies.join(', ')})</span>
                      )}
                    </p>
                  </div>
                  <button onClick={() => setExpandedAgent(isExpanded ? null : agent.id)} className="mt-1 text-slate-400 hover:text-slate-600">
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                </div>

                {/* Expanded info */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <p className="mt-2 text-[11px] leading-relaxed text-slate-600">{agent.responsibility}</p>
                      {agent.dependencies.length > 0 && (
                        <p className="mt-1 text-[10px] text-slate-500">Depends on: {agent.dependencies.join(', ')}</p>
                      )}
                      {hasFailed && errorMsg && (
                        <p className="mt-2 rounded-lg bg-rose-50 px-2 py-1.5 text-[10px] text-rose-600">{errorMsg}</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action buttons — View always opens central workspace for this agent */}
                <div className="mt-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => openAgentView(agent.id)}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-lg border py-1.5 text-[10px] font-semibold transition ${
                      selectedOutput === agent.id
                        ? 'border-primary-300 bg-primary-600 text-white'
                        : hasOutput
                          ? 'border-primary-100 bg-white text-primary-600 hover:bg-primary-50'
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Eye className="h-3 w-3" /> View
                  </button>
                  {hasFailed && (
                    <button
                      type="button"
                      onClick={() => void regenerateAgent(agent.id)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-rose-200 bg-white py-1.5 text-[10px] font-semibold text-rose-600 hover:bg-rose-50 transition"
                    >
                      <RefreshCw className="h-3 w-3" /> Retry
                    </button>
                  )}
                  {hasOutput && (
                    <button
                      type="button"
                      onClick={() => copyOutput(agent.id)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-400 hover:text-slate-600 transition"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Smart Tools Section (Student Mode Only) */}
        {mode === 'student' && (
          <div className="mt-4 border-t border-slate-100 px-5 pb-5 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Smart Tools</h3>
              <button onClick={() => setToolsExpanded(!toolsExpanded)} className="text-slate-400 hover:text-slate-700 transition">
                {toolsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
            <AnimatePresence>
              {toolsExpanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-2 overflow-hidden">
                  {STUDENT_TOOLS.filter(t => !hiddenTools.includes(t.id)).sort((a, b) => {
                    const aPinned = pinnedTools.includes(a.id);
                    const bPinned = pinnedTools.includes(b.id);
                    return aPinned === bPinned ? 0 : aPinned ? -1 : 1;
                  }).map(tool => (
                    <div key={tool.id} className="group relative flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:border-primary-300 hover:bg-primary-50 transition cursor-pointer">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-600">
                        <tool.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-slate-800 truncate">{tool.name}</p>
                        <p className="text-[10px] font-medium text-slate-500 truncate mt-0.5">{tool.description}</p>
                      </div>
                      <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1 bg-white/90 rounded backdrop-blur-sm px-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setPinnedTools(prev => prev.includes(tool.id) ? prev.filter(id => id !== tool.id) : [...prev, tool.id]); }}
                          className={`p-1.5 rounded-md hover:bg-slate-200 transition ${pinnedTools.includes(tool.id) ? 'text-amber-500 bg-amber-50' : 'text-slate-400'}`}
                          title={pinnedTools.includes(tool.id) ? 'Unpin' : 'Pin'}
                        >
                          <Pin className="h-3 w-3" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setHiddenTools(prev => [...prev, tool.id]); }}
                          className="p-1.5 rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition"
                          title="Hide tool"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {hiddenTools.length > 0 && (
                    <button onClick={() => setHiddenTools([])} className="w-full mt-2 text-[10px] font-medium text-slate-400 hover:text-slate-700 text-center transition">
                      Restore hidden tools ({hiddenTools.length})
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </aside>

      <AgentOutputModal
        open={Boolean(selectedOutput)}
        agentId={selectedOutput}
        agentName={selectedAgentMeta?.name || selectedOutput || 'Agent'}
        agentIcon={selectedAgentMeta?.icon || Search}
        result={selected}
        sources={mergeSources(sharedSources || [], selected?.sources)}
        regenerating={regenerating}
        loading={Boolean(
          regenerating
          || (selectedOutput && (statuses[selectedOutput] === 'running' || statuses[selectedOutput] === 'queued')),
        )}
        regenError={regenError}
        userPrompt={lastSubmittedPromptRef.current || prompt}
        mode={mode}
        onClose={closeAgentView}
        onRegenerate={() => {
          if (selectedOutput) void regenerateAgent(selectedOutput);
        }}
        onComment={() => setCommentOpen(true)}
      />

      {/* Location permission / manual entry (Part 8) */}
      <AnimatePresence>
        {showLocationPrompt && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <button type="button" className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" aria-label="Dismiss location dialog" onClick={() => setShowLocationPrompt(false)} />
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="location-prompt-title"
            >
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-600">
                  <MapPin className="h-5 w-5" />
                </span>
                <div>
                  <h3 id="location-prompt-title" className="text-base font-semibold text-slate-900">Location helps local analysis</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    To provide local market demand, nearby competitor analysis, and location-specific recommendations, COMET needs your location. You may allow current location access or enter the location manually.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">City, state, country</label>
                <input
                  value={locationInput}
                  onChange={e => setLocationInput(e.target.value)}
                  placeholder="e.g. Delhi, India"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && locationInput.trim()) applyLocationAndRun(locationInput);
                  }}
                />
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  disabled={locating}
                  onClick={() => requestCurrentLocation()}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                >
                  {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
                  {locating ? 'Locating…' : 'Use Current Location'}
                </button>
                <button
                  type="button"
                  disabled={!locationInput.trim()}
                  onClick={() => applyLocationAndRun(locationInput)}
                  className="inline-flex flex-1 items-center justify-center rounded-xl border border-primary-200 bg-primary-50 px-3 py-2.5 text-xs font-semibold text-primary-800 hover:bg-primary-100 disabled:opacity-50"
                >
                  Enter Manually
                </button>
                <button
                  type="button"
                  onClick={() => applyLocationAndRun('', true)}
                  className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Continue Without Location
                </button>
              </div>
              <p className="mt-3 text-[11px] text-slate-400">COMET stores only the market area you choose for this project — not continuous GPS tracking.</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightweight comment sheet when opened from modal */}
      {commentOpen && selectedOutput && (
        <div className="fixed bottom-6 left-1/2 z-[120] w-full max-w-lg -translate-x-1/2 rounded-2xl border border-primary-100 bg-white p-4 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-primary-800">Ask {selectedAgentMeta?.name} about this output…</p>
            <button type="button" onClick={() => setCommentOpen(false)} aria-label="Close"><X className="h-4 w-4 text-slate-400" /></button>
          </div>
          {thread.length > 0 && (
            <div className="mb-2 max-h-32 space-y-1 overflow-y-auto text-xs">
              {thread.slice(-4).map((msg, i) => (
                <p key={i} className={msg.role === 'user' ? 'text-slate-600' : 'text-primary-800'}>
                  <strong>{msg.role === 'user' ? 'You' : 'Agent'}:</strong> {msg.text}
                </p>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-400"
              placeholder="Improve the competitor section…"
              onKeyDown={e => { if (e.key === 'Enter') void sendComment(); }}
            />
            <button type="button" disabled={!commentText.trim() || commentLoading} onClick={() => void sendComment()} className="rounded-xl bg-primary-600 px-4 py-2 text-xs font-semibold text-white disabled:bg-slate-300">
              {commentLoading ? '…' : 'Send'}
            </button>
          </div>
          {thread.some(m => m.pendingData) && (
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="text-[11px] font-semibold text-primary-700"
                onClick={() => {
                  const last = [...thread].reverse().find(m => m.pendingData);
                  if (last?.pendingData && selectedOutput) applyCommentUpdate(selectedOutput, last.pendingData);
                }}
              >
                Apply Update
              </button>
              {outputBackups[selectedOutput] && (
                <button type="button" className="text-[11px] font-semibold text-slate-600" onClick={() => undoOutput(selectedOutput)}>Undo</button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
