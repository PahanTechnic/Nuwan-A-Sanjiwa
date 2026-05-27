'use client'

import { useEffect, useState } from 'react'
import AIChatPanel from '@/components/AIChatPanel'
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
  LineChart, Line, CartesianGrid, XAxis, YAxis,
  RadialBarChart, RadialBar, PolarGrid,
} from 'recharts'
import {
  Trophy, TrendingUp, FileText, Activity,
  Wifi, WifiOff, LogOut, Brain, Users, Menu, X, Sparkles,
} from 'lucide-react'

// ── Marking scheme ────────────────────────────────────────────────────────────
const MCQ_MAX      = 50          // Paper 1 total
const SQ_PER_Q     = 150         // Each structured question max
const EQ_PER_Q     = 100         // Each essay question max
const SQ_COUNT     = 4
const EQ_COUNT     = 4
const SQ_MAX       = SQ_PER_Q * SQ_COUNT   // 600
const EQ_MAX       = EQ_PER_Q * EQ_COUNT   // 400
const PAPER2_MAX   = SQ_MAX + EQ_MAX       // 1000
const P2_DIVISOR   = PAPER2_MAX / MCQ_MAX  // 20  → /20 scales P2 to /50

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
  sq1: number; sq2: number; sq3: number; sq4: number
  structured: number
  es1: number; es2: number; es3: number; es4: number
  essay: number
  paper2Raw: number
  paper2Scaled: number
  total: number
  mcqPct: number
  structuredPct: number
  essayPct: number
}

type Tab = 'overview' | 'papers' | 'questions' | 'ai'

// ── buildChartData ────────────────────────────────────────────────────────────
function buildChartData(marks: any[]): PaperData[] {
  return marks.map((m) => {
    const mcq = Number(m.mcq_score) || 0
    const sq1 = Number(m.seq_q1) || 0
    const sq2 = Number(m.seq_q2) || 0
    const sq3 = Number(m.seq_q3) || 0
    const sq4 = Number(m.seq_q4) || 0
    const structured = sq1 + sq2 + sq3 + sq4
    const es1 = Number(m.ess_q1) || 0
    const es2 = Number(m.ess_q2) || 0
    const es3 = Number(m.ess_q3) || 0
    const es4 = Number(m.ess_q4) || 0
    const essay = es1 + es2 + es3 + es4
    const paper2Raw = structured + essay
    const paper2Scaled = Number((paper2Raw / P2_DIVISOR).toFixed(2))
    const total = Number((mcq + paper2Scaled).toFixed(2))
    return {
      name: m.papers?.paper_name || 'Paper',
      mcq, sq1, sq2, sq3, sq4, structured,
      es1, es2, es3, es4, essay,
      paper2Raw, paper2Scaled, total,
      mcqPct:        Number(((mcq / MCQ_MAX) * 100).toFixed(1)),
      structuredPct: Number(((structured / SQ_MAX) * 100).toFixed(1)),
      essayPct:      Number(((essay / EQ_MAX) * 100).toFixed(1)),
    }
  })
}

// ── shadcn ChartConfig ────────────────────────────────────────────────────────
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
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function StudentDashboardUI({
  studentName, studentId, studentDbId, initialMarks,
}: DashboardUIProps) {
  const [marks, setMarks]           = useState<any[]>(initialMarks)
  const [isOnline, setIsOnline]     = useState(true)
  const [isLoggingOut, setLoggingOut] = useState(false)
  const [activeTab, setActiveTab]   = useState<Tab>('overview')
  const [classRank, setClassRank]   = useState(0)
  const [classSize, setClassSize]   = useState(0)
  const [menuOpen, setMenuOpen]     = useState(false)

  const supabase   = createClient()
  const chartData  = buildChartData(marks)

  // ── Derived stats ─────────────────────────────────────────────────────────
  const avg = (fn: (r: PaperData) => number) =>
    chartData.length
      ? Number((chartData.reduce((s, r) => s + fn(r), 0) / chartData.length).toFixed(1))
      : 0

  const avgTotal    = avg(r => r.total)
  const highestTotal = chartData.length ? Math.max(...chartData.map(r => r.total)) : 0
  const avgMcqPct   = avg(r => r.mcqPct)
  const avgStrPct   = avg(r => r.structuredPct)
  const avgEssPct   = avg(r => r.essayPct)

  const radialData = [
    { name: 'MCQ',        value: avgMcqPct, fill: 'var(--color-mcq)' },
    { name: 'Structured', value: avgStrPct, fill: 'var(--color-structured)' },
    { name: 'Essay',      value: avgEssPct, fill: 'var(--color-essay)' },
  ]

  // ── Class rank ────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchRank = async () => {
      const { data } = await supabase
        .from('marks')
        .select('student_id, mcq_score, seq_q1, seq_q2, seq_q3, seq_q4, ess_q1, ess_q2, ess_q3, ess_q4')
      if (!data) return

      const map: Record<string, number[]> = {}
      data.forEach((m) => {
        const mcq = Number(m.mcq_score) || 0
        const str = (Number(m.seq_q1)||0)+(Number(m.seq_q2)||0)+(Number(m.seq_q3)||0)+(Number(m.seq_q4)||0)
        const ess = (Number(m.ess_q1)||0)+(Number(m.ess_q2)||0)+(Number(m.ess_q3)||0)+(Number(m.ess_q4)||0)
        const t   = mcq + (str + ess) / P2_DIVISOR
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

  // ── Realtime subscription ─────────────────────────────────────────────────
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

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview',  label: 'Overview' },
    { id: 'papers',    label: 'Papers' },
    { id: 'questions', label: 'Questions' },
    { id: 'ai',        label: '✦ AI Assistant' },
  ]

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center shrink-0">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-sm leading-none">Engine with NAS</p>
              <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">Student Dashboard</p>
            </div>
          </div>

          {/* Desktop */}
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

          {/* Mobile hamburger */}
          <button
            className="sm:hidden h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* Mobile dropdown */}
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
      <section className="px-4 sm:px-6 py-10 sm:py-20 border-b border-slate-100">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-4">
            Engineering Technology Analytics
          </p>
          <h1 className="text-3xl sm:text-6xl md:text-7xl font-black tracking-tight text-[#020617] leading-tight">
            Welcome back,{' '}
            <span className="italic">{studentName}</span>
          </h1>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-2 text-sm text-slate-600 border border-slate-200 rounded-full px-5 py-2">
              Student ID: <span className="font-bold text-[#020617]">{studentId}</span>
            </span>
            {classRank > 0 && (
              <span className="inline-flex items-center gap-2 text-sm font-bold text-white bg-[#020617] rounded-full px-5 py-2">
                <Trophy className="h-3.5 w-3.5" />
                Class Rank #{classRank} of {classSize}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── STAT CARDS ── */}
      <section className="px-4 sm:px-6 py-12 border-b border-slate-100">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {([
            {
              label: 'Average Score', value: `${avgTotal}`,
              unit: '/100', sub: 'Final total', icon: <TrendingUp className="h-5 w-5" />,
            },
            {
              label: 'Highest Score', value: `${highestTotal}`,
              unit: '/100', sub: 'Best paper', icon: <Trophy className="h-5 w-5" />,
            },
            {
              label: 'Total Papers', value: `${chartData.length}`,
              unit: '', sub: 'Attempted', icon: <FileText className="h-5 w-5" />,
            },
            {
              label: 'Class Rank',
              value: classRank > 0 ? `#${String(classRank).padStart(2, '0')}` : '—',
              unit: '',
              sub: classSize > 0 ? `of ${classSize} students` : 'Loading…',
              icon: <Users className="h-5 w-5" />,
            },
          ] as const).map((s) => (
            <div key={s.label} className="border border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-8">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
          <p className="text-xs text-slate-400 uppercase tracking-widest font-medium truncate">{s.label}</p>
                  <p className="text-2xl sm:text-4xl md:text-5xl font-black text-[#020617] mt-2 leading-none">
                    {s.value}
                    {s.unit && <span className="text-sm sm:text-lg font-medium text-slate-400 ml-1">{s.unit}</span>}
                  </p>
                  <p className="text-xs text-slate-400 mt-1.5">{s.sub}</p>
                </div>
                <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                  {s.icon}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ANALYTICS ── */}
      <section className="px-4 sm:px-6 py-12 sm:py-20">
        <div className="max-w-7xl mx-auto">

          <div className="text-center mb-10 sm:mb-14">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-4">Performance Analytics</p>
            <h2 className="text-3xl sm:text-5xl font-black text-[#020617] tracking-tight">Track your growth</h2>
            <p className="text-slate-400 mt-3 text-sm max-w-sm mx-auto">
              Paper scores, skill breakdown, and per-question trends.
            </p>
          </div>

          {/* Tab bar */}
          <div className="flex items-center justify-center gap-2 mb-8 sm:mb-12 flex-wrap">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-colors border ${
                  activeTab === t.id
                    ? 'bg-[#020617] text-white border-[#020617]'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ══ OVERVIEW TAB ══ */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

              {/* Line chart – total per paper */}
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
                    <LineChart data={chartData} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
                      <CartesianGrid vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name" tickLine={false} axisLine={{ stroke: '#e2e8f0' }}
                        tickMargin={8} tick={{ fontSize: 11 }}
                        tickFormatter={shortName}
                      />
                      <YAxis
                        tickLine={false} axisLine={{ stroke: '#e2e8f0' }}
                        tick={{ fontSize: 11 }} tickMargin={8}
                        domain={[0, 100]} tickCount={6}
                        tickFormatter={(v) => `${v}`}
                        width={36}
                      />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                      <Line
                        dataKey="total" type="natural"
                        stroke="var(--color-total)" strokeWidth={2}
                        dot={{ fill: 'var(--color-total)', r: 4 }}
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
                <CardFooter className="flex-col items-start gap-1 text-sm pt-0">
                  <div className="flex gap-2 items-center font-medium">
                    <TrendingUp className="h-4 w-4" /> Average: {avgTotal}/100
                  </div>
                  <p className="text-xs text-slate-400">
                    Formula: MCQ (/50) + (Structured + Essay) ÷ 20 (/50) = Total (/100)
                  </p>
                </CardFooter>
              </Card>

              {/* Radial chart – skill % */}
              <Card className="rounded-3xl border-slate-200 shadow-none flex flex-col">
                <CardHeader className="items-center pb-0">
                  <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Skill Breakdown</p>
                  <CardTitle className="text-xl font-black text-[#020617] text-center">Average by section</CardTitle>
                  <CardDescription className="text-center">MCQ · Structured · Essay %</CardDescription>
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
                    { label: 'MCQ',        value: avgMcqPct, sub: `avg % out of ${MCQ_MAX}` },
                    { label: 'Structured', value: avgStrPct, sub: `avg % out of ${SQ_MAX}` },
                    { label: 'Essay',      value: avgEssPct, sub: `avg % out of ${EQ_MAX}` },
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

                  {/* Header */}
                  <div className="flex items-start justify-between mb-6 gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                        Engineering Technology
                      </p>
                      <h2 className="text-2xl sm:text-3xl font-black text-[#020617] leading-tight">
                        {paper.name}
                      </h2>
                    </div>
                    <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-[#020617] text-white flex flex-col items-center justify-center shrink-0">
                      <span className="text-xl sm:text-2xl font-black leading-none">{paper.total}</span>
                      <span className="text-xs opacity-60">/100</span>
                    </div>
                  </div>

                  {/* Score breakdown table */}
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
                          { label: 'MCQ  (Paper 1)', score: paper.mcq, max: MCQ_MAX, pct: paper.mcqPct },
                          { label: 'Structured (Paper 2)', score: paper.structured, max: SQ_MAX, pct: paper.structuredPct },
                          { label: 'Essay (Paper 2)', score: paper.essay, max: EQ_MAX, pct: paper.essayPct },
                          { label: 'Paper 2 Raw Total', score: paper.paper2Raw, max: PAPER2_MAX, pct: Number(((paper.paper2Raw/PAPER2_MAX)*100).toFixed(1)), muted: true },
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

                  {/* Per-question grids */}
                  <div className="space-y-5">
                    {/* Structured */}
                    <div>
                      <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-3">
                        Structured Questions <span className="normal-case text-slate-300 ml-1">each /150</span>
                      </p>
                      <div className="grid grid-cols-4 gap-2 sm:gap-3">
                        {[paper.sq1, paper.sq2, paper.sq3, paper.sq4].map((q, idx) => (
                          <div key={idx} className="border border-slate-200 rounded-2xl p-2 sm:p-3 text-center">
                            <p className="text-xs text-slate-400">SQ {idx + 1}</p>
                            <p className="text-lg sm:text-2xl font-black text-[#020617] mt-1">{q}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {Number(((q / SQ_PER_Q) * 100).toFixed(0))}%
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Essay */}
                    <div>
                      <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-3">
                        Essay Questions <span className="normal-case text-slate-300 ml-1">each /100</span>
                      </p>
                      <div className="grid grid-cols-4 gap-2 sm:gap-3">
                        {[paper.es1, paper.es2, paper.es3, paper.es4].map((q, idx) => (
                          <div key={idx} className="border border-slate-200 rounded-2xl p-2 sm:p-3 text-center">
                            <p className="text-xs text-slate-400">EQ {idx + 1}</p>
                            <p className="text-lg sm:text-2xl font-black text-[#020617] mt-1">{q}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {Number(((q / EQ_PER_Q) * 100).toFixed(0))}%
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* AI insight */}
                  <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-200 p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center shrink-0">
                        <Brain className="h-4 w-4 text-slate-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#020617]">AI Insight</p>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          Paper 2 contributed {paper.paper2Scaled.toFixed(1)}/50 to your final score
                          (raw: {paper.paper2Raw}/{PAPER2_MAX}).{' '}
                          {paper.structuredPct > paper.essayPct
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


          {/* ══ AI ASSISTANT TAB ══ */}
          {activeTab === 'ai' && (
            <div>
              <div className="mb-6">
                <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">Powered by Groq · llama-3.3-70b</p>
                <h2 className="text-3xl sm:text-4xl font-black text-[#020617]">AI Study Assistant</h2>
                <p className="text-sm text-slate-400 mt-1">ඔයාගේ marks data analyze කරලා A/L Engineering Technology syllabus target කරගත් personalized advice.</p>
              </div>
              <div className="border border-slate-200 rounded-3xl p-5 sm:p-6">
                <AIChatPanel
                  studentName={studentName}
                  studentId={studentId}
                  classRank={classRank}
                  classSize={classSize}
                  avgTotal={avgTotal}
                  avgMcqPct={avgMcqPct}
                  avgStrPct={avgStrPct}
                  avgEssPct={avgEssPct}
                  papers={chartData.map(p => ({ name: p.name, total: p.total, mcqPct: p.mcqPct, structuredPct: p.structuredPct, essayPct: p.essayPct }))}
                />
              </div>
              <p className="text-xs text-slate-400 text-center mt-4">Chat history automatically saved · Images stored in Supabase · Sessions logged to Google Sheets</p>
            </div>
          )}

          {/* ══ QUESTIONS TAB ══ */}
          {activeTab === 'questions' && (
            <div className="space-y-6">

              {/* Structured Q trend */}
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
                      <XAxis
                        dataKey="name" tickLine={false} axisLine={{ stroke: '#e2e8f0' }}
                        tickMargin={8} tick={{ fontSize: 11 }} tickFormatter={shortName}
                      />
                      <YAxis
                        tickLine={false} axisLine={{ stroke: '#e2e8f0' }}
                        tick={{ fontSize: 11 }} tickMargin={8}
                        domain={[0, SQ_PER_Q]} tickCount={6}
                        width={36}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      {(['sq1', 'sq2', 'sq3', 'sq4'] as const).map(k => (
                        <Line key={k} dataKey={k} type="natural" stroke={`var(--color-${k})`} strokeWidth={2} dot={{ r: 3 }} />
                      ))}
                    </LineChart>
                  </ChartContainer>
                </CardContent>
                <CardFooter>
                  <p className="text-xs text-slate-400">How each structured question score changed across papers</p>
                </CardFooter>
              </Card>

              {/* Essay Q trend */}
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
                      <XAxis
                        dataKey="name" tickLine={false} axisLine={{ stroke: '#e2e8f0' }}
                        tickMargin={8} tick={{ fontSize: 11 }} tickFormatter={shortName}
                      />
                      <YAxis
                        tickLine={false} axisLine={{ stroke: '#e2e8f0' }}
                        tick={{ fontSize: 11 }} tickMargin={8}
                        domain={[0, EQ_PER_Q]} tickCount={6}
                        width={36}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      {(['es1', 'es2', 'es3', 'es4'] as const).map(k => (
                        <Line key={k} dataKey={k} type="natural" stroke={`var(--color-${k})`} strokeWidth={2} dot={{ r: 3 }} />
                      ))}
                    </LineChart>
                  </ChartContainer>
                </CardContent>
                <CardFooter>
                  <p className="text-xs text-slate-400">How each essay question score changed across papers</p>
                </CardFooter>
              </Card>

              {/* Full data table */}
              {chartData.length > 0 && (
                <div className="border border-slate-200 rounded-3xl overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-100">
                    <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-1">Full Breakdown</p>
                    <h3 className="text-xl font-black text-[#020617]">All papers · all questions</h3>
                  </div>
                  <div className="overflow-x-auto -mx-0">
                    <table className="w-full text-sm min-w-[560px]">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-50">Paper</th>
                          <th className="text-right px-3 py-3 text-xs font-medium text-slate-400 uppercase">MCQ<br/><span className="font-normal">/50</span></th>
                          <th className="text-right px-3 py-3 text-xs font-medium text-slate-400 uppercase">SQ1<br/><span className="font-normal">/150</span></th>
                          <th className="text-right px-3 py-3 text-xs font-medium text-slate-400 uppercase">SQ2<br/><span className="font-normal">/150</span></th>
                          <th className="text-right px-3 py-3 text-xs font-medium text-slate-400 uppercase">SQ3<br/><span className="font-normal">/150</span></th>
                          <th className="text-right px-3 py-3 text-xs font-medium text-slate-400 uppercase">SQ4<br/><span className="font-normal">/150</span></th>
                          <th className="text-right px-3 py-3 text-xs font-medium text-slate-400 uppercase">EQ1<br/><span className="font-normal">/100</span></th>
                          <th className="text-right px-3 py-3 text-xs font-medium text-slate-400 uppercase">EQ2<br/><span className="font-normal">/100</span></th>
                          <th className="text-right px-3 py-3 text-xs font-medium text-slate-400 uppercase">EQ3<br/><span className="font-normal">/100</span></th>
                          <th className="text-right px-3 py-3 text-xs font-medium text-slate-400 uppercase">EQ4<br/><span className="font-normal">/100</span></th>
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

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-100 py-8 px-6 text-center">
        <p className="text-xs text-slate-400">
          © 2026 Engine with NAS. Powered by Engineering Technology Stream.
        </p>
      </footer>
    </div>
  )
}