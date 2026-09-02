import type { SVGProps } from 'react';
import { Database, ExternalLink, Cpu, Layers, FileCode } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { PublicDataIntelligenceOutput } from '../../types/agents';

interface PublicDataWorkspaceProps {
  data: Record<string, unknown>;
}

export default function PublicDataWorkspace({ data }: PublicDataWorkspaceProps) {
  const output = data as unknown as PublicDataIntelligenceOutput;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* Top Banner: Data Overview */}
      <div className="bg-sky-50 rounded-2xl border border-sky-100 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-sky-900 mb-2 flex items-center gap-2">
            <Database className="w-6 h-6 text-sky-600" /> Public Data Intelligence Dashboard
          </h2>
          <p className="text-sky-700 text-sm">
            {output.dataOverview || "No data overview was generated from available evidence."}
          </p>
        </div>
      </div>

      {/* Data Source Integration Header */}
      <div className="flex items-center gap-2 text-slate-800 font-bold text-lg pt-4">
        <Layers className="w-5 h-5 text-sky-500" /> Data Source Integration
      </div>

      {/* Government Data Portal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Government Datasets Portal */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm flex flex-col hover:border-blue-300 transition-colors relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Cpu className="w-24 h-24" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-4">Government Datasets Portal</h3>
          <p className="text-sm text-slate-600 leading-relaxed flex-1 mb-8">
            Access open government datasets including infrastructure inventories, scheme utilization, budget allocations, and public service records. Integrate directly with PMGSY, JJM, and SBM monitoring dashboards.
          </p>
          <a href="https://data.gov.in" target="_blank" rel="noreferrer" className="text-sky-600 font-bold text-sm flex items-center gap-1 hover:text-sky-700 transition-colors w-fit">
            Open Data.gov.in <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Census & Demographics Portal */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm flex flex-col hover:border-emerald-300 transition-colors relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <DatabaseIcon className="w-24 h-24" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-4">Census & Demographics Portal</h3>
          <p className="text-sm text-slate-600 leading-relaxed flex-1 mb-8">
            Population demographics, literacy rates, occupation patterns, SC/ST statistics, and household data. Cross-reference with citizen complaints for demographic impact analysis.
          </p>
          <a href="https://censusindia.gov.in" target="_blank" rel="noreferrer" className="text-emerald-600 font-bold text-sm flex items-center gap-1 hover:text-emerald-700 transition-colors w-fit">
            Open Census India <ExternalLink className="w-4 h-4" />
          </a>
        </div>

      </div>

      {/* Bottom Grid: Data Pipeline Architecture & Connected Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        
        {/* Data Pipeline Architecture */}
        <div className="lg:col-span-2 bg-[#1e293b] rounded-2xl p-8 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Layers className="w-32 h-32 text-white" />
          </div>
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 relative z-10">
            <Layers className="w-5 h-5 text-slate-300" /> Data Pipeline Architecture
          </h3>
          <p className="text-slate-300 text-sm leading-relaxed relative z-10">
            {output.infrastructureAnalysis || "The data pipeline processes government datasets through ingestion, cleaning, normalization, and cross-referencing stages to produce actionable infrastructure intelligence."}
          </p>
        </div>

        {/* Connected Data Sources */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col">
          <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-sky-500" /> Connected Data Sources
          </h3>
          <div className="space-y-4 flex-1">
            {output.dataSources?.map((source, idx) => (
              <a 
                key={idx} 
                href={source.url || '#'} 
                target="_blank" 
                rel="noreferrer"
                className="block group"
              >
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 hover:border-sky-200 hover:bg-sky-50 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-800 group-hover:text-sky-700">{source.name}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600" />
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    {source.description}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>

      </div>

      {/* Sector-wise Analysis Section */}
      {(output.demographicBreakdown || output.schoolsAnalysis || output.roadsAnalysis || output.hospitalsAnalysis || output.populationInsights || output.waterSupplyAnalysis || output.electricityAnalysis || output.sanitationAnalysis || output.connectivityAnalysis || output.budgetUtilization || output.governmentSchemes) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-8 mt-6">
          <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">
            Sector-wise Data Analysis
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {output.demographicBreakdown && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase mb-2">Demographics & Population</div>
                <p className="text-sm text-slate-600 leading-relaxed">{output.demographicBreakdown}</p>
              </div>
            )}

            {output.roadsAnalysis && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase mb-2">Roads & Connectivity</div>
                <p className="text-sm text-slate-600 leading-relaxed">{output.roadsAnalysis}</p>
              </div>
            )}

            {output.schoolsAnalysis && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase mb-2">Education Infrastructure</div>
                <p className="text-sm text-slate-600 leading-relaxed">{output.schoolsAnalysis}</p>
              </div>
            )}

            {output.hospitalsAnalysis && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase mb-2">Healthcare Facilities</div>
                <p className="text-sm text-slate-600 leading-relaxed">{output.hospitalsAnalysis}</p>
              </div>
            )}

            {output.waterSupplyAnalysis && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase mb-2">Water Supply & Irrigation</div>
                <p className="text-sm text-slate-600 leading-relaxed">{output.waterSupplyAnalysis}</p>
              </div>
            )}

            {output.electricityAnalysis && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase mb-2">Electricity & Power</div>
                <p className="text-sm text-slate-600 leading-relaxed">{output.electricityAnalysis}</p>
              </div>
            )}

            {output.sanitationAnalysis && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase mb-2">Sanitation & Hygiene</div>
                <p className="text-sm text-slate-600 leading-relaxed">{output.sanitationAnalysis}</p>
              </div>
            )}

            {output.connectivityAnalysis && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase mb-2">Digital Connectivity</div>
                <p className="text-sm text-slate-600 leading-relaxed">{output.connectivityAnalysis}</p>
              </div>
            )}

            {output.budgetUtilization && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase mb-2">Budget Utilization</div>
                <p className="text-sm text-slate-600 leading-relaxed">{output.budgetUtilization}</p>
              </div>
            )}

            {output.governmentSchemes && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase mb-2">Active Government Schemes</div>
                <p className="text-sm text-slate-600 leading-relaxed">{output.governmentSchemes}</p>
              </div>
            )}

            {output.populationInsights && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 md:col-span-2">
                <div className="text-xs font-bold text-slate-400 uppercase mb-2">Population Insights & Trends</div>
                <p className="text-sm text-slate-700 leading-relaxed">{output.populationInsights}</p>
              </div>
            )}

            {output.geoMappingData && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 md:col-span-2">
                <div className="text-xs font-bold text-slate-400 uppercase mb-2">Geo-Mapping & Spatial Analysis</div>
                <p className="text-sm text-slate-700 leading-relaxed">{output.geoMappingData}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deep Dive Report */}
      {output.detailedReport && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mt-8">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <FileCode className="w-6 h-6 text-primary-500" />
            <h3 className="text-2xl font-bold text-slate-900">Comprehensive Public Data Report</h3>
          </div>
          <div className="prose prose-slate max-w-none prose-headings:text-primary-900 prose-a:text-primary-600">
            <ReactMarkdown>{output.detailedReport}</ReactMarkdown>
          </div>
        </div>
      )}

    </div>
  );
}

// Inline fallback icon for Database if it wasn't imported (using svg)
function DatabaseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <path d="M3 12A9 3 0 0 0 21 12" />
    </svg>
  );
}
