import { useReducedMotion } from 'framer-motion'
import { ThinkingOrb as AnimatedThinkingOrb } from 'thinking-orbs'
import type { ThinkingOrbProps } from 'thinking-orbs'

export type { ThinkingOrbProps, OrbState, OrbSize, OrbTheme } from 'thinking-orbs'

export function ThinkingOrb(props: ThinkingOrbProps) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return (
      <span
        aria-hidden="true"
        className="inline-block shrink-0 rounded-full"
        style={{
          width: props.size || 64,
          height: props.size || 64,
          background: 'radial-gradient(circle at 35% 28%, #ede4ff 0%, #b7a1f8 25%, #64537d 52%, #24222d 76%)',
          boxShadow: 'inset -3px -4px 10px #10111480, 0 0 16px #b7a1f820',
        }}
      />
    )
  }

  return <AnimatedThinkingOrb {...props} />
}

export default ThinkingOrb
