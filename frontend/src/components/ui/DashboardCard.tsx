import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

export type DashboardCardProps = {
  children: ReactNode
  title?: string
  eyebrow?: string
  action?: ReactNode
  className?: string
}

export function DashboardCard({ children, title, eyebrow, action, className = '' }: DashboardCardProps) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`relative rounded-[22px] border border-white/[0.07] bg-[#191a20]/90 p-5 shadow-[0_6px_28px_#00000012] backdrop-blur-xl sm:p-6 ${className}`}
    >
      {(title || eyebrow || action) && (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {eyebrow && <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#96949f]">{eyebrow}</p>}
            {title && <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-[#f2f0f7]">{title}</h2>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </motion.section>
  )
}
