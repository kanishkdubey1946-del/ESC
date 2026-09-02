import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import type { AgentResult } from '../../types/agents';
import CitizenInsightsWorkspace from './ResearchWorkspace';
import DevelopmentPlanningWorkspace from './StrategyWorkspace';
import CommunicationWorkspace from './ContentWorkspace';
import PublicDataWorkspace from './DevelopmentWorkspace';
import RecommendationWorkspace from './PitchWorkspace';

interface WorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string | null;
  agentName: string;
  agentColor: string;
  agentBg: string;
  agentGradient: string;
  result?: AgentResult<unknown>;
}

export default function WorkspaceModal({
  isOpen,
  onClose,
  agentId,
  agentName,
  agentBg,
  agentGradient,
  result,
}: WorkspaceModalProps) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    }
  }, [isOpen, onClose]);

  if (!agentId || !result) return null;

  const data = result.data as Record<string, unknown>;

  // Export all deliverables as a combined download
  const handleExportAll = () => {
    const deliverables = (data?.deliverables || []) as Array<{ filename: string; content: string }>;
    if (deliverables.length === 0) return;
    
    deliverables.forEach(file => {
      const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  // Render the appropriate workspace based on agentId
  const renderWorkspace = () => {
    switch (agentId) {
      case 'research':
        return <CitizenInsightsWorkspace data={data} />;
      case 'strategy':
        return <DevelopmentPlanningWorkspace data={data} />;
      case 'content':
        return <CommunicationWorkspace data={data} />;
      case 'development':
        return <PublicDataWorkspace data={data} />;
      case 'pitch':
        return <RecommendationWorkspace data={data} />;
      default:
        return (
          <div className="p-12 text-center text-slate-400">
            <p className="text-lg font-medium">Unknown agent type</p>
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-[100]"
          />

          {/* Fullscreen Popup — 95% viewport, single vertical scroll */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-3 sm:p-4 md:p-6 pointer-events-none"
          >
            <div className="w-full h-full max-w-[1400px] max-h-[95vh] bg-white rounded-2xl shadow-2xl pointer-events-auto flex flex-col overflow-hidden border border-slate-200/60">
              
              {/* ── Sticky Header ── */}
              <header className="px-6 sm:px-8 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/95 backdrop-blur-sm z-10">
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-xl ${agentBg} border border-slate-100 flex items-center justify-center shadow-sm`}>
                    <div className={`w-5 h-5 rounded-md bg-gradient-to-br ${agentGradient}`} />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-dark tracking-tight">{agentName} Workspace</h2>
                    <div className="flex items-center gap-3 mt-0.5 text-xs sm:text-sm font-medium">
                      {result.success ? (
                        <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Generated
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                          <AlertTriangle className="w-3.5 h-3.5" /> Generation failed
                        </span>
                      )}
                      {result.provider && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3.5 h-3.5" /> via {result.provider}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportAll}
                    className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-700 rounded-xl transition-all"
                  >
                    <Download className="w-4 h-4" /> Export All
                  </button>
                  <button
                    onClick={onClose}
                    className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </header>

              {/* ── Scrollable Content — Single vertical scroll, NO sidebar ── */}
              <div className="flex-1 overflow-y-auto workspace-scroll">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8">
                  {renderWorkspace()}
                </div>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
