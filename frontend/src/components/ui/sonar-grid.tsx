"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface SonarGridProps extends React.ComponentProps<"div"> {
  /** Distance between dots in CSS pixels. */
  spacing?: number
  /** Dot radius at rest, in CSS pixels. */
  dotRadius?: number
  /** Resting dot opacity (0–1). Dots on a wavefront go to 1. */
  baseOpacity?: number
  /** Any CSS color. */
  color?: string
  /** Seconds between ambient pings. Set 0 to disable them. */
  pingEvery?: number
  /** Wavefront speed in CSS pixels per second. */
  speed?: number
  /** Thickness of the wavefront in CSS pixels. */
  ringWidth?: number
  /** How much a dot grows at the wave peak. */
  amplitude?: number
  /** Emit a ping where the user taps or clicks. */
  interactive?: boolean
  /** Maximum simultaneous rings. */
  maxRings?: number
  /** Start with one ring already mid-expansion. */
  seedPing?: boolean
  /** Allowed ambient ping area: [x0, y0, x1, y1]. */
  pingArea?: [number, number, number, number]
}

interface Ring {
  x: number
  y: number
  born: number
}

const MAX_DPR = 2
const TAU = Math.PI * 2

/**
 * Decorative, theme-aware dot field with expanding sonar rings.
 * It pauses off-screen and renders a still grid for reduced-motion users.
 */
export function SonarGrid({
  spacing = 26,
  dotRadius = 1.4,
  baseOpacity = 0.28,
  color,
  pingEvery = 2.4,
  speed = 260,
  ringWidth = 90,
  amplitude = 2.2,
  interactive = true,
  maxRings = 6,
  seedPing = true,
  pingArea = [0.15, 0.2, 0.85, 0.8],
  className,
  children,
  ref,
  ...rest
}: SonarGridProps) {
  const hostRef = React.useRef<HTMLDivElement | null>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const ringsRef = React.useRef<Ring[]>([])
  const refreshRef = React.useRef<() => void>(() => {})

  const opts = React.useRef({ spacing, dotRadius, baseOpacity, pingEvery, speed, ringWidth, amplitude, interactive, maxRings, seedPing, pingArea })
  opts.current = { spacing, dotRadius, baseOpacity, pingEvery, speed, ringWidth, amplitude, interactive, maxRings, seedPing, pingArea }

  const setHost = React.useCallback(
    (node: HTMLDivElement | null) => {
      hostRef.current = node
      if (typeof ref === "function") ref(node)
      else if (ref) ref.current = node
    },
    [ref]
  )

  React.useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    let width = 0
    let height = 0
    let raf = 0
    let timer = 0
    let visible = true
    let seeded = false
    let stroke = ""
    let nextPing = performance.now() + opts.current.pingEvery * 1000

    const readColor = () => {
      stroke = getComputedStyle(canvas).color
    }

    const addRing = (x: number, y: number, born: number) => {
      readColor()
      const rings = ringsRef.current
      rings.push({ x, y, born })
      while (rings.length > opts.current.maxRings) rings.shift()
    }

    const draw = (now: number) => {
      const o = opts.current
      const lifetime = (Math.hypot(width, height) + o.ringWidth) / o.speed
      ringsRef.current = ringsRef.current.filter((ring) => (now - ring.born) / 1000 < lifetime)
      const live = ringsRef.current.map((ring) => {
        const age = (now - ring.born) / 1000
        const radius = age * o.speed
        return { x: ring.x, y: ring.y, radius, reach: radius + o.ringWidth, fade: 1 - age / lifetime }
      })

      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = stroke

      const cols = Math.ceil(width / o.spacing) + 1
      const rows = Math.ceil(height / o.spacing) + 1
      const offsetX = (width - (cols - 1) * o.spacing) / 2
      const offsetY = (height - (rows - 1) * o.spacing) / 2
      const hot: number[] = []

      ctx.globalAlpha = o.baseOpacity
      ctx.beginPath()
      for (let i = 0; i < cols; i += 1) {
        const cx = offsetX + i * o.spacing
        for (let j = 0; j < rows; j += 1) {
          const cy = offsetY + j * o.spacing
          let energy = 0
          for (const ring of live) {
            if (Math.abs(cx - ring.x) > ring.reach || Math.abs(cy - ring.y) > ring.reach) continue
            const distance = Math.abs(Math.hypot(cx - ring.x, cy - ring.y) - ring.radius)
            if (distance >= o.ringWidth) continue
            const progress = 1 - distance / o.ringWidth
            const intensity = progress * progress * (3 - 2 * progress) * ring.fade
            if (intensity > energy) energy = intensity
          }
          if (energy < 0.01) {
            ctx.moveTo(cx + o.dotRadius, cy)
            ctx.arc(cx, cy, o.dotRadius, 0, TAU)
          } else {
            hot.push(cx, cy, energy)
          }
        }
      }
      ctx.fill()

      for (let index = 0; index < hot.length; index += 3) {
        const energy = hot[index + 2] ?? 0
        ctx.globalAlpha = o.baseOpacity + (1 - o.baseOpacity) * energy
        ctx.beginPath()
        ctx.arc(hot[index] ?? 0, hot[index + 1] ?? 0, o.dotRadius * (1 + o.amplitude * energy), 0, TAU)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    const resize = () => {
      const rect = host.getBoundingClientRect()
      width = Math.max(1, Math.round(rect.width))
      height = Math.max(1, Math.round(rect.height))
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (!seeded) {
        seeded = true
        const [x0, y0, x1, y1] = opts.current.pingArea
        if (opts.current.seedPing && !reduceMotion.matches) {
          addRing(width * (x0 + (x1 - x0) * 0.68), height * (y0 + (y1 - y0) * 0.34), performance.now() - 500)
        }
      }
      draw(performance.now())
    }

    const scheduleIdle = (delay: number) => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => tick(performance.now()), Math.max(16, delay))
    }

    const tick = (now: number) => {
      raf = 0
      if (!visible || document.hidden) return
      if (reduceMotion.matches) {
        ringsRef.current = []
        draw(now)
        return
      }
      const o = opts.current
      if (o.pingEvery > 0 && now >= nextPing) {
        const [x0, y0, x1, y1] = o.pingArea
        addRing(width * (x0 + Math.random() * (x1 - x0)), height * (y0 + Math.random() * (y1 - y0)), now)
        nextPing = now + o.pingEvery * 1000
      }
      draw(now)
      if (ringsRef.current.length > 0) raf = requestAnimationFrame(tick)
      else if (o.pingEvery > 0) scheduleIdle(nextPing - now)
    }

    const wake = () => {
      if (!raf) {
        window.clearTimeout(timer)
        raf = requestAnimationFrame(tick)
      }
    }

    refreshRef.current = () => {
      readColor()
      nextPing = Math.min(nextPing, performance.now() + opts.current.pingEvery * 1000)
      wake()
    }

    const onDown = (event: PointerEvent) => {
      if (!opts.current.interactive || reduceMotion.matches) return
      const rect = host.getBoundingClientRect()
      addRing(event.clientX - rect.left, event.clientY - rect.top, performance.now())
      wake()
    }
    const onVisibility = () => {
      if (!document.hidden) wake()
    }

    const resizeObserver = new ResizeObserver(resize)
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? true
        if (visible) wake()
      },
      { threshold: 0 }
    )
    const mutationObserver = new MutationObserver(() => refreshRef.current())

    readColor()
    resize()
    resizeObserver.observe(host)
    intersectionObserver.observe(host)
    mutationObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] })
    host.addEventListener("pointerdown", onDown)
    document.addEventListener("visibilitychange", onVisibility)
    reduceMotion.addEventListener("change", wake)
    wake()

    return () => {
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      mutationObserver.disconnect()
      host.removeEventListener("pointerdown", onDown)
      document.removeEventListener("visibilitychange", onVisibility)
      reduceMotion.removeEventListener("change", wake)
      cancelAnimationFrame(raf)
      window.clearTimeout(timer)
      refreshRef.current = () => {}
    }
  }, [])

  React.useEffect(() => {
    refreshRef.current()
  }, [spacing, dotRadius, baseOpacity, color, pingEvery, speed, ringWidth, amplitude, interactive, maxRings, pingArea])

  return (
    <div
      ref={setHost}
      data-slot="sonar-grid"
      className={cn("relative isolate overflow-hidden", interactive && "cursor-crosshair", className)}
      {...rest}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="text-primary pointer-events-none absolute inset-0 -z-10 size-full"
        style={color ? { color } : undefined}
      />
      {children}
    </div>
  )
}

export default SonarGrid
