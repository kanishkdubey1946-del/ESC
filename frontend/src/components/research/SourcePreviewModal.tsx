import { ExternalLink, X } from 'lucide-react';
import type { SourceRecord } from '../../types/sources';
import { formatRetrievedDate, formatSourceDate } from '../../utils/sourceDates';

export default function SourcePreviewModal({
  source,
  claim,
  onClose,
}: {
  source: SourceRecord | null;
  claim?: string;
  onClose: () => void;
}) {
  if (!source) return null;

  return (
    <div
      className="fixed inset-0 z-[120] grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div className="min-w-0 pr-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-600">
              Source preview · [{source.citationNumber}]
            </p>
            <h3 className="mt-1 text-base font-semibold text-slate-900">{source.title}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-[11px] font-semibold text-slate-500">Publisher</p>
              <p className="mt-1 text-slate-800">{source.publisher || source.domain || '—'}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-[11px] font-semibold text-slate-500">Website</p>
              <p className="mt-1 truncate text-slate-800">{source.domain || '—'}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-[11px] font-semibold text-slate-500">Published</p>
              <p className="mt-1 text-slate-800">{formatSourceDate(source.publicationDate)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-[11px] font-semibold text-slate-500">Retrieved</p>
              <p className="mt-1 text-slate-800">{formatRetrievedDate(source.retrievedAt)}</p>
            </div>
            {source.lastUpdatedDate && formatSourceDate(source.lastUpdatedDate) !== 'Date unavailable' && (
              <div className="rounded-lg bg-slate-50 p-3 sm:col-span-2">
                <p className="text-[11px] font-semibold text-slate-500">Last updated</p>
                <p className="mt-1 text-slate-800">{formatSourceDate(source.lastUpdatedDate)}</p>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-[11px] font-semibold text-slate-500">Reliability</p>
            <p className="mt-1 text-slate-800">
              {source.reliabilityLevel} · {source.verificationStatus} · {source.sourceType}
            </p>
          </div>

          {claim && (
            <div className="rounded-lg border border-primary-100 bg-primary-50 p-3">
              <p className="text-[11px] font-semibold text-primary-700">Supported claim</p>
              <p className="mt-1 text-slate-800">{claim}</p>
            </div>
          )}

          <div>
            <p className="text-[11px] font-semibold text-slate-500">Relevant evidence excerpt</p>
            <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">
              {(source.evidenceSnippets || []).length ? (
                source.evidenceSnippets.map((snippet, index) => (
                  <p key={index} className="rounded-lg bg-slate-50 p-3 text-[13px] leading-relaxed text-slate-700">
                    {snippet}
                  </p>
                ))
              ) : (
                <p className="text-sm text-slate-500">No excerpt available for this source.</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
          {source.url?.startsWith('http') && (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Open Original Source <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
