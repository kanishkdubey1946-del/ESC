import { Lightbulb, Activity, Target, TrendingUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { CitizenInsightsOutput } from '../../types/agents';

interface CitizenInsightsWorkspaceProps {
  data: Record<string, unknown>;
}

export default function CitizenInsightsWorkspace({ data }: CitizenInsightsWorkspaceProps) {
  const output = data as unknown as CitizenInsightsOutput;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* Executive Summary Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h2 className="text-sm font-bold text-sky-700 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Lightbulb className="w-4 h-4" /> Citizen Feedback Summary
        </h2>
        <div className="prose prose-slate max-w-none">
          <p className="text-lg leading-relaxed text-slate-700">
            {output.executiveSummary || "No executive summary was generated."}
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Issue Severity */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4 text-sky-600 font-semibold">
            <Activity className="w-5 h-5" />
            Issue Severity
          </div>
          <p className="text-sm text-slate-600 leading-relaxed flex-1">
            {output.issueSeverity || "Severity not determined from available evidence."}
          </p>
        </div>

        {/* Urgency Level */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4 text-purple-600 font-semibold">
            <Target className="w-5 h-5" />
            Urgency Level
          </div>
          <div className="flex-1 flex items-center">
            <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${
              output.urgencyLevel === 'High' ? 'bg-red-50 text-red-600' :
              output.urgencyLevel === 'Medium' ? 'bg-yellow-50 text-yellow-600' :
              output.urgencyLevel === 'Low' ? 'bg-green-50 text-green-600' :
              'bg-slate-100 text-slate-600'
            }`}>
              {output.urgencyLevel || 'Needs Verification'}
            </span>
          </div>
        </div>

        {/* Citizen Satisfaction Score */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4 text-emerald-600 font-semibold">
            <TrendingUp className="w-5 h-5" />
            Citizen Satisfaction
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-extrabold text-slate-900">
                {typeof output.citizenSatisfaction === 'number' && output.citizenSatisfaction > 0
                  ? output.citizenSatisfaction
                  : '—'}
              </span>
              <span className="text-sm font-medium text-slate-400">/100</span>
            </div>
            {typeof output.citizenSatisfaction === 'number' && output.citizenSatisfaction > 0 ? (
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, output.citizenSatisfaction))}%` }}
                />
              </div>
            ) : (
              <p className="text-xs text-slate-500">Estimate unavailable without supporting evidence.</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Complaint Distribution & Recurring Themes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Complaint Distribution (Donut Chart) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Complaint Distribution</h3>
          <div className="aspect-square max-w-[280px] mx-auto relative flex items-center justify-center">
             <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
               <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="16" />
               <circle 
                 cx="50" cy="50" r="40" fill="transparent" stroke="#0ea5e9" 
                 strokeWidth="16" strokeDasharray="251.2" strokeDashoffset={251.2 * 0.3} 
               />
               <circle 
                 cx="50" cy="50" r="40" fill="transparent" stroke="#8b5cf6" 
                 strokeWidth="16" strokeDasharray="251.2" strokeDashoffset={251.2 * 0.85} 
               />
             </svg>
             <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
               <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Complaints</span>
               <span className="text-2xl font-bold text-slate-900">342</span>
             </div>
          </div>
        </div>

        {/* Top Recurring Themes Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 overflow-hidden flex flex-col">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Top Recurring Themes</h3>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Theme</th>
                  <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Frequency</th>
                  <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Affected Area</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {output.topThemes?.map((theme, idx) => (
                  <tr key={idx} className="group">
                    <td className="py-4 pr-4 font-semibold text-slate-900 align-top">
                      {theme.theme}
                    </td>
                    <td className="py-4 pr-4 text-sm text-slate-600 align-top">
                      {theme.frequency}
                    </td>
                    <td className="py-4 text-sm text-sky-600 font-medium align-top">
                      {theme.affectedArea}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Deep Data Section */}
      {(output.recurringIssues || output.affectedDemographics || output.keyRisks) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          
          {/* Recurring Issues */}
          {output.recurringIssues && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-500" /> Recurring Issues
              </h3>
              <ul className="space-y-3">
                {output.recurringIssues.map((issue, i) => (
                  <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                    <span className="text-primary-400 mt-1">•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Affected Demographics */}
          {output.affectedDemographics && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-pink-500" /> Affected Demographics
              </h3>
              <ul className="space-y-3">
                {output.affectedDemographics.map((demo, i) => (
                  <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                    <span className="text-pink-400 mt-1">•</span>
                    <span>{demo}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Risks */}
          {output.keyRisks && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-red-500" /> Risk Analysis
              </h3>
              <ul className="space-y-3">
                {output.keyRisks.map((risk, i) => (
                  <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                    <span className="text-red-400 mt-1">•</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      )}

      {/* Deep Dive Report */}
      {output.detailedReport && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mt-8">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <TrendingUp className="w-6 h-6 text-primary-500" />
            <h3 className="text-2xl font-bold text-slate-900">Comprehensive Citizen Insights Report</h3>
          </div>
          <div className="prose prose-slate max-w-none prose-headings:text-primary-900 prose-a:text-primary-600">
            <ReactMarkdown>{output.detailedReport}</ReactMarkdown>
          </div>
        </div>
      )}

    </div>
  );
}
