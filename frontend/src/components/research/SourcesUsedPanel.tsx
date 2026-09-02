import { ExternalLink, FileText, ShieldCheck } from 'lucide-react';
import type { SourceRecord } from '../../types/sources';
import { formatRetrievedDate, formatSourceDate } from '../../utils/sourceDates';

const reliabilityColor: Record<string, string> = {
  High: 'bg-emerald-50 text-emerald-700',
  Moderate: 'bg-sky-50 text-sky-700',
  Limited: 'bg-amber-50 text-amber-700',
};

function domainFromUrl(url?: string) {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export default function SourcesUsedPanel({
  sources,
  activeCitation,
  onSelect,
  retrievedAt,
  generatedWithoutLiveResearch,
  researchFailed,
  researchError,
}: {
  sources: SourceRecord[];
  activeCitation?: number | null;
  onSelect?: (source: SourceRecord) => void;
  retrievedAt?: string;
  generatedWithoutLiveResearch?: boolean;
  researchFailed?: boolean;
  researchError?: string;
}) {
  if (!sources.length && !researchFailed && !generatedWithoutLiveResearch) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-600">Sources & Evidence</p>
        <p className="mt-2 text-sm text-slate-600">
          Live evidence was unavailable for this section. The following content is an AI-generated analysis based on the available context and should be independently verified.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-600">Sources & Evidence</p>
          <h3 className="mt-1 text-base font-semibold text-slate-900">Evidence trail</h3>
        </div>
        <ShieldCheck className="h-5 w-5 text-primary-500" />
      </div>

      {(generatedWithoutLiveResearch || researchFailed) && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Live evidence was unavailable for this section. The following content is an AI-generated analysis based on the available context and should be independently verified.
          {researchError ? ` ${researchError}` : ''}
        </div>
      )}

      {researchFailed && !sources.length && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          Live research could not be completed. Add sources or retry research.
        </div>
      )}

      {retrievedAt && (
        <p className="mt-2 text-[11px] text-slate-500">
          Session retrieved: {formatRetrievedDate(retrievedAt)}
        </p>
      )}

      <ol className="mt-4 space-y-3">
        {sources.map(source => {
          const active = activeCitation === source.citationNumber;
          const published = formatSourceDate(source.publicationDate);
          const updated = source.lastUpdatedDate ? formatSourceDate(source.lastUpdatedDate) : null;
          const retrieved = formatRetrievedDate(source.retrievedAt);
          const domain = source.domain || domainFromUrl(source.url);
          const publisher = source.publisher || domain || 'Unknown';
          const relevance = Number.isFinite(source.relevanceScore)
            ? Math.round(source.relevanceScore)
            : null;
          const claimSupport = source.purpose
            || (source.evidenceSnippets?.length ? source.evidenceSnippets[0] : '')
            || 'Supports claims cited in the report';
          const canOpen = Boolean(source.url?.startsWith('http'));

          return (
            <li
              key={source.sourceId || `${source.citationNumber}-${source.title}`}
              id={`source-cite-${source.citationNumber}`}
              className={`rounded-xl border px-4 py-3 transition ${
                active ? 'border-primary-300 bg-primary-50 ring-2 ring-primary-100' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    <span className="mr-2 inline-flex h-5 min-w-5 items-center justify-center rounded bg-slate-900 px-1.5 text-[11px] text-white">
                      {source.citationNumber}
                    </span>
                    {source.title || 'Untitled source'}
                  </p>

                  <dl className="mt-2 grid gap-1 text-[12px] text-slate-600 sm:grid-cols-2">
                    <div>
                      <dt className="inline font-medium text-slate-500">Publisher: </dt>
                      <dd className="inline">{publisher}</dd>
                    </div>
                    <div>
                      <dt className="inline font-medium text-slate-500">Domain: </dt>
                      <dd className="inline">
                        {domain ? (
                          canOpen ? (
                            <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-700 hover:underline">
                              {domain}
                            </a>
                          ) : domain
                        ) : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline font-medium text-slate-500">Published: </dt>
                      <dd className="inline">{published}</dd>
                    </div>
                    {updated && updated !== 'Date unavailable' && (
                      <div>
                        <dt className="inline font-medium text-slate-500">Last updated: </dt>
                        <dd className="inline">{updated}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="inline font-medium text-slate-500">Retrieved: </dt>
                      <dd className="inline">{retrieved}</dd>
                    </div>
                    <div>
                      <dt className="inline font-medium text-slate-500">Type: </dt>
                      <dd className="inline">{source.sourceType || '—'}</dd>
                    </div>
                    {relevance != null && (
                      <div>
                        <dt className="inline font-medium text-slate-500">Relevance: </dt>
                        <dd className="inline font-semibold text-slate-800">{relevance}/100</dd>
                      </div>
                    )}
                  </dl>

                  <p className="mt-2 text-[12px] leading-relaxed text-slate-700">
                    <span className="font-semibold text-slate-600">Supports claim: </span>
                    {claimSupport}
                  </p>

                  {source.evidenceSnippets?.length > 1 && (
                    <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[11px] text-slate-500">
                      {source.evidenceSnippets.slice(0, 3).map((snip, i) => (
                        <li key={i}>{snip}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      reliabilityColor[source.reliabilityLevel] || 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {source.reliabilityLevel || 'Unknown'}
                  </span>
                  {canOpen ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-primary-700"
                    >
                      Open Source <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-500">
                      <FileText className="h-3 w-3" /> Uploaded file
                    </span>
                  )}
                  {onSelect && (
                    <button
                      type="button"
                      onClick={() => onSelect(source)}
                      className="text-[11px] font-semibold text-slate-600 hover:text-slate-900"
                    >
                      Preview
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
