import { useState } from 'react';
import { Award, ChevronLeft, ChevronRight, Info, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { RecommendationOutput } from '../../types/agents';

interface RecommendationWorkspaceProps {
  data: Record<string, unknown>;
}

export default function RecommendationWorkspace({ data }: RecommendationWorkspaceProps) {
  const output = data as unknown as RecommendationOutput;
  const [currentIndex, setCurrentIndex] = useState(0);

  const recommendations = output.recommendations || [];
  const currentRec = recommendations[currentIndex];

  const nextRec = () => {
    if (currentIndex < recommendations.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const prevRec = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (!recommendations.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-slate-50 rounded-2xl border border-slate-200">
        <Award className="w-12 h-12 text-slate-300 mb-4" />
        <p className="text-slate-500 font-medium">No recommendations generated yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* Top Banner */}
      <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 text-white">
        <div>
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
            <Award className="w-8 h-8 text-sky-400" /> 
            MP Development Report Generator
          </h2>
          <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
            {output.executiveSummary || "Your comprehensive development recommendations have been generated. Review each project recommendation before exporting the final MP report."}
          </p>
        </div>
        <div className="shrink-0 flex gap-2">
           <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-semibold transition-colors border border-slate-700">
             Export PDF
           </button>
           <button className="px-4 py-2 bg-sky-600 hover:bg-sky-500 rounded-lg text-sm font-semibold transition-colors shadow-sm">
             Export Report
           </button>
        </div>
      </div>

      {/* Recommendation Viewer */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        
        {/* Viewer Header / Toolbar */}
        <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center justify-between">
          <div className="text-sm font-bold text-slate-700">
            Recommendation {currentIndex + 1} of {recommendations.length}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={prevRec}
              disabled={currentIndex === 0}
              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={nextRec}
              disabled={currentIndex === recommendations.length - 1}
              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* The Recommendation Detail View */}
        <div className="relative w-full aspect-video bg-gradient-to-br from-slate-50 to-white flex flex-col items-center justify-center p-12 lg:p-24 border-b border-slate-100 group">
          <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,transparent,black)] opacity-20 pointer-events-none" />
          
          <div className="relative z-10 w-full max-w-4xl text-center space-y-8 animate-in zoom-in-95 duration-300" key={currentIndex}>
            <h1 className="text-4xl lg:text-6xl font-extrabold text-slate-900 tracking-tight">
              {currentRec.projectName}
            </h1>
            
            <div className="prose prose-lg prose-slate mx-auto text-left whitespace-pre-wrap leading-relaxed">
              {currentRec.impactSummary}
            </div>

            {currentRec.priorityScore && (
              <div className="mt-12 inline-flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-xl border border-sky-100/50 min-w-[200px]">
                <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-sky-500 to-primary-600">
                  {currentRec.priorityScore}
                </span>
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2">
                  Priority Score
                </span>
              </div>
            )}

            {currentRec.budgetEstimate && (
              <div className="inline-flex flex-col items-center justify-center p-4 bg-emerald-50 rounded-xl border border-emerald-100 min-w-[160px] ml-4">
                <span className="text-3xl font-black text-emerald-700">
                  {currentRec.budgetEstimate}
                </span>
                <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest mt-1">
                  {currentRec.budgetEstimateLabel || "Budget Estimate"}
                </span>
              </div>
            )}

            {currentRec.urgencyLabel && (
              <div className="mt-4">
                <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${
                  currentRec.urgencyLabel === 'Critical' ? 'bg-red-50 text-red-600' :
                  currentRec.urgencyLabel === 'High' ? 'bg-amber-50 text-amber-600' :
                  'bg-green-50 text-green-600'
                }`}>
                  {currentRec.urgencyLabel} Priority
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Implementation Notes */}
        {currentRec.implementationNotes && (
          <div className="bg-yellow-50/50 p-6 flex gap-4">
            <div className="shrink-0 mt-1 text-amber-500">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900 mb-1">Implementation Notes</h4>
              <p className="text-sm text-amber-800/80 leading-relaxed">
                {currentRec.implementationNotes}
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Grid Overview */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-4">Recommendations Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {recommendations.map((rec, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`relative aspect-video rounded-lg border-2 overflow-hidden transition-all ${
                idx === currentIndex 
                  ? 'border-sky-500 shadow-md scale-105 z-10' 
                  : 'border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100'
              }`}
            >
              <div className="absolute inset-0 bg-slate-50 flex items-center justify-center p-2 text-center">
                <span className="text-[10px] font-bold text-slate-700 leading-tight line-clamp-3">
                  {rec.projectName}
                </span>
              </div>
              <div className="absolute top-1 left-1 bg-white/90 backdrop-blur text-[8px] font-bold text-slate-500 px-1.5 py-0.5 rounded">
                {idx + 1}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Deep Dive Report */}
      {output.detailedReport && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mt-8">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <FileText className="w-6 h-6 text-primary-500" />
            <h3 className="text-2xl font-bold text-slate-900">Comprehensive Recommendation Report</h3>
          </div>
          <div className="prose prose-slate max-w-none prose-headings:text-primary-900 prose-a:text-primary-600">
            <ReactMarkdown>{output.detailedReport}</ReactMarkdown>
          </div>
        </div>
      )}

    </div>
  );
}
