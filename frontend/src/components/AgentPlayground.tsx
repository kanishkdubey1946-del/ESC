import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Sparkles } from 'lucide-react';
import {
  marketplaceSpecialistsForMode,
  type MarketplaceSpecialist,
  type WorkspaceMode,
} from '../lib/modeAgents';

type AgentPlaygroundProps = {
  mode: WorkspaceMode;
  onQuickLaunch: (specialist: MarketplaceSpecialist) => void;
};

const TAG_TONES = [
  'bg-sky-50 text-sky-700',
  'bg-violet-50 text-violet-700',
  'bg-emerald-50 text-emerald-700',
  'bg-amber-50 text-amber-700',
];

/**
 * A mode-aware catalogue. Quick Launch deliberately hands off to the existing
 * DynamicOrchestrator chat instead of creating a disconnected second chat.
 */
export default function AgentPlayground({ mode, onQuickLaunch }: AgentPlaygroundProps) {
  const [query, setQuery] = useState('');
  const isLearningMode = mode === 'student' || mode === 'playground';
  const allSpecialists = useMemo(() => marketplaceSpecialistsForMode(mode), [mode]);
  const specialists = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return allSpecialists;
    return allSpecialists.filter(specialist => [
      specialist.name,
      specialist.role,
      specialist.responsibility,
      ...specialist.tags,
    ].join(' ').toLowerCase().includes(term));
  }, [allSpecialists, query]);

  const heading = isLearningMode ? 'Talk to a learning specialist' : 'Talk to a specialist';
  const subheading = isLearningMode
    ? 'Choose a focused AI learning expert for personalised study support.'
    : 'Choose one of 12 focused AI experts for a dedicated conversation.';

  return (
    <div className="flex h-full flex-1 overflow-y-auto bg-slate-50 p-6 sm:p-8">
      <div className="mx-auto w-full max-w-6xl">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-primary-600">
          <Sparkles className="h-3.5 w-3.5" /> Agent marketplace
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">{heading}</h1>
        <p className="mt-2 text-sm text-slate-600">{subheading}</p>

        <label className="mt-6 flex max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            className="w-full bg-transparent text-sm outline-none"
            placeholder="Search specialists"
            aria-label="Search specialists"
          />
        </label>

        {specialists.length ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {specialists.map((specialist, index) => {
              const Icon = specialist.icon;
              return (
                <motion.article
                  key={specialist.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-600">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="font-semibold text-slate-900">{specialist.name}</h2>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{specialist.responsibility}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {specialist.tags.map((tag, tagIndex) => (
                      <span key={tag} className={`rounded-md px-2 py-1 text-[11px] font-medium ${TAG_TONES[(index + tagIndex) % TAG_TONES.length]}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="mt-4 text-xs leading-5 text-slate-500"><strong className="font-semibold text-slate-600">Try:</strong> “{specialist.tryPrompt}”</p>
                  <button
                    type="button"
                    onClick={() => onQuickLaunch(specialist)}
                    className="mt-4 w-full rounded-xl border border-primary-200 py-2.5 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                  >
                    Quick Launch
                  </button>
                </motion.article>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No specialists match “{query}”. Try a name, responsibility, or tag.
          </div>
        )}
      </div>
    </div>
  );
}
