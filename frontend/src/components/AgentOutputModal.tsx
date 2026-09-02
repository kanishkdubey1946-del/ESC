import { useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties } from 'react';
import { ChevronDown, Copy, Download, Loader2, MessageSquare, RefreshCw, X } from 'lucide-react';
import type { AgentResult } from '../types/agents';
import type { SourceRecord } from '../types/sources';
import { formatRetrievedDate } from '../utils/sourceDates';
import { agentOutputToText, copyTextToClipboard } from '../utils/agentOutput';
import { exportAgentOutput, getExportOptions, type ExportFormat } from '../utils/smartExport';
import SourcePreviewModal from './research/SourcePreviewModal';
import AgentOutputRenderer, { normalizeAgentData } from './report/AgentOutputRenderer';
import { statusLabel } from './report/OutputTypeResolver';

export type AgentOutputModalProps = {
  open: boolean;
  agentId: string | null;
  agentName: string;
  agentIcon: ComponentType<{ className?: string }>;
  result?: AgentResult<unknown>;
  sources: SourceRecord[];
  regenerating?: boolean;
  loading?: boolean;
  regenError?: string | null;
  userPrompt?: string;
  mode?: 'business' | 'student' | 'playground';
  onClose: () => void;
  onRegenerate: () => void;
  onComment?: () => void;
};

function hasUsableResult(result?: AgentResult<unknown>): boolean {
  if (!result) return false;
  if (result.success === false && result.data == null) return false;
  if (result.data != null) {
    const n = normalizeAgentData(result.data);
    return n != null;
  }
  return result.success === true;
}

export default function AgentOutputModal({
  open,
  agentId,
  agentName,
  agentIcon: Icon,
  result,
  sources,
  regenerating = false,
  loading = false,
  regenError,
  userPrompt,
  mode,
  onClose,
  onRegenerate,
  onComment,
}: AgentOutputModalProps) {
  // Hooks always run in the same order (never after conditional return)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [copyFeedback, setCopyFeedback] = useState('');
  const [downloadState, setDownloadState] = useState<'idle' | 'preparing' | 'done' | 'error'>('idle');
  const [downloadMenu, setDownloadMenu] = useState(false);
  const [previewSource, setPreviewSource] = useState<SourceRecord | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const downloadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (regenerating) setConfirmClose(true);
        else onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, regenerating, onClose]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open, agentId]);

  useEffect(() => {
    if (open && bodyRef.current) bodyRef.current.scrollTop = 0;
    setDownloadMenu(false);
  }, [open, agentId]);

  useEffect(() => {
    if (!downloadMenu) return;
    const onDoc = (e: MouseEvent) => {
      if (downloadRef.current && !downloadRef.current.contains(e.target as Node)) setDownloadMenu(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [downloadMenu]);

  const normalizedData = useMemo(
    () => (result?.data != null ? normalizeAgentData(result.data) : null),
    [result?.data],
  );

  const usable = hasUsableResult(result);
  const isLoading = Boolean(loading || regenerating);
  const exportOptions = useMemo(
    () => getExportOptions(agentId || '', normalizedData ?? undefined),
    [agentId, normalizedData],
  );

  const title = useMemo(() => {
    if (normalizedData && typeof normalizedData === 'object') {
      const d = normalizedData as Record<string, unknown>;
      for (const k of ['researchObjective', 'strategicObjective', 'executiveSummary', 'detailedReport', 'problem']) {
        if (d[k] != null && String(d[k]).trim()) return String(d[k]).slice(0, 110);
      }
    }
    return `${agentName} Report`;
  }, [normalizedData, agentName]);

  const verifiedSources = (sources || []).filter(s => Boolean(s?.title || s?.url));
  const feedback =
    copyState === 'copied' ? (copyFeedback || 'Report copied')
      : copyState === 'error' ? 'Unable to copy. Try again.'
        : downloadState === 'done' ? 'Download ready'
          : downloadState === 'error' ? 'Download failed'
            : '';

  const flashCopy = (label?: string) => {
    const msg = !label || label === 'Report' ? 'Report copied'
      : label === 'Caption' ? 'Caption copied'
        : label === 'Hashtags' || label === 'Hashtag' ? 'Hashtags copied'
          : label === 'Hook' ? 'Hook copied'
            : label === 'CTA' || label === 'Call to Action' ? 'CTA copied'
              : label === 'Full Post' ? 'Full post copied'
                : `${label} copied`;
    setCopyFeedback(msg);
    setCopyState('copied');
    window.setTimeout(() => {
      setCopyState('idle');
      setCopyFeedback('');
    }, 2200);
  };

  if (!open || !agentId) return null;

  const handleCopy = async () => {
    if (!usable || normalizedData == null) {
      setCopyState('error');
      window.setTimeout(() => setCopyState('idle'), 2000);
      return;
    }
    const text = agentOutputToText(agentName, normalizedData, {
      generatedAt: result?.timestamp,
      sources: verifiedSources,
    });
    const ok = await copyTextToClipboard(text);
    if (ok) flashCopy('Report');
    else {
      setCopyState('error');
      window.setTimeout(() => setCopyState('idle'), 2000);
    }
  };

  const handleDownload = async (format?: ExportFormat) => {
    if (!result || !usable || normalizedData == null) return;
    setDownloadMenu(false);
    setDownloadState('preparing');
    const r = await exportAgentOutput(
      agentId,
      agentName,
      { ...result, success: true, data: normalizedData },
      verifiedSources,
      format,
    );
    setDownloadState(r.ok ? 'done' : 'error');
    window.setTimeout(() => setDownloadState('idle'), 2200);
  };

  const requestClose = () => {
    if (regenerating) setConfirmClose(true);
    else onClose();
  };

  const statusText = statusLabel({
    regenerating,
    loading: isLoading,
    success: usable,
    researchFailed: result?.researchFailed,
    withoutLive: result?.generatedWithoutLiveResearch,
    sourcesCount: verifiedSources.length,
  });

  // ~85–90% width · ~88–92% height, centered output workspace
  const shellStyle: CSSProperties = {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    width: 'min(90vw, 1480px)',
    height: 'min(90vh, 960px)',
    maxWidth: '100%',
    maxHeight: '100dvh',
    overflow: 'hidden',
    background: '#ffffff',
    color: '#0f172a',
    borderRadius: 18,
    border: '1px solid #e2e8f0',
    boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.28)',
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-3"
        role="dialog"
        aria-modal="true"
        aria-label={`${agentName} output`}
      >
        <button
          type="button"
          aria-label="Close modal backdrop"
          onClick={requestClose}
          style={{
            position: 'absolute',
            inset: 0,
            border: 'none',
            background: 'rgba(15, 23, 42, 0.48)',
            backdropFilter: 'blur(3px)',
            cursor: 'pointer',
          }}
        />

        <div style={shellStyle} className="max-sm:!h-[100dvh] max-sm:!w-full max-sm:!rounded-none">
          {/* accent bar */}
          <div style={{ height: 4, flexShrink: 0, background: 'linear-gradient(90deg, #0EA5E9, #38BDF8)' }} />

          {/* Header */}
          <header
            style={{
              flexShrink: 0,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              padding: '14px 18px',
              borderBottom: '1px solid #e2e8f0',
              background: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', gap: 12, minWidth: 0, flex: 1 }}>
              <span
                style={{
                  width: 48,
                  height: 48,
                  flexShrink: 0,
                  borderRadius: 12,
                  display: 'grid',
                  placeItems: 'center',
                  background: '#E0F2FE',
                  color: '#0369A1',
                }}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0284C7' }}>
                  {agentName} Output
                </p>
                <h2 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 650, color: '#0f172a', lineHeight: 1.3 }}>
                  {title}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                  <span style={{ color: usable ? '#0284C7' : '#64748b' }}>● {statusText}</span>
                  {result?.timestamp ? ` · Updated: ${formatRetrievedDate(result.timestamp)}` : ''}
                  {verifiedSources.length ? ` · ${verifiedSources.length} verified source${verifiedSources.length === 1 ? '' : 's'}` : ''}
                  {result?.retrievedAt ? ` · Data as of ${formatRetrievedDate(result.retrievedAt)}` : ''}
                </p>
                {feedback && (
                  <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 650, color: '#047857' }} role="status">
                    {feedback}
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              {onComment && (
                <button type="button" onClick={onComment} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  <MessageSquare className="h-3.5 w-3.5" /> Refine
                </button>
              )}
              <button type="button" onClick={() => void handleCopy()} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                <Copy className="h-3.5 w-3.5" /> {copyState === 'copied' ? 'Copied ✓' : 'Copy'}
              </button>
              <div className="relative" ref={downloadRef}>
                <button
                  type="button"
                  onClick={() => {
                    if (exportOptions.length <= 1) void handleDownload(exportOptions[0]?.format);
                    else setDownloadMenu(v => !v);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  {downloadState === 'preparing'
                    ? 'Preparing…'
                    : downloadState === 'done'
                      ? 'Downloaded'
                      : exportOptions[0]?.label.replace(/^Download\s+/i, '') || 'Download'}
                  {exportOptions.length > 1 && <ChevronDown className="h-3 w-3" />}
                </button>
                {downloadMenu && exportOptions.length > 1 && (
                  <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                    {exportOptions.map(opt => (
                      <button
                        key={opt.format}
                        type="button"
                        onClick={() => void handleDownload(opt.format)}
                        className="block w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-primary-50 hover:text-primary-800"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                disabled={regenerating}
                onClick={onRegenerate}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {regenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                {regenerating ? 'Regenerating…' : 'Regenerate'}
              </button>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={requestClose}
                aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          {/* Body — never zero height */}
          <div
            ref={bodyRef}
            className="workspace-scroll"
            style={{
              flex: '1 1 auto',
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              WebkitOverflowScrolling: 'touch',
              padding: '20px 18px 28px',
              background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
              color: '#0f172a',
            }}
          >
            {isLoading && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-900">
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary-600" />
                <div>
                  <p className="m-0 font-semibold">Preparing agent output…</p>
                  <p className="m-0 mt-0.5 text-xs text-primary-800/80">Using your prompt, sources, and mode context.</p>
                </div>
              </div>
            )}

            {regenError && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">{regenError}</div>
            )}

            {usable && normalizedData != null ? (
              <AgentOutputRenderer
                agentId={agentId}
                data={normalizedData}
                sources={verifiedSources}
                retrievedAt={result?.retrievedAt}
                generatedWithoutLiveResearch={result?.generatedWithoutLiveResearch}
                researchFailed={result?.researchFailed}
                researchError={result?.researchError}
                userPrompt={userPrompt}
                mode={mode}
                onCitationClick={(_n, source) => {
                  if (source) setPreviewSource(source);
                }}
                onCopyText={async (label, text) => {
                  const ok = await copyTextToClipboard(text);
                  if (ok) flashCopy(label);
                  else {
                    setCopyState('error');
                    window.setTimeout(() => setCopyState('idle'), 2000);
                  }
                }}
                onRegenerate={onRegenerate}
              />
            ) : result && result.success === false ? (
              <div className="rounded-xl border border-rose-200 bg-white p-6 shadow-sm">
                <p className="m-0 text-sm font-semibold text-rose-900">Unable to load this agent output.</p>
                <p className="mt-1 text-xs text-rose-700">{result.error || 'Generation failed.'}</p>
                <button type="button" onClick={onRegenerate} className="mt-4 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white">
                  Regenerate
                </button>
              </div>
            ) : !isLoading ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <p className="m-0 text-base font-semibold text-slate-900">Output is not available yet.</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
                  This agent has not completed its output. Run or regenerate the agent to create the report.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <button type="button" onClick={onRegenerate} className="rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700">
                    Run Agent
                  </button>
                  <button type="button" onClick={onRegenerate} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    Regenerate
                  </button>
                  <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    Close
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {confirmClose && (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <p className="text-sm font-semibold text-slate-900">Generation is still in progress. Close anyway?</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmClose(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">Keep Open</button>
              <button type="button" onClick={() => { setConfirmClose(false); onClose(); }} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white">Close</button>
            </div>
          </div>
        </div>
      )}

      <SourcePreviewModal source={previewSource} onClose={() => setPreviewSource(null)} />
    </>
  );
}
