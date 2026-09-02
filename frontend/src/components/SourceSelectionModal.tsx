import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UploadCloud, Globe, HardDrive, Type, ArrowLeft, Loader2, CheckCircle2, AlertCircle, FileVideo, Image as ImageIcon } from 'lucide-react';
import { saveWorkspaceDocument } from '../lib/workspaceMemory';

type View = 'menu' | 'upload' | 'website' | 'drive' | 'text' | 'youtube' | 'image';
type ProcessState = 'idle' | 'uploading' | 'extracting' | 'processing' | 'ready' | 'error';

interface SourceSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Optional initial screen when opening from the + menu */
  initialView?: View | null;
}

export default function SourceSelectionModal({ isOpen, onClose, onSuccess, initialView = null }: SourceSelectionModalProps) {
  const [currentView, setCurrentView] = useState<View>(initialView || 'menu');
  
  // Shared state
  const [state, setState] = useState<ProcessState>('idle');
  const [error, setError] = useState('');

  // Upload state
  const [_file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Website state
  const [url, setUrl] = useState('');

  // Text state
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');

  const resetAll = () => {
    setCurrentView('menu');
    setState('idle');
    setError('');
    setFile(null);
    setUrl('');
    setTextTitle('');
    setTextContent('');
  };

  // Open to a specific submenu when parent requests it (composer + menu)
  useEffect(() => {
    if (isOpen && initialView) {
      setCurrentView(initialView);
      setState('idle');
      setError('');
    }
  }, [isOpen, initialView]);

  const handleClose = () => {
    if (state !== 'uploading' && state !== 'extracting' && state !== 'processing') {
      resetAll();
      onClose();
    }
  };

  const handleSuccess = () => {
    setTimeout(() => {
      onSuccess();
      window.dispatchEvent(new Event('storage')); // Trigger update in Sidebar
      resetAll();
      onClose();
    }, 1200);
  };

  // ─── File Upload Logic ────────────────────────────────────────────────
  const processFile = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setState('uploading');
    setError('');
    
    try {
      if (uploadedFile.size > 10 * 1024 * 1024) {
        throw new Error('File exceeds the 10MB limit.');
      }

      const isImage = (uploadedFile.type || '').startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(uploadedFile.name);

      // Images: store as source reference without fake OCR/analysis
      if (isImage) {
        setState('processing');
        saveWorkspaceDocument({
          id: crypto.randomUUID(),
          name: uploadedFile.name,
          type: uploadedFile.type || 'image',
          text: `[Image source: ${uploadedFile.name}]\nType: ${uploadedFile.type || 'image'}\nSize: ${uploadedFile.size} bytes\nNote: Image OCR is not configured. Reference this file by name in your prompt.`,
          addedAt: new Date().toISOString(),
        });
        setState('ready');
        handleSuccess();
        return;
      }

      setState('extracting');
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const form = new FormData();
      form.append('file', uploadedFile);

      let text = '';
      let extractedType = uploadedFile.type || 'text/plain';

      try {
        const response = await fetch(`${apiBase}/api/v1/sources/extract`, {
          method: 'POST',
          body: form,
        });
        const result = await response.json();
        if (result.success && result.text) {
          text = String(result.text);
          extractedType = result.type || extractedType;
        } else if (!response.ok || result.error) {
          // Fall back to browser text read for plain formats only
          const lower = uploadedFile.name.toLowerCase();
          const plain = lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.csv') || lower.endsWith('.json') || (uploadedFile.type || '').startsWith('text/');
          if (!plain) {
            throw new Error(result.error || 'Could not extract text from this file.');
          }
        }
      } catch (networkErr) {
        // Network failure → plain text client parse only
        const lower = uploadedFile.name.toLowerCase();
        const plain = lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.csv') || lower.endsWith('.json') || (uploadedFile.type || '').startsWith('text/');
        if (!plain) {
          throw networkErr instanceof Error ? networkErr : new Error('Source extraction failed.');
        }
      }

      if (!text.trim()) {
        text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = (e.target?.result as string) || '';
            if (!result.trim()) {
              reject(new Error('Could not extract text from this file. Try TXT, MD, CSV, JSON, PDF, or DOCX.'));
              return;
            }
            resolve(result);
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
      handleSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred during processing.');
      setState('error');
    }
  };

  const processYoutube = async () => {
    if (!url.trim()) return;
    setError('');
    setState('extracting');
    try {
      const raw = url.trim();
      const testUrl = raw.startsWith('http') ? raw : `https://${raw}`;
      const parsed = new URL(testUrl);
      const host = parsed.hostname.replace(/^www\./, '');
      if (!['youtube.com', 'youtu.be', 'm.youtube.com'].includes(host) && !host.endsWith('youtube.com')) {
        throw new Error('Please enter a valid YouTube URL.');
      }
      setState('processing');
      // Do not claim a transcript was retrieved — store URL as a source reference
      saveWorkspaceDocument({
        id: crypto.randomUUID(),
        name: `YouTube: ${parsed.hostname}${parsed.pathname}`,
        type: 'youtube',
        text: `[YouTube source]\nURL: ${testUrl}\nNote: Video transcript retrieval is not configured. Agents may reference this URL as context only.`,
        addedAt: new Date().toISOString(),
      });
      setState('ready');
      handleSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid YouTube URL.');
      setState('error');
    }
  };

  // ─── Website Logic ───────────────────────────────────────────────────
  const processWebsite = async () => {
    if (!url.trim()) return;
    setError('');
    setState('extracting'); // Maps to retrieving/validating visually

    try {
      const testUrl = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`;
      new URL(testUrl);
      if (!testUrl.includes('.')) throw new Error('Invalid URL');
      
      const response = await fetch('http://localhost:8000/api/v1/sources/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to retrieve website content.');

      setState('processing');

      saveWorkspaceDocument({
        id: crypto.randomUUID(),
        name: result.title || result.domain || url.trim(),
        type: 'website',
        text: result.text,
        addedAt: new Date().toISOString(),
      });

      setState('ready');
      handleSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid URL or network error.');
      setState('error');
    }
  };

  // ─── Copied Text Logic ────────────────────────────────────────────────
  const processText = async () => {
    if (!textContent.trim()) return;
    setState('processing');
    
    try {
      saveWorkspaceDocument({
        id: crypto.randomUUID(),
        name: textTitle.trim() || 'Untitled Text Source',
        type: 'text/plain',
        text: textContent.trim(),
        addedAt: new Date().toISOString(),
      });

      setState('ready');
      handleSuccess();
    } catch (err) {
      setError('Failed to save text source.');
      setState('error');
    }
  };

  if (!isOpen) return null;
  const isWorking = state === 'uploading' || state === 'extracting' || state === 'processing';

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40 p-4 backdrop-blur-sm" onMouseDown={handleClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        onMouseDown={e => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            {currentView !== 'menu' && !isWorking && state !== 'ready' && (
              <button onClick={() => { setCurrentView('menu'); setState('idle'); setError(''); }} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="text-[16px] font-semibold text-slate-900">Add your sources</h2>
          </div>
          <button onClick={handleClose} disabled={isWorking} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6">
          <AnimatePresence mode="wait">
            
            {/* MAIN MENU */}
            {currentView === 'menu' && (
              <motion.div key="menu" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <p className="text-sm text-slate-500 mb-6 text-center">Upload files, add websites, paste text, or connect supported sources.</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <button onClick={() => setCurrentView('upload')} className="group flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-primary-300 hover:bg-primary-50">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600 group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                      <UploadCloud className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 group-hover:text-primary-700">Upload files</span>
                  </button>
                  <button onClick={() => setCurrentView('image')} className="group flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-primary-300 hover:bg-primary-50">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600 group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 group-hover:text-primary-700">Upload image</span>
                  </button>
                  <button onClick={() => setCurrentView('website')} className="group flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-primary-300 hover:bg-primary-50">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600 group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                      <Globe className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 group-hover:text-primary-700">Add website</span>
                  </button>
                  <button onClick={() => setCurrentView('text')} className="group flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-primary-300 hover:bg-primary-50">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600 group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                      <Type className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 group-hover:text-primary-700">Paste text</span>
                  </button>
                  <button onClick={() => setCurrentView('youtube')} className="group flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-primary-300 hover:bg-primary-50">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600 group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                      <FileVideo className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 group-hover:text-primary-700">YouTube link</span>
                  </button>
                  <button onClick={() => setCurrentView('drive')} className="group flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500 group-hover:bg-slate-200 transition-colors">
                      <HardDrive className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">Drive</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* DRIVE - DISABLED */}
            {currentView === 'drive' && (
              <motion.div key="drive" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="py-8 text-center">
                <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
                  <HardDrive className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800">Drive integration disabled</h3>
                <p className="mt-2 text-sm text-slate-500">Google Drive integration is not configured yet.</p>
              </motion.div>
            )}

            {/* SHARED PROCESSING STATE (used by upload, website, text) */}
            {isWorking && (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-4">
                <div className="flex items-center gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-600">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 capitalize">{state} source...</p>
                    <p className="mt-1 text-xs text-slate-500">Please wait while we process this.</p>
                  </div>
                </div>
                <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <motion.div className="h-full bg-primary-500" initial={{ width: '0%' }} animate={{ width: state === 'uploading' ? '30%' : state === 'extracting' ? '70%' : '95%' }} transition={{ duration: 0.5 }} />
                </div>
              </motion.div>
            )}

            {state === 'ready' && (
              <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-6 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-900">Source Ready</p>
                <p className="mt-1 text-xs text-slate-500">Successfully added to your workspace.</p>
              </motion.div>
            )}

            {state === 'error' && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-4">
                <div className="flex items-start gap-3 rounded-xl bg-rose-50 p-4">
                  <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
                  <div>
                    <p className="text-sm font-semibold text-rose-900">Failed</p>
                    <p className="mt-1 text-xs text-rose-700">{error}</p>
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-3">
                  <button onClick={() => setState('idle')} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700">Try Again</button>
                </div>
              </motion.div>
            )}

            {/* UPLOAD VIEW */}
            {(currentView === 'upload' || currentView === 'image') && state === 'idle' && (
              <motion.div key={currentView} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                <div 
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const dropped = e.dataTransfer.files?.[0]; if (dropped) void processFile(dropped); }}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center transition hover:border-primary-300 hover:bg-primary-50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud className="mb-4 h-8 w-8 text-slate-400" />
                  <p className="text-sm font-medium text-slate-700">Click or drag a file here</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {currentView === 'image' ? 'PNG, JPG, JPEG, WEBP (Max 10MB)' : 'PDF, TXT, CSV, DOCX, PPTX, XLSX (Max 10MB)'}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={currentView === 'image' ? 'image/png,image/jpeg,image/jpg,image/webp' : undefined}
                    multiple={currentView === 'upload'}
                    className="hidden"
                    onChange={e => {
                      const files = e.target.files;
                      if (!files?.length) return;
                      void (async () => {
                        for (const f of Array.from(files)) await processFile(f);
                      })();
                    }}
                  />
                </div>
              </motion.div>
            )}

            {/* WEBSITE VIEW */}
            {currentView === 'website' && state === 'idle' && (
              <motion.div key="website" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                <label className="text-sm font-medium text-slate-700">Paste website URL</label>
                <input
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100 transition"
                  onKeyDown={e => { if (e.key === 'Enter') void processWebsite(); }}
                />
                <div className="mt-6 flex justify-end gap-2">
                  <button type="button" onClick={() => { setCurrentView('menu'); setUrl(''); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                  <button onClick={processWebsite} disabled={!url.trim()} className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:bg-slate-300">Add Source</button>
                </div>
              </motion.div>
            )}

            {/* YOUTUBE VIEW */}
            {currentView === 'youtube' && state === 'idle' && (
              <motion.div key="youtube" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                <label className="text-sm font-medium text-slate-700">Paste YouTube URL</label>
                <input
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=…"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100 transition"
                  onKeyDown={e => { if (e.key === 'Enter') void processYoutube(); }}
                />
                <p className="mt-2 text-[11px] text-slate-500">Transcript retrieval is only used when configured. Invalid or blocked videos are reported honestly.</p>
                <div className="mt-6 flex justify-end gap-2">
                  <button type="button" onClick={() => { setCurrentView('menu'); setUrl(''); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                  <button onClick={() => void processYoutube()} disabled={!url.trim()} className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:bg-slate-300">Add Source</button>
                </div>
              </motion.div>
            )}

            {/* TEXT VIEW */}
            {currentView === 'text' && state === 'idle' && (
              <motion.div key="text" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Source title <span className="text-slate-400 font-normal">(optional)</span></label>
                    <input
                      value={textTitle}
                      onChange={e => setTextTitle(e.target.value)}
                      placeholder="e.g., Meeting Notes"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100 transition"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Paste your text here</label>
                    <textarea
                      value={textContent}
                      onChange={e => setTextContent(e.target.value)}
                      placeholder="Paste text content..."
                      rows={5}
                      className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100 transition"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button onClick={processText} disabled={!textContent.trim()} className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:bg-slate-300">Add Text Source</button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
