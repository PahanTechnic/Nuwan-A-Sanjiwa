'use client'

import { useEffect, useState } from 'react'
import { BottomNav, type NavTab } from '@/components/bottom-nav'
import { AssistantSheet } from '@/components/assistant-sheet'
import { createClient } from '@/lib/supabase/client'
import {
  Card, CardContent, CardDescription,
  CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer, ChartTooltip,
  ChartTooltipContent, type ChartConfig,
} from '@/components/ui/chart'
import {
  LineChart, Line, AreaChart, Area, CartesianGrid, XAxis, YAxis,
  RadialBarChart, RadialBar, PolarGrid,
  BarChart, Bar, Cell, ResponsiveContainer, LabelList,
} from 'recharts'
import {
  Trophy, TrendingUp, FileText, Activity,
  Wifi, WifiOff, LogOut, Brain, Users, Menu, X, Sparkles,
  FlaskConical, Wrench, LayoutDashboard, BookOpen, HelpCircle, Bot,
} from 'lucide-react'

// ── Marking scheme ────────────────────────────────────────────────────────────
const MCQ_QUESTIONS   = 50
const MCQ_PER_Q       = 0.7
const MCQ_MAX         = MCQ_QUESTIONS * MCQ_PER_Q  // 35

const SQ_COUNT        = 4
const SQ_PER_Q        = 75
const SQ_MAX          = SQ_COUNT * SQ_PER_Q        // 300

const EQ_COUNT        = 4
const EQ_PER_Q        = 100
const EQ_MAX          = EQ_COUNT * EQ_PER_Q        // 400

const PAPER2_RAW_MAX  = SQ_MAX + EQ_MAX            // 700
const PAPER2_SCALED   = 35
const P2_DIVISOR      = PAPER2_RAW_MAX / PAPER2_SCALED  // 20

const PRACTICAL_MAX   = 30

// ── Types ─────────────────────────────────────────────────────────────────────
interface DashboardUIProps {
  studentName: string
  studentId: string
  studentDbId: string
  initialMarks: any[]
}

interface PaperData {
  name: string
  mcq: number
  mcqScaled: number
  mcqPct: number
  sq1: number; sq2: number; sq3: number; sq4: number
  structured: number
  structuredPct: number
  es1: number; es2: number; es3: number; es4: number
  essay: number
  essayPct: number
  paper2Raw: number
  paper2Scaled: number
  paper2Pct: number
  practical: number
  practicalPct: number
  total: number
}

// Use NavTab from bottom-nav so both stay in sync
type Tab = NavTab

// ── buildChartData ────────────────────────────────────────────────────────────
function buildChartData(marks: any[]): PaperData[] {
  return marks.map((m) => {
    const mcq        = Number(m.mcq_score) || 0
    const mcqScaled  = Number((mcq * MCQ_PER_Q).toFixed(2))
    const mcqPct     = Number(((mcqScaled / MCQ_MAX) * 100).toFixed(1))

    const sq1 = Number(m.seq_q1) || 0
    const sq2 = Number(m.seq_q2) || 0
    const sq3 = Number(m.seq_q3) || 0
    const sq4 = Number(m.seq_q4) || 0
    const structured    = sq1 + sq2 + sq3 + sq4
    const structuredPct = Number(((structured / SQ_MAX) * 100).toFixed(1))

    const es1 = Number(m.ess_q1) || 0
    const es2 = Number(m.ess_q2) || 0
    const es3 = Number(m.ess_q3) || 0
    const es4 = Number(m.ess_q4) || 0
    const essay    = es1 + es2 + es3 + es4
    const essayPct = Number(((essay / EQ_MAX) * 100).toFixed(1))

    const paper2Raw    = structured + essay
    const paper2Scaled = Number((paper2Raw / P2_DIVISOR).toFixed(2))
    const paper2Pct    = Number(((paper2Raw / PAPER2_RAW_MAX) * 100).toFixed(1))

    const practical    = Number(m.practical_score) || 0
    const practicalPct = Number(((practical / PRACTICAL_MAX) * 100).toFixed(1))

    const total = Number((mcqScaled + paper2Scaled + practical).toFixed(2))

    return {
      name: m.papers?.paper_name || 'Paper',
      mcq, mcqScaled, mcqPct,
      sq1, sq2, sq3, sq4, structured, structuredPct,
      es1, es2, es3, es4, essay, essayPct,
      paper2Raw, paper2Scaled, paper2Pct,
      practical, practicalPct,
      total,
    }
  })
}

// ── Chart configs ─────────────────────────────────────────────────────────────
const trendConfig: ChartConfig = {
  total: { label: 'Total Score', color: 'var(--chart-1)' },
}
const sqConfig: ChartConfig = {
  sq1: { label: 'SQ 01', color: 'var(--chart-1)' },
  sq2: { label: 'SQ 02', color: 'var(--chart-2)' },
  sq3: { label: 'SQ 03', color: 'var(--chart-3)' },
  sq4: { label: 'SQ 04', color: 'var(--chart-4)' },
}
const eqConfig: ChartConfig = {
  es1: { label: 'EQ 01', color: 'var(--chart-1)' },
  es2: { label: 'EQ 02', color: 'var(--chart-2)' },
  es3: { label: 'EQ 03', color: 'var(--chart-3)' },
  es4: { label: 'EQ 04', color: 'var(--chart-4)' },
}
const radialConfig: ChartConfig = {
  mcq:        { label: 'MCQ',        color: 'var(--chart-1)' },
  structured: { label: 'Structured', color: 'var(--chart-2)' },
  essay:      { label: 'Essay',      color: 'var(--chart-3)' },
  practical:  { label: 'Practical',  color: 'var(--chart-4)' },
}
const practicalConfig: ChartConfig = {
  practical: { label: 'Practical Score', color: 'var(--chart-4)' },
}

function practicalGradeColor(pct: number): string {
  if (pct >= 90) return '#10b981'
  if (pct >= 75) return '#3b82f6'
  if (pct >= 55) return '#f59e0b'
  return '#ef4444'
}
function practicalGradeLabel(pct: number): string {
  if (pct >= 90) return 'Excellent'
  if (pct >= 75) return 'Good'
  if (pct >= 55) return 'Average'
  return 'Needs Work'
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function StudentDashboardUI({
  studentName, studentId, studentDbId, initialMarks,
}: DashboardUIProps) {
  const [marks, setMarks]             = useState<any[]>(initialMarks)
  const [isOnline, setIsOnline]       = useState(true)
  const [isLoggingOut, setLoggingOut] = useState(false)
  const [activeTab, setActiveTab]     = useState<Tab>('overview')
  const [classRank, setClassRank]     = useState(0)
  const [classSize, setClassSize]     = useState(0)
  const [menuOpen, setMenuOpen]       = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)

  const supabase  = createClient()
  const chartData = buildChartData(marks)

  const avg = (fn: (r: PaperData) => number) =>
    chartData.length
      ? Number((chartData.reduce((s, r) => s + fn(r), 0) / chartData.length).toFixed(1))
      : 0

  const avgTotal        = avg(r => r.total)
  const highestTotal    = chartData.length ? Math.max(...chartData.map(r => r.total)) : 0
  const avgMcqPct       = avg(r => r.mcqPct)
  const avgStrPct       = avg(r => r.structuredPct)
  const avgEssPct       = avg(r => r.essayPct)
  const avgPracticalPct = avg(r => r.practicalPct)
  const avgPractical    = avg(r => r.practical)

  const radialData = [
    { name: 'MCQ',        value: avgMcqPct,      fill: 'var(--color-mcq)' },
    { name: 'Structured', value: avgStrPct,       fill: 'var(--color-structured)' },
    { name: 'Essay',      value: avgEssPct,       fill: 'var(--color-essay)' },
    { name: 'Practical',  value: avgPracticalPct, fill: 'var(--color-practical)' },
  ]

  const practicalBarData = chartData.map(p => ({
    name: p.name,
    practical: p.practical,
    pct: p.practicalPct,
  }))

  // AI panel data object — passed to BottomNav → AssistantSheet → AIChatPanel
  const aiPanelData = {
    studentName,
    studentId,
    classRank,
    classSize,
    avgTotal,
    avgMcqPct,
    avgStrPct,
    avgEssPct,
    papers: chartData.map(p => ({
      name: p.name,
      total: p.total,
      mcqPct: p.mcqPct,
      structuredPct: p.structuredPct,
      essayPct: p.essayPct,
    })),
  }

  useEffect(() => {
    const fetchRank = async () => {
      const { data } = await supabase
        .from('marks')
        .select('student_id, mcq_score, seq_q1, seq_q2, seq_q3, seq_q4, ess_q1, ess_q2, ess_q3, ess_q4, practical_score')
      if (!data) return

      const map: Record<string, number[]> = {}
      data.forEach((m) => {
        const mcqScaled = (Number(m.mcq_score) || 0) * MCQ_PER_Q
        const str = (Number(m.seq_q1)||0)+(Number(m.seq_q2)||0)+(Number(m.seq_q3)||0)+(Number(m.seq_q4)||0)
        const ess = (Number(m.ess_q1)||0)+(Number(m.ess_q2)||0)+(Number(m.ess_q3)||0)+(Number(m.ess_q4)||0)
        const p2  = (str + ess) / P2_DIVISOR
        const prac = Number(m.practical_score) || 0
        const t   = mcqScaled + p2 + prac
        if (!map[m.student_id]) map[m.student_id] = []
        map[m.student_id].push(t)
      })

      const sorted = Object.entries(map)
        .map(([id, arr]) => ({ id, avg: arr.reduce((a, b) => a + b, 0) / arr.length }))
        .sort((a, b) => b.avg - a.avg)

      const idx = sorted.findIndex(s => s.id === studentDbId)
      setClassRank(idx >= 0 ? idx + 1 : 0)
      setClassSize(sorted.length)
    }
    fetchRank()
  }, [studentDbId])

  useEffect(() => {
    const ch = supabase
      .channel('realtime-marks')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'marks',
        filter: `student_id=eq.${studentDbId}`,
      }, async () => {
        const { data, error } = await supabase
          .from('marks')
          .select(`*, papers(paper_name)`)
          .eq('student_id', studentDbId)
        if (error) { setIsOnline(false); return }
        if (data)  { setMarks(data); setIsOnline(true) }
      })
      .subscribe(s => setIsOnline(s === 'SUBSCRIBED'))
    return () => { supabase.removeChannel(ch) }
  }, [studentDbId])

  const handleLogout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const shortName = (n: string) => n.length > 10 ? n.slice(0, 10) + '…' : n

  // Desktop tab definitions (mobile tabs handled by BottomNav)
  const desktopTabs: { id: Tab; label: string }[] = [
    { id: 'overview',  label: 'Overview'      },
    { id: 'papers',    label: 'Papers'        },
    { id: 'practical', label: 'Practical'     },
    { id: 'questions', label: 'Questions'     },
    { id: 'ai',        label: 'AI Assistant'  },
  ]

  return (
    // pb-28 on mobile gives space for the fixed bottom nav (bar + FAB above)
    <div className="min-h-screen bg-white pb-28 sm:pb-0">

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl border border-slate-200 flex items-center justify-center shrink-0">
              <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <div>
              <p className="font-bold text-sm leading-none">Engine with NAS</p>
              <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">Student Dashboard</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1 border ${
              isOnline
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                : 'text-rose-700 bg-rose-50 border-rose-200'
            }`}>
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isOnline ? 'Realtime' : 'Offline'}
            </span>
            <button
              disabled={isLoggingOut}
              onClick={handleLogout}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-[#020617] text-white text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              {isLoggingOut ? 'Logging out…' : 'Logout'}
            </button>
          </div>

          <button
            className="sm:hidden h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {menuOpen && (
          <div className="sm:hidden border-t border-slate-100 px-4 py-3 flex items-center justify-between bg-white">
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1 border ${
              isOnline
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                : 'text-rose-700 bg-rose-50 border-rose-200'
            }`}>
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isOnline ? 'Realtime' : 'Offline'}
            </span>
            <button
              disabled={isLoggingOut}
              onClick={handleLogout}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-[#020617] text-white text-sm font-medium disabled:opacity-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              {isLoggingOut ? '…' : 'Logout'}
            </button>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="px-4 sm:px-6 py-6 sm:py-16 border-b border-slate-100">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-slate-400 mb-2 sm:mb-4">
            Engineering Technology Analytics
          </p>
          <h1 className="text-2xl sm:text-5xl md:text-7xl font-black tracking-tight text-[#020617] leading-tight">
            Welcome back,{' '}
            <span className="italic">{studentName}</span>
          </h1>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-600 border border-slate-200 rounded-full px-3 sm:px-5 py-1.5 sm:py-2">
              Student ID: <span className="font-bold text-[#020617]">{studentId}</span>
            </span>
            {classRank > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white bg-[#020617] rounded-full px-3 sm:px-5 py-1.5 sm:py-2">
                <Trophy className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                Class Rank #{classRank} of {classSize}
              </span>
            )}
          </div>
          <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 max-w-xs sm:max-w-none mx-auto">
            <span className="font-semibold text-[#020617]">Paper I</span>
            <span className="text-slate-300">/35</span>
            <span className="text-slate-400">+</span>
            <span className="font-semibold text-[#020617]">Paper II</span>
            <span className="text-slate-300">/35</span>
            <span className="text-slate-400">+</span>
            <span className="font-semibold text-[#020617]">Practical</span>
            <span className="text-slate-300">/30</span>
            <span className="text-slate-400">=</span>
            <span className="font-black text-[#020617]">100</span>
          </div>
        </div>
      </section>

      {/* ── STAT CARDS ── */}
      <section className="px-4 sm:px-6 py-6 sm:py-12 border-b border-slate-100">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {([
            {
              label: 'Average Score', value: `${avgTotal}`,
              unit: '/100', sub: 'Final total', icon: <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />,
            },
            {
              label: 'Highest Score', value: `${highestTotal}`,
              unit: '/100', sub: 'Best paper', icon: <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />,
            },
            {
              label: 'Total Papers', value: `${chartData.length}`,
              unit: '', sub: 'Attempted', icon: <FileText className="h-4 w-4 sm:h-5 sm:w-5" />,
            },
            {
              label: 'Class Rank',
              value: classRank > 0 ? `#${String(classRank).padStart(2, '0')}` : '—',
              unit: '',
              sub: classSize > 0 ? `of ${classSize} students` : 'Loading…',
              icon: <Users className="h-4 w-4 sm:h-5 sm:w-5" />,
            },
          ] as const).map((s) => (
            <div key={s.label} className="border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-8">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest font-medium truncate">{s.label}</p>
                  <p className="text-xl sm:text-4xl md:text-5xl font-black text-[#020617] mt-1.5 sm:mt-2 leading-none">
                    {s.value}
                    {s.unit && <span className="text-xs sm:text-lg font-medium text-slate-400 ml-1">{s.unit}</span>}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-1">{s.sub}</p>
                </div>
                <div className="h-8 w-8 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                  {s.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {chartData.length > 0 && (
          <div className="max-w-7xl mx-auto mt-2.5 sm:mt-4">
            <div className="border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-8 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl bg-[#020617] text-white flex items-center justify-center shrink-0">
                    <FlaskConical className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest font-medium">Practical</p>
                    <p className="text-lg sm:text-2xl font-black text-[#020617] leading-none">
                      {avgPractical}
                      <span className="text-xs sm:text-sm font-medium text-slate-400 ml-1">/30 avg</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:gap-6">
                  <div className="text-center">
                    <p className="text-[10px] sm:text-xs text-slate-400 mb-0.5">Avg %</p>
                    <p className="text-lg sm:text-2xl font-black" style={{ color: practicalGradeColor(avgPracticalPct) }}>
                      {avgPracticalPct}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] sm:text-xs text-slate-400 mb-1">Grade</p>
                    <span
                      className="inline-block px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold text-white"
                      style={{ backgroundColor: practicalGradeColor(avgPracticalPct) }}
                    >
                      {practicalGradeLabel(avgPracticalPct)}
                    </span>
                  </div>
                  <div className="hidden sm:block text-center">
                    <p className="text-xs text-slate-400 mb-1">Best</p>
                    <p className="text-2xl font-black text-[#020617]">
                      {chartData.length ? Math.max(...chartData.map(r => r.practical)) : 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── ANALYTICS ── */}
      <section className="px-4 sm:px-6 py-8 sm:py-20">
        <div className="max-w-7xl mx-auto">

          <div className="text-center mb-6 sm:mb-14">
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-slate-400 mb-2 sm:mb-4">Performance Analytics</p>
            <h2 className="text-2xl sm:text-5xl font-black text-[#020617] tracking-tight">Track your growth</h2>
            <p className="text-slate-400 mt-2 text-xs sm:text-sm max-w-sm mx-auto">
              Paper scores, practical results, and per-question trends.
            </p>
          </div>

          {/* Desktop tab bar — hidden on mobile (BottomNav handles mobile) */}
          <div className="hidden sm:flex items-center gap-2 mb-12 justify-center">
            {desktopTabs.map(t => (
              <button
                key={t.id}
                onClick={() => {
                  if (t.id === 'ai') {
                    setAssistantOpen(true)
                  } else {
                    setActiveTab(t.id)
                  }
                }}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-colors border whitespace-nowrap ${
                  t.id === 'ai'
                    ? 'bg-[#020617] text-white border-[#020617] flex items-center gap-2'
                    : activeTab === t.id
                    ? 'bg-[#020617] text-white border-[#020617]'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {t.id === 'ai' && <Sparkles className="h-3.5 w-3.5" />}
                {t.label}
              </button>
            ))}
          </div>

          {/* ══ OVERVIEW TAB ══ */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <Card className="xl:col-span-2 rounded-3xl border-slate-200 shadow-none">
                <CardHeader>
                  <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Performance Trend</p>
                  <CardTitle className="text-2xl sm:text-3xl font-black text-[#020617]">
                    Total score per paper
                  </CardTitle>
                  <CardDescription>Final score out of 100 across all papers</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={trendConfig} className="h-[260px] sm:h-[320px] w-full">
                    <AreaChart data={chartData} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
                      <defs>
                        <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-total)" stopOpacity={0.35} />
                          <stop offset="60%" stopColor="var(--color-total)" stopOpacity={0.08} />
                          <stop offset="100%" stopColor="var(--color-total)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name" tickLine={false} axisLine={{ stroke: '#e2e8f0' }}
                        tickMargin={8} tick={{ fontSize: 11 }} tickFormatter={shortName}
                      />
                      <YAxis
                        tickLine={false} axisLine={{ stroke: '#e2e8f0' }}
                        tick={{ fontSize: 11 }} tickMargin={8}
                        domain={[0, 100]} tickCount={6}
                        tickFormatter={(v) => `${v}`} width={36}
                      />
                      <ChartTooltip
                        cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Area
                        dataKey="total" type="natural"
                        stroke="var(--color-total)" strokeWidth={2.5}
                        fill="url(#gradTotal)"
                        dot={{ fill: 'var(--color-total)', r: 4, strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff', fill: 'var(--color-total)' }}
                      />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
                <CardFooter className="flex-col items-start gap-1 text-sm pt-0">
                  <div className="flex gap-2 items-center font-medium">
                    <TrendingUp className="h-4 w-4" /> Average: {avgTotal}/100
                  </div>
                  <p className="text-xs text-slate-400">
                    Formula: MCQ (×0.7 → /35) + Paper II (÷20 → /35) + Practical (/30) = Total (/100)
                  </p>
                </CardFooter>
              </Card>

              <Card className="rounded-3xl border-slate-200 shadow-none flex flex-col">
                <CardHeader className="items-center pb-0">
                  <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Skill Breakdown</p>
                  <CardTitle className="text-xl font-black text-[#020617] text-center">Average by section</CardTitle>
                  <CardDescription className="text-center">MCQ · Structured · Essay · Practical %</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 pb-0">
                  <ChartContainer config={radialConfig} className="mx-auto aspect-square max-h-[220px]">
                    <RadialBarChart data={radialData} innerRadius={30} outerRadius={90}>
                      <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="name" />} />
                      <PolarGrid gridType="circle" />
                      <RadialBar dataKey="value" />
                    </RadialBarChart>
                  </ChartContainer>
                </CardContent>
                <CardFooter className="flex-col gap-0 pt-4">
                  {[
                    { label: 'MCQ',        value: avgMcqPct,      sub: `avg % · max ${MCQ_MAX} marks` },
                    { label: 'Structured', value: avgStrPct,       sub: `avg % · max ${SQ_MAX} raw` },
                    { label: 'Essay',      value: avgEssPct,       sub: `avg % · max ${EQ_MAX} raw` },
                    { label: 'Practical',  value: avgPracticalPct, sub: `avg % · max ${PRACTICAL_MAX} marks` },
                  ].map(item => (
                    <div key={item.label} className="w-full flex items-center justify-between border-b border-slate-100 py-2.5 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-[#020617]">{item.label}</p>
                        <p className="text-xs text-slate-400">{item.sub}</p>
                      </div>
                      <p className="text-2xl font-black text-[#020617]">{item.value}%</p>
                    </div>
                  ))}
                </CardFooter>
              </Card>
            </div>
          )}

          {/* ══ PAPERS TAB ══ */}
          {activeTab === 'papers' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {chartData.length === 0 && (
                <div className="lg:col-span-2 text-center py-20 text-slate-400 text-sm">
                  No papers found yet.
                </div>
              )}
              {chartData.map((paper, i) => (
                <div key={i} className="border border-slate-200 rounded-3xl p-6 sm:p-8">
                  <div className="flex items-start justify-between mb-6 gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">Engineering Technology</p>
                      <h2 className="text-2xl sm:text-3xl font-black text-[#020617] leading-tight">{paper.name}</h2>
                    </div>
                    <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-[#020617] text-white flex flex-col items-center justify-center shrink-0">
                      <span className="text-xl sm:text-2xl font-black leading-none">{paper.total}</span>
                      <span className="text-xs opacity-60">/100</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 overflow-hidden mb-6 overflow-x-auto">
                    <table className="w-full text-sm min-w-[320px]">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="text-left px-4 py-2 text-xs font-medium text-slate-400 uppercase tracking-widest">Section</th>
                          <th className="text-right px-3 py-2 text-xs font-medium text-slate-400 uppercase">Score</th>
                          <th className="text-right px-3 py-2 text-xs font-medium text-slate-400 uppercase">Max</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-slate-400 uppercase">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: 'Paper I — MCQ (×0.7)', score: paper.mcqScaled, max: MCQ_MAX, pct: paper.mcqPct },
                          { label: 'Paper II — Structured', score: paper.structured, max: SQ_MAX, pct: paper.structuredPct },
                          { label: 'Paper II — Essay', score: paper.essay, max: EQ_MAX, pct: paper.essayPct },
                          { label: 'Paper II Raw Total', score: paper.paper2Raw, max: PAPER2_RAW_MAX, pct: paper.paper2Pct, muted: true },
                          { label: 'Paper II Scaled', score: paper.paper2Scaled, max: PAPER2_SCALED, pct: paper.paper2Pct, muted: true },
                          { label: 'Practical', score: paper.practical, max: PRACTICAL_MAX, pct: paper.practicalPct },
                        ].map(row => (
                          <tr key={row.label} className={`border-t border-slate-100 ${row.muted ? 'bg-slate-50' : ''}`}>
                            <td className={`px-4 py-2.5 ${row.muted ? 'text-slate-400 text-xs' : 'font-medium'}`}>{row.label}</td>
                            <td className="px-3 py-2.5 text-right font-black text-[#020617]">{row.score}</td>
                            <td className="px-3 py-2.5 text-right text-slate-400">{row.max}</td>
                            <td className="px-4 py-2.5 text-right font-bold">{row.pct}%</td>
                          </tr>
                        ))}
                        <tr className="border-t border-slate-300 bg-[#020617] text-white">
                          <td className="px-4 py-3 font-bold rounded-bl-2xl">Final Total</td>
                          <td className="px-3 py-3 text-right font-black">{paper.total}</td>
                          <td className="px-3 py-3 text-right opacity-50">100</td>
                          <td className="px-4 py-3 text-right font-black rounded-br-2xl">{paper.total}%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-3">
                        Structured Questions <span className="normal-case text-slate-300 ml-1">each /{SQ_PER_Q}</span>
                      </p>
                      <div className="grid grid-cols-4 gap-2 sm:gap-3">
                        {[paper.sq1, paper.sq2, paper.sq3, paper.sq4].map((q, idx) => (
                          <div key={idx} className="border border-slate-200 rounded-2xl p-2 sm:p-3 text-center">
                            <p className="text-xs text-slate-400">SQ {idx + 1}</p>
                            <p className="text-lg sm:text-2xl font-black text-[#020617] mt-1">{q}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{Number(((q / SQ_PER_Q) * 100).toFixed(0))}%</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-3">
                        Essay Questions <span className="normal-case text-slate-300 ml-1">each /{EQ_PER_Q}</span>
                      </p>
                      <div className="grid grid-cols-4 gap-2 sm:gap-3">
                        {[paper.es1, paper.es2, paper.es3, paper.es4].map((q, idx) => (
                          <div key={idx} className="border border-slate-200 rounded-2xl p-2 sm:p-3 text-center">
                            <p className="text-xs text-slate-400">EQ {idx + 1}</p>
                            <p className="text-lg sm:text-2xl font-black text-[#020617] mt-1">{q}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{Number(((q / EQ_PER_Q) * 100).toFixed(0))}%</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-3">
                        Practical Score <span className="normal-case text-slate-300 ml-1">/{PRACTICAL_MAX}</span>
                      </p>
                      <div className="flex items-center gap-4 border border-slate-200 rounded-2xl p-4">
                        <div
                          className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex flex-col items-center justify-center shrink-0 text-white"
                          style={{ backgroundColor: practicalGradeColor(paper.practicalPct) }}
                        >
                          <span className="text-lg font-black leading-none">{paper.practical}</span>
                          <span className="text-xs opacity-80">/{PRACTICAL_MAX}</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#020617]">
                            {paper.practicalPct}% — {practicalGradeLabel(paper.practicalPct)}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Practical contributes {PRACTICAL_MAX} marks to your final score
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-200 p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center shrink-0">
                        <Brain className="h-4 w-4 text-slate-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#020617]">AI Insight</p>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          Paper II contributed {paper.paper2Scaled.toFixed(1)}/35 · Practical {paper.practical}/{PRACTICAL_MAX} to your final score.{' '}
                          {paper.practicalPct < 60
                            ? 'Practical score needs improvement — focus on lab skills.'
                            : paper.structuredPct > paper.essayPct
                              ? 'Structured questions are your stronger area this paper.'
                              : 'Essay questions are your stronger area this paper.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ══ PRACTICAL TAB ══ */}
          {activeTab === 'practical' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { label: 'Average',   value: `${avgPractical}`, unit: `/${PRACTICAL_MAX}` },
                  { label: 'Average %', value: `${avgPracticalPct}%`, unit: '' },
                  { label: 'Best',      value: `${chartData.length ? Math.max(...chartData.map(r => r.practical)) : 0}`, unit: `/${PRACTICAL_MAX}` },
                  { label: 'Grade',     value: practicalGradeLabel(avgPracticalPct), unit: '' },
                ].map(s => (
                  <div key={s.label} className="border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-center">
                    <p className="text-xs text-slate-400 uppercase tracking-widest font-medium mb-2">{s.label}</p>
                    <p className="text-xl sm:text-3xl font-black text-[#020617] leading-none">
                      {s.value}
                      {s.unit && <span className="text-sm font-medium text-slate-400 ml-0.5">{s.unit}</span>}
                    </p>
                  </div>
                ))}
              </div>

              <Card className="rounded-3xl border-slate-200 shadow-none">
                <CardHeader>
                  <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Practical Exam</p>
                  <CardTitle className="text-2xl sm:text-3xl font-black text-[#020617]">Practical scores across papers</CardTitle>
                  <CardDescription>Score out of {PRACTICAL_MAX} per paper</CardDescription>
                </CardHeader>
                <CardContent>
                  {practicalBarData.length === 0 ? (
                    <div className="h-[260px] flex items-center justify-center text-slate-400 text-sm">No practical data yet.</div>
                  ) : (
                    <ChartContainer config={practicalConfig} className="h-[260px] sm:h-[320px] w-full">
                      <BarChart data={practicalBarData} margin={{ left: 8, right: 8, top: 16, bottom: 8 }}>
                        <CartesianGrid vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="name" tickLine={false} axisLine={{ stroke: '#e2e8f0' }}
                          tickMargin={8} tick={{ fontSize: 11 }} tickFormatter={shortName}
                        />
                        <YAxis
                          tickLine={false} axisLine={{ stroke: '#e2e8f0' }}
                          tick={{ fontSize: 11 }} tickMargin={8}
                          domain={[0, PRACTICAL_MAX]} tickCount={7} width={36}
                        />
                        <ChartTooltip cursor={{ fill: '#f8fafc' }} content={<ChartTooltipContent />} />
                        <Bar dataKey="practical" radius={[8, 8, 0, 0]} maxBarSize={60}>
                          {practicalBarData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={practicalGradeColor(entry.pct)} />
                          ))}
                          <LabelList dataKey="practical" position="top" style={{ fontSize: 11, fontWeight: 700, fill: '#020617' }} />
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
                <CardFooter className="flex-col items-start gap-1">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <FlaskConical className="h-4 w-4" />
                    Average practical: {avgPractical}/{PRACTICAL_MAX} ({avgPracticalPct}%)
                  </p>
                  <p className="text-xs text-slate-400">Practical contributes 30 marks out of 100 to your final A/L score</p>
                </CardFooter>
              </Card>

              <div className="flex flex-wrap items-center gap-3 sm:gap-4 px-1">
                <p className="text-xs text-slate-400 uppercase tracking-widest font-medium">Grade Scale</p>
                {[
                  { label: 'Excellent ≥90%', color: '#10b981' },
                  { label: 'Good ≥75%',      color: '#3b82f6' },
                  { label: 'Average ≥55%',   color: '#f59e0b' },
                  { label: 'Needs Work <55%',color: '#ef4444' },
                ].map(g => (
                  <div key={g.label} className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                    <p className="text-xs text-slate-600">{g.label}</p>
                  </div>
                ))}
              </div>

              {chartData.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-4">Per-Paper Breakdown</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {chartData.map((p, i) => (
                      <div key={i} className="border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
                        <div
                          className="h-14 w-14 rounded-2xl flex flex-col items-center justify-center shrink-0 text-white"
                          style={{ backgroundColor: practicalGradeColor(p.practicalPct) }}
                        >
                          <span className="text-xl font-black leading-none">{p.practical}</span>
                          <span className="text-xs opacity-80">/{PRACTICAL_MAX}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[#020617] truncate text-sm">{p.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{p.practicalPct}% · {practicalGradeLabel(p.practicalPct)}</p>
                          <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${p.practicalPct}%`, backgroundColor: practicalGradeColor(p.practicalPct) }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-3xl bg-slate-50 border border-slate-200 p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center shrink-0">
                    <Wrench className="h-4 w-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-bold text-[#020617] mb-1">Practical Exam Tips</p>
                    <ul className="text-xs text-slate-500 space-y-1.5 leading-relaxed list-disc list-inside">
                      <li>ප්‍රායෝගික පරීක්ෂණය ලකුණු 30ක් — නිරන්තරව lab work කරන්න.</li>
                      <li>Circuit diagrams, wiring, and measurements correctly.</li>
                      <li>Safety precautions always mention in your answers.</li>
                      <li>Neatness and labelling in practical work matters.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ AI ASSISTANT TAB ══ — Opens as AssistantSheet (see above) */}

          {/* ══ QUESTIONS TAB ══ */}
          {activeTab === 'questions' && (
            <div className="space-y-6">
              <Card className="rounded-3xl border-slate-200 shadow-none">
                <CardHeader>
                  <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Question Trends</p>
                  <CardTitle className="text-2xl font-black text-[#020617]">Structured Questions — SQ 01–04</CardTitle>
                  <CardDescription>Each question out of {SQ_PER_Q} marks across papers</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={sqConfig} className="h-[260px] sm:h-[320px] w-full">
                    <LineChart data={chartData} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
                      <CartesianGrid vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tickMargin={8} tick={{ fontSize: 11 }} tickFormatter={shortName} />
                      <YAxis tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tick={{ fontSize: 11 }} tickMargin={8} domain={[0, SQ_PER_Q]} tickCount={6} width={36} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      {(['sq1', 'sq2', 'sq3', 'sq4'] as const).map(k => (
                        <Line key={k} dataKey={k} type="natural" stroke={`var(--color-${k})`} strokeWidth={2} dot={{ r: 3 }} />
                      ))}
                    </LineChart>
                  </ChartContainer>
                </CardContent>
                <CardFooter>
                  <p className="text-xs text-slate-400">How each structured question score changed across papers (each /{SQ_PER_Q})</p>
                </CardFooter>
              </Card>

              <Card className="rounded-3xl border-slate-200 shadow-none">
                <CardHeader>
                  <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Question Trends</p>
                  <CardTitle className="text-2xl font-black text-[#020617]">Essay Questions — EQ 01–04</CardTitle>
                  <CardDescription>Each question out of {EQ_PER_Q} marks across papers</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={eqConfig} className="h-[260px] sm:h-[320px] w-full">
                    <LineChart data={chartData} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
                      <CartesianGrid vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tickMargin={8} tick={{ fontSize: 11 }} tickFormatter={shortName} />
                      <YAxis tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tick={{ fontSize: 11 }} tickMargin={8} domain={[0, EQ_PER_Q]} tickCount={6} width={36} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      {(['es1', 'es2', 'es3', 'es4'] as const).map(k => (
                        <Line key={k} dataKey={k} type="natural" stroke={`var(--color-${k})`} strokeWidth={2} dot={{ r: 3 }} />
                      ))}
                    </LineChart>
                  </ChartContainer>
                </CardContent>
                <CardFooter>
                  <p className="text-xs text-slate-400">How each essay question score changed across papers (each /{EQ_PER_Q})</p>
                </CardFooter>
              </Card>

              {chartData.length > 0 && (
                <div className="border border-slate-200 rounded-3xl overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-100">
                    <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-1">Full Breakdown</p>
                    <h3 className="text-xl font-black text-[#020617]">All papers · all questions</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[640px]">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-50">Paper</th>
                          <th className="text-right px-3 py-3 text-xs font-medium text-slate-400 uppercase">MCQ<br/><span className="font-normal">/50q</span></th>
                          <th className="text-right px-3 py-3 text-xs font-medium text-slate-400 uppercase">SQ1<br/><span className="font-normal">/{SQ_PER_Q}</span></th>
                          <th className="text-right px-3 py-3 text-xs font-medium text-slate-400 uppercase">SQ2<br/><span className="font-normal">/{SQ_PER_Q}</span></th>
                          <th className="text-right px-3 py-3 text-xs font-medium text-slate-400 uppercase">SQ3<br/><span className="font-normal">/{SQ_PER_Q}</span></th>
                          <th className="text-right px-3 py-3 text-xs font-medium text-slate-400 uppercase">SQ4<br/><span className="font-normal">/{SQ_PER_Q}</span></th>
                          <th className="text-right px-3 py-3 text-xs font-medium text-slate-400 uppercase">EQ1<br/><span className="font-normal">/{EQ_PER_Q}</span></th>
                          <th className="text-right px-3 py-3 text-xs font-medium text-slate-400 uppercase">EQ2<br/><span className="font-normal">/{EQ_PER_Q}</span></th>
                          <th className="text-right px-3 py-3 text-xs font-medium text-slate-400 uppercase">EQ3<br/><span className="font-normal">/{EQ_PER_Q}</span></th>
                          <th className="text-right px-3 py-3 text-xs font-medium text-slate-400 uppercase">EQ4<br/><span className="font-normal">/{EQ_PER_Q}</span></th>
                          <th className="text-right px-3 py-3 text-xs font-medium text-slate-400 uppercase">Prac<br/><span className="font-normal">/{PRACTICAL_MAX}</span></th>
                          <th className="text-right px-6 py-3 text-xs font-medium text-slate-400 uppercase">Total<br/><span className="font-normal">/100</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {chartData.map((p, i) => (
                          <tr key={i} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-3 font-medium text-[#020617] sticky left-0 bg-white">{p.name}</td>
                            <td className="px-3 py-3 text-right tabular-nums">{p.mcq}</td>
                            <td className="px-3 py-3 text-right tabular-nums">{p.sq1}</td>
                            <td className="px-3 py-3 text-right tabular-nums">{p.sq2}</td>
                            <td className="px-3 py-3 text-right tabular-nums">{p.sq3}</td>
                            <td className="px-3 py-3 text-right tabular-nums">{p.sq4}</td>
                            <td className="px-3 py-3 text-right tabular-nums">{p.es1}</td>
                            <td className="px-3 py-3 text-right tabular-nums">{p.es2}</td>
                            <td className="px-3 py-3 text-right tabular-nums">{p.es3}</td>
                            <td className="px-3 py-3 text-right tabular-nums">{p.es4}</td>
                            <td className="px-3 py-3 text-right tabular-nums font-bold" style={{ color: practicalGradeColor(p.practicalPct) }}>{p.practical}</td>
                            <td className="px-6 py-3 text-right font-black text-[#020617] tabular-nums">{p.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </section>

      {/* ── AI ASSISTANT SHEET (both desktop + mobile) ── */}
      <AssistantSheet
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        aiPanelData={aiPanelData}
      />

      {/* ── MOBILE BOTTOM NAV (glass morphism — hidden on sm+) ── */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        aiPanelData={aiPanelData}
      />

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-100 py-8 px-6 text-center">
        <p className="text-xs text-slate-400">
          © 2026 Engine with NAS. Powered by Engineering Technology Stream.
        </p>
      </footer>
    </div>
  )
}