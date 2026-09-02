import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Check, Globe, Loader2, X } from 'lucide-react';
import { saveWorkspaceDocument, type WorkspaceDocument } from '../lib/workspaceMemory';

interface WebsiteSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ProcessingStatus = 'idle' | 'validating' | 'retrieving' | 'extracting' | 'ready' | 'failed';

const STATUS_MESSAGES: Record<ProcessingStatus, string> = {
  idle: '',
  validating: 'Validating URL...',
  retrieving: 'Retrieving website content...',
  extracting: 'Extracting text and metadata...',
  ready: 'Source added successfully!',
  failed: 'Failed to process website.',
};

export default function WebsiteSourceModal({ isOpen, onClose, onSuccess }: WebsiteSourceModalProps) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [error, setError] = useState('');

  const isValidUrl = (input: string) => {
    try {
      const testUrl = input.startsWith('http') ? input : `https://${input}`;
      new URL(testUrl);
      return testUrl.includes('.');
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!url.trim()) return;

    setError('');
    setStatus('validating');

    if (!isValidUrl(url.trim())) {
      setError('Please enter a valid URL (e.g., example.com or https://example.com)');
      setStatus('failed');
      return;
    }

    setStatus('retrieving');

    try {
      const response = await fetch('http://localhost:8000/api/v1/sources/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to retrieve website content.');
        setStatus('failed');
        return;
      }

      setStatus('extracting');

      // Save as workspace document
      const doc: WorkspaceDocument = {
        id: crypto.randomUUID(),
        name: result.title || result.domain || url.trim(),
        type: 'website',
        text: result.text,
        addedAt: new Date().toISOString(),
      };

      saveWorkspaceDocument(doc);
      setStatus('ready');

      // Auto-close after success
      setTimeout(() => {
        setUrl('');
        setStatus('idle');
        setError('');
        onSuccess();
      }, 1200);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Make sure the backend is running.');
      setStatus('failed');
    }
  };

  const handleClose = () => {
    if (status !== 'retrieving' && status !== 'extracting') {
      setUrl('');
      setStatus('idle');
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  const processing = status === 'validating' || status === 'retrieving' || status === 'extracting';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={handleClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-slate-900">Add Website Source</h3>
          </div>
          <button onClick={handleClose} disabled={processing} className="text-slate-400 hover:text-slate-700 transition disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Website URL</label>
          <input
            value={url}
            onChange={e => { setUrl(e.target.value); if (status === 'failed') { setStatus('idle'); setError(''); } }}
            placeholder="https://example.com/article"
            disabled={processing}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100 transition disabled:opacity-60"
            onKeyDown={e => { if (e.key === 'Enter') void handleSubmit(); }}
          />
        </div>

        {/* Status indicator */}
        <AnimatePresence>
          {status !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
                status === 'ready' ? 'bg-emerald-50 text-emerald-700' :
                status === 'failed' ? 'bg-rose-50 text-rose-700' :
                'bg-primary-50 text-primary-700'
              }`}
            >
              {processing && <Loader2 className="h-4 w-4 animate-spin" />}
              {status === 'ready' && <Check className="h-4 w-4" />}
              {status === 'failed' && <AlertCircle className="h-4 w-4" />}
              <span className="font-medium">{error || STATUS_MESSAGES[status]}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-5 flex justify-end gap-3">
          <button onClick={handleClose} disabled={processing} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!url.trim() || processing || status === 'ready'}
            className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {processing ? 'Processing...' : 'Add Source'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
