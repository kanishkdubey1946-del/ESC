/**
 * AgentOutputModal → OutputTypeResolver → AgentSpecificRenderer → Sources
 * Heavy experiences are lazy-loaded for performance.
 */
import { Component, Suspense, lazy, type ErrorInfo, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import type { SourceRecord } from '../../types/sources';
import SourcesUsedPanel from '../research/SourcesUsedPanel';
import {
  ContentExperience,
  DevelopmentExperience,
  GenericAgentExperience,
  PitchExperience,
  ResearchExperience,
  StrategyExperience,
  StudentExperience,
} from './AgentExperiences';
import { FinanceExperience } from './SpecializedExperiences';
import { experienceLabel, resolveOutputExperience, type OutputExperienceType } from './OutputTypeResolver';

const MockTestExperience = lazy(() => import('./StudentInteractive').then(m => ({ default: m.MockTestExperience })));
const FlashcardExperience = lazy(() => import('./StudentInteractive').then(m => ({ default: m.FlashcardExperience })));
const StudyPlanExperience = lazy(() => import('./StudentInteractive').then(m => ({ default: m.StudyPlanExperience })));
const MindMapExperience = lazy(() => import('./StudentInteractive').then(m => ({ default: m.MindMapExperience })));

export function normalizeAgentData(raw: unknown): unknown {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return null;
    try {
      const parsed = JSON.parse(t) as unknown;
      if (parsed && typeof parsed === 'object') return normalizeAgentData(parsed);
    } catch {
      return { detailedReport: t };
    }
    return { detailedReport: t };
  }
  if (Array.isArray(raw)) return { items: raw };
  if (typeof raw !== 'object') return { detailedReport: String(raw) };

  const obj = raw as Record<string, unknown>;
  for (const key of ['data', 'result', 'output', 'report', 'content'] as const) {
    const nested = obj[key];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const nKeys = Object.keys(nested as object).length;
      const oKeys = Object.keys(obj).filter(k => !['data', 'result', 'output', 'success', 'error', 'timestamp', 'sources'].includes(k)).length;
      if (nKeys >= oKeys && nKeys > 0) return normalizeAgentData(nested);
    }
  }
  return obj;
}

class VizBoundary extends Component<{ label: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[AgentOutputRenderer] ${this.props.label}:`, error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          This visualization could not be displayed.
        </div>
      );
    }
    return this.props.children;
  }
}

function LazyShell({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={(
        <div className="flex items-center gap-2 rounded-xl border border-primary-100 bg-primary-50 px-4 py-6 text-sm text-primary-800">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading interactive workspace…
        </div>
      )}
    >
      {children}
    </Suspense>
  );
}

function renderExperience(
  type: OutputExperienceType,
  props: {
    data: unknown;
    sources?: SourceRecord[];
    agentId: string;
    onCitationClick?: (n: number, source?: SourceRecord) => void;
    onCopyText?: (label: string, text: string) => void;
    onRegenerate?: () => void;
  },
) {
  switch (type) {
    case 'research':
      return <ResearchExperience {...props} />;
    case 'finance':
      return <FinanceExperience {...props} />;
    case 'strategy':
      return <StrategyExperience {...props} />;
    case 'presentation':
      return <PitchExperience {...props} />;
    case 'content':
      return <ContentExperience {...props} />;
    case 'development':
      return <DevelopmentExperience {...props} />;
    case 'mock_test':
      return <LazyShell><MockTestExperience data={props.data} sources={props.sources} onCitationClick={props.onCitationClick} onCopyText={props.onCopyText} agentId={props.agentId} onRegenerate={props.onRegenerate} /></LazyShell>;
    case 'flashcards':
      return <LazyShell><FlashcardExperience {...props} /></LazyShell>;
    case 'study_plan':
      return <LazyShell><StudyPlanExperience {...props} /></LazyShell>;
    case 'mind_map':
      return <LazyShell><MindMapExperience {...props} /></LazyShell>;
    case 'student':
      return <StudentExperience {...props} />;
    default:
      return <GenericAgentExperience {...props} />;
  }
}

export type AgentOutputRendererProps = {
  agentId: string;
  data: unknown;
  sources?: SourceRecord[];
  retrievedAt?: string;
  generatedWithoutLiveResearch?: boolean;
  researchFailed?: boolean;
  researchError?: string;
  userPrompt?: string;
  mode?: 'business' | 'student' | 'playground';
  onCitationClick?: (n: number, source?: SourceRecord) => void;
  onCopyText?: (label: string, text: string) => void;
  onRegenerate?: () => void;
};

export default function AgentOutputRenderer({
  agentId,
  data,
  sources = [],
  retrievedAt,
  generatedWithoutLiveResearch,
  researchFailed,
  researchError,
  userPrompt,
  mode,
  onCitationClick,
  onCopyText,
  onRegenerate,
}: AgentOutputRendererProps) {
  const baseId = agentId.startsWith('pg_') ? agentId.slice(3) : agentId;
  const normalized = normalizeAgentData(data);

  if (normalized == null) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Output is not available yet.</p>
        <p className="mt-1 text-xs text-slate-500">This agent has not completed its output.</p>
      </div>
    );
  }

  const experienceType = resolveOutputExperience({
    agentId,
    data: normalized,
    mode,
    userPrompt,
    sourcesCount: sources.length,
  });

  return (
    <div className="comet-output space-y-5 pb-8">
      <div className="comet-output-banner">
        <strong>{experienceLabel(experienceType)}</strong>
        <span className="text-[11px] font-medium text-slate-500">Agent · {baseId}</span>
      </div>

      <VizBoundary key={`exp-${agentId}-${experienceType}`} label={`${experienceType} experience`}>
        {renderExperience(experienceType, {
          data: normalized,
          sources,
          agentId: baseId,
          onCitationClick,
          onCopyText,
          onRegenerate,
        })}
      </VizBoundary>

      <div id="section-sources" className="comet-section comet-section--source">
        <span className="comet-section__rail" aria-hidden />
        <header className="comet-section__head">
          <span className="comet-section__eyebrow">Source evidence</span>
          <h3 className="comet-section__title">Sources & provenance</h3>
        </header>
        <div className="comet-section__body !pt-2">
          <VizBoundary key={`src-${agentId}`} label="sources">
            <SourcesUsedPanel
              sources={sources}
              onSelect={(s) => {
                if (s.citationNumber != null) onCitationClick?.(s.citationNumber, s);
              }}
              retrievedAt={retrievedAt}
              generatedWithoutLiveResearch={generatedWithoutLiveResearch}
              researchFailed={researchFailed}
              researchError={researchError}
            />
          </VizBoundary>
        </div>
      </div>
    </div>
  );
}
