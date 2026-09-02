/**
 * Agent-specific interactive View experiences.
 * Output type controls the interface — not a single generic template.
 */
import { useMemo, useState, type ComponentType, type ReactNode } from 'react';
import type { SourceRecord } from '../../types/sources';
import CitedText from '../research/CitedText';
import {
  ContentPlatformTabs,
  DevelopmentDashboard,
  ResearchDashboard,
  StrategyCanvas,
  StudentDashboard,
} from './EvidenceDashboards';
import PrototypePreview from './PrototypePreview';
import {
  ExamInsightExperience,
  GuideMindsExperience,
  SpecialistHubExperience,
  StudyVaultExperience,
  SuccessArchitectExperience,
} from './StudentAgentExperiences';
import {
  ExecutiveSummaryCard,
  ExperienceShell,
  MetricCard,
  OpportunityRiskGrid,
  ProgressBar,
  RiskGauge,
  TextBlock,
  TimelineList,
  ValidBarChart,
  ValidDonut,
  asRecord,
  isNonEmpty,
  num,
  parseSizeNumber,
  str,
} from './shared';

type ExpProps = {
  data: unknown;
  sources?: SourceRecord[];
  onCitationClick?: (n: number, s?: SourceRecord) => void;
  onCopyText?: (label: string, text: string) => void;
  onRegenerate?: () => void;
  agentId?: string;
};

export function ResearchExperience({ data, sources, onCitationClick }: ExpProps) {
  const r = asRecord(data);
  const score = num(r.opportunityScore ?? r.cometAnalyticalScore);
  const competition = str(r.competitionLevel);
  const confidence = str(r.researchConfidence || r.evidenceStatus);

  const marketBars = useMemo(() => {
    const items: Array<{ label: string; value: number }> = [];
    for (const [label, key] of [['TAM', 'tam'], ['SAM', 'sam'], ['SOM', 'som']] as const) {
      const raw = str(r[key]);
      const n = parseSizeNumber(raw);
      if (n != null && n > 0) items.push({ label, value: n });
    }
    return items;
  }, [r]);

  const factorBars = useMemo(() => {
    const factors = Array.isArray(r.opportunityScoreFactors) ? r.opportunityScoreFactors : [];
    return factors
      .map((f) => {
        const row = f && typeof f === 'object' ? f as Record<string, unknown> : null;
        if (!row) return null;
        const value = num(row.score);
        const label = str(row.factor || row.name);
        if (value == null || !label) return null;
        return { label, value };
      })
      .filter(Boolean) as Array<{ label: string; value: number }>;
  }, [r]);

  const execMetrics = [
    score != null ? {
      label: 'Opportunity score',
      value: (<>{Math.round(score)} <span className="text-sm text-slate-500">/100</span></>) as ReactNode,
      hint: str(r.opportunityScoreNote) || 'COMET assessment from evidence factors — not an external statistic',
      tone: 'primary' as const,
    } : null,
    competition ? {
      label: 'Competition',
      value: competition as ReactNode,
      hint: str(r.competitionRationale) || undefined,
      tone: /high/i.test(competition) ? 'danger' as const : /moderate/i.test(competition) ? 'warn' as const : 'success' as const,
    } : null,
    confidence ? {
      label: 'Confidence',
      value: confidence as ReactNode,
      hint: sources?.length ? `${sources.length} source(s) in pack` : str(r.researchConfidenceNote) || undefined,
      tone: 'default' as const,
    } : null,
    num(r.riskScore) != null ? {
      label: 'Risk level',
      value: `${Math.round(num(r.riskScore)!)}/100` as ReactNode,
      hint: 'Higher = more risk (COMET assessment)',
      tone: (num(r.riskScore)! >= 60 ? 'danger' : num(r.riskScore)! >= 30 ? 'warn' : 'success') as 'danger' | 'warn' | 'success',
    } : null,
  ].filter(Boolean) as Array<{ label: string; value: ReactNode; hint?: string; tone?: 'default' | 'primary' | 'success' | 'warn' | 'danger' }>;

  return (
    <ExperienceShell
      defaultTab="overview"
      tabs={[
        {
          id: 'overview',
          label: 'Overview',
          content: (
            <div className="space-y-4">
              <ExecutiveSummaryCard data={r} sources={sources} onCitationClick={onCitationClick} metrics={execMetrics} />
              <ResearchDashboard data={data} sources={sources} onCitationClick={onCitationClick} />
              <TextBlock title="Research objective" body={r.researchObjective} sources={sources} onCitationClick={onCitationClick} kind="finding" />
            </div>
          ),
        },
        {
          id: 'market',
          label: 'Market',
          available: Boolean(str(r.marketOrDomainAnalysis) || marketBars.length || str(r.tam)),
          content: (
            <div className="space-y-4">
              <TextBlock title="Market analysis" body={r.marketOrDomainAnalysis} sources={sources} onCitationClick={onCitationClick} kind="fact" />
              {marketBars.length >= 2 && (
                <ValidDonut
                  title="Market size composition (parsed values)"
                  segments={marketBars.map((m, i) => ({
                    label: m.label,
                    value: m.value,
                    color: ['#0EA5E9', '#38BDF8', '#7DD3FC'][i] || '#0284C7',
                  }))}
                  sourceNote={str(r.marketSizeSource) || str(r.marketSizeNote) || undefined}
                />
              )}
              {marketBars.length > 0 && (
                <ValidBarChart
                  title="TAM / SAM / SOM (parsed from evidence strings)"
                  items={marketBars}
                  sourceNote={str(r.marketSizeNote) || undefined}
                />
              )}
              <TextBlock title="Market size note" body={r.marketSizeNote} sources={sources} onCitationClick={onCitationClick} />
            </div>
          ),
        },
        {
          id: 'competition',
          label: 'Competition',
          available: Boolean(competition || Array.isArray(r.competitors) || Array.isArray(r.competitorTable)),
          content: (
            <div className="space-y-4">
              {competition && (
                <MetricCard
                  label="Competition level"
                  value={competition}
                  hint={str(r.competitionRationale) ? (
                    <CitedText text={str(r.competitionRationale)} sources={sources} onCitationClick={onCitationClick} />
                  ) : undefined}
                  tone={/high/i.test(competition) ? 'danger' : /moderate/i.test(competition) ? 'warn' : 'success'}
                />
              )}
              <ResearchDashboard data={{ competitors: r.competitors || r.competitorTable }} sources={sources} onCitationClick={onCitationClick} />
              <TextBlock title="Competitor analysis" body={r.competitorOrAlternativeAnalysis} sources={sources} onCitationClick={onCitationClick} />
            </div>
          ),
        },
        {
          id: 'scores',
          label: 'Scores',
          available: score != null || factorBars.length > 0 || Boolean(confidence) || num(r.riskScore) != null,
          content: (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {score != null && (
                  <MetricCard
                    label="COMET Opportunity Assessment"
                    tone="primary"
                    value={<>{Math.round(score)} <span className="text-base font-semibold text-slate-500">/ 100</span></>}
                    hint={<ProgressBar value={score} />}
                  />
                )}
                {confidence && <MetricCard label="Research confidence" value={confidence} hint={str(r.researchConfidenceNote)} />}
              </div>
              {factorBars.length > 0 && (
                <ValidBarChart title="Score factors (from model calculation)" items={factorBars} unit="pts" />
              )}
              <TextBlock title="Score methodology" body={r.opportunityScoreNote || 'Score is a COMET analytical assessment when factors are provided — not an external verified statistic.'} sources={sources} onCitationClick={onCitationClick} />
              {num(r.riskScore) != null && (
                <RiskGauge
                  score={num(r.riskScore)!}
                  label="Market / research risk"
                  methodology={str(r.riskMethodology || r.riskScoreNote) || 'Higher score means higher risk. Bands: 0–29 Low, 30–59 Moderate, 60–79 High, 80–100 Critical.'}
                  factors={Array.isArray(r.riskFactors) ? r.riskFactors.map(String) : undefined}
                />
              )}
            </div>
          ),
        },
        {
          id: 'insights',
          label: 'Insights',
          available: Boolean(isNonEmpty(r.keyFindings) || isNonEmpty(r.opportunities) || isNonEmpty(r.risks) || isNonEmpty(r.currentTrends)),
          content: (
            <div className="space-y-4">
              <TextBlock title="Key findings" body={r.keyFindings} sources={sources} onCitationClick={onCitationClick} />
              <TextBlock title="Trends" body={r.currentTrends} sources={sources} onCitationClick={onCitationClick} />
              <OpportunityRiskGrid
                opportunities={Array.isArray(r.opportunities) ? r.opportunities : undefined}
                risks={Array.isArray(r.risks) ? r.risks : undefined}
                sources={sources}
                onCitationClick={onCitationClick}
              />
              <TextBlock title="Limitations" body={r.dataLimitations} sources={sources} onCitationClick={onCitationClick} />
            </div>
          ),
        },
        {
          id: 'full',
          label: 'Full report',
          available: Boolean(str(r.detailedReport)),
          content: <TextBlock title="Detailed report" body={r.detailedReport} sources={sources} onCitationClick={onCitationClick} />,
        },
      ]}
    />
  );
}

export function StrategyExperience({ data, sources, onCitationClick }: ExpProps) {
  const r = asRecord(data);
  const roadmap = Array.isArray(r.executionRoadmap) ? r.executionRoadmap
    : Array.isArray(r.priorityActions) ? r.priorityActions
      : [];

  return (
    <ExperienceShell
      tabs={[
        {
          id: 'canvas',
          label: 'Business model',
          content: (
            <div className="space-y-4">
              <TextBlock title="Strategic overview" body={r.executiveSummary || r.strategicObjective} sources={sources} onCitationClick={onCitationClick} highlight />
              <StrategyCanvas data={data} sources={sources} onCitationClick={onCitationClick} />
            </div>
          ),
        },
        {
          id: 'gtm',
          label: 'Go-to-market',
          available: Boolean(isNonEmpty(r.goToMarketStrategy) || isNonEmpty(r.growthStrategy) || isNonEmpty(r.pricingStrategy) || isNonEmpty(r.positioning)),
          content: (
            <div className="space-y-3">
              <TextBlock title="Positioning" body={r.positioning} sources={sources} onCitationClick={onCitationClick} />
              <TextBlock title="Value proposition" body={r.valueProposition} sources={sources} onCitationClick={onCitationClick} />
              <TextBlock title="Go-to-market" body={r.goToMarketStrategy} sources={sources} onCitationClick={onCitationClick} />
              <TextBlock title="Growth channels" body={r.growthStrategy} sources={sources} onCitationClick={onCitationClick} />
              <TextBlock title="Pricing" body={r.pricingStrategy} sources={sources} onCitationClick={onCitationClick} />
            </div>
          ),
        },
        {
          id: 'roadmap',
          label: 'Roadmap',
          available: roadmap.length > 0 || Boolean(str(r.executionRoadmap)),
          content: (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="m-0 text-sm font-semibold text-slate-900">Execution timeline</h3>
              <div className="mt-4">
                {roadmap.length > 0 ? (
                  <TimelineList items={roadmap} sources={sources} onCitationClick={onCitationClick} />
                ) : (
                  <CitedText text={str(r.executionRoadmap)} sources={sources} onCitationClick={onCitationClick} className="text-sm whitespace-pre-wrap" />
                )}
              </div>
            </div>
          ),
        },
        {
          id: 'risks',
          label: 'Risks & next steps',
          available: Boolean(isNonEmpty(r.risks) || isNonEmpty(r.recommendations)),
          content: (
            <div className="space-y-3">
              <OpportunityRiskGrid risks={Array.isArray(r.risks) ? r.risks : undefined} sources={sources} onCitationClick={onCitationClick} />
              <TextBlock title="Recommended next steps" body={r.recommendations} sources={sources} onCitationClick={onCitationClick} highlight />
            </div>
          ),
        },
        {
          id: 'full',
          label: 'Full strategy',
          available: Boolean(str(r.detailedReport)),
          content: <TextBlock title="Detailed strategy" body={r.detailedReport} sources={sources} onCitationClick={onCitationClick} />,
        },
      ]}
    />
  );
}

export function ContentExperience({ data, sources, onCitationClick, onCopyText, onRegenerate }: ExpProps) {
  const r = asRecord(data);
  return (
    <ExperienceShell
      tabs={[
        {
          id: 'studio',
          label: 'Platform posts',
          content: (
            <div className="space-y-4">
              <ExecutiveSummaryCard data={r} sources={sources} onCitationClick={onCitationClick} />
              <ContentPlatformTabs
                data={data}
                onCopy={(l, t) => onCopyText?.(l, t)}
                onRegenerate={onRegenerate}
              />
            </div>
          ),
        },
        {
          id: 'ideas',
          label: 'Ideas & CTA',
          available: Boolean(isNonEmpty(r.contentIdeas) || isNonEmpty(r.visualIdeas) || isNonEmpty(r.callsToAction) || isNonEmpty(r.hooks)),
          content: (
            <div className="space-y-3">
              <TextBlock title="Hooks" body={r.hooks} sources={sources} onCitationClick={onCitationClick} kind="finding" />
              <TextBlock title="Content ideas" body={r.contentIdeas} sources={sources} onCitationClick={onCitationClick} kind="analysis" />
              <TextBlock title="Visual ideas" body={r.visualIdeas} sources={sources} onCitationClick={onCitationClick} kind="metric" />
              <TextBlock title="Calls to action" body={r.callsToAction} sources={sources} onCitationClick={onCitationClick} kind="action" />
            </div>
          ),
        },
        {
          id: 'full',
          label: 'Full plan',
          available: Boolean(str(r.detailedReport)),
          content: <TextBlock title="Content plan" body={r.detailedReport} sources={sources} onCitationClick={onCitationClick} kind="default" />,
        },
      ]}
    />
  );
}

export function DevelopmentExperience({ data, sources, onCitationClick }: ExpProps) {
  const r = asRecord(data);
  const phases = Array.isArray(r.developmentPhases) ? r.developmentPhases
    : Array.isArray(r.implementationRoadmap) ? r.implementationRoadmap
      : [];

  const launchPhases = [
    { title: 'Phase 1 — Planning', body: r.productRequirements || 'Define product, users, and problem from your brief.' },
    { title: 'Phase 2 — UI/UX', body: 'Map pages, navigation, and responsive layouts before code.' },
    { title: 'Phase 3 — MVP Development', body: r.mvpFeatures || 'Ship must-have features only.' },
    { title: 'Phase 4 — AI & API Integration', body: r.dataOverview || 'Wire APIs and AI only where they add clear value.' },
    { title: 'Phase 5 — Testing', body: 'Functional, mobile, API, error, and security checks.' },
    { title: 'Phase 6 — Deployment', body: r.infrastructureAnalysis || 'Host, env vars, domain, production checklist.' },
    { title: 'Phase 7 — User feedback', body: 'Collect usage signals and prioritize fixes.' },
    { title: 'Phase 8 — Improve & scale', body: 'Performance, reliability, and feature expansion.' },
  ];

  return (
    <ExperienceShell
      defaultTab="prototype"
      tabs={[
        {
          id: 'prototype',
          label: 'AI prototype',
          content: (
            <div className="space-y-4">
              <div className="rounded-xl border border-primary-100 bg-primary-50/50 px-4 py-3 text-sm text-primary-900">
                <strong>Mode A — AI-generated prototype.</strong> Preview is sandboxed and built from your development-plan fields
                (and agent HTML when present). Not a production application.
              </div>
              <PrototypePreview data={data} />
            </div>
          ),
        },
        {
          id: 'roadmap',
          label: 'Build-it-yourself',
          content: (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3 text-sm text-amber-950">
                <strong>Mode B — Build roadmap.</strong> Beginner-friendly plan from your agent output. Estimates are ranges, not guarantees.
              </div>
              <ExecutiveSummaryCard data={r} sources={sources} onCitationClick={onCitationClick} />
              <TextBlock title="1. Product definition" body={r.productRequirements || r.executiveSummary} sources={sources} onCitationClick={onCitationClick} kind="summary" />
              <TextBlock title="2. MVP feature selection" body={r.mvpFeatures} sources={sources} onCitationClick={onCitationClick} kind="action" />
              <TextBlock title="3. Recommended building method" body={r.recommendedApproach || r.recommendedStack} sources={sources} onCitationClick={onCitationClick} kind="analysis" />
              <TextBlock title="4. Frontend plan" body={r.frontendPlan || r.technicalArchitecture} sources={sources} onCitationClick={onCitationClick} kind="fact" />
              <TextBlock title="5. Backend & APIs" body={r.backendPlan || r.apiRequirements || r.dataOverview} sources={sources} onCitationClick={onCitationClick} kind="fact" />
              <TextBlock title="6. Database plan" body={r.databaseSchema || r.databasePlan || r.dataSources} sources={sources} onCitationClick={onCitationClick} kind="fact" />
              <TextBlock title="7. AI integration" body={r.aiIntegration || r.aiPlan} sources={sources} onCitationClick={onCitationClick} kind="analysis" />
              <TextBlock title="8. Deployment" body={r.infrastructureAnalysis || r.deploymentPlan} sources={sources} onCitationClick={onCitationClick} kind="action" />
              <TextBlock title="9. Testing plan" body={r.testingPlan || r.dataLimitations} sources={sources} onCitationClick={onCitationClick} kind="default" />
              <div className="space-y-3">
                <p className="comet-subsection">10. Launch roadmap</p>
                {launchPhases.map((p) => (
                  <TextBlock key={p.title} title={p.title} body={typeof p.body === 'string' || isNonEmpty(p.body) ? p.body : `Complete ${p.title} using your plan.`} sources={sources} onCitationClick={onCitationClick} kind="action" />
                ))}
              </div>
              {phases.length > 0 && (
                <div className="comet-section comet-section--action">
                  <span className="comet-section__rail" aria-hidden />
                  <header className="comet-section__head">
                    <span className="comet-section__eyebrow">Recommended action</span>
                    <h3 className="comet-section__title">Agent timeline</h3>
                  </header>
                  <div className="comet-section__body">
                    <TimelineList items={phases} sources={sources} onCitationClick={onCitationClick} />
                  </div>
                </div>
              )}
              <TextBlock title="11. Estimates & risks" body={r.estimates || r.risks || r.dataLimitations} sources={sources} onCitationClick={onCitationClick} kind="risk" />
            </div>
          ),
        },
        {
          id: 'architecture',
          label: 'Architecture',
          content: (
            <div className="space-y-4">
              <DevelopmentDashboard data={data} sources={sources} onCitationClick={onCitationClick} />
              <TextBlock title="Technical architecture" body={r.technicalArchitecture} sources={sources} onCitationClick={onCitationClick} kind="fact" />
              <TextBlock title="Recommended stack" body={r.recommendedStack} sources={sources} onCitationClick={onCitationClick} kind="metric" />
            </div>
          ),
        },
        {
          id: 'full',
          label: 'Full plan',
          available: Boolean(str(r.detailedReport)),
          content: <TextBlock title="Technical plan" body={r.detailedReport} sources={sources} onCitationClick={onCitationClick} kind="analysis" />,
        },
      ]}
    />
  );
}

type DeckSlide = {
  id: string;
  label: string;
  body: unknown;
  notes?: string;
  icon?: string;
};

function buildDeckSlides(r: Record<string, unknown>): DeckSlide[] {
  if (Array.isArray(r.slides) && r.slides.length) {
    return (r.slides as Array<Record<string, unknown>>).map((s, i) => ({
      id: str(s.id) || `slide-${i}`,
      label: str(s.title || s.heading || s.label || `Slide ${i + 1}`),
      body: s.bullets ?? s.body ?? s.content ?? s.text ?? '',
      notes: str(s.notes || s.speakerNotes || s.speaker_notes) || undefined,
      icon: str(s.icon) || undefined,
    })).filter(s => isNonEmpty(s.body) || s.label);
  }
  return [
    { id: 'title', label: 'Title', body: r.executiveSummary || r.title || r.projectName, notes: str(r.titleNotes) || undefined, icon: '✦' },
    { id: 'problem', label: 'Problem', body: r.problem, notes: str(r.problemNotes) || undefined, icon: '!' },
    { id: 'solution', label: 'Solution', body: r.solution, notes: str(r.solutionNotes) || undefined, icon: '✓' },
    { id: 'market', label: 'Market', body: r.marketOpportunity, notes: str(r.marketNotes) || undefined, icon: '◎' },
    { id: 'product', label: 'Product', body: r.product, icon: '▣' },
    { id: 'business', label: 'Business model', body: r.businessModel, icon: '$' },
    { id: 'advantage', label: 'Advantage', body: r.competitiveAdvantage, icon: '★' },
    { id: 'impact', label: 'Impact', body: r.impact, icon: '↑' },
    { id: 'roadmap', label: 'Roadmap', body: r.roadmap, icon: '→' },
    { id: 'ask', label: 'The ask', body: r.ask, notes: str(r.askNotes) || undefined, icon: '◆' },
  ].filter(s => isNonEmpty(s.body));
}

function slideBodyToBullets(body: unknown): string[] {
  if (Array.isArray(body)) return body.map(b => (typeof b === 'string' ? b : JSON.stringify(b))).filter(Boolean);
  if (typeof body === 'string') {
    return body.split(/\n+/).map(l => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
  }
  if (body && typeof body === 'object') return [JSON.stringify(body)];
  return body != null ? [String(body)] : [];
}

export function PitchExperience({ data, sources, onCitationClick }: ExpProps) {
  const r = asRecord(data);
  const slides = useMemo(() => buildDeckSlides(asRecord(data)), [data]);
  const deckTitle = str(r.presentationTitle || r.title || r.projectName || r.executiveSummary).slice(0, 80) || 'COMET Presentation';
  const [idx, setIdx] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const safeIdx = slides.length ? Math.min(idx, slides.length - 1) : 0;
  const slide = slides[safeIdx];

  if (!slides.length) {
    return (
      <div className="space-y-3">
        <TextBlock title="Executive summary" body={r.executiveSummary} sources={sources} onCitationClick={onCitationClick} highlight />
        <TextBlock title="Recommendations" body={r.recommendations} sources={sources} onCitationClick={onCitationClick} />
        <TextBlock title="Detailed pitch" body={r.detailedReport} sources={sources} onCitationClick={onCitationClick} />
        <p className="text-xs text-slate-500">No structured slides found. Use Download PPTX/PDF from the header when content is available.</p>
      </div>
    );
  }

  const bullets = slideBodyToBullets(slide.body);
  const go = (next: number) => setIdx(Math.max(0, Math.min(slides.length - 1, next)));

  return (
    <div className={`space-y-4 ${fullscreen ? 'fixed inset-0 z-[130] overflow-auto bg-slate-950/95 p-4 sm:p-6' : ''}`}>
      {/* Chrome */}
      <div className={`flex flex-wrap items-center justify-between gap-2 ${fullscreen ? 'text-white' : ''}`}>
        <div>
          <p className={`m-0 text-[11px] font-bold uppercase tracking-[0.14em] ${fullscreen ? 'text-sky-300' : 'text-primary-700'}`}>
            Presentation
          </p>
          <h2 className={`m-0 mt-0.5 text-sm font-bold sm:text-base ${fullscreen ? 'text-white' : 'text-slate-900'}`}>{deckTitle}</h2>
          <p className={`m-0 mt-0.5 text-xs ${fullscreen ? 'text-slate-300' : 'text-slate-500'}`}>
            Slide {safeIdx + 1} of {slides.length} · 16:9
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setShowNotes(v => !v)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${fullscreen ? 'border-slate-600 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
            {showNotes ? 'Hide notes' : 'Speaker notes'}
          </button>
          <button type="button" onClick={() => setFullscreen(f => !f)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${fullscreen ? 'border-slate-600 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
            {fullscreen ? 'Exit full screen' : 'Full-screen presentation'}
          </button>
          <button type="button" disabled={safeIdx <= 0} onClick={() => go(safeIdx - 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40">Previous slide</button>
          <button type="button" disabled={safeIdx >= slides.length - 1} onClick={() => go(safeIdx + 1)} className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">Next slide</button>
        </div>
      </div>

      <div className="flex gap-3">
        {/* Thumbnails */}
        <div className={`hidden w-36 shrink-0 flex-col gap-2 overflow-y-auto sm:flex ${fullscreen ? 'max-h-[75vh]' : 'max-h-[380px]'}`}>
          {slides.map((s, i) => {
            const preview = slideBodyToBullets(s.body)[0] || s.label;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => go(i)}
                className={`rounded-xl border p-2 text-left transition ${
                  i === safeIdx
                    ? 'border-primary-400 bg-primary-50 shadow-sm ring-2 ring-primary-200'
                    : fullscreen
                      ? 'border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-400'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-primary-200'
                }`}
              >
                <div className={`mb-1.5 aspect-video rounded-md border ${i === safeIdx ? 'border-primary-200 bg-gradient-to-br from-white to-primary-50' : 'border-slate-100 bg-slate-50'} p-1.5`}>
                  <p className="m-0 text-[8px] font-bold uppercase text-primary-600">{s.label}</p>
                  <p className="m-0 mt-0.5 line-clamp-2 text-[7px] leading-tight text-slate-500">{preview}</p>
                </div>
                <p className={`m-0 text-[10px] font-semibold ${i === safeIdx ? 'text-primary-800' : ''}`}>
                  {i + 1}. {s.label}
                </p>
              </button>
            );
          })}
        </div>

        {/* Active slide */}
        <article
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); go(safeIdx + 1); }
            if (e.key === 'ArrowLeft') go(safeIdx - 1);
            if (e.key === 'Escape') setFullscreen(false);
          }}
          className={`flex min-h-[240px] flex-1 flex-col rounded-2xl border shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${
            fullscreen
              ? 'border-slate-700 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950 p-8 sm:p-12'
              : 'border-primary-100 bg-gradient-to-br from-white via-white to-primary-50/60 p-6'
          }`}
          style={{ aspectRatio: fullscreen ? undefined : '16 / 9' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`m-0 text-[11px] font-bold uppercase tracking-[0.14em] ${fullscreen ? 'text-sky-400' : 'text-primary-600'}`}>
                {slide.icon ? `${slide.icon} ` : ''}{slide.label}
              </p>
              <h3 className={`mt-2 m-0 text-xl font-bold sm:text-2xl lg:text-3xl ${fullscreen ? 'text-white' : 'text-slate-900'}`}>
                {slide.label}
              </h3>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums ${fullscreen ? 'bg-white/10 text-sky-200' : 'bg-primary-50 text-primary-700'}`}>
              {safeIdx + 1}/{slides.length}
            </span>
          </div>

          <div className={`mt-5 flex-1 space-y-2.5 overflow-y-auto ${fullscreen ? 'text-slate-100' : 'text-slate-800'}`}>
            {bullets.length <= 1 && typeof slide.body === 'string' ? (
              <p className={`m-0 whitespace-pre-wrap text-base leading-relaxed sm:text-lg ${fullscreen ? 'text-slate-100' : ''}`}>
                <CitedText text={slide.body} sources={sources} onCitationClick={onCitationClick} className={fullscreen ? 'text-slate-100' : ''} />
              </p>
            ) : (
              <ul className="m-0 space-y-2.5 p-0 list-none">
                {bullets.map((b, i) => (
                  <li
                    key={i}
                    className={`flex gap-3 rounded-xl px-3 py-2.5 text-sm sm:text-base ${
                      fullscreen ? 'bg-white/5' : 'bg-white/90 shadow-sm border border-slate-100'
                    }`}
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${fullscreen ? 'bg-sky-400' : 'bg-primary-500'}`} aria-hidden />
                    <CitedText text={b} sources={sources} onCitationClick={onCitationClick} className={fullscreen ? 'text-slate-100' : ''} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className={`mt-4 m-0 text-[10px] ${fullscreen ? 'text-slate-500' : 'text-slate-400'}`}>
            ← → or Space · Download valid PPTX / PDF from the header
          </p>
        </article>
      </div>

      {/* Speaker notes */}
      {showNotes && (
        <div className={`rounded-xl border px-4 py-3 ${fullscreen ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-amber-100 bg-amber-50/60'}`}>
          <p className={`m-0 text-[10px] font-extrabold uppercase tracking-wider ${fullscreen ? 'text-amber-300' : 'text-amber-800'}`}>
            Speaker notes
          </p>
          <p className={`mt-1.5 m-0 text-sm leading-relaxed ${fullscreen ? 'text-slate-300' : 'text-amber-950'}`}>
            {slide.notes || str(r.speakerNotes) || 'No speaker notes for this slide. Add notes in regenerate or use talking points from the body bullets.'}
          </p>
        </div>
      )}

      {!fullscreen && (
        <TextBlock title="Recommendations" body={r.recommendations} sources={sources} onCitationClick={onCitationClick} kind="action" />
      )}
    </div>
  );
}

export function StudentExperience({ data, sources, onCitationClick, onCopyText, agentId }: ExpProps) {
  const id = (agentId || 'studyvault').replace(/^pg_/, '');
  const studentProps = { data, sources, onCitationClick, onCopyText, agentId: id };
  if (id === 'examinsight') return <ExamInsightExperience {...studentProps} />;
  if (id === 'studyvault') return <StudyVaultExperience {...studentProps} />;
  if (id === 'successarchitect') return <SuccessArchitectExperience {...studentProps} />;
  if (id === 'guideminds') return <GuideMindsExperience {...studentProps} />;
  if (id === 'specialisthub') return <SpecialistHubExperience {...studentProps} />;

  const r = asRecord(data);
  const readiness = num(r.examReadinessScore ?? r.readinessScore ?? r.confidenceScore);

  return (
    <ExperienceShell
      tabs={[
        {
          id: 'dashboard',
          label: 'Study dashboard',
          content: (
            <div className="space-y-4">
              <StudentDashboard data={data} agentId={id} sources={sources} onCitationClick={onCitationClick} />
              {readiness != null && (
                <MetricCard
                  label="Readiness"
                  tone="primary"
                  value={<>{Math.round(readiness)} <span className="text-base text-slate-500">/ 100</span></>}
                  hint={<ProgressBar value={readiness} />}
                />
              )}
              <TextBlock title="Overview" body={r.executiveSummary} sources={sources} onCitationClick={onCitationClick} highlight />
            </div>
          ),
        },
        {
          id: 'topics',
          label: 'Topics',
          available: Boolean(isNonEmpty(r.keyConcepts) || isNonEmpty(r.priorityTopics) || isNonEmpty(r.weakAreas) || isNonEmpty(r.definitions)),
          content: (
            <div className="space-y-3">
              <TextBlock title="Key concepts" body={r.keyConcepts} sources={sources} onCitationClick={onCitationClick} />
              <TextBlock title="Priority topics" body={r.priorityTopics} sources={sources} onCitationClick={onCitationClick} />
              <TextBlock title="Weak areas" body={r.weakAreas} sources={sources} onCitationClick={onCitationClick} />
              <TextBlock title="Definitions" body={r.definitions} sources={sources} onCitationClick={onCitationClick} />
            </div>
          ),
        },
        {
          id: 'plan',
          label: 'Plan',
          available: Boolean(isNonEmpty(r.studySchedule) || isNonEmpty(r.milestones) || isNonEmpty(r.likelyQuestions)),
          content: (
            <div className="space-y-3">
              {Array.isArray(r.studySchedule) && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="m-0 text-sm font-semibold text-slate-900">Study schedule</h3>
                  <div className="mt-3"><TimelineList items={r.studySchedule} sources={sources} onCitationClick={onCitationClick} /></div>
                </div>
              )}
              <TextBlock title="Milestones" body={r.milestones} sources={sources} onCitationClick={onCitationClick} />
              <TextBlock title="Likely questions" body={r.likelyQuestions} sources={sources} onCitationClick={onCitationClick} />
              <TextBlock title="Step-by-step solutions" body={r.stepByStepSolutions} sources={sources} onCitationClick={onCitationClick} />
            </div>
          ),
        },
        {
          id: 'full',
          label: 'Full notes',
          available: Boolean(str(r.detailedReport)),
          content: <TextBlock title="Study notes" body={r.detailedReport} sources={sources} onCitationClick={onCitationClick} />,
        },
      ]}
    />
  );
}

export function GenericAgentExperience({ data, sources, onCitationClick }: ExpProps) {
  const r = asRecord(data);
  return (
    <ExperienceShell
      tabs={[
        {
          id: 'summary',
          label: 'Summary',
          content: (
            <div className="space-y-3">
              <TextBlock title="Executive summary" body={r.executiveSummary} sources={sources} onCitationClick={onCitationClick} highlight />
              <TextBlock title="Detailed report" body={r.detailedReport} sources={sources} onCitationClick={onCitationClick} />
            </div>
          ),
        },
        {
          id: 'details',
          label: 'Details',
          available: Object.keys(r).some(k => !['executiveSummary', 'detailedReport', 'claims', 'sourcesUsed'].includes(k) && isNonEmpty(r[k])),
          content: (
            <div className="space-y-3">
              {Object.entries(r)
                .filter(([k, v]) => !['executiveSummary', 'detailedReport', 'claims', 'sourcesUsed', 'title'].includes(k) && isNonEmpty(v))
                .map(([k, v]) => (
                  <TextBlock key={k} title={k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())} body={v} sources={sources} onCitationClick={onCitationClick} />
                ))}
            </div>
          ),
        },
      ]}
    />
  );
}

/** Route to the correct interactive experience by agent type. */
export function resolveAgentExperience(agentId: string): ComponentType<ExpProps> {
  const id = agentId.startsWith('pg_') ? agentId.slice(3) : agentId;
  if (id === 'research' || id === 'market') return ResearchExperience;
  if (id === 'strategy') return StrategyExperience;
  if (id === 'content' || id === 'marketing') return ContentExperience;
  if (id === 'development' || id === 'frontend' || id === 'backend' || id === 'product') return DevelopmentExperience;
  if (id === 'pitch' || id === 'presentation') return PitchExperience;
  if (['studyvault', 'examinsight', 'successarchitect', 'guideminds', 'specialisthub'].includes(id)) {
    return function StudentExp(props: ExpProps) {
      return <StudentExperience {...props} agentId={id} />;
    };
  }
  return GenericAgentExperience;
}
