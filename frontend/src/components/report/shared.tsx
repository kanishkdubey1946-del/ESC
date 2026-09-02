/**
 * Shared interactive building blocks for agent-specific View experiences.
 * Only render with real values — never invent numbers.
 */
import { useEffect, useState, type ReactNode } from 'react';
import type { SourceRecord } from '../../types/sources';
import CitedText from '../research/CitedText';

export function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
}

export function str(v: unknown): string {
  return v == null ? '' : String(v);
}

export function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

export function isNonEmpty(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === 'string') return Boolean(v.trim());
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v as object).length > 0;
  return true;
}

export type SectionKind =
  | 'summary'
  | 'finding'
  | 'analysis'
  | 'fact'
  | 'opportunity'
  | 'risk'
  | 'action'
  | 'source'
  | 'metric'
  | 'default';

const KIND_LABEL: Record<SectionKind, string> = {
  summary: 'Executive summary',
  finding: 'Key finding',
  analysis: 'AI analysis',
  fact: 'Verified / sourced',
  opportunity: 'Opportunity',
  risk: 'Risk',
  action: 'Recommended action',
  source: 'Source evidence',
  metric: 'Metric',
  default: 'Section',
};

export function ExperienceShell({
  tabs,
  defaultTab,
}: {
  tabs: Array<{ id: string; label: string; content: ReactNode; available?: boolean }>;
  defaultTab?: string;
}) {
  const visible = tabs.filter(t => t.available !== false);
  const [active, setActive] = useState(defaultTab && visible.some(t => t.id === defaultTab) ? defaultTab : visible[0]?.id || '');
  const current = visible.find(t => t.id === active) || visible[0];

  if (!visible.length) return null;

  return (
    <div className="comet-output-shell">
      <div role="tablist" aria-label="Report sections" className="comet-output-tabs no-scrollbar">
        {visible.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={current?.id === tab.id}
            onClick={() => setActive(tab.id)}
            className="comet-output-tab"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="min-h-[140px] space-y-4">
        {current?.content}
      </div>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'default' | 'primary' | 'success' | 'warn' | 'danger';
}) {
  const tones = {
    default: 'border-slate-200',
    primary: 'border-primary-200 bg-primary-50/40',
    success: 'border-emerald-200 bg-emerald-50/40',
    warn: 'border-amber-200 bg-amber-50/40',
    danger: 'border-rose-200 bg-rose-50/40',
  };
  return (
    <div className={`comet-metric ${tones[tone]}`}>
      <p className="comet-metric__label">{label}</p>
      <div className="comet-metric__value">{value}</div>
      {hint && <div className="comet-metric__hint">{hint}</div>}
    </div>
  );
}

export function ProgressBar({ value, max = 100, label }: { value: number; max?: number; label?: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div>
      {label && (
        <div className="mb-1 flex justify-between text-[11px] font-medium text-slate-600">
          <span>{label}</span>
          <span>{Math.round(value)}{max === 100 ? '/100' : ''}</span>
        </div>
      )}
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-sky-400 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** CSS-only bars from real numeric pairs — no chart library, no fake data. */
export function ValidBarChart({
  title,
  items,
  unit,
  sourceNote,
}: {
  title: string;
  items: Array<{ label: string; value: number }>;
  unit?: string;
  sourceNote?: string;
}) {
  if (!items.length || items.some(i => !Number.isFinite(i.value))) return null;
  const max = Math.max(...items.map(i => Math.abs(i.value)), 1);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="m-0 text-sm font-semibold text-slate-900">{title}</h4>
      {unit && <p className="mt-0.5 text-[11px] text-slate-500">Unit: {unit}</p>}
      <ul className="mt-4 space-y-3">
        {items.map(item => (
          <li key={item.label}>
            <div className="mb-1 flex justify-between gap-2 text-xs">
              <span className="font-medium text-slate-700">{item.label}</span>
              <span className="tabular-nums text-slate-600">{item.value}{unit ? ` ${unit}` : ''}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-primary-500"
                style={{ width: `${(Math.abs(item.value) / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      {sourceNote && <p className="mt-3 text-[11px] text-slate-500">Source: {sourceNote}</p>}
    </div>
  );
}

/** Proportional doughnut using conic-gradient when all values are real numbers. */
export function ValidDonut({
  title,
  segments,
  sourceNote,
}: {
  title: string;
  segments: Array<{ label: string; value: number; color: string }>;
  sourceNote?: string;
}) {
  const valid = segments.filter(s => Number.isFinite(s.value) && s.value > 0);
  if (valid.length < 2) return null;
  const total = valid.reduce((s, x) => s + x.value, 0);
  if (total <= 0) return null;
  let acc = 0;
  const stops = valid.map(s => {
    const start = (acc / total) * 360;
    acc += s.value;
    const end = (acc / total) * 360;
    return `${s.color} ${start}deg ${end}deg`;
  }).join(', ');

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="m-0 text-sm font-semibold text-slate-900">{title}</h4>
      <div className="mt-4 flex flex-wrap items-center gap-6">
        <div
          className="relative h-36 w-36 shrink-0 rounded-full"
          style={{ background: `conic-gradient(${stops})` }}
          role="img"
          aria-label={valid.map(s => `${s.label}: ${s.value}`).join(', ')}
        >
          <div className="absolute inset-6 rounded-full bg-white" />
        </div>
        <ul className="space-y-2 text-xs text-slate-700">
          {valid.map(s => (
            <li key={s.label} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
              <span className="font-medium">{s.label}</span>
              <span className="text-slate-500">
                {s.value} ({Math.round((s.value / total) * 100)}%)
              </span>
            </li>
          ))}
        </ul>
      </div>
      {sourceNote && <p className="mt-3 text-[11px] text-slate-500">Source: {sourceNote}</p>}
    </div>
  );
}

export function ExpandableCard({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-900"
        aria-expanded={open}
      >
        {title}
        <span className="text-slate-400">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="border-t border-slate-100 px-4 py-3 text-sm text-slate-700">{children}</div>}
    </div>
  );
}

export function OpportunityRiskGrid({
  opportunities,
  risks,
  sources,
  onCitationClick,
}: {
  opportunities?: unknown[];
  risks?: unknown[];
  sources?: SourceRecord[];
  onCitationClick?: (n: number, s?: SourceRecord) => void;
}) {
  if ((!opportunities || !opportunities.length) && (!risks || !risks.length)) return null;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {opportunities && opportunities.length > 0 && (
        <TextBlock title="Opportunities" body={opportunities} sources={sources} onCitationClick={onCitationClick} kind="opportunity" />
      )}
      {risks && risks.length > 0 && (
        <TextBlock title="Risks" body={risks} sources={sources} onCitationClick={onCitationClick} kind="risk" />
      )}
    </div>
  );
}

export function TimelineList({
  items,
  sources,
  onCitationClick,
}: {
  items: unknown[];
  sources?: SourceRecord[];
  onCitationClick?: (n: number, s?: SourceRecord) => void;
}) {
  if (!items.length) return null;
  return (
    <ol className="space-y-3 border-l-2 border-primary-200 pl-4">
      {items.map((item, i) => (
        <li key={i} className="relative text-sm text-slate-700">
          <span className="absolute -left-[1.35rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary-500" />
          {typeof item === 'string' ? (
            <CitedText text={item} sources={sources} onCitationClick={onCitationClick} />
          ) : typeof item === 'object' && item ? (
            Object.entries(item as Record<string, unknown>).map(([k, v]) => (
              <p key={k} className="my-0.5">
                <strong className="text-slate-800">{k}:</strong>{' '}
                <CitedText text={str(v)} sources={sources} onCitationClick={onCitationClick} />
              </p>
            ))
          ) : (
            str(item)
          )}
        </li>
      ))}
    </ol>
  );
}

/** Infer semantic kind from title keywords when kind not provided. */
function inferKind(title: string, highlight?: boolean): SectionKind {
  const t = title.toLowerCase();
  if (highlight || /executive|overview|summary|objective/.test(t)) return 'summary';
  if (/key finding|finding|insight/.test(t)) return 'finding';
  if (/risk|threat|limitation|gap/.test(t)) return 'risk';
  if (/opportunit|growth channel|advantage/.test(t)) return 'opportunity';
  if (/recommend|next step|action|roadmap|timeline|plan/.test(t)) return 'action';
  if (/source|evidence|citation/.test(t)) return 'source';
  if (/metric|score|kpi|size|tam|sam|som|market growth/.test(t)) return 'metric';
  if (/competitor|market analysis|trend|verified|data/.test(t)) return 'fact';
  if (/analysis|interpretation|assessment|positioning|strategy|model/.test(t)) return 'analysis';
  return 'default';
}

/**
 * Premium executive summary — never looks like ordinary body text.
 * Pulls structured bullets when fields exist; otherwise uses freeform summary.
 */
export function ExecutiveSummaryCard({
  data,
  sources,
  onCitationClick,
  metrics,
}: {
  data: Record<string, unknown>;
  sources?: SourceRecord[];
  onCitationClick?: (n: number, s?: SourceRecord) => void;
  metrics?: Array<{ label: string; value: ReactNode; hint?: string; tone?: 'default' | 'primary' | 'success' | 'warn' | 'danger' }>;
}) {
  const summary = str(data.executiveSummary || data.summary || data.overview);
  const objective = str(data.researchObjective || data.strategicObjective || data.productRequirements || data.coreIdea);
  const findings = Array.isArray(data.keyFindings) ? data.keyFindings.map(String).filter(Boolean) : [];
  const opportunities = Array.isArray(data.opportunities) ? data.opportunities : [];
  const risks = Array.isArray(data.risks) ? data.risks : [];
  const recommendations = data.recommendations ?? data.recommendedDirection ?? data.priorityActions;

  const mainFinding = findings[0] || str(data.mainFinding) || '';
  const keyOpp = opportunities[0]
    ? (typeof opportunities[0] === 'string' ? opportunities[0] : JSON.stringify(opportunities[0]))
    : str(data.keyOpportunity);
  const primaryChallenge = risks[0]
    ? (typeof risks[0] === 'string' ? risks[0] : JSON.stringify(risks[0]))
    : str(data.primaryChallenge || data.keyRisk);
  const direction = Array.isArray(recommendations)
    ? str(recommendations[0])
    : str(recommendations);

  if (!summary && !objective && !mainFinding && !direction) return null;

  const points: Array<{ label: string; text: string }> = [
    objective ? { label: 'Core idea / subject', text: objective } : null,
    mainFinding ? { label: 'Main finding', text: mainFinding } : null,
    keyOpp ? { label: 'Key opportunity', text: keyOpp } : null,
    primaryChallenge ? { label: 'Primary challenge', text: primaryChallenge } : null,
    direction ? { label: 'Recommended direction', text: direction } : null,
  ].filter(Boolean) as Array<{ label: string; text: string }>;

  return (
    <section className="overflow-hidden rounded-2xl border border-primary-200 bg-gradient-to-br from-sky-50 via-white to-primary-50/60 shadow-md" aria-label="Executive summary">
      <div className="flex items-center gap-2 border-b border-primary-100 bg-primary-600/95 px-4 py-2.5 text-white sm:px-5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-sm font-bold" aria-hidden>Σ</span>
        <div>
          <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-100">Executive Summary</p>
          <p className="m-0 text-[11px] text-primary-50/90">Scan this first — full detail is below</p>
        </div>
      </div>
      <div className="space-y-4 px-4 py-5 sm:px-6">
        {summary && (
          <p className="m-0 text-[15px] font-medium leading-8 text-slate-800 sm:text-base">
            <CitedText text={summary} sources={sources} onCitationClick={onCitationClick} className="whitespace-pre-wrap" />
          </p>
        )}
        {points.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {points.map(p => (
              <div key={p.label} className="rounded-xl border border-white/80 bg-white/90 px-3 py-2.5 shadow-sm">
                <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.08em] text-primary-700">{p.label}</p>
                <p className="mt-1 m-0 text-sm leading-relaxed text-slate-700">
                  <CitedText text={p.text.length > 280 ? `${p.text.slice(0, 277)}…` : p.text} sources={sources} onCitationClick={onCitationClick} />
                </p>
              </div>
            ))}
          </div>
        )}
        {metrics && metrics.length > 0 && (
          <div>
            <p className="comet-subsection !mt-1">Key assessments</p>
            <div className="comet-metric-grid">
              {metrics.map(m => (
                <MetricCard key={m.label} label={m.label} value={m.value} hint={m.hint} tone={m.tone} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function TextBlock({
  title,
  body,
  sources,
  onCitationClick,
  highlight,
  kind,
}: {
  title: string;
  body: unknown;
  sources?: SourceRecord[];
  onCitationClick?: (n: number, s?: SourceRecord) => void;
  highlight?: boolean;
  kind?: SectionKind;
}) {
  if (!isNonEmpty(body)) return null;
  const sectionKind = kind || inferKind(title, highlight);
  const badge = KIND_LABEL[sectionKind];

  return (
    <section className={`comet-section comet-section--${sectionKind}`} aria-label={title}>
      <span className="comet-section__rail" aria-hidden />
      <header className="comet-section__head">
        <span className="comet-section__eyebrow">{badge}</span>
        <h3 className="comet-section__title">{title}</h3>
      </header>
      <div className="comet-section__body">
        {typeof body === 'string' || typeof body === 'number' ? (
          <CitedText text={String(body)} sources={sources} onCitationClick={onCitationClick} className="whitespace-pre-wrap" />
        ) : Array.isArray(body) ? (
          <ul className="comet-list">
            {body.map((item, i) => (
              <li key={i}>
                {typeof item === 'string' ? (
                  <CitedText text={item} sources={sources} onCitationClick={onCitationClick} />
                ) : (
                  <CitedText text={JSON.stringify(item)} sources={sources} onCitationClick={onCitationClick} />
                )}
              </li>
            ))}
          </ul>
        ) : (
          <pre className="m-0 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-600">{JSON.stringify(body, null, 2)}</pre>
        )}
      </div>
    </section>
  );
}

/**
 * Animated risk gauge 0–100. Higher score = higher risk.
 * Colors: green low · amber moderate · red high · deep-red critical.
 */
export function RiskGauge({
  score,
  label = 'Risk score',
  methodology,
  factors,
}: {
  score: number;
  label?: string;
  methodology?: string;
  factors?: string[];
}) {
  const clamped = Math.min(100, Math.max(0, Number.isFinite(score) ? score : 0));
  const band =
    clamped <= 29 ? { name: 'Low Risk', color: '#059669' }
      : clamped <= 59 ? { name: 'Moderate Risk', color: '#D97706' }
        : clamped <= 79 ? { name: 'High Risk', color: '#DC2626' }
          : { name: 'Critical Risk', color: '#991B1B' };

  const [shown, setShown] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const dur = 900;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const ease = 1 - (1 - t) ** 3;
      setShown(clamped * ease);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [clamped]);

  const pct = Math.min(100, Math.max(0, shown));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">COMET Risk Assessment · higher score = higher risk</p>
      <div className="mt-4 flex flex-wrap items-end gap-6">
        <div className="min-w-[10rem]">
          <p className="text-4xl font-extrabold tabular-nums text-slate-900">{Math.round(shown)}<span className="text-lg font-semibold text-slate-400">/100</span></p>
          <p className="mt-1 text-sm font-bold" style={{ color: band.color }}>{band.name}</p>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.round(shown)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: band.color }} />
          </div>
        </div>
        <div className="min-w-[12rem] flex-1 space-y-2 text-xs text-slate-600">
          <p><strong className="text-slate-800">Bands:</strong> 0–29 Low (green) · 30–59 Moderate (amber) · 60–79 High (red) · 80–100 Critical (deep red)</p>
          {methodology && <p className="leading-relaxed"><strong className="text-slate-800">How calculated:</strong> {methodology}</p>}
          {factors && factors.length > 0 && (
            <ul className="list-disc pl-4">
              {factors.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/** Try to parse market size strings into numbers for charts (only when parseable). */
export function parseSizeNumber(raw: string): number | null {
  if (!raw.trim()) return null;
  const cleaned = raw.replace(/,/g, '').trim();
  const m = cleaned.match(/([\d.]+)\s*(trillion|billion|million|bn|mn|m|k|cr|lakh)?/i);
  if (!m) return null;
  let n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  const u = (m[2] || '').toLowerCase();
  if (u.startsWith('tr')) n *= 1e12;
  else if (u.startsWith('b') || u === 'bn') n *= 1e9;
  else if (u.startsWith('m') || u === 'mn') n *= 1e6;
  else if (u === 'k') n *= 1e3;
  else if (u === 'cr') n *= 1e7;
  else if (u === 'lakh') n *= 1e5;
  return n;
}
