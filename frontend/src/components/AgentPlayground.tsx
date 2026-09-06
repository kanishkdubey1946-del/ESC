import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Search, Sparkles } from 'lucide-react';
import { ThinkingOrb } from './ui/thinking-orbs';
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
  'bg-[#b7a1f8]/[0.08] text-[#b7a1f8]',
  'bg-[#cadb9c]/[0.07] text-[#bdcb9e]',
  'bg-[#92b7cc]/[0.08] text-[#a0becf]',
  'bg-[#d4ad92]/[0.08] text-[#c7b09f]',
];

/**
 * A mode-aware catalogue. Quick Launch deliberately hands off to the existing
 * workspace companion rather than creating a disconnected second chat.
 */
export default function AgentPlayground({ mode, onQuickLaunch }: AgentPlaygroundProps) {
  const [query, setQuery] = useState('');
  const reduceMotion = useReducedMotion();
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

  const heading = isLearningMode ? 'A specialist for every aha moment.' : 'Meet your specialist team.';
  const subheading = isLearningMode
    ? 'Understand the difficult bits. Find your next step. Your learning team is one conversation away.'
    : 'Choose a focused AI expert for a dedicated conversation.';

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-y-auto bg-[#101114] p-5 text-[#f2f0f7] sm:p-8 lg:p-10" data-theme="dark">
      <div className="mx-auto w-full max-w-[1180px] pb-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-[580px]">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b7a1f8]">
              <Sparkles size={13} aria-hidden="true" /> Your AI study team
            </p>
            <h1 className="mt-3 text-[30px] font-medium leading-tight tracking-[-0.04em] sm:text-[36px]">{heading}</h1>
            <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-[#96949f]">{subheading}</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] py-1.5 pl-2 pr-5">
            <ThinkingOrb state="listening" size={64} theme="dark" />
            <div>
              <p className="text-xs font-medium text-[#d6d0e4]">{allSpecialists.length} focused specialists</p>
              <p className="mt-1 text-[11px] text-[#96949f]">One connected study space</p>
            </div>
          </div>
        </div>

        <div className="mb-6 mt-9 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] pb-5">
        <label className="flex w-full max-w-[360px] items-center gap-3 rounded-xl border border-white/[0.08] bg-[#191a20] px-4 py-3 transition focus-within:border-[#b7a1f8]/50 focus-within:ring-2 focus-within:ring-[#b7a1f8]/10">
          <Search className="h-4 w-4 shrink-0 text-[#777480]" aria-hidden="true" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            className="w-full bg-transparent text-xs text-[#e6e1ef] outline-none placeholder:text-[#777480]"
            placeholder="Find your specialist..."
            aria-label="Search specialists by name, responsibility, or tag"
          />
        </label>
        <p className="text-[11px] text-[#96949f]" role="status">{specialists.length} {specialists.length === 1 ? 'specialist' : 'specialists'} {query ? 'found' : 'ready to help'}</p>
        </div>

        {specialists.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {specialists.map((specialist, index) => {
              const Icon = specialist.icon;
              return (
                <motion.article
                  key={specialist.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduceMotion ? 0 : Math.min(index * 0.025, 0.2), duration: 0.25 }}
                  whileHover={reduceMotion ? undefined : { y: -3 }}
                  className="group flex flex-col rounded-[20px] border border-white/[0.07] bg-[#191a20] p-5 transition-colors hover:border-[#b7a1f8]/20 hover:bg-[#1c1c24] sm:p-6"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${TAG_TONES[index % TAG_TONES.length]}`}>
                      <Icon className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#777480]">{String(index + 1).padStart(2, '0')} / ESC</span>
                  </div>
                  <h2 className="text-[16px] font-semibold tracking-[-0.02em]">{specialist.name}</h2>
                  <p className="mt-2 min-h-[60px] text-[12px] leading-[1.8] text-[#96949f]">{specialist.responsibility}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {specialist.tags.map((tag, tagIndex) => (
                      <span key={tag} className={`rounded-md px-2 py-1 text-[10px] font-medium ${TAG_TONES[(index + tagIndex) % TAG_TONES.length]}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mb-5 mt-5 flex-1 rounded-xl border border-white/[0.035] bg-[#101114]/50 p-3.5">
                    <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#777480]">Try asking</p>
                    <p className="text-[11px] leading-[1.8] text-[#b1acbc]">“{specialist.tryPrompt}”</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onQuickLaunch(specialist)}
                    className="flex w-full items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-xs font-medium text-[#d8ccec] transition hover:border-[#b7a1f8]/30 hover:bg-[#b7a1f8]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b7a1f8]"
                  >
                    Quick Launch
                    <ArrowUpRight size={15} className="text-[#96949f] transition group-hover:text-[#b7a1f8]" aria-hidden="true" />
                  </button>
                </motion.article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[20px] border border-dashed border-white/10 bg-[#191a20] px-8 py-16 text-center">
            <Search size={22} className="mx-auto mb-4 text-[#777480]" aria-hidden="true" />
            <p className="text-sm text-[#d5cfdf]">No specialists match “{query}”.</p>
            <p className="mt-2 text-xs text-[#96949f]">Try a name, subject, or skill you'd like to work on.</p>
          </div>
        )}
      </div>
    </div>
  );
}
