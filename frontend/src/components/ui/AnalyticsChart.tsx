import { useId } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ChartNoAxesCombined } from 'lucide-react'

export type AnalyticsChartProps = {
  data: Array<{ label: string; value: number }>
  label?: string
  color?: string
  className?: string
}

export function AnalyticsChart({ data, label = 'Study activity', color = '#b7a1f8', className = '' }: AnalyticsChartProps) {
  const chartId = useId().replace(/:/g, '')
  const reduceMotion = useReducedMotion()
  const validData = data.filter(item => Number.isFinite(item.value))

  if (validData.length === 0) {
    return (
      <div className={`flex min-h-[190px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] px-6 text-center ${className}`}>
        <ChartNoAxesCombined size={22} className="mb-3 text-[#77717f]" aria-hidden="true" />
        <p className="text-sm text-[#c9c6d2]">Your progress starts here</p>
        <p className="mt-1.5 max-w-[240px] text-xs leading-relaxed text-[#96949f]">Complete a study activity to see your {label.toLowerCase()} over time.</p>
      </div>
    )
  }

  const width = 560
  const height = 210
  const padding = { top: 18, right: 20, bottom: 38, left: 36 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const maximum = Math.max(...validData.map(item => Math.max(0, item.value)), 1)
  const baseline = height - padding.bottom
  const points = validData.map((item, index) => ({
    x: padding.left + (validData.length === 1 ? plotWidth / 2 : (index / (validData.length - 1)) * plotWidth),
    y: baseline - (Math.max(0, item.value) / maximum) * plotHeight,
    ...item,
  }))
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const area = `${line} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`
  const labelInterval = Math.max(1, Math.ceil(validData.length / 7))
  const valueFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })

  return (
    <div className={`w-full ${className}`}>
      <svg className="h-auto w-full overflow-visible" viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${chartId}-title ${chartId}-description`}>
        <title id={`${chartId}-title`}>{label}</title>
        <desc id={`${chartId}-description`}>{validData.map(item => `${item.label}: ${valueFormat.format(item.value)}`).join('; ')}</desc>
        <defs>
          <linearGradient id={`${chartId}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.19" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map(fraction => {
          const axisY = baseline - fraction * plotHeight
          return (
            <g key={fraction} aria-hidden="true">
              <line x1={padding.left} x2={width - padding.right} y1={axisY} y2={axisY} stroke="#ffffff" strokeOpacity="0.065" strokeDasharray="3 5" />
              <text x={padding.left - 10} y={axisY + 4} textAnchor="end" fontSize="10" fill="#96949f">{valueFormat.format(maximum * fraction)}</text>
            </g>
          )
        })}
        <path d={area} fill={`url(#${chartId}-fill)`} />
        <motion.path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduceMotion ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        {points.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle cx={point.x} cy={point.y} r="4" fill="#191a20" stroke={color} strokeWidth="2">
              <title>{point.label}: {valueFormat.format(point.value)}</title>
            </circle>
            {(index % labelInterval === 0 || index === points.length - 1) && (
              <text x={point.x} y={height - 12} textAnchor="middle" fontSize="10" fill="#96949f" aria-hidden="true">{point.label}</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}
