'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { approveStudent } from '../actions/approveStudent'
import { importStudents } from '../actions/importStudents'
import { importMarks } from '../actions/importMarks'
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Users, CheckCircle2, Clock, Trophy, FileText, Activity,
  Upload, Download, LogOut, Wifi, WifiOff, Menu, X,
  TrendingUp, Medal, Crown, Sparkles, LayoutDashboard,
  UserCheck, UserX, Search, RefreshCw, FlaskConical,
} from 'lucide-react'
import Papa from 'papaparse'

// ── Marking scheme (same as StudentDashboardUI) ───────────────────────────────
const MCQ_PER_Q      = 0.7
const SQ_COUNT       = 4
const SQ_PER_Q       = 75
const SQ_MAX         = SQ_COUNT * SQ_PER_Q   // 300
const EQ_COUNT       = 4
const EQ_PER_Q       = 100
const EQ_MAX         = EQ_COUNT * EQ_PER_Q   // 400
const PAPER2_RAW_MAX = SQ_MAX + EQ_MAX        // 700
const PAPER2_SCALED  = 35
const P2_DIVISOR     = PAPER2_RAW_MAX / PAPER2_SCALED  // 20
const PRACTICAL_MAX  = 30

// ── Types ─────────────────────────────────────────────────────────────────────
interface Student {
  id: string
  student_id: string
  name: string
  class_name: string
  book_number: string
  approved: boolean
  created_at: string
  auth_user_id: string
}

interface MarkRow {
  student_id: string       // DB UUID
  mcq_score: number
  seq_q1: number; seq_q2: number; seq_q3: number; seq_q4: number
  ess_q1: number; ess_q2: number; ess_q3: number; ess_q4: number
  practical_score: number
  papers?: { paper_name: string }
}

interface Paper {
  id: string
  paper_name: string
}

interface LeaderboardEntry {
  rank: number
  student_id: string
  name: string
  class_name: string
  avgTotal: number
  paperCount: number
}

type Tab = 'overview' | 'students' | 'leaderboard' | 'import'

interface Props {
  teacherName: string
  initialStudents: Student[]
  initialMarks: MarkRow[]
  initialPapers: Paper[]
}

// ── Score calculator (identical logic to StudentDashboardUI) ──────────────────
function calcTotal(m: MarkRow): number {
  const mcqScaled  = (Number(m.mcq_score) || 0) * MCQ_PER_Q
  const str        = (Number(m.seq_q1)||0)+(Number(m.seq_q2)||0)+(Number(m.seq_q3)||0)+(Number(m.seq_q4)||0)
  const ess        = (Number(m.ess_q1)||0)+(Number(m.ess_q2)||0)+(Number(m.ess_q3)||0)+(Number(m.ess_q4)||0)
  const p2Scaled   = (str + ess) / P2_DIVISOR
  const practical  = Number(m.practical_score) || 0
  return Number((mcqScaled + p2Scaled + practical).toFixed(2))
}

function buildLeaderboard(students: Student[], marks: MarkRow[]): LeaderboardEntry[] {
  const map: Record<string, number[]> = {}
  marks.forEach(m => {
    const sid = m.student_id
    if (!map[sid]) map[sid] = []
    map[sid].push(calcTotal(m))
  })

  const entries: LeaderboardEntry[] = students
    .filter(s => s.approved)
    .map(s => {
      const totals = map[s.id] || []
      const avg = totals.length
        ? Number((totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1))
        : 0
      return {
        rank: 0,
        student_id: s.student_id,
        name: s.name,
        class_name: s.class_name,
        avgTotal: avg,
        paperCount: totals.length,
      }
    })
    .sort((a, b) => b.avgTotal - a.avgTotal)
    .slice(0, 10)
    .map((e, i) => ({ ...e, rank: i + 1 }))

  return entries
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function rankColor(rank: number) {
  if (rank === 1) return { bg: '#FFD700', text: '#7a5c00' }
  if (rank === 2) return { bg: '#C0C0C0', text: '#4a4a4a' }
  if (rank === 3) return { bg: '#CD7F32', text: '#5c3300' }
  return { bg: '#f1f5f9', text: '#64748b' }
}

function rankIcon(rank: number) {
  if (rank === 1) return <Crown className="h-3.5 w-3.5" />
  if (rank === 2) return <Medal className="h-3.5 w-3.5" />
  if (rank === 3) return <Trophy className="h-3.5 w-3.5" />
  return <span className="text-xs font-black">#{rank}</span>
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TeacherDashboardUI({ teacherName, initialStudents, initialMarks, initialPapers }: Props) {
  const [students, setStudents]   = useState<Student[]>(initialStudents)
  const [marks, setMarks]         = useState<MarkRow[]>(initialMarks)
  const [papers]                  = useState<Paper[]>(initialPapers)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [isOnline, setIsOnline]   = useState(true)
  const [menuOpen, setMenuOpen]   = useState(false)
  const [isLoggingOut, setLoggingOut] = useState(false)
  const [search, setSearch]       = useState('')
  const [approvingId, setApprovingId] = useState<string | null>(null)

  // Import state
  const [importType, setImportType]     = useState<'students' | 'marks'>('marks')
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [importing, setImporting]       = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const supabase    = createClient()
  const leaderboard = buildLeaderboard(students, marks)

  const pendingStudents  = students.filter(s => !s.approved)
  const approvedStudents = students.filter(s => s.approved)
  const totalMarksRows   = marks.length

  // ── Realtime: students ────────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel('teacher-students')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, async () => {
        const { data } = await supabase.from('students').select('*').order('created_at', { ascending: false })
        if (data) setStudents(data)
      })
      .subscribe(s => setIsOnline(s === 'SUBSCRIBED'))
    return () => { supabase.removeChannel(ch) }
  }, [])

  // ── Realtime: marks ───────────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel('teacher-marks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marks' }, async () => {
        const { data } = await supabase
          .from('marks')
          .select('*, papers(paper_name)')
        if (data) setMarks(data)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  // ── Approve ────────────────────────────────────────────────────────────────
  const handleApprove = async (s: Student) => {
    setApprovingId(s.id)
    const res = await approveStudent(s.id, s.student_id, s.book_number)
    if (res.success) {
      setStudents(prev => prev.map(st => st.id === s.id ? { ...st, approved: true } : st))
    }
    setApprovingId(null)
  }

  // ── Dynamic sample CSV ─────────────────────────────────────────────────────
  const downloadSampleCSV = () => {
    const header = [
      'student_id', 'paper_name',
      'mcq_score',
      'seq_q1', 'seq_q2', 'seq_q3', 'seq_q4',
      'ess_q1', 'ess_q2', 'ess_q3', 'ess_q4',
    ]
    const rows = approvedStudents.map(s => [
      s.student_id,
      '',   // paper_name — ගුරුවරයා fill කරන්නේ
      '',   // mcq_score
      '', '', '', '',
      '', '', '', '',
    ])
    const csv = [header, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'marks_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Import CSV ─────────────────────────────────────────────────────────────
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportStatus(null)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        try {
          if (importType === 'marks') {
            const res = await importMarks(result.data as any)
            setImportStatus(res.success
              ? `✅ Marks imported: ${res.successCount} success, ${res.errorCount} errors`
              : `❌ Import failed: ${res.error}`)
          } else {
            const res = await importStudents(result.data as any)
            setImportStatus(`✅ Students imported: ${res.successCount} success, ${res.errorCount} errors`)
          }
        } catch (err: any) {
          setImportStatus(`❌ Error: ${err.message}`)
        }
        setImporting(false)
        if (fileRef.current) fileRef.current.value = ''
      },
      error: (err) => {
        setImportStatus(`❌ CSV parse error: ${err.message}`)
        setImporting(false)
      },
    })
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id.toLowerCase().includes(search.toLowerCase())
  )

  // ── Desktop tab bar ────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview',    label: 'Overview'    },
    { id: 'students',    label: 'Students'    },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'import',      label: 'Import Data' },
  ]

  return (
    <div className="min-h-screen bg-white">

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl border border-slate-200 flex items-center justify-center shrink-0">
              <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <div>
              <p className="font-bold text-sm leading-none">Engine with NAS</p>
              <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">Teacher Panel</p>
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
            <span className="italic">{teacherName}</span>
          </h1>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-600 border border-slate-200 rounded-full px-3 sm:px-5 py-1.5 sm:py-2">
              Teacher Panel
            </span>
            {pendingStudents.length > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white bg-amber-500 rounded-full px-3 sm:px-5 py-1.5 sm:py-2">
                <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                {pendingStudents.length} Pending Approval
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── STAT CARDS ── */}
      <section className="px-4 sm:px-6 py-6 sm:py-12 border-b border-slate-100">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {([
            {
              label: 'Total Students', value: `${students.length}`,
              unit: '', sub: 'Registered', icon: <Users className="h-4 w-4 sm:h-5 sm:w-5" />,
            },
            {
              label: 'Approved', value: `${approvedStudents.length}`,
              unit: '', sub: 'Active accounts', icon: <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />,
            },
            {
              label: 'Pending', value: `${pendingStudents.length}`,
              unit: '', sub: 'Awaiting approval', icon: <Clock className="h-4 w-4 sm:h-5 sm:w-5" />,
            },
            {
              label: 'Marks Records', value: `${totalMarksRows}`,
              unit: '', sub: 'Total entries', icon: <FileText className="h-4 w-4 sm:h-5 sm:w-5" />,
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
      </section>

      {/* ── MAIN CONTENT ── */}
      <section className="px-4 sm:px-6 py-8 sm:py-20">
        <div className="max-w-7xl mx-auto">

          <div className="text-center mb-6 sm:mb-14">
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-slate-400 mb-2 sm:mb-4">Management Panel</p>
            <h2 className="text-2xl sm:text-5xl font-black text-[#020617] tracking-tight">Manage your class</h2>
            <p className="text-slate-400 mt-2 text-xs sm:text-sm max-w-sm mx-auto">
              Approve students, import marks, and view the leaderboard.
            </p>
          </div>

          {/* Tab bar */}
          <div className="flex flex-wrap items-center gap-2 mb-8 sm:mb-12 justify-center">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 sm:px-5 py-2 rounded-full text-sm font-medium transition-colors border whitespace-nowrap ${
                  activeTab === t.id
                    ? 'bg-[#020617] text-white border-[#020617]'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {t.label}
                {t.id === 'students' && pendingStudents.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center h-4 w-4 rounded-full bg-amber-400 text-[10px] font-black text-white">
                    {pendingStudents.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ══ OVERVIEW TAB ══ */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Pending approvals quick list */}
              {pendingStudents.length > 0 && (
                <div className="border border-amber-200 bg-amber-50 rounded-3xl p-6 sm:p-8">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="h-10 w-10 rounded-2xl bg-amber-400 text-white flex items-center justify-center shrink-0">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-black text-[#020617] text-lg">Pending Approvals</p>
                      <p className="text-xs text-amber-700">{pendingStudents.length} ශිෂ්‍යයන් අනුමැතිය බලාපොරොත්තු වෙනවා</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {pendingStudents.slice(0, 5).map(s => (
                      <div key={s.id} className="flex items-center justify-between gap-3 bg-white rounded-2xl p-4 border border-amber-100">
                        <div className="min-w-0">
                          <p className="font-bold text-[#020617] text-sm truncate">{s.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{s.student_id} · Book: {s.book_number} · Year: {s.class_name}</p>
                        </div>
                        <button
                          disabled={approvingId === s.id}
                          onClick={() => handleApprove(s)}
                          className="shrink-0 inline-flex items-center gap-1.5 h-8 px-4 rounded-full bg-[#020617] text-white text-xs font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {approvingId === s.id ? '…' : 'Approve'}
                        </button>
                      </div>
                    ))}
                    {pendingStudents.length > 5 && (
                      <button onClick={() => setActiveTab('students')} className="w-full text-xs text-amber-700 font-medium py-2 hover:underline">
                        තවත් {pendingStudents.length - 5} දෙනෙක් බලන්න →
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Top 3 quick preview */}
              {leaderboard.length > 0 && (
                <div className="border border-slate-200 rounded-3xl p-6 sm:p-8">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-[#020617] text-white flex items-center justify-center shrink-0">
                        <Trophy className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-black text-[#020617] text-lg">Top Students</p>
                        <p className="text-xs text-slate-400">Average total score ranking</p>
                      </div>
                    </div>
                    <button onClick={() => setActiveTab('leaderboard')} className="text-xs text-slate-400 hover:text-[#020617] font-medium">
                      Full leaderboard →
                    </button>
                  </div>
                  <div className="space-y-2">
                    {leaderboard.slice(0, 3).map(e => {
                      const c = rankColor(e.rank)
                      return (
                        <div key={e.student_id} className="flex items-center gap-4 rounded-2xl border border-slate-100 p-4">
                          <div
                            className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm"
                            style={{ backgroundColor: c.bg, color: c.text }}
                          >
                            {rankIcon(e.rank)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[#020617] text-sm truncate">{e.name}</p>
                            <p className="text-xs text-slate-400">{e.student_id} · {e.paperCount} papers</p>
                          </div>
                          <p className="text-2xl font-black text-[#020617] tabular-nums shrink-0">
                            {e.avgTotal}
                            <span className="text-xs font-medium text-slate-400">/100</span>
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Class summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-50 to-white">
                  <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-3">Class Average</p>
                  {leaderboard.length > 0 ? (
                    <>
                      <p className="text-5xl font-black text-[#020617] leading-none">
                        {(leaderboard.reduce((s, e) => s + e.avgTotal, 0) / leaderboard.length).toFixed(1)}
                        <span className="text-lg font-medium text-slate-400">/100</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-2">Top {leaderboard.length} students average</p>
                    </>
                  ) : (
                    <p className="text-slate-400 text-sm">No marks data yet</p>
                  )}
                </div>
                <div className="border border-slate-200 rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-50 to-white">
                  <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-3">Papers Available</p>
                  <p className="text-5xl font-black text-[#020617] leading-none">{papers.length}</p>
                  <p className="text-xs text-slate-400 mt-2">Exam papers in system</p>
                </div>
              </div>
            </div>
          )}

          {/* ══ STUDENTS TAB ══ */}
          {activeTab === 'students' && (
            <div className="space-y-5">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="නමින් හෝ Student ID වලින් සොයන්න..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10 rounded-2xl border-slate-200 h-11"
                />
              </div>

              {/* Pending */}
              {filteredStudents.filter(s => !s.approved).length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-amber-500" /> Pending Approval
                  </p>
                  <div className="space-y-2">
                    {filteredStudents.filter(s => !s.approved).map(s => (
                      <div key={s.id} className="flex items-center gap-3 border border-amber-200 bg-amber-50 rounded-2xl p-4">
                        <div className="h-10 w-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                          <UserX className="h-4 w-4 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[#020617] text-sm truncate">{s.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{s.student_id} · Book: {s.book_number} · Year: {s.class_name}</p>
                        </div>
                        <button
                          disabled={approvingId === s.id}
                          onClick={() => handleApprove(s)}
                          className="shrink-0 inline-flex items-center gap-1.5 h-8 px-4 rounded-full bg-[#020617] text-white text-xs font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {approvingId === s.id ? '…' : 'Approve'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Approved */}
              {filteredStudents.filter(s => s.approved).length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                    <UserCheck className="h-3.5 w-3.5 text-emerald-500" /> Approved Students
                  </p>
                  <div className="border border-slate-200 rounded-3xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[500px]">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-widest">Name</th>
                            <th className="text-left px-3 py-3 text-xs font-medium text-slate-400 uppercase">Student ID</th>
                            <th className="text-left px-3 py-3 text-xs font-medium text-slate-400 uppercase hidden sm:table-cell">Year</th>
                            <th className="text-left px-3 py-3 text-xs font-medium text-slate-400 uppercase hidden sm:table-cell">Book ID</th>
                            <th className="text-right px-5 py-3 text-xs font-medium text-slate-400 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStudents.filter(s => s.approved).map((s, i, arr) => (
                            <tr key={s.id} className={`border-t border-slate-100 hover:bg-slate-50 transition-colors ${i === arr.length - 1 ? '' : ''}`}>
                              <td className="px-5 py-3 font-medium text-[#020617]">{s.name}</td>
                              <td className="px-3 py-3 font-mono text-xs text-slate-600">{s.student_id}</td>
                              <td className="px-3 py-3 text-slate-500 hidden sm:table-cell">{s.class_name}</td>
                              <td className="px-3 py-3 text-slate-500 hidden sm:table-cell">{s.book_number}</td>
                              <td className="px-5 py-3 text-right">
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                                  <CheckCircle2 className="h-3 w-3" /> Active
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {filteredStudents.length === 0 && (
                <div className="text-center py-20 text-slate-400 text-sm">
                  ශිෂ්‍යයන් සොයාගත නොහැක.
                </div>
              )}
            </div>
          )}

          {/* ══ LEADERBOARD TAB ══ */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-11 w-11 rounded-2xl bg-[#020617] text-white flex items-center justify-center shrink-0">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-black text-[#020617] text-xl">Top {leaderboard.length} Students</p>
                  <p className="text-xs text-slate-400">Average total score — all papers combined</p>
                </div>
              </div>

              {leaderboard.length === 0 ? (
                <div className="text-center py-20 text-slate-400 text-sm border border-slate-200 rounded-3xl">
                  Marks data නොමැත. Marks import කරන්න.
                </div>
              ) : (
                <>
                  {/* Top 3 podium */}
                  <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
                    {leaderboard.slice(0, Math.min(3, leaderboard.length)).map(e => {
                      const c = rankColor(e.rank)
                      const heights = ['h-36 sm:h-44', 'h-28 sm:h-36', 'h-24 sm:h-32']
                      const order   = [1, 0, 2]  // 2nd, 1st, 3rd visual order
                      return null  // rendered below in sorted visual order
                    })}
                  </div>

                  {/* Podium (1st center, 2nd left, 3rd right) */}
                  {leaderboard.length >= 1 && (
                    <div className="flex items-end justify-center gap-3 sm:gap-4 mb-8">
                      {[
                        leaderboard[1] ?? null,
                        leaderboard[0],
                        leaderboard[2] ?? null,
                      ].map((e, vi) => {
                        if (!e) return <div key={vi} className="flex-1 max-w-[140px]" />
                        const c = rankColor(e.rank)
                        const h = vi === 1 ? 'pt-0' : vi === 0 ? 'pt-6' : 'pt-10'
                        return (
                          <div key={e.student_id} className={`flex-1 max-w-[140px] flex flex-col items-center ${h}`}>
                            <div
                              className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl flex items-center justify-center font-black text-lg mb-2 border-2"
                              style={{ backgroundColor: c.bg, color: c.text, borderColor: c.bg }}
                            >
                              {rankIcon(e.rank)}
                            </div>
                            <p className="text-xs font-bold text-[#020617] text-center leading-tight px-1 truncate w-full text-center">{e.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{e.student_id}</p>
                            <div
                              className="w-full mt-3 rounded-t-2xl flex flex-col items-center justify-start pt-3 pb-2 min-h-[60px] sm:min-h-[80px]"
                              style={{ backgroundColor: c.bg }}
                            >
                              <p className="text-2xl sm:text-3xl font-black leading-none" style={{ color: c.text }}>{e.avgTotal}</p>
                              <p className="text-[10px] mt-0.5" style={{ color: c.text, opacity: 0.7 }}>/100 avg</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Full list */}
                  <div className="border border-slate-200 rounded-3xl overflow-hidden">
                    <div className="px-5 sm:px-6 py-4 border-b border-slate-100">
                      <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-0.5">Full Ranking</p>
                      <h3 className="text-xl font-black text-[#020617]">Top {leaderboard.length} Leaderboard</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {leaderboard.map(e => {
                        const c = rankColor(e.rank)
                        return (
                          <div key={e.student_id} className="flex items-center gap-4 px-5 sm:px-6 py-4 hover:bg-slate-50 transition-colors">
                            <div
                              className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm"
                              style={{ backgroundColor: c.bg, color: c.text }}
                            >
                              {rankIcon(e.rank)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-[#020617] text-sm truncate">{e.name}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{e.student_id} · {e.class_name} · {e.paperCount} paper{e.paperCount !== 1 ? 's' : ''}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-2xl font-black text-[#020617] tabular-nums leading-none">{e.avgTotal}</p>
                              <p className="text-[10px] text-slate-400">/100 avg</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ══ IMPORT TAB ══ */}
          {activeTab === 'import' && (
            <div className="space-y-6 max-w-2xl mx-auto">

              {/* Import type selector */}
              <div className="border border-slate-200 rounded-3xl p-6 sm:p-8">
                <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-4">Import Type</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['marks', 'students'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setImportType(t)}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        importType === t
                          ? 'border-[#020617] bg-[#020617] text-white'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <p className="font-bold text-sm capitalize">{t === 'marks' ? 'Marks CSV' : 'Students CSV'}</p>
                      <p className={`text-xs mt-1 ${importType === t ? 'text-slate-300' : 'text-slate-400'}`}>
                        {t === 'marks' ? 'Exam marks import කරන්න' : 'Bulk student import කරන්න'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Download sample */}
              {importType === 'marks' && (
                <div className="border border-slate-200 rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-50 to-white">
                  <div className="flex items-start gap-4">
                    <div className="h-11 w-11 rounded-2xl border border-slate-200 bg-white flex items-center justify-center shrink-0">
                      <Download className="h-5 w-5 text-slate-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-[#020617] text-lg">Sample CSV Download</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        සිස්ටම් එකේ ඉන්න approved ළමයින්ගේ Student ID සහ නම ස්වයංක්‍රීයව ඇතුළත් වෙලා CSV හැදෙනවා.
                        Paper Name සහ Marks columns හිස්ව ඇත — ඒවා fill කරලා import කරන්න.
                      </p>
                      <div className="mt-3 text-xs text-slate-400 space-y-0.5">
                        <p>✅ {approvedStudents.length} approved students ඇතුළත් වෙනවා</p>
                        <p>📋 Columns: student_id, paper_name, mcq_score, seq_q1–4, ess_q1–4</p>
                      </div>
                      <button
                        onClick={downloadSampleCSV}
                        className="mt-4 inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[#020617] text-white text-sm font-bold hover:bg-slate-800 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        Get Sample CSV ({approvedStudents.length} students)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Column reference */}
              <div className="border border-slate-200 rounded-3xl overflow-hidden">
                <div className="px-5 sm:px-6 py-4 border-b border-slate-100">
                  <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-0.5">CSV Format Reference</p>
                  <h3 className="text-xl font-black text-[#020617]">
                    {importType === 'marks' ? 'Marks CSV columns' : 'Students CSV columns'}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[400px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-400 uppercase">Column</th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-slate-400 uppercase">Example</th>
                        <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-400 uppercase">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(importType === 'marks' ? [
                        { col: 'student_id',  ex: 'ET26-A1234', note: 'Student ID (auto-filled in sample)' },
                        { col: 'paper_name',  ex: 'Paper 01',   note: 'Exam paper name' },
                        { col: 'mcq_score',   ex: '38',         note: 'Number of correct MCQs (out of 50)' },
                        { col: 'seq_q1–q4',   ex: '60',         note: `Structured Qs, each /${SQ_PER_Q}` },
                        { col: 'ess_q1–q4',   ex: '80',         note: `Essay Qs, each /${EQ_PER_Q}` },
                      ] : [
                        { col: 'student_id',  ex: 'ET26-A1234', note: 'Unique student ID' },
                        { col: 'name',        ex: 'Pahan C.',   note: 'Full name' },
                        { col: 'book_number', ex: 'B-1052',     note: 'Book ID (used as password)' },
                        { col: 'class_name',  ex: '2026',       note: 'Class year' },
                      ]).map(r => (
                        <tr key={r.col} className="border-t border-slate-100">
                          <td className="px-5 py-2.5 font-mono text-xs font-bold text-[#020617]">{r.col}</td>
                          <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{r.ex}</td>
                          <td className="px-5 py-2.5 text-xs text-slate-400">{r.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Upload */}
              <div className="border border-slate-200 rounded-3xl p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <div className="h-11 w-11 rounded-2xl border border-slate-200 bg-white flex items-center justify-center shrink-0">
                    <Upload className="h-5 w-5 text-slate-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-[#020617] text-lg">Upload CSV</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {importType === 'marks' ? 'Marks CSV' : 'Students CSV'} ෆයිල් එක upload කරන්න
                    </p>
                    <div className="mt-4 flex flex-col sm:flex-row gap-3">
                      <label className={`inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[#020617] text-white text-sm font-bold cursor-pointer hover:bg-slate-800 transition-colors ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
                        <Upload className="h-4 w-4" />
                        {importing ? 'Importing…' : 'Choose CSV File'}
                        <input
                          ref={fileRef}
                          type="file"
                          accept=".csv"
                          className="hidden"
                          onChange={handleFileImport}
                          disabled={importing}
                        />
                      </label>
                    </div>
                    {importStatus && (
                      <div className={`mt-4 p-3 rounded-2xl text-sm font-medium border ${
                        importStatus.startsWith('✅')
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-red-50 text-red-700 border-red-100'
                      }`}>
                        {importStatus}
                      </div>
                    )}
                  </div>
                </div>
              </div>
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