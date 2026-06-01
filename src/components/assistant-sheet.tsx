"use client"

import { useEffect, useState } from "react"
import { Sparkles, X, ArrowUp } from "lucide-react"
import { cn } from "@/lib/utils"
import AIChatPanel from "@/components/AIChatPanel"
import type { AIPanelData } from "@/components/bottom-nav"

type AssistantSheetProps = {
  open: boolean
  onClose: () => void
  aiPanelData?: AIPanelData
}

const SUGGESTIONS = [
  "Summarize my latest paper results",
  "Which section needs most improvement?",
  "Generate practice questions for me",
  "How can I improve my essay score?",
]

export function AssistantSheet({ open, onClose, aiPanelData }: AssistantSheetProps) {
  const [mounted, setMounted] = useState(false)
  const [started, setStarted] = useState(false)

  // Keep node mounted briefly so exit transition can play
  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    const t = setTimeout(() => {
      setMounted(false)
      setStarted(false)
    }, 350)
    return () => clearTimeout(t)
  }, [open])

  // Lock background scroll while open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  const handleSuggestion = (text: string) => {
    setStarted(true)
  }

  const handleStartChat = () => setStarted(true)

  if (!mounted && !open) return null

  return (
    <div className="fixed inset-0 z-[60]" aria-hidden={!open}>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close assistant"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-out",
          open ? "opacity-100" : "opacity-0",
        )}
      />

      {/* ── MOBILE: bottom sheet / DESKTOP: right side floating panel ── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="AI Assistant"
        className={cn(
          "absolute flex flex-col",
          // ── Adjusted Glassmorphism Look (Less transparent, less blurry) ──
          "border border-white/60 bg-white/85 backdrop-blur-xl backdrop-saturate-100",
          // ── MOBILE styles (default) ───────────────────────────────────
          "inset-x-0 bottom-0 mx-auto h-[90dvh] max-w-md",
          "rounded-t-[2rem]",
          "shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.8)]",
          // ── DESKTOP overrides (sm:) ───────────────────────────────────
          // Right floating panel: 4 units from right, top, and bottom
          "sm:inset-x-auto sm:inset-y-4 sm:right-4 sm:bottom-4 sm:top-4",
          "sm:h-[calc(100vh-2rem)] sm:w-[420px] sm:max-w-[420px]",
          // Full rounded corners for floating look
          "sm:rounded-[2rem]", 
          "sm:shadow-[-16px_16px_48px_-12px_rgba(0,0,0,0.22),inset_1px_1px_0_0_rgba(255,255,255,0.8)]",
          // ── Transition ────────────────────────────────────────────────
          "transition-transform duration-300 ease-out will-change-transform",
          // mobile: slide up ↑  |  desktop: slide in from right →
          open
            ? "translate-y-0 sm:translate-x-0"
            : "translate-y-full sm:translate-y-0 sm:translate-x-[110%]", // move fully off-screen right
        )}
      >
        {/* Grab handle — mobile only */}
        <div className="flex justify-center pt-3 shrink-0 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-neutral-300" aria-hidden="true" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 pt-3 sm:pt-5 shrink-0 border-b border-neutral-200/50">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white shadow-[0_8px_16px_-6px_rgba(0,0,0,0.5)]">
              <Sparkles className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold leading-tight tracking-tight text-black">AI Study Assistant</h2>
              <p className="text-xs font-medium text-neutral-500">
                {aiPanelData ? `Hi ${aiPanelData.studentName.split(" ")[0]} 👋` : "Always here to help"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition-colors duration-200 hover:bg-neutral-200 hover:text-black"
          >
            <X className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {!started ? (
            /* Landing / suggestion screen */
            <div className="flex-1 overflow-y-auto px-5">
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white shadow-[0_12px_28px_-8px_rgba(0,0,0,0.45)]">
                  <Sparkles className="h-7 w-7" strokeWidth={2} aria-hidden="true" />
                </span>
                <h3 className="text-balance text-base font-semibold tracking-tight text-black">
                  How can I help you today?
                </h3>
                <p className="max-w-xs text-pretty text-sm leading-relaxed text-neutral-500">
                  Ask me anything about your papers, practicals, or exam tips.
                </p>

                {/* Quick stats */}
                {aiPanelData && (
                  <div className="flex items-center gap-3 mt-1">
                    <div className="rounded-xl border border-neutral-200 bg-white/90 px-3 py-2 text-center backdrop-blur-sm">
                      <p className="text-xs text-neutral-500">Avg Score</p>
                      <p className="text-lg font-black text-black">{aiPanelData.avgTotal}</p>
                    </div>
                    <div className="rounded-xl border border-neutral-200 bg-white/90 px-3 py-2 text-center backdrop-blur-sm">
                      <p className="text-xs text-neutral-500">MCQ Avg</p>
                      <p className="text-lg font-black text-black">{aiPanelData.avgMcqPct}%</p>
                    </div>
                    <div className="rounded-xl border border-neutral-200 bg-white/90 px-3 py-2 text-center backdrop-blur-sm">
                      <p className="text-xs text-neutral-500">Papers</p>
                      <p className="text-lg font-black text-black">{aiPanelData.papers.length}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Suggestions */}
              <div className="grid grid-cols-1 gap-2 pb-6">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSuggestion(s)}
                    className={cn(
                      "flex items-center justify-between rounded-2xl border border-neutral-200 bg-white/70 px-4 py-3 text-left",
                      "text-sm font-medium text-black transition-all duration-200 hover:border-black/30 hover:bg-white active:scale-[0.98]",
                    )}
                  >
                    <span>{s}</span>
                    <ArrowUp className="h-4 w-4 shrink-0 rotate-45 text-neutral-400" strokeWidth={2.2} aria-hidden="true" />
                  </button>
                ))}

                <button
                  type="button"
                  onClick={handleStartChat}
                  className="mt-1 flex items-center justify-center gap-2 rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-neutral-800 active:scale-[0.98]"
                >
                  <Sparkles className="h-4 w-4" strokeWidth={2.2} />
                  Start chatting
                </button>
              </div>
            </div>
          ) : (
            /* Full AIChatPanel */
            <div className="flex-1 overflow-hidden min-h-0 pb-2">
              {aiPanelData ? (
                <AIChatPanel
                  studentName={aiPanelData.studentName}
                  studentId={aiPanelData.studentId}
                  classRank={aiPanelData.classRank}
                  classSize={aiPanelData.classSize}
                  avgTotal={aiPanelData.avgTotal}
                  avgMcqPct={aiPanelData.avgMcqPct}
                  avgStrPct={aiPanelData.avgStrPct}
                  avgEssPct={aiPanelData.avgEssPct}
                  papers={aiPanelData.papers}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                  No student data available.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}