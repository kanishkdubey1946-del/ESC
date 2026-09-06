import { motion, useReducedMotion } from 'framer-motion'

export type ProgressBarProps = {
  value: number
  max?: number
  label?: string
  detail?: string
  className?: string
}

export function ProgressBar({ value, max = 100, label, detail, className = '' }: ProgressBarProps) {
  const reduceMotion = useReducedMotion()
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100
  const safeValue = Number.isFinite(value) ? Math.min(Math.max(value, 0), safeMax) : 0
  const percentage = (safeValue / safeMax) * 100

  return (
    <div className={className}>
      {(label || detail) && (
        <div className="mb-2.5 flex items-center justify-between gap-4 text-xs">
          {label && <span className="text-[#c9c6d2]">{label}</span>}
          {detail && <span className="ml-auto font-medium tabular-nums text-[#96949f]">{detail}</span>}
        </div>
      )}
      <div
        className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]"
        role="progressbar"
        aria-label={label || 'Study progress'}
        aria-valuenow={safeValue}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuetext={detail || `${Math.round(percentage)}%`}
      >
        <motion.div
          initial={reduceMotion ? false : { width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: reduceMotion ? 0 : 0.65, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-[#9880df] to-[#c8b9ef]"
        />
      </div>
    </div>
  )
}
