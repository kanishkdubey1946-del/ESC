"use client"

import * as React from "react"
import { motion, useReducedMotion } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import BrandMark from "./BrandMark"
import { SonarGrid } from "./sonar-grid"

export type SignInMode = "signin" | "signup"

export interface SignInPageProps {
  mode: SignInMode
  onModeChange: (mode: SignInMode) => void
  onClose: () => void
  heading: string
  description: string
  children: React.ReactNode
  footer?: React.ReactNode
  viewKey?: string
  busy?: boolean
  className?: string
}

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",")

/**
 * Full-screen authentication shell adapted from the 21st.dev sign-in flow.
 * Authentication state and submission stay with the consumer so this visual
 * component never simulates OAuth, verification codes, or account creation.
 */
export function SignInPage({
  mode,
  onModeChange,
  onClose,
  heading,
  description,
  children,
  footer,
  viewKey = mode,
  busy = false,
  className,
}: SignInPageProps) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()

  React.useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== "Tab" || !rootRef.current) return

      const focusable = Array.from(rootRef.current.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((element) => element.offsetParent !== null)
      if (!focusable.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [onClose])

  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      rootRef.current?.querySelector<HTMLElement>("[data-auth-autofocus]")?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [viewKey])

  return (
    <div
      ref={rootRef}
      className={cn("esc-auth-flow", className)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="esc-auth-title"
      aria-describedby="esc-auth-description"
    >
      <div className="esc-auth-flow-grid" aria-hidden="true">
        <SonarGrid
          className="absolute inset-0"
          spacing={24}
          dotRadius={1.05}
          baseOpacity={0.11}
          color="#e8e5ee"
          pingEvery={3.8}
          speed={180}
          ringWidth={104}
          amplitude={1.6}
          interactive
          interactionScope="viewport"
          maxRings={3}
          pingArea={[0.12, 0.12, 0.88, 0.86]}
        />
      </div>
      <div className="esc-auth-flow-atmosphere" aria-hidden="true" />

      <header className="esc-auth-flow-nav">
        <button type="button" className="esc-auth-flow-brand" onClick={onClose} aria-label="Return to ESC home">
          <BrandMark className="esc-auth-flow-logo" />
          <span>ESC</span>
        </button>

        <nav className="esc-auth-flow-links" aria-label="Homepage sections">
          <a href="#specialists" onClick={onClose}>Specialists</a>
          <a href="#how" onClick={onClose}>How it works</a>
          <a href="#modes" onClick={onClose}>Features</a>
        </nav>

        <div className="esc-auth-flow-actions" role="group" aria-label="Authentication mode">
          <button
            type="button"
            className={mode === "signin" ? "is-active" : ""}
            onClick={() => onModeChange("signin")}
            disabled={busy}
            aria-pressed={mode === "signin"}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === "signup" ? "is-active" : ""}
            onClick={() => onModeChange("signup")}
            disabled={busy}
            aria-pressed={mode === "signup"}
          >
            Create account
          </button>
        </div>

        <button type="button" className="esc-auth-flow-close" onClick={onClose} aria-label="Close authentication">
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      <main className="esc-auth-flow-main">
        <motion.div
          key={viewKey}
          className="esc-auth-flow-panel"
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.36, ease: "easeOut" }}
        >
          <h1 id="esc-auth-title">{heading}</h1>
          <p id="esc-auth-description">{description}</p>
          <div className="esc-auth-flow-content">{children}</div>
          {footer && <div className="esc-auth-flow-footer">{footer}</div>}
        </motion.div>
      </main>
    </div>
  )
}

export default SignInPage
