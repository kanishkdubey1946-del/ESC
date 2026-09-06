import { ThinkingOrb } from './thinking-orbs'
import type { OrbState } from './thinking-orbs'

export type AIStatusProps = {
  state: OrbState
  label?: string
  size?: 20 | 64
  compact?: boolean
  className?: string
}

export const AI_STATE_LABELS: Record<OrbState, string> = {
  searching: 'Finding the right resources',
  working: 'Making sense of your sources',
  solving: 'Working through your question',
  listening: 'Ready when you are',
  connecting: 'Connecting your ideas',
  weaving: 'Bringing everything together',
  composing: 'Putting your answer together',
  breathing: 'Ready when you are',
  shaping: 'Building your next steps',
}

export function AIStatus({ state, label, size = 20, compact = false, className = '' }: AIStatusProps) {
  const statusLabel = label || AI_STATE_LABELS[state]

  return (
    <span
      className={`inline-flex items-center gap-2.5 ${compact ? '' : 'rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-2'} ${className}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-ai-state={state}
    >
      <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center">
        <ThinkingOrb state={state} size={size} theme="dark" />
      </span>
      <span className="text-xs font-medium leading-relaxed text-[#b7b4c2]">{statusLabel}</span>
    </span>
  )
}
