/**
 * Premium dashboard cards for agent reports.
 * Only renders when the model/evidence pack provided real structured fields.
 * Never invents TAM/SAM/SOM, competitors, or scores.
 */
import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import type { SourceRecord } from '../../types/sources';
import CitedText from '../research/CitedText';

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

export function ResearchDashboard({
  data,
  sources,
  onCitationClick,
}: {
  data: unknown;
  sources?: SourceRecord[];
  onCitationClick?: (n: number, source?: SourceRecord) => void;
}) {
  const r = asRecord(data);
  const [showScore, setShowScore] = useState(false);
  const score = num(r.opportunityScore ?? r.cometAnalyticalScore);
  const competition = str(r.competitionLevel);
  const confidence = str(r.researchConfidence || r.evidenceStatus);
  const scoreFactors = Array.isArray(r.opportunityScoreFactors) ? r.opportunityScoreFactors : null;
  const scoreNote = str(r.opportunityScoreNote || r.opportunityScoreLabel);
  const isPreliminary = /preliminary|estimate|insufficient|limited/i.test(scoreNote + confidence);

  const tam = str(r.tam);
  const sam = str(r.sam);
  const som = str(r.som);
  const hasMarketSize = Boolean(tam || sam || som);

  const competitors = Array.isArray(r.competitors)
    ? r.competitors
    : Array.isArray(r.competitorTable)
      ? r.competitorTable
      : null;

  const cite = (text: string) => (
    <CitedText text={text} sources={sources} onCitationClick={onCitationClick} className="text-sm leading-relaxed text-slate-700" />
  );

  return (
    <div className="space-y-4">
      {/* KPI row — metric hierarchy */}
      <div className="comet-metric-grid">
        {competition && (
          <div className="comet-metric border-slate-200">
            <p className="comet-metric__label">Competition level</p>
            <p className={`comet-metric__value ${
              /very high|high/i.test(competition) ? 'text-rose-600'
                : /moderate|medium/i.test(competition) ? 'text-amber-600'
                  : 'text-emerald-600'
            }`}>{competition}</p>
            {str(r.competitionRationale) && (
              <p className="comet-metric__hint">{cite(str(r.competitionRationale))}</p>
            )}
          </div>
        )}

        {score != null && (
          <div className="comet-metric border-primary-200 bg-primary-50/40 sm:col-span-1">
            <p className="comet-metric__label">COMET Opportunity Assessment</p>
            <p className="comet-metric__value">{Math.round(score)} <span className="text-base font-semibold text-slate-500">/ 100</span></p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-primary-500" style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
            </div>
            {isPreliminary && (
              <p className="mt-2 text-[11px] font-semibold text-amber-700">Preliminary estimate — model analysis, not a verified external statistic</p>
            )}
            {scoreNote && <p className="comet-metric__hint">{cite(scoreNote)}</p>}
            {scoreFactors && scoreFactors.length > 0 && (
              <button type="button" onClick={() => setShowScore(v => !v)} className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700">
                <Info className="h-3 w-3" /> How was this calculated? {showScore ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            )}
            {showScore && scoreFactors && (
              <ul className="comet-list mt-2">
                {scoreFactors.map((f, i) => {
                  const row = f && typeof f === 'object' ? f as Record<string, unknown> : { factor: String(f) };
                  return (
                    <li key={i}>
                      <strong>{str(row.factor || row.name)}</strong>
                      {row.weight != null && <span> · weight {str(row.weight)}</span>}
                      {row.score != null && <span> · score {str(row.score)}</span>}
                      {Boolean(row.evidence) && <p className="mt-0.5 text-slate-500">{cite(str(row.evidence))}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {confidence && (
          <div className="comet-metric border-slate-200">
            <p className="comet-metric__label">Research confidence</p>
            <p className="comet-metric__value text-xl">{confidence}</p>
            {str(r.researchConfidenceNote) && (
              <p className="comet-metric__hint">{cite(str(r.researchConfidenceNote))}</p>
            )}
            {sources && (
              <p className="comet-metric__hint">{sources.length} source(s) in evidence pack</p>
            )}
          </div>
        )}
      </div>

      {/* Market size — only if provided */}
      {hasMarketSize ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Market-size analysis</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { key: 'TAM', value: tam, color: 'bg-sky-500' },
              { key: 'SAM', value: sam, color: 'bg-primary-500' },
              { key: 'SOM', value: som, color: 'bg-emerald-500' },
            ].filter(x => x.value).map(item => (
              <div key={item.key} className="rounded-xl bg-slate-50 p-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                  <p className="text-[11px] font-semibold uppercase text-slate-500">{item.key}</p>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{cite(item.value)}</p>
              </div>
            ))}
          </div>
          {str(r.marketSizeNote) && <p className="mt-3 text-xs text-slate-600">{cite(str(r.marketSizeNote))}</p>}
          {str(r.marketSizeSource) && <p className="mt-1 text-[11px] text-slate-500">Source: {cite(str(r.marketSizeSource))}</p>}
        </div>
      ) : (
        str(r.marketOrDomainAnalysis) && (
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3 text-xs text-amber-900">
            Insufficient verified information is available to calculate reliable TAM, SAM, and SOM estimates unless provided in the evidence pack.
          </div>
        )
      )}

      {/* Competitors table */}
      {competitors && competitors.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Competitor analysis</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Competitor</th>
                  <th className="px-3 py-2 font-semibold">Location</th>
                  <th className="px-3 py-2 font-semibold">Strength</th>
                  <th className="px-3 py-2 font-semibold">Weakness</th>
                  <th className="px-3 py-2 font-semibold">Position</th>
                  <th className="px-3 py-2 font-semibold">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {competitors.map((c, i) => {
                  const row = c && typeof c === 'object' ? c as Record<string, unknown> : { name: String(c) };
                  return (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-800">{str(row.name || row.competitor)}</td>
                      <td className="px-3 py-2 text-slate-600">{str(row.location)}</td>
                      <td className="px-3 py-2 text-slate-600">{cite(str(row.strength || row.strengths))}</td>
                      <td className="px-3 py-2 text-slate-600">{cite(str(row.weakness || row.weaknesses))}</td>
                      <td className="px-3 py-2 text-slate-600">{str(row.position || row.positioning)}</td>
                      <td className="px-3 py-2 text-slate-600">{cite(str(row.evidence || row.source || ''))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

type ContentCardModel = {
  id: string;
  platform: string;
  contentType: string;
  hook: string;
  caption: string;
  cta: string;
  hashtags: string[];
  keywords: string[];
  tone: string;
  audience: string;
  insight: string;
  score: number | null;
  title: string;
  visualIdea: string;
};

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).map(t => t.trim()).filter(Boolean);
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(/[\s,]+/).map(t => t.trim()).filter(Boolean);
  }
  return [];
}

function normalizeHashtag(t: string) {
  const clean = t.replace(/^#+/, '').trim();
  return clean ? `#${clean}` : '';
}

function buildContentCards(data: unknown): ContentCardModel[] {
  const r = asRecord(data);
  const cards: ContentCardModel[] = [];
  const channels = Array.isArray(r.channels) ? (r.channels as Array<Record<string, unknown>>) : [];

  channels.forEach((ch, ci) => {
    const platform = str(ch.channel || ch.platform || 'Channel') || 'Channel';
    const entries = Array.isArray(ch.entries) ? (ch.entries as Array<Record<string, unknown>>) : [];
    entries.forEach((entry, ei) => {
      const caption = str(entry.body || entry.caption || entry.mainCaption);
      const hook = str(entry.hook || entry.trendingHook || entry.openingHook);
      const tags = parseTags(entry.hashtags).map(normalizeHashtag).filter(Boolean);
      const keywords = parseTags(entry.keywords || entry.seoKeywords || entry.keyPhrases);
      const scoreRaw = num(entry.contentScore ?? entry.score ?? entry.qualityScore);
      cards.push({
        id: `ch-${ci}-e-${ei}`,
        platform,
        contentType: str(entry.contentType || entry.type || entry.format || ch.contentType || 'Post'),
        hook,
        caption,
        cta: str(entry.cta || entry.callToAction),
        hashtags: tags,
        keywords,
        tone: str(entry.tone || ch.tone),
        audience: str(entry.audience || entry.targetAudience || ch.audience),
        insight: str(entry.insight || entry.contentInsight || entry.whyItWorks || entry.rationale),
        score: scoreRaw != null && scoreRaw >= 0 && scoreRaw <= 100 ? scoreRaw : null,
        title: str(entry.title),
        visualIdea: str(entry.visualIdea || entry.visual),
      });
    });
  });

  // Flat-array fallback: pair hooks/captions/ctas into separate cards
  if (!cards.length) {
    const hooks = Array.isArray(r.hooks) ? r.hooks.map(String) : [];
    const captions = Array.isArray(r.captions) ? r.captions.map(String) : [];
    const ctas = Array.isArray(r.callsToAction) ? r.callsToAction.map(String) : [];
    const tags = parseTags(r.hashtags).map(normalizeHashtag).filter(Boolean);
    const keywords = parseTags(r.keywords);
    const n = Math.max(hooks.length, captions.length, ctas.length, hooks.length || captions.length ? 1 : 0);
    for (let i = 0; i < n; i += 1) {
      const caption = captions[i] || captions[0] || '';
      const hook = hooks[i] || hooks[0] || '';
      const cta = ctas[i] || ctas[0] || '';
      if (!caption && !hook && !cta) continue;
      cards.push({
        id: `flat-${i}`,
        platform: str(r.platform || r.channel || 'Content'),
        contentType: str(r.contentType || 'Post'),
        hook,
        caption,
        cta,
        hashtags: tags,
        keywords,
        tone: str(r.tone),
        audience: str(r.targetAudience || r.audience),
        insight: str(r.contentInsight || r.insight),
        score: num(r.contentScore),
        title: str(r.title),
        visualIdea: '',
      });
    }
  }

  return cards;
}

function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ContentCard({
  card,
  onCopy,
  onRegenerate,
}: {
  card: ContentCardModel;
  onCopy: (label: string, text: string) => void;
  onRegenerate?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ hook: card.hook, caption: card.caption, cta: card.cta });
  const [feedback, setFeedback] = useState('');
  const [savedNote, setSavedNote] = useState('');

  // Keep draft in sync when agent output changes
  useEffect(() => {
    setDraft({ hook: card.hook, caption: card.caption, cta: card.cta });
    setEditing(false);
  }, [card.id, card.hook, card.caption, card.cta]);

  const hook = editing ? draft.hook : card.hook;
  const caption = editing ? draft.caption : card.caption;
  const cta = editing ? draft.cta : card.cta;
  const tagText = card.hashtags.join(' ');
  const fullPost = [hook, caption, tagText, cta].filter(Boolean).join('\n\n');
  const charCount = caption.length + (hook ? hook.length + 2 : 0) + (cta ? cta.length + 2 : 0) + (tagText ? tagText.length + 2 : 0);

  const flash = (msg: string) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback((cur) => (cur === msg ? '' : cur)), 2200);
  };

  const doCopy = (label: string, text: string, successMsg: string) => {
    if (!text.trim()) return;
    onCopy(label, text);
    flash(successMsg);
  };

  const handleSave = () => {
    const payload = {
      ...card,
      hook,
      caption,
      cta,
      savedAt: new Date().toISOString(),
    };
    try {
      const key = 'comet.content.saved.v1';
      const prev = JSON.parse(localStorage.getItem(key) || '[]') as unknown[];
      const list = Array.isArray(prev) ? prev : [];
      list.unshift(payload);
      localStorage.setItem(key, JSON.stringify(list.slice(0, 40)));
      setSavedNote('Saved to this browser');
      window.setTimeout(() => setSavedNote(''), 2500);
    } catch {
      setSavedNote('Could not save locally');
      window.setTimeout(() => setSavedNote(''), 2500);
    }
    downloadTextFile(
      `COMET_${card.platform.replace(/\s+/g, '_')}_post.txt`,
      [
        `Platform: ${card.platform}`,
        `Type: ${card.contentType}`,
        card.tone ? `Tone: ${card.tone}` : '',
        card.audience ? `Audience: ${card.audience}` : '',
        '',
        hook ? `HOOK\n${hook}` : '',
        caption ? `CAPTION\n${caption}` : '',
        cta ? `CTA\n${cta}` : '',
        tagText ? `HASHTAGS\n${tagText}` : '',
        card.keywords.length ? `KEYWORDS\n${card.keywords.join(', ')}` : '',
      ].filter(Boolean).join('\n\n'),
    );
  };

  const handleDownload = () => {
    downloadTextFile(
      `COMET_${card.platform.replace(/\s+/g, '_')}_${card.id}.txt`,
      fullPost || caption || hook || 'No content',
    );
    flash('Post downloaded');
  };

  return (
    <article className="content-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Meta header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/90 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary-600 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-white">
            {card.platform}
          </span>
          {card.contentType && (
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
              {card.contentType}
            </span>
          )}
          {card.tone && (
            <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
              Tone · {card.tone}
            </span>
          )}
          {card.audience && (
            <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-800">
              Audience · {card.audience}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] tabular-nums text-slate-500">
          <span>{charCount} characters</span>
          {card.score != null && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-800">
              Score {Math.round(card.score)}/100
            </span>
          )}
        </div>
      </div>

      {card.title && (
        <div className="border-b border-slate-100 px-4 py-2.5">
          <p className="m-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">Title</p>
          <h4 className="m-0 mt-0.5 text-sm font-bold text-slate-900">{card.title}</h4>
        </div>
      )}

      {/* HOOK — highlighted small card */}
      {(hook || editing) && (
        <div className="content-card__hook mx-4 mt-4 flex gap-3 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/80 p-3 shadow-sm">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/90 text-base" aria-hidden>
            ⚡
          </span>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.14em] text-amber-800">Trending Hook</p>
            {editing ? (
              <textarea
                value={draft.hook}
                onChange={(e) => setDraft(d => ({ ...d, hook: e.target.value }))}
                rows={2}
                className="mt-1.5 w-full rounded-lg border border-amber-200 bg-white px-2.5 py-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-amber-300"
              />
            ) : (
              <p className="mt-1.5 m-0 text-sm font-semibold leading-relaxed text-amber-950">{hook}</p>
            )}
          </div>
        </div>
      )}

      {/* CAPTION — large readable area */}
      {(caption || editing) && (
        <div className="content-card__caption mx-4 mt-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-4">
          <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.14em] text-sky-700">Main Caption</p>
          {editing ? (
            <textarea
              value={draft.caption}
              onChange={(e) => setDraft(d => ({ ...d, caption: e.target.value }))}
              rows={6}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[15px] leading-7 text-slate-900 outline-none focus:ring-2 focus:ring-primary-300"
            />
          ) : (
            <p className="mt-2 m-0 whitespace-pre-wrap text-[15px] leading-7 text-slate-800">{caption}</p>
          )}
        </div>
      )}

      {/* CTA — blue callout */}
      {(cta || editing) && (
        <div className="content-card__cta mx-4 mt-3 rounded-xl border border-sky-300 bg-gradient-to-r from-sky-600 to-primary-600 px-4 py-3 text-white shadow-sm">
          <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.14em] text-sky-100">Call to Action</p>
          {editing ? (
            <textarea
              value={draft.cta}
              onChange={(e) => setDraft(d => ({ ...d, cta: e.target.value }))}
              rows={2}
              className="mt-1.5 w-full rounded-lg border-0 bg-white/95 px-2.5 py-2 text-sm font-semibold text-slate-900 outline-none"
            />
          ) : (
            <p className="mt-1.5 m-0 text-sm font-bold leading-relaxed">{cta}</p>
          )}
        </div>
      )}

      {/* HASHTAGS — chips */}
      {card.hashtags.length > 0 && (
        <div className="mx-4 mt-3">
          <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.14em] text-primary-700">Hashtags</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {card.hashtags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => doCopy('Hashtags', tag, 'Hashtag copied')}
                className="content-chip content-chip--tag rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-800 hover:bg-primary-100"
                title="Copy hashtag"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* KEYWORDS — separate tags */}
      {card.keywords.length > 0 && (
        <div className="mx-4 mt-3">
          <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Keywords</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {card.keywords.map((kw) => (
              <span
                key={kw}
                className="content-chip content-chip--keyword rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CONTENT INSIGHT */}
      {card.insight && (
        <div className="mx-4 mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
          <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.14em] text-indigo-700">Content Insight</p>
          <p className="mt-1.5 m-0 text-xs leading-relaxed text-indigo-950">{card.insight}</p>
          <p className="mt-1 m-0 text-[10px] text-indigo-600/80">Why this may work — model analysis, not a performance guarantee.</p>
        </div>
      )}

      {card.visualIdea && (
        <div className="mx-4 mt-3 rounded-lg border border-slate-100 bg-white px-3 py-2">
          <p className="m-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">Visual concept</p>
          <p className="mt-0.5 m-0 text-xs text-slate-600">{card.visualIdea}</p>
        </div>
      )}

      {/* Actions — only real actions */}
      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3">
        {fullPost && (
          <button type="button" onClick={() => doCopy('Full Post', fullPost, 'Full post copied')} className="rounded-lg bg-primary-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-primary-700">
            Copy Full Post
          </button>
        )}
        {caption && (
          <button type="button" onClick={() => doCopy('Caption', caption, 'Caption copied')} className="rounded-lg border border-primary-100 bg-primary-50 px-2.5 py-1.5 text-[11px] font-semibold text-primary-700">
            Copy Caption
          </button>
        )}
        {hook && (
          <button type="button" onClick={() => doCopy('Hook', hook, 'Hook copied')} className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-900">
            Copy Hook
          </button>
        )}
        {cta && (
          <button type="button" onClick={() => doCopy('CTA', cta, 'CTA copied')} className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[11px] font-semibold text-sky-800">
            Copy CTA
          </button>
        )}
        {tagText && (
          <button type="button" onClick={() => doCopy('Hashtags', tagText, 'Hashtags copied')} className="rounded-lg border border-primary-100 bg-primary-50 px-2.5 py-1.5 text-[11px] font-semibold text-primary-700">
            Copy Hashtags
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (editing) setEditing(false);
            else setEditing(true);
          }}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
        >
          {editing ? 'Done editing' : 'Edit'}
        </button>
        {onRegenerate && (
          <button type="button" onClick={onRegenerate} className="rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-[11px] font-semibold text-violet-800 hover:bg-violet-100">
            Regenerate
          </button>
        )}
        <button type="button" onClick={handleSave} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800">
          Save
        </button>
        <button type="button" onClick={handleDownload} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700">
          Download
        </button>
      </div>

      {(feedback || savedNote) && (
        <div className="border-t border-emerald-100 bg-emerald-50 px-4 py-2 text-center text-xs font-semibold text-emerald-800" role="status" aria-live="polite">
          {feedback || savedNote}
        </div>
      )}
    </article>
  );
}

export function ContentPlatformTabs({
  data,
  onCopy,
  onRegenerate,
}: {
  data: unknown;
  onCopy: (label: string, text: string) => void;
  onRegenerate?: () => void;
}) {
  const cards = buildContentCards(data);
  const platforms = Array.from(new Set(cards.map(c => c.platform)));
  const [active, setActive] = useState(platforms[0] || 'Content');
  const visible = cards.filter(c => c.platform === active || platforms.length <= 1);
  const platformKey = platforms.join('|');

  useEffect(() => {
    const list = platformKey ? platformKey.split('|') : [];
    if (list.length && !list.includes(active)) setActive(list[0]);
  }, [platformKey, active]);

  if (!cards.length) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        No structured content posts were found. Use the Ideas & CTA tab or regenerate with a platform-specific brief.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {platforms.length > 1 && (
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
          {platforms.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setActive(p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                active === p ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {(platforms.length > 1 ? visible : cards).map((card) => (
        <ContentCard key={card.id} card={card} onCopy={onCopy} onRegenerate={onRegenerate} />
      ))}
    </div>
  );
}

/** Development plan cards — only fields present in model output. */
export function DevelopmentDashboard({
  data,
  sources,
  onCitationClick,
}: {
  data: unknown;
  sources?: SourceRecord[];
  onCitationClick?: (n: number, source?: SourceRecord) => void;
}) {
  const r = asRecord(data);
  const stack = r.recommendedStack;
  const mvp = Array.isArray(r.mvpFeatures) ? r.mvpFeatures : null;
  const phases = Array.isArray(r.developmentPhases) ? r.developmentPhases : null;
  const arch = str(r.technicalArchitecture || r.productRequirements);
  const html = str(r.landingPageHtml || r.html || r.generatedHtml);
  const hasHtml = html.length > 40 && /<html|<body|<div|<section/i.test(html);

  if (!stack && !mvp && !phases && !arch && !hasHtml) return null;

  const cite = (text: string) => (
    <CitedText text={text} sources={sources} onCitationClick={onCitationClick} className="text-sm leading-relaxed text-slate-700" />
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {arch && (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-sm sm:col-span-2 lg:col-span-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Architecture</p>
            <div className="mt-2">{cite(arch.slice(0, 600) + (arch.length > 600 ? '…' : ''))}</div>
          </div>
        )}
        {stack != null && !isEmpty(stack) && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Recommended stack</p>
            <div className="mt-2 text-sm text-slate-700">
              {Array.isArray(stack)
                ? (
                  <ul className="space-y-1">
                    {stack.map((item, i) => <li key={i} className="rounded-lg bg-slate-50 px-2 py-1.5">{typeof item === 'string' ? item : JSON.stringify(item)}</li>)}
                  </ul>
                )
                : typeof stack === 'object'
                  ? Object.entries(stack as Record<string, unknown>).map(([k, v]) => (
                      <p key={k} className="mb-1"><strong className="text-slate-800">{k}:</strong> {str(v)}</p>
                    ))
                  : cite(str(stack))}
            </div>
          </div>
        )}
        {hasHtml && (
          <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-700">Generated HTML</p>
            <p className="mt-2 text-sm text-slate-700">A real HTML landing page was generated and is available via Download HTML.</p>
            <p className="mt-1 text-[11px] text-slate-500">This is a page artifact — not a full production application.</p>
          </div>
        )}
      </div>

      {mvp && mvp.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">MVP features</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {mvp.map((item, i) => (
              <li key={i} className="rounded-xl bg-emerald-50/60 px-3 py-2 text-sm text-slate-700">
                {typeof item === 'string' ? cite(item) : cite(JSON.stringify(item))}
              </li>
            ))}
          </ul>
        </div>
      )}

      {phases && phases.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Development timeline</p>
          <ol className="mt-3 space-y-3 border-l-2 border-emerald-200 pl-4">
            {phases.map((item, i) => (
              <li key={i} className="relative text-sm text-slate-700">
                <span className="absolute -left-[1.35rem] top-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                {typeof item === 'string' ? cite(item) : cite(JSON.stringify(item))}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function isEmpty(v: unknown) {
  if (v == null) return true;
  if (typeof v === 'string') return !v.trim();
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v as object).length === 0;
  return false;
}

/** Student agent cards — only when structured educational fields exist. */
export function StudentDashboard({
  data,
  agentId,
  sources,
  onCitationClick,
}: {
  data: unknown;
  agentId: string;
  sources?: SourceRecord[];
  onCitationClick?: (n: number, source?: SourceRecord) => void;
}) {
  const r = asRecord(data);
  const readiness = num(r.examReadinessScore ?? r.readinessScore ?? r.confidenceScore);
  const topics = Array.isArray(r.priorityTopics || r.weakAreas || r.keyConcepts) ? (r.priorityTopics || r.weakAreas || r.keyConcepts) as unknown[] : null;
  const schedule = Array.isArray(r.studySchedule || r.milestones) ? (r.studySchedule || r.milestones) as unknown[] : null;
  const summary = str(r.executiveSummary);

  if (readiness == null && !topics && !schedule && !summary) return null;

  const cite = (text: string) => (
    <CitedText text={text} sources={sources} onCitationClick={onCitationClick} className="text-sm leading-relaxed text-slate-700" />
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {readiness != null && (
          <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-700">
              {agentId === 'examinsight' ? 'Exam readiness' : 'Readiness'}
            </p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{Math.round(readiness)} <span className="text-base font-semibold text-slate-500">/ 100</span></p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(100, Math.max(0, readiness))}%` }} />
            </div>
            <p className="mt-2 text-[11px] font-semibold text-amber-700">
              {str(r.readinessNote) || 'Score only shown when the model provided a justified estimate from your materials.'}
            </p>
          </div>
        )}
        {summary && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Overview</p>
            <div className="mt-2">{cite(summary)}</div>
          </div>
        )}
      </div>

      {topics && topics.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Priority topics</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {topics.slice(0, 16).map((t, i) => (
              <span key={i} className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-800">
                {typeof t === 'string' ? t : str((t as Record<string, unknown>).topic || (t as Record<string, unknown>).name || JSON.stringify(t))}
              </span>
            ))}
          </div>
        </div>
      )}

      {schedule && schedule.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Study roadmap</p>
          <ol className="mt-3 space-y-2 border-l-2 border-violet-200 pl-4">
            {schedule.map((item, i) => (
              <li key={i} className="text-sm text-slate-700">
                {typeof item === 'string' ? cite(item) : cite(JSON.stringify(item))}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export function StrategyCanvas({ data, sources, onCitationClick }: { data: unknown; sources?: SourceRecord[]; onCitationClick?: (n: number, s?: SourceRecord) => void }) {
  const r = asRecord(data);
  const cells = [
    { key: 'keyPartnerships', label: 'Key partnerships' },
    { key: 'keyActivities', label: 'Key activities' },
    { key: 'keyResources', label: 'Key resources' },
    { key: 'valueProposition', label: 'Value proposition' },
    { key: 'customerSegments', label: 'Customer segments', alt: 'targetAudience' },
    { key: 'customerNeeds', label: 'Customer needs' },
    { key: 'channels', label: 'Channels', alt: 'distributionChannels' },
    { key: 'revenueStreams', label: 'Revenue streams', alt: 'revenueOptions' },
    { key: 'costStructure', label: 'Cost structure' },
    { key: 'pricingStrategy', label: 'Pricing strategy' },
    { key: 'growthStrategy', label: 'Growth channels' },
    { key: 'goToMarketStrategy', label: 'Go-to-market' },
  ];
  const present = cells.filter(c => {
    const v = r[c.key] ?? (c.alt ? r[c.alt] : undefined);
    return v != null && v !== '' && !(Array.isArray(v) && !v.length);
  });
  if (!present.length) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {present.map(c => {
        const v = r[c.key] ?? (c.alt ? r[c.alt] : undefined);
        const text = Array.isArray(v) ? v.map(String).join('\n• ') : String(v);
        return (
          <div key={c.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-600">{c.label}</p>
            <div className="mt-2 text-sm leading-relaxed text-slate-700">
              <CitedText text={Array.isArray(v) ? `• ${text}` : text} sources={sources} onCitationClick={onCitationClick} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
