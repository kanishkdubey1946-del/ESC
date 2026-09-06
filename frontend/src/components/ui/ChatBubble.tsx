import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, Copy } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AIStatus } from './AIStatus'
import { ThinkingOrb } from './thinking-orbs'

export type ChatBubbleProps = {
  role: 'user' | 'assistant'
  text: string
  name?: string
  streaming?: boolean
  children?: ReactNode
}

export function ChatBubble({ role, text, name, streaming = false, children }: ChatBubbleProps) {
  const reduceMotion = useReducedMotion()
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const assistant = role === 'assistant'

  useEffect(() => () => clearTimeout(copyTimeout.current), [])

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setCopyError(false)
      clearTimeout(copyTimeout.current)
      copyTimeout.current = setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopyError(true)
    }
  }

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      aria-label={`${name || (assistant ? 'ESC' : 'You')} message`}
      className={`group flex w-full gap-3 py-4 ${assistant ? '' : 'justify-end'}`}
    >
      {assistant && (
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-[#211e2a]" aria-hidden="true">
          <ThinkingOrb state={streaming ? 'composing' : 'listening'} size={20} theme="dark" />
        </div>
      )}
      <div className={`min-w-0 ${assistant ? 'w-full max-w-[760px]' : 'max-w-[85%] sm:max-w-[75%]'}`}>
        <div className={`mb-2 flex items-center gap-2 ${assistant ? '' : 'justify-end'}`}>
          <span className="text-xs font-medium text-[#c9c6d2]">{name || (assistant ? 'ESC' : 'You')}</span>
          {assistant && <span className="rounded-md bg-[#b7a1f8]/10 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-[#b7a1f8]">STUDY COMPANION</span>}
        </div>
        <div className={assistant ? 'py-0.5' : 'rounded-[20px] rounded-tr-md border border-white/[0.07] bg-[#24242c] px-5 py-3.5'}>
          {text && (
            <div className="prose prose-sm prose-invert max-w-none break-words text-[14px] leading-[1.85] text-[#d5d2de] prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-[#f2f0f7] prose-p:my-2 prose-a:text-[#cbb6ff] prose-a:decoration-[#b7a1f8]/40 prose-a:underline-offset-4 prose-strong:font-semibold prose-strong:text-[#ede9f6] prose-pre:border prose-pre:border-white/10 prose-pre:bg-[#111216] prose-code:text-[#d1bfff] prose-blockquote:border-[#b7a1f8]/40 prose-blockquote:text-[#b7b4c2] prose-th:border-white/10 prose-td:border-white/10">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
            </div>
          )}
          {streaming && <AIStatus state="composing" label={text ? 'Still writing' : 'Putting your answer together'} compact className="mt-3" />}
          {children}
        </div>
        {assistant && text && !streaming && (
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={copyText}
              aria-label={copied ? 'Answer copied' : 'Copy answer'}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] text-[#96949f] transition hover:bg-white/5 hover:text-[#e5dff2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b7a1f8]"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
            </button>
            {copyError && <span role="status" className="text-xs text-[#e4bba4]">Select the answer to copy it.</span>}
          </div>
        )}
      </div>
    </motion.article>
  )
}
