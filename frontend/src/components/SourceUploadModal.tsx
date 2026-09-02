import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, FileText, Loader2, UploadCloud, X } from 'lucide-react';
import { authenticatedHeaders } from '../lib/localAuth';
import { saveWorkspaceDocument } from '../lib/workspaceMemory';

type ProcessState = 'idle' | 'uploading' | 'extracting' | 'processing' | 'ready' | 'error';

interface SourceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SourceUploadModal({ isOpen, onClose, onSuccess }: SourceUploadModalProps) {
  const [state, setState] = useState<ProcessState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setState('uploading');
    setError('');

    try {
      if (uploadedFile.size > 10 * 1024 * 1024) {
        throw new Error('File exceeds the 10MB limit.');
      }
      setState('extracting');
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const form = new FormData();
      form.append('file', uploadedFile);
      let text = '';
      let extractedType = uploadedFile.type || 'text/plain';

      const response = await fetch(`${apiBase}/api/v1/sources/extract`, { method: 'POST', headers: authenticatedHeaders(), body: form });
      const result = await response.json().catch(() => ({}));
      if (result.success && result.text) {
        text = String(result.text);
        extractedType = result.type || extractedType;
      } else {
        const lower = uploadedFile.name.toLowerCase();
        const plain = lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.csv') || lower.endsWith('.json') || (uploadedFile.type || '').startsWith('text/');
        if (!plain) {
          throw new Error(result.error || 'Could not extract text from this file.');
        }
        text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const value = (e.target?.result as string) || '';
            if (!value.trim()) reject(new Error('Could not extract text from this file.'));
            else resolve(value);
          };
          reader.onerror = () => reject(new Error('Failed to read file.'));
          reader.readAsText(uploadedFile);
        });
      }

      setState('processing');
      saveWorkspaceDocument({
        id: crypto.randomUUID(),
        name: uploadedFile.name,
        type: extractedType,
        text,
        addedAt: new Date().toISOString()
      });

      setState('ready');
      setTimeout(() => {
        onSuccess();
        reset();
      }, 600);

    } catch (err: any) {
      setError(err.message || 'An error occurred during processing.');
      setState('error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) void processFile(selected);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) void processFile(dropped);
  };

  const reset = () => {
    setState('idle');
    setFile(null);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm" onMouseDown={state === 'ready' || state === 'idle' ? reset : undefined}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        onMouseDown={e => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-[15px] font-semibold text-slate-900">Add Source</h2>
          {(state === 'idle' || state === 'error' || state === 'ready') && (
            <button onClick={reset} className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <div className="p-6">
          <AnimatePresence mode="wait">
            {state === 'idle' && (
              <motion.div 
                key="idle"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center transition hover:border-primary-300 hover:bg-primary-50"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className="mb-4 h-8 w-8 text-slate-400" />
                <p className="text-sm font-medium text-slate-700">Click or drag a file here</p>
                <p className="mt-1 text-xs text-slate-500">PDF, TXT, CSV, DOCX (Max 10MB)</p>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
              </motion.div>
            )}

            {(state === 'uploading' || state === 'extracting' || state === 'processing') && (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-4">
                <div className="flex items-center gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-600">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{file?.name}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-600" />
                      <span className="text-xs font-medium text-primary-700 capitalize">{state}...</span>
                    </div>
                  </div>
                </div>
                <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <motion.div 
                    className="h-full bg-primary-500" 
                    initial={{ width: '0%' }}
                    animate={{ width: state === 'uploading' ? '30%' : state === 'extracting' ? '70%' : '95%' }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </motion.div>
            )}

            {state === 'ready' && (
              <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-6 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-900">Source Ready</p>
                <p className="mt-1 text-xs text-slate-500">{file?.name} has been processed.</p>
              </motion.div>
            )}

            {state === 'error' && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-4">
                <div className="flex items-start gap-3 rounded-xl bg-rose-50 p-4">
                  <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
                  <div>
                    <p className="text-sm font-semibold text-rose-900">Processing Failed</p>
                    <p className="mt-1 text-xs text-rose-700">{error}</p>
                  </div>
                </div>
                <div className="mt-5 flex gap-3">
                  <button onClick={() => file && void processFile(file)} className="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700">Retry</button>
                  <button onClick={() => setState('idle')} className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Remove</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
