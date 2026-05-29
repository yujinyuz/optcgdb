import { useState, useEffect, useCallback } from 'react'
import { prefersReducedMotion } from '../lib/spring'

interface AboutModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const [closing, setClosing] = useState(false)
  const reducedMotion = prefersReducedMotion()

  const handleClose = useCallback(() => {
    setClosing(true)
    setTimeout(onClose, reducedMotion ? 100 : 200)
  }, [onClose, reducedMotion])

  // Keyboard: Escape to close
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, handleClose])

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isOpen])

  if (!isOpen) return null

  const overlayStyle = closing
    ? { animation: `modalOverlayOut ${reducedMotion ? 100 : 150}ms var(--ease-out-quart) forwards` }
    : { animation: `modalOverlayIn ${reducedMotion ? 100 : 150}ms var(--ease-out-quart) forwards` }

  const contentStyle = closing
    ? { animation: `modalContentOutSpring ${reducedMotion ? 100 : 200}ms var(--ease-out-quart) forwards` }
    : { animation: `modalContentInSpring ${reducedMotion ? 100 : 250}ms var(--ease-spring-default) forwards` }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
      onClick={handleClose}
      style={overlayStyle}
    >
      <div
        className="relative w-full sm:max-w-md max-h-[85vh] sm:max-h-[80vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white dark:bg-[#1a1d2e] shadow-2xl"
        style={contentStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-[#3a3d4a]" />
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 dark:text-[#64748b] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#25283a] transition-colors z-10"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="px-6 pt-6 pb-8 sm:px-8 sm:pt-8 sm:pb-10">
          {/* Header */}
          <div className="flex items-start gap-3 mb-6">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[#c8963e] to-[#a1762e] flex items-center justify-center shadow-lg shadow-[#c8963e]/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h2 id="about-modal-title" className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                Why I Built This
              </h2>
              <p className="text-xs text-slate-400 dark:text-[#64748b] mt-0.5">
                For players, by players
              </p>
            </div>
          </div>

          {/* Story sections */}
          <div className="space-y-5">
            <StorySection
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 000-7.07m-4.243 2.121a1.5 1.5 0 112.121 2.121 1.5 1.5 0 01-2.121-2.121zM13.5 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              title="The problem"
              delay={reducedMotion ? 0 : 50}
            >
              Other card search tools are great, but they all need internet. Every. Single. Time.
              At locals, at the shop — when a lot of people are on their phones, the network gets congested and everything crawls. I just want to look up a card <em>now</em>, without waiting for a page to load or hoping the connection holds up.
            </StorySection>

            <StorySection
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              }
              title="How it works"
              delay={reducedMotion ? 0 : 150}
            >
              OPTCG Lib stores the entire card database (~10MB) right on your phone. First visit downloads everything;
              after that it works fully offline. Search, filter, browse — no connection needed. It's a <strong>Progressive Web App</strong>,
              so it lives on your home screen like a native app.
            </StorySection>

            <StorySection
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
              title="Built for speed"
              delay={reducedMotion ? 0 : 150}
            >
              The whole thing runs on SQLite in a Web Worker. Type a card name and see results instantly —
              no server round-trips, no loading spinners. It was built for the moment when someone says
              "wait, what does that card do again?" and you need the answer in 3 seconds.
            </StorySection>
          </div>

          {/* Tech footer */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-[#2e303a]">
            <div className="flex items-center justify-between">
              <div className="text-[11px] text-slate-400 dark:text-[#4a5568]">
                Built with React + Tailwind + SQLite
              </div>
              <a
                href="https://github.com/yujinyuz/optcgdb"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-[#4a5568] hover:text-slate-600 dark:hover:text-[#94a3b8] transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                Source
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Story section with stagger ────────────────────────────── */

function StorySection({ icon, title, children, delay = 0 }: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
  delay?: number
}) {
  const reducedMotion = prefersReducedMotion()

  return (
    <div
      style={reducedMotion ? undefined : { animation: `fadeInUp 300ms var(--ease-out-quart) ${delay}ms both` }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 dark:bg-[#13151f] text-[#c8963e]">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
      </div>
      <p className="text-sm text-slate-600 dark:text-[#94a3b8] leading-relaxed pl-8">
        {children}
      </p>
    </div>
  )
}
