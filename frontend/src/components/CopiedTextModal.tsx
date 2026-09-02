import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Check, FileText, Loader2, X } from 'lucide-react';
import { saveWorkspaceDocument, type WorkspaceDocument } from '../lib/workspaceMemory';

interface CopiedTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ProcessingStatus = 'idle' | 'processing' | 'ready' | 'failed';

export default function CopiedTextModal({ isOpen, onClose, onSuccess }: CopiedTextModalProps) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!text.trim()) {
      setError('Please paste some text content.');
      setStatus('failed');
      return;
    }
    if (!title.trim()) {
      setError('Please provide a title for this source.');
      setStatus('failed');
      return;
    }

    setError('');
    setStatus('processing');

    // Save as workspace document
    const doc: WorkspaceDocument = {
      id: crypto.randomUUID(),
      name: title.trim(),
      type: 'text/plain',
      text: text.trim(),
      addedAt: new Date().toISOString(),
    };

    try {
      saveWorkspaceDocument(doc);
      setStatus('ready');

      // Auto-close after success
      setTimeout(() => {
        setTitle('');
        setText('');
        setStatus('idle');
        setError('');
        onSuccess();
      }, 1000);
    } catch (err) {
      setError('Failed to save source. Please try again.');
      setStatus('failed');
    }
  };

  const handleClose = () => {
    if (status !== 'processing') {
      // Don't clear text on recoverable errors
      if (status !== 'failed') {
        setTitle('');
        setText('');
      }
      setStatus('idle');
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  const charCount = text.length;
  const processing = status === 'processing';

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
            <FileText className="h-5 w-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-slate-900">Add Copied Text</h3>
          </div>
          <button onClick={handleClose} disabled={processing} className="text-slate-400 hover:text-slate-700 transition disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Source Title</label>
            <input
              value={title}
              onChange={e => { setTitle(e.target.value); if (status === 'failed') { setStatus('idle'); setError(''); } }}
              placeholder="e.g., Market Research Notes"
              disabled={processing}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100 transition disabled:opacity-60"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Text Content</label>
              <span className={`text-[11px] font-medium ${charCount > 40000 ? 'text-rose-500' : 'text-slate-400'}`}>
                {charCount.toLocaleString()} characters
              </span>
            </div>
            <textarea
              value={text}
              onChange={e => { setText(e.target.value); if (status === 'failed') { setStatus('idle'); setError(''); } }}
              placeholder="Paste your text content here..."
              disabled={processing}
              rows={8}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100 resize-none transition disabled:opacity-60"
            />
          </div>
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
              <span className="font-medium">{error || (status === 'processing' ? 'Saving source...' : status === 'ready' ? 'Source added successfully!' : '')}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-5 flex justify-end gap-3">
          <button onClick={handleClose} disabled={processing} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || !title.trim() || processing || status === 'ready'}
            className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {processing ? 'Saving...' : 'Add Source'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
