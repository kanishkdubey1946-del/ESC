/**
 * Student-agent-specific interactive experiences.
 * ExamInsight · StudyVault · SuccessArchitect · GuideMinds · SpecialistHub
 * Never invent exam certainty or fake progress data.
 */
import { useMemo, useState, type ReactNode } from 'react';
import type { SourceRecord } from '../../types/sources';
import CitedText from '../research/CitedText';
import {
  ExperienceShell,
  MetricCard,
  ProgressBar,
  TextBlock,
  TimelineList,
  ValidBarChart,
  asRecord,
  isNonEmpty,
  num,
  str,
} from './shared';
import { StudentDashboard } from './EvidenceDashboards';

type Props = {
  data: unknown;
  sources?: SourceRecord[];
  onCitationClick?: (n: number, s?: SourceRecord) => void;
  onCopyText?: (label: string, text: string) => void;
  agentId?: string;
};

function listOf(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function itemLabel(item: unknown): string {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object') {
    const o = item as Record<string, unknown>;
    return str(o.topic || o.name || o.title || o.label || o.concept || o.page || JSON.stringify(item));
  }
  return String(item ?? '');
}

function itemNum(item: unknown, ...keys: string[]): number | null {
  if (!item || typeof item !== 'object') return null;
  const o = item as Record<string, unknown>;
  for (const k of keys) {
    const n = num(o[k]);
    if (n != null) return n;
  }
  return null;
}

function ringColor(score: number) {
  if (score >= 70) return '#059669';
  if (score >= 40) return '#d97706';
  return '#dc2626';
}

function ReadinessRing({ score, label }: { score: number; label: string }) {
  const pct = Math.min(100, Math.max(0, score));
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const color = ringColor(pct);
  return (
    <div className="flex flex-col items-center rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
      <svg width="100" height="100" viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
        />
        <text x="50" y="54" textAnchor="middle" className="fill-slate-900" style={{ fontSize: 18, fontWeight: 800 }}>
          {Math.round(pct)}
        </text>
      </svg>
      <p className="mt-1 m-0 text-center text-[11px] font-bold uppercase tracking-wider text-violet-700">{label}</p>
      <p className="m-0 text-center text-[10px] text-amber-700">Model estimate from your materials — not a guaranteed exam outcome</p>
    </div>
  );
}

/** EXAMINSIGHT */
export function ExamInsightExperience({ data, sources, onCitationClick }: Props) {
  const r = asRecord(data);
  const readiness = num(r.examReadinessScore ?? r.readinessScore ?? r.confidenceScore);
  const topics = listOf(r.priorityTopics || r.importantTopics || r.topics || r.weakAreas);
  const syllabus = r.syllabusCoverage || r.syllabus || r.coverage;
  const difficulty = str(r.expectedDifficulty || r.difficulty);
  const prepStatus = str(r.preparationStatus || r.prepStatus);
  const weak = listOf(r.weakAreas || r.gaps);
  const revision = listOf(r.revisionPriorities || r.revisionPlan || r.priorityTopics);
  const actions = listOf(r.recommendedActions || r.studyActions || r.recommendations);

  const heatItems = topics.slice(0, 16).map((t, i) => {
    const label = itemLabel(t);
    const priority = itemNum(t, 'priority', 'weight', 'importance', 'score') ?? (topics.length - i);
    return { label: label.slice(0, 28), value: priority };
  });

  return (
    <ExperienceShell
      tabs={[
        {
          id: 'overview',
          label: 'Exam overview',
          content: (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
                {readiness != null ? (
                  <ReadinessRing score={readiness} label="Readiness" />
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                    Readiness score not provided by the agent
                  </div>
                )}
                <div className="space-y-3">
                  <TextBlock title="Exam overview" body={r.executiveSummary || r.examOverview || r.examName} sources={sources} onCitationClick={onCitationClick} kind="summary" highlight />
                  <div className="grid gap-2 sm:grid-cols-2">
                    {difficulty && <MetricCard label="Expected difficulty" value={difficulty} tone="warn" hint="Evidence-based estimate — not a certainty" />}
                    {prepStatus && <MetricCard label="Preparation status" value={prepStatus} tone="primary" />}
                  </div>
                </div>
              </div>
              <TextBlock title="Syllabus coverage" body={syllabus} sources={sources} onCitationClick={onCitationClick} kind="fact" />
            </div>
          ),
        },
        {
          id: 'topics',
          label: 'Topics & priority',
          available: topics.length > 0 || weak.length > 0 || heatItems.length > 0,
          content: (
            <div className="space-y-4">
              {heatItems.length > 0 && (
                <ValidBarChart
                  title="Topic priority (from agent — higher = more focus suggested)"
                  items={heatItems}
                  sourceNote="Priority is model guidance from your materials, not a claim that topics will appear"
                />
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {topics.slice(0, 12).map((t, i) => {
                  const label = itemLabel(t);
                  const p = itemNum(t, 'priority', 'score') ?? Math.max(1, 12 - i);
                  const heat = Math.min(100, p <= 10 ? p * 10 : p);
                  return (
                    <div key={i} className="rounded-xl border border-violet-100 bg-white p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <p className="m-0 text-sm font-semibold text-slate-900">{label}</p>
                        <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-800">P{Math.round(p)}</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-violet-100">
                        <div className="h-full rounded-full bg-violet-500" style={{ width: `${heat}%` }} />
                      </div>
                      <p className="mt-1.5 m-0 text-[10px] text-slate-500">
                        Suggested focus weight — may appear based on syllabus patterns; not guaranteed
                      </p>
                    </div>
                  );
                })}
              </div>
              {weak.length > 0 && (
                <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4">
                  <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-rose-700">Weak areas</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {weak.map((w, i) => (
                      <span key={i} className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-medium text-rose-900">
                        {itemLabel(w)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ),
        },
        {
          id: 'revision',
          label: 'Revision & actions',
          available: revision.length > 0 || actions.length > 0 || isNonEmpty(r.likelyQuestions),
          content: (
            <div className="space-y-3">
              <TextBlock title="Revision priorities" body={revision.length ? revision : r.revisionPriorities} sources={sources} onCitationClick={onCitationClick} kind="action" />
              <TextBlock title="Recommended study actions" body={actions.length ? actions : r.recommendedActions} sources={sources} onCitationClick={onCitationClick} kind="action" />
              <TextBlock title="Likely question patterns" body={r.likelyQuestions || r.expectedQuestions} sources={sources} onCitationClick={onCitationClick} kind="analysis" />
              <p className="text-[11px] text-amber-800 font-medium rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
                Language is probability-based. No topic is claimed to “definitely” appear in an exam.
              </p>
            </div>
          ),
        },
        {
          id: 'full',
          label: 'Full insight',
          available: Boolean(str(r.detailedReport)),
          content: <TextBlock title="Exam insight report" body={r.detailedReport} sources={sources} onCitationClick={onCitationClick} />,
        },
      ]}
    />
  );
}

/** STUDYVAULT */
export function StudyVaultExperience({ data, sources, onCitationClick }: Props) {
  const r = asRecord(data);
  const resources = listOf(r.resources || r.uploadedResources || r.materials || r.sourcesUsed);
  const chapters = listOf(r.chapters || r.sections);
  const bookmarks = listOf(r.bookmarks || r.importantPages || r.pages);
  const notes = r.notes || r.aiNotes || r.studyNotes;
  const concepts = listOf(r.keyConcepts || r.concepts);
  const relationships = r.resourceRelationships || r.relationships || r.links;

  return (
    <ExperienceShell
      tabs={[
        {
          id: 'resources',
          label: 'Resources',
          content: (
            <div className="space-y-4">
              <div className="rounded-xl border border-teal-100 bg-teal-50/50 px-3 py-2 text-[11px] font-medium text-teal-900">
                Uploaded / evidence sources stay separate from AI-generated notes below.
              </div>
              {resources.length > 0 ? (
                <ul className="space-y-2">
                  {resources.map((res, i) => {
                    const o = res && typeof res === 'object' ? res as Record<string, unknown> : null;
                    const title = o ? str(o.title || o.name || o.filename || `Resource ${i + 1}`) : itemLabel(res);
                    const cat = o ? str(o.category || o.aiCategory || o.type) : '';
                    const url = o ? str(o.url) : '';
                    return (
                      <li key={i} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase text-white">Source</span>
                          {cat && <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-800">AI category · {cat}</span>}
                        </div>
                        <p className="mt-1.5 m-0 text-sm font-semibold text-slate-900">{title}</p>
                        {url && <p className="mt-0.5 m-0 truncate text-xs text-primary-700">{url}</p>}
                        {o && str(o.description || o.summary) && (
                          <p className="mt-1 m-0 text-xs text-slate-600">{str(o.description || o.summary)}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <TextBlock title="Materials referenced" body={r.executiveSummary || 'No structured resource list in this output. Check Sources below.'} sources={sources} onCitationClick={onCitationClick} />
              )}
              {sources && sources.length > 0 && (
                <p className="text-xs text-slate-500">{sources.length} item(s) in the evidence pack (see Sources section).</p>
              )}
            </div>
          ),
        },
        {
          id: 'structure',
          label: 'Chapters & concepts',
          available: chapters.length > 0 || concepts.length > 0 || bookmarks.length > 0,
          content: (
            <div className="space-y-4">
              {chapters.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="m-0 text-sm font-semibold text-slate-900">Chapters / sections</p>
                  <ol className="mt-3 space-y-2 border-l-2 border-teal-200 pl-4">
                    {chapters.map((ch, i) => (
                      <li key={i} className="text-sm text-slate-700">{itemLabel(ch)}</li>
                    ))}
                  </ol>
                </div>
              )}
              {bookmarks.length > 0 && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
                  <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-amber-800">Bookmarks / important pages</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {bookmarks.map((b, i) => (
                      <span key={i} className="rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-xs font-medium text-amber-950">
                        {itemLabel(b)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {concepts.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="m-0 text-sm font-semibold text-slate-900">Key concepts</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {concepts.map((c, i) => (
                      <span key={i} className="rounded-full border border-primary-100 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-900">
                        {itemLabel(c)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <TextBlock title="Resource relationships" body={relationships} sources={sources} onCitationClick={onCitationClick} kind="analysis" />
            </div>
          ),
        },
        {
          id: 'notes',
          label: 'AI notes',
          content: (
            <div className="space-y-3">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-3 py-2 text-[11px] font-semibold text-indigo-900">
                AI-generated notes — distinct from uploaded source materials
              </div>
              <TextBlock title="Notes" body={notes || r.detailedReport || r.executiveSummary} sources={sources} onCitationClick={onCitationClick} kind="analysis" />
              <TextBlock title="Search / highlights" body={r.searchResults || r.highlights} sources={sources} onCitationClick={onCitationClick} />
            </div>
          ),
        },
      ]}
    />
  );
}

/** SUCCESSARCHITECT — interactive planner */
export function SuccessArchitectExperience({ data, sources, onCitationClick }: Props) {
  const r = asRecord(data);
  const daily = listOf(r.dailyPlan || r.todayPlan);
  const weekly = listOf(r.weeklyPlan || r.weekPlan);
  const monthly = listOf(r.monthlyPlan || r.monthPlan);
  const schedule = listOf(r.studySchedule || r.tasks || r.sessions);
  const goals = listOf(r.goals || r.objectives);
  const deadlines = listOf(r.deadlines || r.milestones);
  const revision = listOf(r.revisionSessions || r.revisionPlan);

  const allTasks = useMemo(() => {
    const rows: Array<{ id: string; label: string; group: string }> = [];
    daily.forEach((t, i) => rows.push({ id: `d-${i}`, label: itemLabel(t), group: 'Daily' }));
    weekly.forEach((t, i) => rows.push({ id: `w-${i}`, label: itemLabel(t), group: 'Weekly' }));
    schedule.forEach((t, i) => rows.push({ id: `s-${i}`, label: itemLabel(t), group: 'Sessions' }));
    revision.forEach((t, i) => rows.push({ id: `r-${i}`, label: itemLabel(t), group: 'Revision' }));
    if (!rows.length && Array.isArray(r.milestones)) {
      listOf(r.milestones).forEach((t, i) => rows.push({ id: `m-${i}`, label: itemLabel(t), group: 'Milestones' }));
    }
    return rows;
  }, [daily, weekly, schedule, revision, r.milestones]);

  const [done, setDone] = useState<Record<string, boolean>>({});
  const completed = Object.values(done).filter(Boolean).length;
  const streak = num(r.streak || r.studyStreak);

  return (
    <ExperienceShell
      tabs={[
        {
          id: 'planner',
          label: 'Study planner',
          content: (
            <div className="space-y-4">
              <TextBlock title="Plan overview" body={r.executiveSummary || r.studyPlan} sources={sources} onCitationClick={onCitationClick} kind="summary" highlight />
              <div className="grid gap-3 sm:grid-cols-3">
                <MetricCard
                  label="Session progress"
                  value={`${completed}/${allTasks.length || '—'}`}
                  hint={allTasks.length ? <ProgressBar value={(completed / allTasks.length) * 100} /> : 'No structured tasks'}
                  tone="primary"
                />
                {streak != null && <MetricCard label="Streak (from plan)" value={`${Math.round(streak)} days`} tone="success" hint="Only if agent provided streak data" />}
                {goals.length > 0 && <MetricCard label="Goals tracked" value={String(goals.length)} />}
              </div>

              {allTasks.length > 0 ? (
                <ul className="space-y-2">
                  {allTasks.map((task) => (
                    <li key={task.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(done[task.id])}
                        onChange={() => setDone(d => ({ ...d, [task.id]: !d[task.id] }))}
                        className="mt-1"
                        aria-label={`Complete ${task.label}`}
                      />
                      <div className={`flex-1 ${done[task.id] ? 'opacity-50 line-through' : ''}`}>
                        <span className="mr-2 rounded bg-primary-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary-700">{task.group}</span>
                        <span className="text-sm text-slate-800">{task.label}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <TimelineList items={listOf(r.milestones)} sources={sources} onCitationClick={onCitationClick} />
              )}
              <p className="text-[11px] text-slate-500">Completion is session-local. Export PDF from the header for a durable plan.</p>
            </div>
          ),
        },
        {
          id: 'calendar',
          label: 'Daily / weekly / monthly',
          available: daily.length > 0 || weekly.length > 0 || monthly.length > 0,
          content: (
            <div className="grid gap-3 lg:grid-cols-3">
              {[
                { title: 'Daily plan', items: daily, tone: 'border-sky-200' },
                { title: 'Weekly plan', items: weekly, tone: 'border-violet-200' },
                { title: 'Monthly plan', items: monthly, tone: 'border-emerald-200' },
              ].map(col => (
                <div key={col.title} className={`rounded-2xl border ${col.tone} bg-white p-4 shadow-sm`}>
                  <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-slate-500">{col.title}</p>
                  {col.items.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-400">Not provided</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {col.items.map((item, i) => (
                        <li key={i} className="rounded-lg bg-slate-50 px-2.5 py-2 text-xs text-slate-700">{itemLabel(item)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          ),
        },
        {
          id: 'goals',
          label: 'Goals & deadlines',
          available: goals.length > 0 || deadlines.length > 0,
          content: (
            <div className="space-y-3">
              <TextBlock title="Goals" body={goals.length ? goals : r.goals} sources={sources} onCitationClick={onCitationClick} kind="action" />
              <TextBlock title="Deadlines" body={deadlines.length ? deadlines : r.deadlines} sources={sources} onCitationClick={onCitationClick} kind="risk" />
              <TextBlock title="Study sessions" body={schedule.length ? schedule : r.studySessions} sources={sources} onCitationClick={onCitationClick} />
              <TextBlock title="Revision sessions" body={revision.length ? revision : r.revisionSessions} sources={sources} onCitationClick={onCitationClick} kind="action" />
            </div>
          ),
        },
        {
          id: 'full',
          label: 'Full plan',
          available: Boolean(str(r.detailedReport)),
          content: <TextBlock title="Detailed study plan" body={r.detailedReport} sources={sources} onCitationClick={onCitationClick} />,
        },
      ]}
    />
  );
}

/** GUIDEMINDS */
export function GuideMindsExperience({ data, sources, onCitationClick }: Props) {
  const r = asRecord(data);
  const blocks = [
    { key: 'recommendedAction', title: 'Recommended Action', body: r.recommendedAction || r.primaryAction || r.action, kind: 'action' as const },
    { key: 'whyThisHelps', title: 'Why This Helps', body: r.whyThisHelps || r.rationale || r.whyItWorks, kind: 'analysis' as const },
    { key: 'howToStart', title: 'How to Start', body: r.howToStart || r.getStarted || r.firstSteps, kind: 'action' as const },
    { key: 'nextStep', title: 'Next Step', body: r.nextStep || r.nextSteps || r.immediateNext, kind: 'action' as const },
  ].filter(b => isNonEmpty(b.body));

  return (
    <ExperienceShell
      tabs={[
        {
          id: 'guidance',
          label: 'Direct guidance',
          content: (
            <div className="space-y-4">
              <TextBlock title="Direct guidance" body={r.executiveSummary || r.guidance || r.advice} sources={sources} onCitationClick={onCitationClick} kind="summary" highlight />
              {blocks.length > 0 ? (
                <div className="space-y-3">
                  {blocks.map(b => (
                    <TextBlock key={b.key} title={b.title} body={b.body} sources={sources} onCitationClick={onCitationClick} kind={b.kind} />
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextBlock title="Recommended Action" body={r.recommendations || r.detailedReport} sources={sources} onCitationClick={onCitationClick} kind="action" />
                  <TextBlock title="Why This Helps" body={r.strategy || r.learningStrategy} sources={sources} onCitationClick={onCitationClick} kind="analysis" />
                </div>
              )}
            </div>
          ),
        },
        {
          id: 'strategy',
          label: 'Learning strategy',
          available: isNonEmpty(r.learningStrategy || r.studyStrategy || r.strategy || r.productivityTips),
          content: (
            <div className="space-y-3">
              <TextBlock title="Recommended learning strategy" body={r.learningStrategy || r.studyStrategy || r.strategy} sources={sources} onCitationClick={onCitationClick} kind="analysis" />
              <TextBlock title="Personalized study advice" body={r.personalizedAdvice || r.studyAdvice} sources={sources} onCitationClick={onCitationClick} kind="action" />
              <TextBlock title="Productivity suggestions" body={r.productivityTips || r.productivity} sources={sources} onCitationClick={onCitationClick} kind="metric" />
            </div>
          ),
        },
        {
          id: 'career',
          label: 'Career & plan',
          available: isNonEmpty(r.careerGuidance || r.career || r.actionPlan),
          content: (
            <div className="space-y-3">
              <TextBlock title="Action plan" body={r.actionPlan || r.plan} sources={sources} onCitationClick={onCitationClick} kind="action" />
              <TextBlock title="Career guidance" body={r.careerGuidance || r.career} sources={sources} onCitationClick={onCitationClick} kind="finding" />
            </div>
          ),
        },
        {
          id: 'full',
          label: 'Full mentor note',
          available: Boolean(str(r.detailedReport)),
          content: <TextBlock title="Mentor notes" body={r.detailedReport} sources={sources} onCitationClick={onCitationClick} />,
        },
      ]}
    />
  );
}

/** Lightweight math-friendly text: preserves ^, _, fractions, and monospaced formulas. */
function MathBlock({ text, className = '' }: { text: string; className?: string }) {
  if (!text.trim()) return null;
  // Split display math blocks ``` or $$ ... $$
  const parts = text.split(/(\$\$[\s\S]+?\$\$|```[\s\S]+?```)/g);
  return (
    <div className={`space-y-2 ${className}`}>
      {parts.map((part, i) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          return (
            <pre key={i} className="overflow-x-auto rounded-lg border border-indigo-100 bg-indigo-50/80 px-3 py-2.5 font-mono text-sm leading-relaxed text-indigo-950 whitespace-pre-wrap">
              {part.slice(2, -2).trim()}
            </pre>
          );
        }
        if (part.startsWith('```') && part.endsWith('```')) {
          const inner = part.slice(3, -3).replace(/^\w*\n/, '');
          return (
            <pre key={i} className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-900 px-3 py-2.5 font-mono text-sm text-sky-100 whitespace-pre-wrap">
              {inner.trim()}
            </pre>
          );
        }
        // Inline-ish formula lines: mostly symbols / equals
        if (/[=∑∫√±≤≥∞πθαβ]|\\frac|\\times|\^|_/.test(part) && part.length < 400 && !part.includes('\n\n')) {
          return (
            <p key={i} className="m-0 font-mono text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
              {part}
            </p>
          );
        }
        return (
          <div key={i} className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
            {part}
          </div>
        );
      })}
    </div>
  );
}

function SpecialistSection({
  step,
  title,
  tone,
  children,
}: {
  step?: string;
  title: string;
  tone: 'dark' | 'sky' | 'violet' | 'indigo' | 'white' | 'emerald' | 'amber' | 'rose' | 'teal';
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    dark: 'border-slate-800 bg-slate-900 text-white',
    sky: 'border-sky-200 bg-sky-50/70 text-sky-950',
    violet: 'border-violet-200 bg-violet-50/60 text-violet-950',
    indigo: 'border-indigo-200 bg-indigo-50/50 text-indigo-950',
    white: 'border-slate-200 bg-white text-slate-900',
    emerald: 'border-emerald-300 bg-emerald-50 text-emerald-950',
    amber: 'border-amber-200 bg-amber-50/60 text-amber-950',
    rose: 'border-rose-200 bg-rose-50/50 text-rose-950',
    teal: 'border-teal-200 bg-teal-50/50 text-teal-950',
  };
  const labelTone: Record<string, string> = {
    dark: 'text-sky-300',
    sky: 'text-sky-800',
    violet: 'text-violet-800',
    indigo: 'text-indigo-800',
    white: 'text-primary-700',
    emerald: 'text-emerald-800',
    amber: 'text-amber-800',
    rose: 'text-rose-800',
    teal: 'text-teal-800',
  };
  return (
    <section className={`rounded-2xl border px-4 py-4 shadow-sm ${tones[tone]}`}>
      <p className={`m-0 text-[10px] font-extrabold uppercase tracking-[0.14em] ${labelTone[tone]}`}>
        {step ? `${step} ` : ''}{title}
      </p>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

function bodyNode(
  body: unknown,
  sources?: SourceRecord[],
  onCitationClick?: Props['onCitationClick'],
  math = false,
) {
  if (!isNonEmpty(body)) return <span className="text-sm opacity-60">Not provided in this output</span>;
  if (Array.isArray(body)) {
    return (
      <ul className="m-0 list-disc space-y-1.5 pl-4 text-sm">
        {body.map((g, i) => (
          <li key={i}>{math ? <MathBlock text={itemLabel(g)} /> : itemLabel(g)}</li>
        ))}
      </ul>
    );
  }
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  if (math) return <MathBlock text={text} />;
  return <CitedText text={text} sources={sources} onCitationClick={onCitationClick} className="text-sm leading-relaxed whitespace-pre-wrap" />;
}

/** SPECIALISTHUB — full academic problem structure (never blend formula + answer). */
export function SpecialistHubExperience({ data, sources, onCitationClick }: Props) {
  const r = asRecord(data);
  const problem = r.problem || r.question || r.prompt;
  const given = r.givenInformation || r.given || r.knowns || r.inputs || r.constraints;
  const required = r.requiredResult || r.find || r.toFind || r.required || r.objective;
  const concept = r.relevantConcept || r.concept || r.concepts || r.theory;
  const formula = r.formula || r.formulas || r.equation || r.equations;
  const steps = listOf(r.steps || r.stepByStep || r.stepByStepSolutions || r.solutionSteps);
  const solution = r.finalAnswer || r.solution || r.answer;
  const alt = r.alternativeMethod || r.alternateMethod || r.anotherMethod || r.alternative;
  const mistakes = r.commonMistakes || r.mistakes || r.pitfalls || r.errorsToAvoid;
  const practice = r.practiceQuestion || r.practice || r.similarQuestion || r.tryThis;
  const approach = r.approach || r.method || r.strategy;

  const hasAcademic =
    isNonEmpty(problem)
    || isNonEmpty(given)
    || steps.length > 0
    || isNonEmpty(solution)
    || isNonEmpty(formula)
    || isNonEmpty(required);

  if (!hasAcademic && !str(r.detailedReport) && !str(r.executiveSummary)) {
    return (
      <div className="space-y-3">
        <StudentDashboard data={data} agentId="specialisthub" sources={sources} onCitationClick={onCitationClick} />
        <TextBlock title="Specialist notes" body={r.detailedReport || r.executiveSummary || 'No structured problem solution in this output.'} sources={sources} onCitationClick={onCitationClick} />
      </div>
    );
  }

  return (
    <ExperienceShell
      tabs={[
        {
          id: 'solve',
          label: 'Problem solver',
          content: (
            <div className="space-y-3">
              <SpecialistSection title="Problem" tone="dark">
                {isNonEmpty(problem)
                  ? bodyNode(problem, sources, onCitationClick)
                  : <span className="text-slate-400 text-sm">No problem statement in output</span>}
              </SpecialistSection>

              <SpecialistSection step="→" title="Given Information" tone="sky">
                {bodyNode(given, sources, onCitationClick)}
              </SpecialistSection>

              {isNonEmpty(required) && (
                <SpecialistSection step="→" title="Required Result" tone="violet">
                  {bodyNode(required, sources, onCitationClick)}
                </SpecialistSection>
              )}

              {isNonEmpty(concept) && (
                <SpecialistSection step="→" title="Relevant Concept" tone="teal">
                  {bodyNode(concept, sources, onCitationClick)}
                </SpecialistSection>
              )}

              {isNonEmpty(formula) && (
                <SpecialistSection step="→" title="Formula" tone="indigo">
                  {bodyNode(formula, sources, onCitationClick, true)}
                </SpecialistSection>
              )}

              {isNonEmpty(approach) && (
                <SpecialistSection title="Solution approach" tone="white">
                  {bodyNode(approach, sources, onCitationClick)}
                </SpecialistSection>
              )}

              {steps.length > 0 && (
                <SpecialistSection step="→" title="Step-by-Step Solution" tone="white">
                  <ol className="m-0 space-y-3 p-0 list-none">
                    {steps.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm text-slate-800">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">{i + 1}</span>
                        <div className="min-w-0 flex-1 pt-0.5">
                          {typeof step === 'string'
                            ? <MathBlock text={step} />
                            : bodyNode(step, sources, onCitationClick, true)}
                        </div>
                      </li>
                    ))}
                  </ol>
                </SpecialistSection>
              )}

              {isNonEmpty(solution) && (
                <SpecialistSection step="→" title="Final Answer" tone="emerald">
                  <div className="text-base font-bold">
                    {bodyNode(solution, sources, onCitationClick, true)}
                  </div>
                </SpecialistSection>
              )}

              {isNonEmpty(alt) && (
                <SpecialistSection step="→" title="Alternative Method" tone="amber">
                  {bodyNode(alt, sources, onCitationClick, true)}
                </SpecialistSection>
              )}

              {isNonEmpty(mistakes) && (
                <SpecialistSection step="→" title="Common Mistakes" tone="rose">
                  {bodyNode(mistakes, sources, onCitationClick)}
                </SpecialistSection>
              )}

              {isNonEmpty(practice) && (
                <SpecialistSection step="→" title="Practice Question" tone="violet">
                  {bodyNode(practice, sources, onCitationClick)}
                </SpecialistSection>
              )}
            </div>
          ),
        },
        {
          id: 'notes',
          label: 'Full notes',
          available: Boolean(str(r.detailedReport) || str(r.executiveSummary)),
          content: (
            <div className="space-y-3">
              <TextBlock title="Overview" body={r.executiveSummary} sources={sources} onCitationClick={onCitationClick} highlight />
              <TextBlock title="Detailed specialist notes" body={r.detailedReport} sources={sources} onCitationClick={onCitationClick} />
            </div>
          ),
        },
      ]}
    />
  );
}


