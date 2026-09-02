/**
 * Finance experience + data provenance labels (never mix estimate with verified fact).
 */
import type { SourceRecord } from '../../types/sources';
import {
  ExperienceShell,
  MetricCard,
  RiskGauge,
  TextBlock,
  ValidBarChart,
  asRecord,
  isNonEmpty,
  num,
  str,
} from './shared';

type Props = {
  data: unknown;
  sources?: SourceRecord[];
  onCitationClick?: (n: number, s?: SourceRecord) => void;
  onCopyText?: (label: string, text: string) => void;
  agentId?: string;
};

export type DataProvenance = 'verified' | 'user' | 'estimate' | 'assumption' | 'unknown';

function metricFrom(r: Record<string, unknown>, keys: string[]): { value: string; raw?: number } | null {
  for (const k of keys) {
    const v = r[k];
    if (v == null || v === '') continue;
    if (typeof v === 'number' && Number.isFinite(v)) return { value: String(v), raw: v };
    if (typeof v === 'string' && v.trim()) return { value: v.trim() };
    if (typeof v === 'object' && v && 'value' in (v as object)) {
      const inner = (v as { value?: unknown; unit?: unknown }).value;
      const unit = (v as { unit?: unknown }).unit;
      if (inner != null) return { value: `${inner}${unit != null ? ` ${unit}` : ''}`, raw: num(inner) ?? undefined };
    }
  }
  return null;
}

/** Infer provenance from field metadata, labels, or surrounding notes — never invents certainty. */
function inferProvenance(r: Record<string, unknown>, keys: string[], valueText: string): DataProvenance {
  const metaKeys = keys.flatMap(k => [
    `${k}Source`, `${k}_source`, `${k}Provenance`, `${k}Label`, `${k}Type`, `${k}Status`,
  ]);
  for (const mk of metaKeys) {
    const raw = str(r[mk]).toLowerCase();
    if (!raw) continue;
    if (/verif|actual|evidence|source|reported|historical|audited/.test(raw)) return 'verified';
    if (/user|input|provided|given|your/.test(raw)) return 'user';
    if (/assum|hypothesis|if we/.test(raw)) return 'assumption';
    if (/estim|project|forecast|model|ai|approx|scenario/.test(raw)) return 'estimate';
  }
  const blob = `${valueText} ${str(r.dataLimitations)} ${str(r.assumptions)} ${str(r.financialOverview)}`.toLowerCase();
  if (/\b(actual|verified|from evidence|reported)\b/.test(blob) && keys.some(k => blob.includes(k.toLowerCase()))) {
    return 'verified';
  }
  if (/\b(user[- ]provided|your input|as provided)\b/.test(blob)) return 'user';
  if (/\b(assumption|assume|holding constant)\b/.test(blob)) return 'assumption';
  if (/\b(estimate|projection|forecast|scenario|approx|modelled|modeled|ai)\b/.test(blob)) return 'estimate';
  // Explicit provenance map if agent provided one
  const map = r.metricProvenance || r.dataProvenance || r.figureLabels;
  if (map && typeof map === 'object' && !Array.isArray(map)) {
    for (const k of keys) {
      const p = str((map as Record<string, unknown>)[k]).toLowerCase();
      if (/verif|actual/.test(p)) return 'verified';
      if (/user/.test(p)) return 'user';
      if (/assum/.test(p)) return 'assumption';
      if (/estim|project/.test(p)) return 'estimate';
    }
  }
  // Default: financial model outputs are estimates unless labeled otherwise
  return 'estimate';
}

const PROVENANCE_UI: Record<DataProvenance, { label: string; className: string }> = {
  verified: { label: 'Verified data', className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  user: { label: 'User-provided data', className: 'border-sky-200 bg-sky-50 text-sky-800' },
  estimate: { label: 'AI estimate', className: 'border-amber-200 bg-amber-50 text-amber-900' },
  assumption: { label: 'Assumption', className: 'border-violet-200 bg-violet-50 text-violet-800' },
  unknown: { label: 'Unlabeled', className: 'border-slate-200 bg-slate-50 text-slate-600' },
};

function ProvenanceBadge({ kind }: { kind: DataProvenance }) {
  const ui = PROVENANCE_UI[kind];
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${ui.className}`}>
      {ui.label}
    </span>
  );
}

function FinanceMetricCard({
  label,
  value,
  provenance,
}: {
  label: string;
  value: string;
  provenance: DataProvenance;
}) {
  const tone =
    provenance === 'verified' ? 'success'
      : provenance === 'user' ? 'primary'
        : provenance === 'assumption' ? 'default'
          : 'warn';
  return (
    <div className="relative">
      <MetricCard
        label={label}
        value={value}
        tone={tone as 'default' | 'primary' | 'success' | 'warn' | 'danger'}
        hint={<ProvenanceBadge kind={provenance} />}
      />
    </div>
  );
}

function listItems(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(x => (typeof x === 'string' ? x : JSON.stringify(x))).filter(Boolean);
  if (typeof v === 'string' && v.trim()) return v.split(/\n+/).map(s => s.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
  return [];
}

export function FinanceExperience({ data, sources, onCitationClick }: Props) {
  const r = asRecord(data);
  const cards: Array<{ label: string; keys: string[]; missing: string }> = [
    { label: 'Initial investment', keys: ['initialInvestment', 'startupCost', 'capex', 'investment'], missing: 'Initial investment or seed capital' },
    { label: 'Operating expenses', keys: ['operatingExpenses', 'opex', 'expenses', 'totalExpenses', 'costs'], missing: 'Expense breakdown or cost assumptions' },
    { label: 'Revenue', keys: ['revenue', 'totalRevenue', 'revenueEstimate', 'monthlyRevenue'], missing: 'Revenue figure or estimate assumptions' },
    { label: 'Gross profit', keys: ['grossProfit', 'gross_profit'], missing: 'Revenue and COGS / gross margin inputs' },
    { label: 'Net profit', keys: ['netProfit', 'net_profit', 'profit'], missing: 'Full P&L inputs' },
    { label: 'Gross margin', keys: ['grossMargin', 'gross_margin'], missing: 'Gross margin %' },
    { label: 'Burn rate', keys: ['burnRate', 'burn_rate'], missing: 'Monthly net cash burn' },
    { label: 'Runway', keys: ['runway', 'cashRunway'], missing: 'Cash balance and burn rate' },
    { label: 'CAC', keys: ['cac', 'customerAcquisitionCost'], missing: 'Acquisition spend and new customers' },
    { label: 'LTV', keys: ['ltv', 'lifetimeValue'], missing: 'ARPU, margin, churn assumptions' },
    { label: 'Break-even', keys: ['breakEven', 'break_even', 'breakEvenPoint', 'breakEvenMonths'], missing: 'Fixed costs, price, variable cost' },
    { label: 'ROI', keys: ['roi', 'returnOnInvestment'], missing: 'Investment and return figures' },
  ];

  const present = cards
    .map(c => {
      const m = metricFrom(r, c.keys);
      if (!m) return null;
      return {
        label: c.label,
        value: m.value,
        raw: m.raw,
        provenance: inferProvenance(r, c.keys, m.value),
      };
    })
    .filter(Boolean) as Array<{ label: string; value: string; raw?: number; provenance: DataProvenance }>;

  const missing = cards
    .filter(c => !metricFrom(r, c.keys))
    .map(c => c.missing);

  const riskScore = num(r.financialRiskScore ?? r.riskScore ?? r.financeRisk);
  const chartItems = present
    .filter(p => p.raw != null && Number.isFinite(p.raw))
    .map(p => ({ label: p.label, value: p.raw as number }));

  const monthly = Array.isArray(r.monthlyProjections) ? r.monthlyProjections
    : Array.isArray(r.monthlyForecast) ? r.monthlyForecast
      : Array.isArray(r.projections) ? r.projections
        : null;
  const annual = Array.isArray(r.annualProjections) ? r.annualProjections
    : Array.isArray(r.yearlyProjections) ? r.yearlyProjections
      : null;
  const cashFlow = Array.isArray(r.cashFlow) ? r.cashFlow
    : Array.isArray(r.cashFlowAnalysis) ? r.cashFlowAnalysis
      : Array.isArray(r.cashflow) ? r.cashflow
        : null;

  const monthlyBars = (monthly || []).slice(0, 12).map((row, i) => {
    const o = row && typeof row === 'object' ? row as Record<string, unknown> : {};
    const label = str(o.month || o.period || o.label || `M${i + 1}`);
    const value = num(o.revenue ?? o.netCash ?? o.cashFlow ?? o.value ?? o.profit);
    if (value == null) return null;
    return { label, value };
  }).filter(Boolean) as Array<{ label: string; value: number }>;

  const costBars = (() => {
    const costs = r.costBreakdown || r.expenseBreakdown || r.costs;
    if (Array.isArray(costs)) {
      return costs.map((row, i) => {
        const o = row && typeof row === 'object' ? row as Record<string, unknown> : { name: String(row) };
        const value = num(o.amount ?? o.value ?? o.cost);
        const label = str(o.category || o.name || o.label || `Cost ${i + 1}`);
        return value != null ? { label, value } : null;
      }).filter(Boolean) as Array<{ label: string; value: number }>;
    }
    if (costs && typeof costs === 'object') {
      return Object.entries(costs as Record<string, unknown>)
        .map(([k, v]) => {
          const n = num(v);
          return n != null ? { label: k, value: n } : null;
        })
        .filter(Boolean) as Array<{ label: string; value: number }>;
    }
    return [];
  })();

  const assumptions = listItems(r.assumptions || r.financialAssumptions);
  const risks = listItems(r.financialRisks || r.risks);
  const revenueModel = r.revenueModel || r.revenueStreams || r.pricing || r.pricingStrategy;

  const byProv = {
    verified: present.filter(p => p.provenance === 'verified'),
    user: present.filter(p => p.provenance === 'user'),
    estimate: present.filter(p => p.provenance === 'estimate'),
    assumption: present.filter(p => p.provenance === 'assumption'),
  };

  return (
    <ExperienceShell
      tabs={[
        {
          id: 'dashboard',
          label: 'Dashboard',
          content: (
            <div className="space-y-4">
              <TextBlock title="Financial overview" body={r.executiveSummary || r.financialOverview} sources={sources} onCitationClick={onCitationClick} highlight kind="summary" />

              <div className="rounded-xl border border-slate-200 bg-white p-3 text-[11px] text-slate-600">
                <p className="m-0 font-bold uppercase tracking-wider text-slate-500">Data provenance legend</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(Object.keys(PROVENANCE_UI) as DataProvenance[]).filter(k => k !== 'unknown').map(k => (
                    <ProvenanceBadge key={k} kind={k} />
                  ))}
                </div>
                <p className="mt-2 m-0 text-amber-800 font-medium">
                  Estimates and assumptions are never shown as verified financial facts. Labels follow agent metadata when present; otherwise figures default to AI estimate.
                </p>
              </div>

              {present.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {present.map(p => (
                    <FinanceMetricCard key={p.label} label={p.label} value={p.value} provenance={p.provenance} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Additional financial information is required to calculate key metrics.
                </div>
              )}

              {missing.length > 0 && present.length < cards.length && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">Missing inputs for full analysis</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    {missing.slice(0, 10).map(m => <li key={m}>{m}</li>)}
                  </ul>
                </div>
              )}

              {chartItems.length >= 2 && (
                <ValidBarChart title="Financial metrics (provided values only)" items={chartItems} sourceNote="Values from agent output — check provenance badges" />
              )}
              {costBars.length >= 2 && (
                <ValidBarChart title="Cost breakdown" items={costBars} sourceNote="Only categories present in output" />
              )}
              {monthlyBars.length >= 2 && (
                <ValidBarChart title="Monthly projections" items={monthlyBars} sourceNote="AI projections or user scenarios — not verified actuals unless labeled" />
              )}
            </div>
          ),
        },
        {
          id: 'model',
          label: 'Model & cash flow',
          available:
            isNonEmpty(revenueModel)
            || isNonEmpty(r.unitEconomics)
            || isNonEmpty(r.breakEven)
            || Boolean(cashFlow?.length)
            || Boolean(annual?.length)
            || isNonEmpty(r.cashFlowAnalysis),
          content: (
            <div className="space-y-3">
              <TextBlock title="Revenue model" body={revenueModel} sources={sources} onCitationClick={onCitationClick} kind="analysis" />
              <TextBlock title="Unit economics" body={r.unitEconomics} sources={sources} onCitationClick={onCitationClick} kind="metric" />
              <TextBlock title="Break-even estimate" body={r.breakEven || r.break_even} sources={sources} onCitationClick={onCitationClick} kind="metric" />
              <TextBlock title="Cash-flow analysis" body={r.cashFlowAnalysis || cashFlow || r.cashFlow} sources={sources} onCitationClick={onCitationClick} kind="analysis" />
              <TextBlock title="Annual projections" body={annual || r.annualProjections} sources={sources} onCitationClick={onCitationClick} kind="metric" />
              {cashFlow && cashFlow.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Period</th>
                        <th className="px-3 py-2">Inflow</th>
                        <th className="px-3 py-2">Outflow</th>
                        <th className="px-3 py-2">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashFlow.slice(0, 24).map((row, i) => {
                        const o = row && typeof row === 'object' ? row as Record<string, unknown> : {};
                        return (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="px-3 py-2 font-medium">{str(o.period || o.month || o.label || i + 1)}</td>
                            <td className="px-3 py-2">{str(o.inflow ?? o.revenue ?? '—')}</td>
                            <td className="px-3 py-2">{str(o.outflow ?? o.expenses ?? '—')}</td>
                            <td className="px-3 py-2">{str(o.net ?? o.cashFlow ?? o.value ?? '—')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-amber-700 font-semibold">AI estimates / projections unless rows are labeled otherwise</p>
                </div>
              )}
            </div>
          ),
        },
        {
          id: 'provenance',
          label: 'Data labels',
          content: (
            <div className="space-y-4">
              {([
                ['Verified data', byProv.verified, 'verified'] as const,
                ['User-provided data', byProv.user, 'user'] as const,
                ['AI estimates', byProv.estimate, 'estimate'] as const,
                ['Assumptions', byProv.assumption, 'assumption'] as const,
              ]).map(([title, rows, kind]) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <h3 className="m-0 text-sm font-semibold text-slate-900">{title}</h3>
                    <ProvenanceBadge kind={kind} />
                  </div>
                  {rows.length === 0 ? (
                    <p className="mt-2 m-0 text-xs text-slate-500">No metrics classified in this bucket from the current output.</p>
                  ) : (
                    <ul className="mt-3 space-y-1.5">
                      {rows.map(row => (
                        <li key={row.label} className="flex justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                          <span className="font-medium text-slate-700">{row.label}</span>
                          <span className="font-semibold text-slate-900">{row.value}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
              {assumptions.length > 0 && (
                <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
                  <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-violet-700">Assumptions (explicit)</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-violet-950">
                    {assumptions.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
              <TextBlock title="Data limitations" body={r.dataLimitations} sources={sources} onCitationClick={onCitationClick} kind="risk" />
            </div>
          ),
        },
        {
          id: 'risk',
          label: 'Risk & profitability',
          available: riskScore != null || risks.length > 0 || isNonEmpty(r.recommendations) || isNonEmpty(r.profitability),
          content: (
            <div className="space-y-4">
              {riskScore != null && (
                <RiskGauge
                  score={riskScore}
                  label="Financial risk"
                  methodology={str(r.riskMethodology || r.riskScoreNote) || 'Score provided by the finance agent from available assumptions and evidence. Not a market-certified rating. Higher = more risk.'}
                  factors={Array.isArray(r.riskFactors) ? r.riskFactors.map(String) : risks.slice(0, 8)}
                />
              )}
              {risks.length > 0 && (
                <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-4">
                  <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-rose-700">Financial risks</p>
                  <ul className="mt-2 space-y-2">
                    {risks.map((risk, i) => (
                      <li key={i} className="flex gap-2 rounded-lg bg-white/80 px-3 py-2 text-sm text-rose-950">
                        <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" aria-hidden />
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <TextBlock title="Profitability indicators" body={r.profitability || r.profitabilityIndicators} sources={sources} onCitationClick={onCitationClick} kind="metric" />
              <TextBlock title="Recommendations" body={r.recommendations} sources={sources} onCitationClick={onCitationClick} kind="action" highlight />
            </div>
          ),
        },
        {
          id: 'full',
          label: 'Full analysis',
          available: Boolean(str(r.detailedReport)),
          content: <TextBlock title="Detailed financial report" body={r.detailedReport} sources={sources} onCitationClick={onCitationClick} />,
        },
      ]}
    />
  );
}
