import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check, ChevronDown, ChevronUp, ExternalLink, Globe, Loader2, Search, AlertCircle,
} from 'lucide-react';
import type { ResearchEvent, SourceRecord } from '../../types/sources';

function faviconUrl(domain: string) {
  if (!domain || domain === 'upload') return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
}

export function ResearchActivityTimeline({
  events,
  running,
  collapsedDefault = false,
}: {
  events: ResearchEvent[];
  running?: boolean;
  collapsedDefault?: boolean;
}) {
  const [open, setOpen] = useState(!collapsedDefault || running);
  if (!events.length && !running) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
          ) : (
            <Search className="h-4 w-4 text-primary-600" />
          )}
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {running ? 'Research Agent is working…' : 'Research process'}
            </p>
            <p className="text-[11px] text-slate-500">
              {events.filter(e => e.status === 'completed').length}/{Math.max(events.length, 1)} steps · real backend events only
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-100"
          >
            <ol className="space-y-1 px-4 py-3">
              {events.map(event => {
                const done = event.status === 'completed';
                const active = event.status === 'active';
                const failed = event.status === 'failed';
                return (
                  <li key={event.id} className="flex gap-3 rounded-lg px-1 py-2">
                    <span
                      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                        done
                          ? 'bg-emerald-50 text-emerald-600'
                          : failed
                            ? 'bg-rose-50 text-rose-600'
                            : active
                              ? 'bg-primary-50 text-primary-600'
                              : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {done ? (
                        <Check className="h-3 w-3" />
                      ) : failed ? (
                        <AlertCircle className="h-3 w-3" />
                      ) : active ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800">{event.message}</p>
                      {typeof event.detail?.url === 'string' && event.detail.url && (
                        <p className="mt-0.5 truncate text-[11px] text-slate-500">{event.detail.url as string}</p>
                      )}
                    </div>
                  </li>
                );
              })}
              {!events.length && running && (
                <li className="flex items-center gap-2 py-2 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin text-primary-600" /> Starting research…
                </li>
              )}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function LiveSourceActivity({
  events,
  sources,
}: {
  events: ResearchEvent[];
  sources: SourceRecord[];
}) {
  const reviewEvents = events.filter(e => e.stage === 'source_review' && e.detail);
  if (!reviewEvents.length && !sources.length) return null;

  // Prefer live review events while running; otherwise show selected sources
  const items =
    reviewEvents.length > 0
      ? reviewEvents.map(e => ({
          key: e.id,
          title: String(e.detail?.title || e.message),
          domain: String(e.detail?.domain || ''),
          status: String(e.detail?.status || e.status),
          purpose: String(e.detail?.sourceType || 'web'),
          url: String(e.detail?.url || ''),
          reliability: String(e.detail?.reliabilityLevel || ''),
        }))
      : sources
          .filter(s => s.sourceType !== 'uploaded')
          .map(s => ({
            key: s.sourceId,
            title: s.title,
            domain: s.domain,
            status: 'completed',
            purpose: s.purpose,
            url: s.url,
            reliability: s.reliabilityLevel,
          }));

  if (!items.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Sources being reviewed</p>
      <ul className="mt-3 space-y-2">
        {items.map(item => {
          const icon = faviconUrl(item.domain);
          return (
            <li
              key={item.key}
              className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
            >
              <span className="mt-0.5 grid h-7 w-7 place-items-center overflow-hidden rounded-md bg-slate-100">
                {icon ? (
                  <img src={icon} alt="" className="h-4 w-4" />
                ) : (
                  <Globe className="h-3.5 w-3.5 text-slate-400" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      item.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : item.status === 'snippet_only'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-primary-50 text-primary-700'
                    }`}
                  >
                    {item.status === 'completed'
                      ? 'Completed'
                      : item.status === 'snippet_only'
                        ? 'Snippet'
                        : 'Reviewing'}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {item.domain || 'Source'}
                  {item.reliability ? ` · ${item.reliability} reliability` : ''}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{item.purpose}</p>
              </div>
              {item.url?.startsWith('http') && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 text-slate-400 hover:text-primary-600"
                  title="Open source"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
