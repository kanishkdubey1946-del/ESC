"use client"

import * as React from "react"
import { ArrowUp, Mic, Square } from "lucide-react"
import { cn } from "@/lib/utils"

export interface PromptInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  onStop?: () => void
  onVoice?: () => void
  busy?: boolean
  listening?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
  identity?: React.ReactNode
  identityLabel?: string
  status?: React.ReactNode
  toolbar?: React.ReactNode
  voiceIndicator?: React.ReactNode
  textareaRef?: React.Ref<HTMLTextAreaElement>
}

function assignRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value)
  else if (ref) ref.current = value
}

/**
 * ESC's source-aware adaptation of the 21st.dev AI chat input.
 *
 * Model routing, sources, voice capture, streaming, and cancellation stay in
 * the parent chat so this component remains a focused, reusable composer UI.
 */
export const PromptInput = React.forwardRef<HTMLDivElement, PromptInputProps>(
  (
    {
      value,
      onChange,
      onSubmit,
      onStop,
      onVoice,
      busy = false,
      listening = false,
      disabled = false,
      placeholder = "Ask anything…",
      className,
      identity,
      identityLabel,
      status,
      toolbar,
      voiceIndicator,
      textareaRef,
    },
    forwardedRef,
  ) => {
    const internalTextareaRef = React.useRef<HTMLTextAreaElement | null>(null)
    const hasPrompt = value.trim().length > 0

    const setTextareaRef = React.useCallback((node: HTMLTextAreaElement | null) => {
      internalTextareaRef.current = node
      assignRef(textareaRef, node)
    }, [textareaRef])

    React.useLayoutEffect(() => {
      const textarea = internalTextareaRef.current
      if (!textarea) return
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 72), 176)}px`
    }, [value])

    const submit = React.useCallback(() => {
      if (disabled || busy || !hasPrompt) return
      onSubmit(value.trim())
    }, [busy, disabled, hasPrompt, onSubmit, value])

    const runPrimaryAction = () => {
      if (busy) {
        onStop?.()
        return
      }
      if (listening) {
        onVoice?.()
        return
      }
      if (hasPrompt) {
        submit()
        return
      }
      onVoice?.()
    }

    const actionLabel = busy
      ? "Stop response"
      : listening
        ? "Stop voice input"
        : hasPrompt
          ? "Send message"
          : "Start voice input"
    const actionDisabled = disabled
      || (busy && !onStop)
      || (listening && !onVoice)
      || (!busy && !listening && !hasPrompt && !onVoice)

    return (
      <div ref={forwardedRef} className={cn("relative w-full", className)}>
        {(identity || identityLabel) && (
          <div
            aria-hidden="true"
            className="esc-ai-input-cap absolute left-5 top-0 z-0 inline-flex h-9 min-w-20 items-center gap-2 rounded-t-[18px] border border-b-0 border-white/[0.09] bg-[#1a1a20]/95 px-3 text-[10px] font-medium tracking-[0.08em] text-white/45 shadow-[0_-10px_35px_rgba(0,0,0,0.2)] backdrop-blur-xl"
          >
            {identity}
            {identityLabel && <span>{identityLabel}</span>}
          </div>
        )}

        <div
          aria-busy={busy}
          className={cn(
            "esc-ai-input-card relative z-10 overflow-visible rounded-[24px] border border-white/[0.1] bg-[#111217]/95",
            "shadow-[0_18px_55px_rgba(0,0,0,0.28),inset_0_1px_rgba(255,255,255,0.025)] backdrop-blur-2xl",
            "transition-[border-color,box-shadow] duration-300 focus-within:border-[#b7a1f8]/45 focus-within:shadow-[0_18px_60px_rgba(0,0,0,0.34),0_0_0_3px_rgba(183,161,248,0.05)]",
            disabled && "opacity-60",
          )}
        >
          {status && (
            <div className="border-b border-white/[0.055] px-4 py-3">
              {status}
            </div>
          )}

          <textarea
            ref={setTextareaRef}
            aria-label="Message ESC"
            value={value}
            rows={1}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                submit()
              }
            }}
            className={cn(
              "esc-ai-input-textarea block max-h-44 min-h-[72px] w-full resize-none overflow-y-auto bg-transparent px-5 pb-2 pt-4",
              "text-[13px] leading-6 text-[#e8e4ed] outline-none placeholder:text-[#777381]",
              "disabled:cursor-not-allowed",
            )}
          />

          <div className="flex min-h-14 items-center justify-between gap-3 px-3 pb-3 pt-1">
            <div className="flex min-w-0 items-center gap-1.5">{toolbar}</div>

            <button
              type="button"
              aria-label={actionLabel}
              aria-pressed={listening || undefined}
              disabled={actionDisabled}
              onClick={runPrimaryAction}
              className={cn(
                "esc-ai-input-action grid size-11 shrink-0 place-items-center rounded-full bg-[#c5ade8] text-[#241c2b] shadow-[0_7px_20px_rgba(176,143,224,0.2)]",
                "transition duration-200 hover:-translate-y-0.5 hover:bg-[#d2bcf1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5ade8]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111217] active:translate-y-0",
                "disabled:cursor-not-allowed disabled:opacity-35 sm:size-9",
              )}
            >
              {busy
                ? <Square size={13} fill="currentColor" aria-hidden="true" />
                : listening && voiceIndicator
                  ? voiceIndicator
                  : hasPrompt
                    ? <ArrowUp size={18} aria-hidden="true" />
                    : <Mic size={16} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>
    )
  },
)

PromptInput.displayName = "PromptInput"

export default PromptInput
