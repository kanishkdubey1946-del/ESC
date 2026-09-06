import { ThinkingOrb } from './thinking-orbs'
import type { OrbState } from './thinking-orbs'

export type OrbLoaderProps = { className?: string; state?: OrbState }

export function OrbLoader({ className = '', state = 'working' }: OrbLoaderProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center align-middle [&_canvas]:!h-full [&_canvas]:!w-full [&>span]:!h-full [&>span]:!w-full ${className.replace(/\S*animate-spin\S*/g, '')}`}
    >
      <ThinkingOrb state={state} size={20} theme="auto" />
    </span>
  )
}
