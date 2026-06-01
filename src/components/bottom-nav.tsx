"use client"

import { Sparkles, LayoutDashboard, FileText, FlaskConical, HelpCircle, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { AssistantSheet } from "@/components/assistant-sheet"
import { useState } from "react"

export type NavTab = "overview" | "papers" | "practical" | "questions" | "ai"

type NavItem = {
  label: string
  icon: LucideIcon
  tab: NavTab
}

const LEFT_ITEMS: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, tab: "overview" },
  { label: "Papers",   icon: FileText,        tab: "papers"   },
]

const RIGHT_ITEMS: NavItem[] = [
  { label: "Practical", icon: FlaskConical, tab: "practical" },
  { label: "Questions", icon: HelpCircle,   tab: "questions" },
]

export type AIPanelData = {
  studentName: string
  studentId: string
  classRank: number
  classSize: number
  avgTotal: number
  avgMcqPct: number
  avgStrPct: number
  avgEssPct: number
  papers: {
    name: string
    total: number
    mcqPct: number
    structuredPct: number
    essayPct: number
  }[]
}

type BottomNavProps = {
  activeTab: NavTab
  onTabChange: (tab: NavTab) => void
  aiPanelData: AIPanelData
}

export function BottomNav({ activeTab, onTabChange, aiPanelData }: BottomNavProps) {
  const [assistantOpen, setAssistantOpen] = useState(false)

  const renderItem = (item: NavItem) => {
    const isActive = activeTab === item.tab
    const Icon = item.icon
    return (
      <button
        key={item.label}
        type="button"
        onClick={() => onTabChange(item.tab)}
        aria-current={isActive ? "page" : undefined}
        className="group relative flex flex-1 flex-col items-center gap-1 px-1 outline-none"
      >
        <span
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-300 ease-out",
            isActive
              ? "-translate-y-2 bg-black text-white shadow-[0_8px_16px_-6px_rgba(0,0,0,0.45)]"
              : "translate-y-0 bg-transparent text-neutral-500 group-hover:-translate-y-0.5 group-hover:text-black",
          )}
        >
          <Icon
            className="h-5 w-5 transition-transform duration-300 ease-out group-active:scale-90"
            strokeWidth={isActive ? 2.4 : 2}
            aria-hidden="true"
          />
        </span>
        <span
          className={cn(
            "text-[11px] leading-none tracking-tight transition-all duration-300 ease-out",
            isActive
              ? "-translate-y-1.5 font-semibold text-black"
              : "translate-y-0 font-medium text-neutral-400 group-hover:text-black",
          )}
        >
          {item.label}
        </span>
      </button>
    )
  }

  const aiActive = activeTab === "ai"

  return (
    <>
      <nav
        aria-label="Primary"
        className="sm:hidden fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="relative w-full max-w-md">
          {/* Center AI Assistant FAB — floats above the bar */}
          <div className="pointer-events-none absolute inset-x-0 -top-7 z-10 flex justify-center">
            <button
              type="button"
              onClick={() => {
                onTabChange("ai")
                setAssistantOpen(true)
              }}
              aria-current={aiActive ? "page" : undefined}
              aria-haspopup="dialog"
              aria-expanded={assistantOpen}
              aria-label="AI Assistant"
              className="group pointer-events-auto flex flex-col items-center outline-none"
            >
              <span className="relative flex items-center justify-center">
                {/* soft glow halo */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute h-16 w-16 rounded-full bg-black/30 blur-xl transition-opacity duration-300 ease-out",
                    aiActive ? "opacity-100" : "opacity-0 group-hover:opacity-70",
                  )}
                />
                <span
                  className={cn(
                    "relative flex h-16 w-16 items-center justify-center rounded-full transition-all duration-300 ease-out",
                    "border-4 border-white/70 bg-black text-white",
                    "shadow-[0_12px_28px_-8px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.3)]",
                    aiActive ? "-translate-y-1 scale-105" : "group-hover:-translate-y-0.5 group-hover:scale-105",
                  )}
                >
                  <Sparkles
                    className="h-7 w-7 transition-transform duration-300 ease-out group-active:scale-90"
                    strokeWidth={aiActive ? 2.4 : 2}
                    aria-hidden="true"
                  />
                </span>
              </span>
              <span
                className={cn(
                  "mt-1 text-[11px] leading-none tracking-tight transition-colors duration-300 ease-out",
                  aiActive ? "font-semibold text-black" : "font-medium text-neutral-500 group-hover:text-black",
                )}
              >
                AI Assistant
              </span>
            </button>
          </div>

          {/* Liquid glass bar */}
          <div
            className={cn(
              "relative flex w-full items-end justify-between gap-1 rounded-[2rem] px-3 py-2",
              "border border-white/40 bg-white/50 backdrop-blur-xl backdrop-saturate-150",
              "shadow-[0_8px_32px_-8px_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.7)]",
            )}
          >
            {/* soft top sheen */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-3 top-0 h-1/2 rounded-t-[2rem] bg-gradient-to-b from-white/50 to-transparent"
            />
            <div className="flex flex-1 justify-around">
              {LEFT_ITEMS.map(renderItem)}
            </div>
            {/* spacer for center FAB */}
            <div aria-hidden="true" className="w-16 shrink-0" />
            <div className="flex flex-1 justify-around">
              {RIGHT_ITEMS.map(renderItem)}
            </div>
          </div>
        </div>
      </nav>

      <AssistantSheet
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        aiPanelData={aiPanelData}
      />
    </>
  )
}