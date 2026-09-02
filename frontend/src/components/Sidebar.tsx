import { BrainCircuit, ExternalLink, FileText, Globe, Layers3, Loader2, Sparkles } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import SourceSelectionModal from './SourceSelectionModal';
import { loadWorkspace, type WorkspaceDocument } from '../lib/workspaceMemory';
import type { ResearchEvent, SourceRecord } from '../types/sources';
import { runResearch } from '../utils/research';
import { formatSourceDate } from '../utils/sourceDates';

type ModalView = 'menu' | 'upload' | 'website' | 'drive' | 'text' | 'youtube' | 'image' | null;

type SearchStatus = 'idle' | 'searching' | 'evaluating' | 'done' | 'error';

function faviconFor(domain: string) {
  if (!domain || domain === 'upload') return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
}

function categoryLabel(source: SourceRecord) {
  const t = (source.sourceType || '').toLowerCase();
  if (t.includes('gov')) return 'Government • Primary Source';
  if (t.includes('academic')) return 'Academic • Research';
  if (t.includes('news')) return 'Journalism';
  if (t.includes('reference')) return 'Reference';
  if (t.includes('upload')) return 'User upload';
  return source.reliabilityLevel ? `${source.sourceType || 'Web'} • ${source.reliabilityLevel}` : 'Web source';
}

export default function Sidebar() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalView, setModalView] = useState<ModalView>(null);
  const [sources, setSources] = useState<WorkspaceDocument[]>([]);
  const [webQuery, setWebQuery] = useState('');
  const [webSources, setWebSources] = useState<SourceRecord[]>([]);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [searchError, setSearchError] = useState('');
  const [stats, setStats] = useState({ sourcesFound: 0, sourcesUsed: 0, crossCheckedClaims: 0 });

  const loadSources = useCallback(() => {
    setSources(loadWorkspace().documents);
  }, []);

  useEffect(() => {
    loadSources();
    window.addEventListener('storage', loadSources);
    const handleOpenModal = (event: Event) => {
      const detail = (event as CustomEvent<{ view?: ModalView }>).detail;
      setModalView(detail?.view || 'menu');
      setIsModalOpen(true);
    };
    const handleWebSources = (event: Event) => {
      const detail = (event as CustomEvent<{
        sources?: SourceRecord[];
        query?: string;
        stats?: { sourcesFound?: number; sourcesUsed?: number; crossCheckedClaims?: number };
        status?: string;
      }>).detail;
      if (detail?.query) setWebQuery(detail.query);
      if (detail?.sources) {
        setWebSources(detail.sources.filter(s => s.url?.startsWith('http')));
      }
      if (detail?.stats) {
        setStats({
          sourcesFound: detail.stats.sourcesFound ?? 0,
          sourcesUsed: detail.stats.sourcesUsed ?? detail.sources?.length ?? 0,
          crossCheckedClaims: detail.stats.crossCheckedClaims ?? 0,
        });
      }
      if (detail?.status === 'searching') {
        setSearchStatus('searching');
        setStatusMessage('Searching trusted sources…');
      } else if (detail?.sources) {
        setSearchStatus('done');
        setStatusMessage('');
      }
    };
    window.addEventListener('open-source-modal', handleOpenModal);
    window.addEventListener('comet-web-sources', handleWebSources);
    return () => {
      window.removeEventListener('storage', loadSources);
      window.removeEventListener('open-source-modal', handleOpenModal);
      window.removeEventListener('comet-web-sources', handleWebSources);
    };
  }, [loadSources]);

  const runWebSearch = async (queryOverride?: string) => {
    const q = (queryOverride ?? webQuery).trim();
    if (!q || searchStatus === 'searching' || searchStatus === 'evaluating') return;
    setSearchError('');
    setSearchStatus('searching');
    setStatusMessage('Searching trusted sources…');
    setWebSources([]);

    try {
      const result = await runResearch({
        prompt: q,
        agentId: 'research',
        forceResearch: true,
        onEvent: (event: ResearchEvent) => {
          if (event.stage === 'search' && event.status === 'active') {
            setStatusMessage('Discovering relevant evidence…');
          } else if (event.stage === 'evaluate') {
            setSearchStatus('evaluating');
            setStatusMessage('Evaluating source quality…');
          } else if (event.stage === 'verify' && event.status === 'active') {
            setStatusMessage('Cross-checking information…');
          } else if (event.message) {
            setStatusMessage(event.message);
          }
        },
      });

      const accepted = (result.sources || []).filter(s => s.url?.startsWith('http'));
      setWebSources(accepted);
      const st = (result as { stats?: { sourcesFound?: number; sourcesUsed?: number; crossCheckedClaims?: number } }).stats;
      setStats({
        sourcesFound: st?.sourcesFound ?? accepted.length,
        sourcesUsed: st?.sourcesUsed ?? accepted.length,
        crossCheckedClaims: st?.crossCheckedClaims ?? accepted.reduce((n, s) => n + (s.evidenceSnippets?.length || 0), 0),
      });
      setSearchStatus('done');
      setStatusMessage(accepted.length ? 'Sources found' : '');
      if (!accepted.length) {
        setSearchError(result.researchError || 'No reliable sources were found for this query.');
      }
      // Notify orchestrator so shared evidence can reuse these sources
      window.dispatchEvent(new CustomEvent('comet-sidebar-research', {
        detail: { query: q, result },
      }));
    } catch (err) {
      setSearchStatus('error');
      setSearchError(err instanceof Error ? err.message : 'Search failed.');
    }
  };

  return (
    <>
      <aside className="hidden h-full w-[300px] shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:flex">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-[15px] font-semibold text-slate-900">Sources</h2>
          <button className="text-slate-400 hover:text-slate-700" aria-label="Collapse"><Layers3 className="h-4 w-4" /></button>
        </div>

        <div className="shrink-0 border-b border-slate-100 p-4">
          <button
            type="button"
            onClick={() => { setModalView('menu'); setIsModalOpen(true); }}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-300 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <span className="text-lg font-normal leading-none">+</span> Add sources
          </button>

          <div className="mt-5">
            <label className="text-[13px] font-medium text-slate-600" htmlFor="comet-web-search">
              Search the web for new sources
            </label>
            <form
              className="mt-2 flex h-10 items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 transition focus-within:border-primary-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary-100"
              onSubmit={e => { e.preventDefault(); void runWebSearch(); }}
            >
              <div className="flex shrink-0 items-center gap-1 rounded-full bg-slate-200/50 px-2.5 py-1 text-xs font-medium text-slate-700">
                <Sparkles className="h-3 w-3 text-primary-600" /> Web
              </div>
              <input
                id="comet-web-search"
                value={webQuery}
                onChange={e => setWebQuery(e.target.value)}
                className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-slate-400"
                placeholder="Search…"
                disabled={searchStatus === 'searching' || searchStatus === 'evaluating'}
              />
              <button
                type="submit"
                disabled={!webQuery.trim() || searchStatus === 'searching' || searchStatus === 'evaluating'}
                className="grid h-7 w-7 place-items-center rounded-full text-primary-600 hover:bg-primary-50 disabled:text-slate-300"
                aria-label="Search the web"
              >
                {searchStatus === 'searching' || searchStatus === 'evaluating'
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <BrainCircuit className="h-4 w-4" />}
              </button>
            </form>

            {(searchStatus === 'searching' || searchStatus === 'evaluating') && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-primary-700">
                <Loader2 className="h-3 w-3 animate-spin" />
                {statusMessage || 'Searching trusted sources…'}
              </p>
            )}

            {searchStatus === 'done' && (stats.sourcesFound > 0 || webSources.length > 0) && (
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-medium text-slate-500">
                <span>Sources found: {stats.sourcesFound || webSources.length}</span>
                <span>Sources used: {stats.sourcesUsed || webSources.length}</span>
                <span>Cross-checked claims: {stats.crossCheckedClaims}</span>
              </div>
            )}

            {searchError && searchStatus !== 'searching' && (
              <div className="mt-2 rounded-lg border border-rose-100 bg-rose-50 px-2.5 py-2 text-[11px] text-rose-800">
                <p>{searchError || 'No reliable sources were found for this query.'}</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void runWebSearch()} className="font-semibold text-rose-700 underline">Retry Search</button>
                  <button type="button" onClick={() => document.getElementById('comet-web-search')?.focus()} className="font-semibold text-rose-700 underline">Refine Query</button>
                  <button type="button" onClick={() => { setModalView('menu'); setIsModalOpen(true); }} className="font-semibold text-rose-700 underline">Add Source Manually</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {/* Web discovery results */}
          {webSources.length > 0 && (
            <div className="mb-5 space-y-2">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Web sources ({webSources.length})
              </p>
              {webSources.map(source => {
                const icon = faviconFor(source.domain);
                return (
                  <a
                    key={source.sourceId || source.url}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block rounded-xl border border-slate-200 bg-slate-50/80 p-3 transition hover:border-primary-300 hover:bg-primary-50"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-slate-100">
                        {icon ? <img src={icon} alt="" className="h-4 w-4" /> : <Globe className="h-3.5 w-3.5 text-slate-400" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold text-slate-800">{source.publisher || source.domain}</p>
                        <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-slate-700">{source.title}</p>
                        <p className="mt-1 truncate text-[10px] text-slate-500">{source.domain}</p>
                        <p className="mt-0.5 text-[10px] font-medium text-slate-500">{categoryLabel(source)}</p>
                        {source.publicationDate && (
                          <p className="mt-0.5 text-[10px] text-slate-400">Published: {formatSourceDate(source.publicationDate)}</p>
                        )}
                        <p className="mt-1 text-[10px] leading-relaxed text-slate-500 line-clamp-2">
                          {source.purpose || 'Relevant evidence for your query'}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] font-semibold text-primary-600 opacity-0 transition group-hover:opacity-100">
                        Open <ExternalLink className="inline h-3 w-3" />
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          )}

          {/* Uploaded / saved sources */}
          {sources.length === 0 && webSources.length === 0 ? (
            <div className="flex h-full min-h-[140px] flex-col items-center justify-center text-center">
              <div className="mb-3 rounded-xl bg-slate-100 p-4 text-slate-400">
                <Layers3 className="h-8 w-8" />
              </div>
              <p className="text-[13px] font-medium text-slate-700">Saved sources will appear here</p>
              <p className="mt-2 px-2 text-xs leading-relaxed text-slate-500">
                Search the web above, or click Add source to add PDFs, websites, text, or videos.
              </p>
            </div>
          ) : sources.length > 0 ? (
            <div className="space-y-2">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Your Sources ({sources.length})
              </p>
              {sources.map(doc => (
                <div key={doc.id} className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-primary-300 hover:bg-primary-50">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded border border-slate-100 bg-white text-primary-600 shadow-sm">
                    {doc.type === 'website' || doc.type === 'youtube' ? <Globe className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-slate-800">{doc.name}</p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">{new Date(doc.addedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </aside>

      <SourceSelectionModal
        isOpen={isModalOpen}
        initialView={modalView}
        onClose={() => { setIsModalOpen(false); setModalView(null); }}
        onSuccess={() => {
          setIsModalOpen(false);
          setModalView(null);
          loadSources();
        }}
      />
    </>
  );
}
