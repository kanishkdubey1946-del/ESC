import { useState } from 'react';
import { 
  FileText, 
  Megaphone, 
  Share2, 
  MapPin, 
  ClipboardList, 
  Building2, 
  AlertCircle, 
  MessageSquare,
  Copy,
  Hash,
  Heart,
  LayoutTemplate,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { CommunicationOutput } from '../../types/agents';

interface CommunicationWorkspaceProps {
  data: Record<string, unknown>;
}

export default function CommunicationWorkspace({ data }: CommunicationWorkspaceProps) {
  const output = data as unknown as CommunicationOutput;
  const [activeChannel, setActiveChannel] = useState(output.channels?.[0]?.channel || '');
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null);

  const getChannelIcon = (channel: string) => {
    switch (channel.toLowerCase()) {
      case 'public notice': return <FileText className="w-4 h-4" />;
      case 'press release': return <Megaphone className="w-4 h-4" />;
      case 'social media post': return <Share2 className="w-4 h-4" />;
      case 'ward update': return <MapPin className="w-4 h-4" />;
      case 'meeting summary': return <ClipboardList className="w-4 h-4" />;
      case 'government report': return <Building2 className="w-4 h-4" />;
      case 'citizen advisory': return <AlertCircle className="w-4 h-4" />;
      case 'sms alert': return <MessageSquare className="w-4 h-4" />;
      default: return <LayoutTemplate className="w-4 h-4" />;
    }
  };

  const activeContent = output.channels?.find(c => c.channel === activeChannel);

  return (
    <div className="flex flex-col h-full bg-slate-50 p-6">
      
      {/* Top Navigation Pills */}
      <div className="flex items-center gap-3 overflow-x-auto pb-4 mb-4 scrollbar-hide border-b border-slate-200">
        {output.channels?.map((c) => {
          const isActive = c.channel === activeChannel;
          return (
            <button
              key={c.channel}
              onClick={() => setActiveChannel(c.channel)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap border ${
                isActive 
                  ? 'bg-white text-sky-600 border-sky-200 shadow-sm ring-1 ring-sky-100' 
                  : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              {getChannelIcon(c.channel)}
              {c.channel}
              <span className={`ml-1 px-1.5 py-0.5 rounded-md text-xs ${isActive ? 'bg-sky-100 text-sky-700' : 'bg-slate-200 text-slate-500'}`}>
                {c.entries?.length || 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeContent && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-4">
            {activeContent.entries?.map((entry, idx) => (
              <div 
                key={idx} 
                className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition-shadow"
              >
                {/* Card Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-sky-700 font-bold text-sm">
                    {getChannelIcon(activeContent.channel)}
                    {activeContent.channel}
                  </div>
                  <button className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-50 transition-colors">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col">
                  {/* Key Message */}
                  <div className="bg-yellow-50 rounded-lg p-3 mb-4 border border-yellow-100">
                    <div className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1 flex items-center gap-1">
                      📢 Key Message
                    </div>
                    <p className="text-amber-900 font-medium text-sm leading-relaxed">
                      {entry.keyMessage || entry.title}
                    </p>
                  </div>

                  {/* Body */}
                  <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap flex-1 mb-6">
                    {entry.body}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 mb-6">
                    <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors">
                      <Copy className="w-3.5 h-3.5" /> Copy Content
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors">
                      <Hash className="w-3.5 h-3.5" /> Copy Tags
                    </button>
                  </div>

                  {/* Required Action Box */}
                  {entry.actionRequired && (
                    <div className="bg-sky-50 rounded-lg p-4 border border-sky-100 mb-4">
                      <div className="text-[10px] font-bold text-sky-700 uppercase tracking-widest mb-1 flex items-center gap-1">
                        → Required Action
                      </div>
                      <p className="text-sky-900 font-medium text-sm leading-relaxed">
                        {entry.actionRequired}
                      </p>
                    </div>
                  )}

                  {/* Expander Toggle */}
                  <button 
                    onClick={() => setExpandedEntry(expandedEntry === idx ? null : idx)}
                    className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors py-2 border-t border-slate-100 mt-2"
                  >
                    {expandedEntry === idx ? (
                      <><ChevronUp className="w-4 h-4" /> Hide Details</>
                    ) : (
                      <><ChevronDown className="w-4 h-4" /> Show Details</>
                    )}
                  </button>

                  {/* Expanded Content Area */}
                  {expandedEntry === idx && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-4 animate-in slide-in-from-top-2 duration-200">
                      
                      {/* Versions */}
                      {(entry.formalVersion || entry.simplifiedVersion) && (
                        <div className="space-y-3">
                          <div className="text-[10px] font-bold text-slate-500 uppercase">Language Versions</div>
                          {entry.formalVersion && (
                            <div className="text-sm text-slate-700 bg-white border border-slate-200 p-2 rounded">
                              <span className="text-xs font-bold text-slate-400 block mb-1">Formal Version</span>
                              {entry.formalVersion}
                            </div>
                          )}
                          {entry.simplifiedVersion && (
                            <div className="text-sm text-slate-700 bg-white border border-slate-200 p-2 rounded">
                              <span className="text-xs font-bold text-slate-400 block mb-1">Simplified Version</span>
                              {entry.simplifiedVersion}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Metadata */}
                      {(entry.audience || entry.language || entry.urgencyTag) && (
                        <div className="bg-primary-50 rounded-lg p-3 border border-primary-100">
                           <div className="text-[10px] font-bold text-primary-500 uppercase mb-2">Distribution Details</div>
                           {entry.audience && <div className="text-xs font-medium text-primary-900"><span className="text-primary-400">Audience:</span> {entry.audience}</div>}
                           {entry.language && <div className="text-xs font-medium text-primary-900 mt-1"><span className="text-primary-400">Language:</span> {entry.language}</div>}
                           {entry.urgencyTag && <div className="text-xs font-medium text-primary-900 mt-1"><span className="text-primary-400">Priority:</span> {entry.urgencyTag}</div>}
                        </div>
                      )}

                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl flex items-center justify-between">
                  <div className="flex-1 truncate pr-4 text-xs font-medium text-sky-600">
                    {entry.tags?.join(' ')}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-medium text-slate-400">{entry.charCount || entry.body?.length || 0} chars</span>
                    <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                      <Heart className="w-3 h-3 fill-current" /> {entry.score || 85}
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

        {/* Deep Dive Report */}
        {output.detailedReport && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mt-8">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
              <FileText className="w-6 h-6 text-primary-500" />
              <h3 className="text-2xl font-bold text-slate-900">Comprehensive Communication Plan</h3>
            </div>
            <div className="prose prose-slate max-w-none prose-headings:text-primary-900 prose-a:text-primary-600">
              <ReactMarkdown>{output.detailedReport}</ReactMarkdown>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
