import { Rocket, Users, Target, LayoutGrid, DollarSign, Zap, Briefcase } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { DevelopmentPlanningOutput } from '../../types/agents';

interface DevelopmentPlanningWorkspaceProps {
  data: Record<string, unknown>;
}

export default function DevelopmentPlanningWorkspace({ data }: DevelopmentPlanningWorkspaceProps) {
  const output = data as unknown as DevelopmentPlanningOutput;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* Top Gradient Banner */}
      <div className="bg-gradient-to-br from-blue-500 via-primary-500 to-purple-600 rounded-2xl shadow-lg p-8 md:p-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transform translate-x-4 -translate-y-4">
          <Rocket className="w-48 h-48" />
        </div>
        
        <div className="relative z-10 max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3 text-white">
            {output.districtName || "District Development Plan"}
          </h1>
          <p className="text-xl md:text-2xl font-medium text-white/90 mb-8">
            {output.visionStatement || "Data-driven development for citizen welfare."}
          </p>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/70 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-300" /> Key Objective
            </h3>
            <p className="text-lg leading-relaxed font-medium">
              {output.keyObjective || "Address critical infrastructure gaps through prioritized, citizen-demanded development projects."}
            </p>
          </div>
        </div>
      </div>

      {/* 4-Column Development Model Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        
        {/* Infrastructure Gaps */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-sky-500" />
            <h3 className="text-lg font-bold text-slate-800">Infrastructure Gaps</h3>
          </div>
          <ul className="space-y-4 flex-1">
            {output.infrastructureGaps?.map((item, i) => (
              <li key={i} className="text-sm text-slate-600 leading-relaxed flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-2 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Proposed Projects */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-6">
            <Target className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-bold text-slate-800">Proposed Projects</h3>
          </div>
          <ul className="space-y-4 flex-1">
            {output.proposedProjects?.map((item, i) => (
              <li key={i} className="text-sm text-slate-600 leading-relaxed flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                <span>
                  {item.includes(':') ? (
                    <>
                      <strong className="text-slate-800">{item.split(':')[0]}:</strong>
                      {item.split(':').slice(1).join(':')}
                    </>
                  ) : (
                    item
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Implementation Channels */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-6">
            <LayoutGrid className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-bold text-slate-800">Implementation Channels</h3>
          </div>
          <ul className="space-y-4 flex-1">
            {output.implementationChannels?.map((item, i) => (
              <li key={i} className="text-sm text-slate-600 leading-relaxed flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                <span>
                  {item.includes(':') ? (
                    <>
                      <strong className="text-slate-800">{item.split(':')[0]}:</strong>
                      {item.split(':').slice(1).join(':')}
                    </>
                  ) : (
                    item
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Budget Allocation */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-6">
            <DollarSign className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold text-slate-800">Budget Allocation</h3>
          </div>
          <ul className="space-y-4 flex-1">
            {output.budgetAllocation?.map((item, i) => (
              <li key={i} className="text-sm text-slate-600 leading-relaxed flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                <span>
                  {item.includes(':') ? (
                    <>
                      <strong className="text-slate-800">{item.split(':')[0]}:</strong>
                      {item.split(':').slice(1).join(':')}
                    </>
                  ) : (
                    item
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>

      </div>

      {/* Milestones & Priority Actions */}
      {(output.keyMilestones || output.priorityActions) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6">
          
          {/* Milestones */}
          {output.keyMilestones && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <div className="flex items-center gap-2 mb-6">
                <Rocket className="w-6 h-6 text-primary-500" />
                <h3 className="text-xl font-bold text-slate-900">Implementation Milestones</h3>
              </div>
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                {output.keyMilestones.map((milestone, idx) => (
                  <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-primary-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2" />
                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                      <div className="font-bold text-primary-600 text-sm mb-1">{milestone.split(':')[0]}</div>
                      <div className="text-slate-600 text-sm leading-relaxed">{milestone.split(':').slice(1).join(':') || milestone}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Priority Actions */}
          {output.priorityActions && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <div className="flex items-center gap-2 mb-6">
                <Target className="w-6 h-6 text-pink-500" />
                <h3 className="text-xl font-bold text-slate-900">Priority Actions</h3>
              </div>
              <div className="space-y-4">
                {output.priorityActions.map((action, idx) => (
                  <div key={idx} className="flex gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50 hover:border-pink-200 hover:bg-pink-50/50 transition-colors">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-pink-100 text-pink-600 font-bold text-sm shrink-0">
                      {idx + 1}
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Deep Dive Report */}
      {output.detailedReport && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mt-8">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <Briefcase className="w-6 h-6 text-primary-500" />
            <h3 className="text-2xl font-bold text-slate-900">Comprehensive Development Plan</h3>
          </div>
          <div className="prose prose-slate max-w-none prose-headings:text-primary-900 prose-a:text-primary-600">
            <ReactMarkdown>{output.detailedReport}</ReactMarkdown>
          </div>
        </div>
      )}

    </div>
  );
}
