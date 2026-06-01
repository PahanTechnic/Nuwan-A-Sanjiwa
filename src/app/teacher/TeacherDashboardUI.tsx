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

// ── Marking scheme (StudentDashboardUI එකට සමාන වේ) ───────────────────────────────
const MCQ_QUESTIONS   = 50
const MCQ_PER_Q       = 0.7
const MCQ_MAX         = MCQ_QUESTIONS * MCQ_PER_Q  // 35
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
  student_id: string // Student DB UUID
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

// ── ලකුණු ගණනය කිරීමේ තර්කනය ──────────────────────────────────────────────────
function calcTotal(m: MarkRow): number {
  const mcqScaled  = (Number(m.mcq_score) || 0) * MCQ_PER_Q
  const str        = (Number(m.seq_q1)||0)+(Number(m.seq_q2)||0)+(Number(m.seq_q3)||0)+(Number(m.seq_q4)||0)
  const ess        = (Number(m.ess_q1)||0)+(Number(m.ess_q2)||0)+(Number(m.ess_q3)||0)+(Number(m.ess_q4)||0)
  const p2Scaled   = (str + ess) / P2_DIVISOR
  const practical  = Number(m.practical_score) || 0
  return Number((mcqScaled + p2Scaled + practical).toFixed(2))
}

// ── Leaderboard එක සකස් කිරීමේ තර්කනය ───────────────────────────────────────
function buildLeaderboard(students: Student[], marks: MarkRow[]): LeaderboardEntry[] {
  const map: Record<string, number[]> = {}
  marks.forEach(m => {
    const sid = m.student_id
    if (!map[sid]) map[sid] = []
    map[sid].push(calcTotal(m))
  })

  return students
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
    .slice(0, 10) // උපරිම 10 දෙනෙක් පමණක් ලබාගනී (අඩු නම් සිටින ගණන පමණක් ගනී)
    .map((e, i) => ({ ...e, rank: i + 1 }))
}

function rankColor(rank: number) {
  if (rank === 1) return { bg: 'rgba(250, 204, 21, 0.15)', text: '#eab308', border: 'border-yellow-200' }
  if (rank === 2) return { bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8', border: 'border-slate-200' }
  if (rank === 3) return { bg: 'rgba(180, 83, 9, 0.15)', text: '#b45309', border: 'border-amber-600' }
  return { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-100' }
}

function rankIcon(rank: number) {
  if (rank === 1) return <Crown className="h-4 w-4 text-yellow-500 animate-pulse" />
  if (rank === 2) return <Medal className="h-4 w-4 text-slate-400" />
  if (rank === 3) return <Trophy className="h-4 w-4 text-amber-600" />
  return <span className="text-xs font-black text-slate-400">#{rank}</span>
}

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

  // Import states
  const [importType, setImportType]     = useState<'students' | 'marks'>('marks')
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [importing, setImporting]       = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const supabase    = createClient()
  const leaderboard = buildLeaderboard(students, marks)

  const pendingStudents  = students.filter(s => !s.approved)
  const approvedStudents = students.filter(s => s.approved)
  const totalMarksRows   = marks.length

  // Realtime updates: Students
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

  // Realtime updates: Marks
  useEffect(() => {
    const ch = supabase
      .channel('teacher-marks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marks' }, async () => {
        const { data } = await supabase.from('marks').select('*, papers(paper_name)')
        if (data) setMarks(data)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const handleApprove = async (s: Student) => {
    setApprovingId(s.id)
    const res = await approveStudent(s.id, s.student_id, s.book_number)
    if (res.success) {
      setStudents(prev => prev.map(st => st.id === s.id ? { ...st, approved: true } : st))
    }
    setApprovingId(null)
  }

  // ── 2. Dynamic Sample CSV Download Function ────────────────────────────────
  const downloadSampleCSV = () => {
    // ගුරුවරයා විසින් ඇතුළත් කළ යුතු නිවැරදි Columns අනුපිළිවෙල
    const headers = [
      'student_id',
      'student_name',
      'paper_name',
      'mcq_score',
      'seq_q1',
      'seq_q2',
      'seq_q3',
      'seq_q4',
      'ess_q1',
      'ess_q2',
      'ess_q3',
      'ess_q4',
      'practical_score'
    ]

    // සිස්ටම් එකේ දැනට සිටින සියලුම Approved සිසුන්ගේ දත්ත ස්වයංක්‍රීයව පිරවීම
    const rows = approvedStudents.map(s => [
      s.student_id,    // Book ID / Student ID
      s.name,          // Student Name
      '',              // paper_name (හිස්ව තැබේ - ගුරුවරයාට පිරවීමට)
      '', '', '', '', '', '', '', '', '', '' // අනෙකුත් ලකුණු තීරු හිස්ව තැබේ
    ])

    // PapaParse හෝ සාමාන්‍ය join ක්‍රමයට CSV එක නිර්මාණය කිරීම
    const csvContent = [headers, ...rows].map(e => e.map(val => `"${val}"`).join(',')).join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `dynamic_marks_template_${new Date().toISOString().slice(0,10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

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
            setImportStatus(res.success ? `✅ Marks imported successfully: ${res.successCount} rows.` : `❌ Import failed.`)
          } else {
            const res = await importStudents(result.data as any)
            setImportStatus(`✅ Students imported successfully!`)
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

  const desktopTabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'leaderboard', label: 'Top 10 Rank', icon: Trophy },
    { id: 'import', label: 'Data Management', icon: Upload },
  ]

  const filteredApproved = approvedStudents.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-white">
      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex h-9 w-9 items-center justify-between rounded-xl bg-gradient-to-tr from-slate-900 to-slate-800 p-2 text-white shadow-md shadow-slate-900/20">
                <Activity className="h-5 w-5" />
                <div className="absolute -right-1 -top-1 flex h-3 w-3">
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${isOnline ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  <span className={`relative inline-flex h-3 w-3 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                </div>
              </div>
              <div>
                <span className="block text-sm font-black tracking-tight text-slate-900 sm:text-base">Engine with NAS</span>
                <span className="block text-[10px] font-medium text-slate-400">Teacher Control Panel</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex md:items-center md:gap-1">
              {desktopTabs.map(t => {
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      activeTab === t.id
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {t.label}
                  </button>
                )
              })}
              <div className="mx-2 h-4 w-px bg-slate-200" />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>

            {/* Mobile Hamburger Menu */}
            <div className="flex md:hidden">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="inline-flex items-center justify-center rounded-xl p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              >
                {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {menuOpen && (
          <div className="border-b border-slate-200 bg-white px-4 pb-4 pt-2 md:hidden">
            <div className="space-y-1">
              {desktopTabs.map(t => {
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    onClick={() => { setActiveTab(t.id); setMenuOpen(false) }}
                    className={`flex w-full items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all ${
                      activeTab === t.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {t.label}
                  </button>
                )
              })}
              <div className="my-2 h-px bg-slate-100" />
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="h-5 w-5" />
                Logout
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ── MAIN BODY CONTENT ── */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Banner */}
        <div className="mb-8 flex flex-col justify-between gap-4 rounded-3xl bg-slate-900 p-6 text-white shadow-xl shadow-slate-900/10 sm:p-8 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Sparkles className="h-4 w-4 text-yellow-400" /> Welcome back
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Hello, {teacherName}!</h1>
            <p className="text-sm text-slate-400">Manage students, review evaluation metrics, and easily import grades.</p>
          </div>
        </div>

        {/* ── TAB CONTENTS ── */}
        <div className="space-y-8">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-500 uppercase">Total Enrolled</CardTitle>
                    <CardDescription>Approved in system</CardDescription>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 p-2.5 text-emerald-600"><Users className="h-5 w-5" /></div>
                </CardHeader>
                <CardContent><p className="text-3xl font-black text-slate-900 tabular-nums">{approvedStudents.length}</p></CardContent>
              </Card>

              <Card className="rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-500 uppercase">Pending Review</CardTitle>
                    <CardDescription>Awaiting authorization</CardDescription>
                  </div>
                  <div className="rounded-2xl bg-amber-50 p-2.5 text-amber-600"><Clock className="h-5 w-5" /></div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-black text-slate-900 tabular-nums">{pendingStudents.length}</p>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md sm:col-span-2 lg:col-span-1">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-500 uppercase">Evaluations Logged</CardTitle>
                    <CardDescription>Total mark records</CardDescription>
                  </div>
                  <div className="rounded-2xl bg-blue-50 p-2.5 text-blue-600"><FileText className="h-5 w-5" /></div>
                </CardHeader>
                <CardContent><p className="text-3xl font-black text-slate-900 tabular-nums">{totalMarksRows}</p></CardContent>
              </Card>
            </div>
          )}

          {/* TAB 2: STUDENTS REGISTRATION REVIEW */}
          {activeTab === 'students' && (
            <div className="space-y-6">
              {pendingStudents.length > 0 && (
                <Card className="rounded-3xl border-amber-200 bg-amber-50/20 shadow-none">
                  <CardHeader><CardTitle className="text-amber-800 flex items-center gap-2 text-lg font-bold"><Clock className="h-5 w-5" /> Registration Requests</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-amber-100/50 text-xs font-bold uppercase text-amber-900">
                          <tr>
                            <th className="px-6 py-3">Student Name</th>
                            <th className="px-6 py-3">Book ID</th>
                            <th className="px-6 py-3">Class</th>
                            <th className="px-6 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-100/50">
                          {pendingStudents.map(s => (
                            <tr key={s.id} className="hover:bg-amber-50/40">
                              <td className="px-6 py-4 font-bold text-slate-900">{s.name}</td>
                              <td className="px-6 py-4 font-mono text-sm">{s.student_id}</td>
                              <td className="px-6 py-4 font-medium">{s.class_name}</td>
                              <td className="px-6 py-4 text-right">
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(s)}
                                  disabled={approvingId === s.id}
                                  className="rounded-xl bg-amber-600 text-white font-semibold shadow-sm hover:bg-amber-700"
                                >
                                  {approvingId === s.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4 mr-1.5" />}
                                  Approve
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <CardHeader className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <CardTitle className="text-xl font-black text-slate-900">Active Directory</CardTitle>
                    <CardDescription>Search and filter approved student lists</CardDescription>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search student or ID..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-9 rounded-xl border-slate-200 focus-visible:ring-slate-950"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-3">Student Details</th>
                          <th className="px-6 py-3">Book ID</th>
                          <th className="px-6 py-3">Class Name</th>
                          <th className="px-6 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredApproved.length === 0 ? (
                          <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">No authorized records matches.</td></tr>
                        ) : (
                          filteredApproved.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50/50">
                              <td className="px-6 py-4 font-bold text-slate-900">{s.name}</td>
                              <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-500">{s.student_id}</td>
                              <td className="px-6 py-4 font-medium text-slate-600">{s.class_name}</td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="h-3 w-3" /> Active
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 3: LEADERBOARD SECTION (TOP 10 GRADE SCORES) */}
          {activeTab === 'leaderboard' && (
            <Card className="rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 sm:p-8">
                <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-widest text-slate-400">
                  <TrendingUp className="h-4 w-4 text-emerald-400" /> Performance Analytics
                </div>
                <CardTitle className="mt-1 text-2xl font-black tracking-tight">Top 10 Performance Leaderboard</CardTitle>
                <CardDescription className="text-slate-400">Ranked by overall average score across all logged papers</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="w-20 px-6 py-4 text-center">Rank</th>
                        <th className="px-6 py-4">Student Identity</th>
                        <th className="px-6 py-4">Book ID</th>
                        <th className="px-6 py-4">Class</th>
                        <th className="px-6 py-4 text-center">Evaluations</th>
                        <th className="px-6 py-4 text-right">Avg Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leaderboard.length === 0 ? (
                        <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">No student grade metrics evaluated yet.</td></tr>
                      ) : (
                        leaderboard.map(e => {
                          const conf = rankColor(e.rank)
                          return (
                            <tr key={e.student_id} className="hover:bg-slate-50/40 transition-colors">
                              <td className="px-6 py-4 text-center">
                                <div className={`mx-auto flex h-7 w-7 items-center justify-center rounded-xl border ${conf.bg} ${conf.text} ${conf.border} font-bold shadow-sm`}>
                                  {rankIcon(e.rank)}
                                </div>
                              </td>
                              <td className="px-6 py-4 font-black text-slate-900">{e.name}</td>
                              <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">{e.student_id}</td>
                              <td className="px-6 py-4 font-semibold text-slate-600">{e.class_name}</td>
                              <td className="px-6 py-4 text-center font-medium tabular-nums text-slate-500">{e.paperCount} papers</td>
                              <td className="px-6 py-4 text-right font-black text-emerald-600 text-base tabular-nums">{e.avgTotal}%</td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 4: CSV IMPORT & EXPORT HANDLING */}
          {activeTab === 'import' && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Template Exporter */}
              <Card className="rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <CardHeader>
                  <div className="rounded-2xl bg-slate-50 w-fit p-2.5 text-slate-900 border border-slate-100 mb-2"><Download className="h-5 w-5" /></div>
                  <CardTitle className="text-xl font-black text-slate-900">Download Dataset Template</CardTitle>
                  <CardDescription>
                    සිසුන්ගේ නම් සහ Book ID ස්වයංක්‍රීයව ඇතුළත් කළ Dynamic CSV එක ලබාගන්න.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-slate-500">
                  <p>මෙම ක්‍රියාවලිය මඟින් දැනට පද්ධතියේ සිටින සියලුම සක්‍රිය සිසුන් ඇතුළත් කර CSV ගොනුවක් සාදයි. ගුරුවරයාට කිරීමට ඇත්තේ අදාළ ලකුණු සහ Paper නාමය පමණක් පිරවීමයි.</p>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button
                    onClick={downloadSampleCSV}
                    className="w-full rounded-2xl bg-slate-900 text-white font-semibold shadow-md hover:bg-slate-800"
                  >
                    <Download className="h-4 w-4 mr-2" /> Get Dynamic Sample CSV
                  </Button>
                </CardFooter>
              </Card>

              {/* CSV Importer */}
              <Card className="rounded-3xl border border-slate-100 shadow-sm">
                <CardHeader>
                  <div className="rounded-2xl bg-slate-50 w-fit p-2.5 text-slate-900 border border-slate-100 mb-2"><Upload className="h-5 w-5" /></div>
                  <CardTitle className="text-xl font-black text-slate-900">Upload Evaluation Spreadsheet</CardTitle>
                  <CardDescription>පිරවූ CSV ගොනුව පද්ධතියට එක් කරන්න.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2 rounded-2xl bg-slate-50 p-1 border border-slate-100">
                    <button
                      onClick={() => { setImportType('marks'); setImportStatus(null) }}
                      className={`flex-1 rounded-xl py-2 text-xs font-bold uppercase tracking-wider transition-all ${importType === 'marks' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Marks Import
                    </button>
                    <button
                      onClick={() => { setImportType('students'); setImportStatus(null) }}
                      className={`flex-1 rounded-xl py-2 text-xs font-bold uppercase tracking-wider transition-all ${importType === 'students' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Bulk Students
                    </button>
                  </div>

                  <div className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center transition-all hover:border-slate-300">
                    <div className="flex flex-col items-center">
                      <Upload className="h-8 w-8 text-slate-300 mb-2" />
                      <span className="text-sm font-semibold text-slate-700">Upload your formatted .csv</span>
                      <span className="text-xs text-slate-400 mt-0.5">Max size 5MB</span>
                      <label className={`mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md cursor-pointer hover:bg-slate-800 transition-colors ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
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
                      <div className={`mt-4 p-3 rounded-2xl text-sm font-medium border ${importStatus.startsWith('✅') ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-700 border-red-100'}`}>
                        {importStatus}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-100 py-8 px-6 text-center mt-12">
        <p className="text-xs text-slate-400">
          © 2026 Engine with NAS. Powered by Engineering Technology Stream.
        </p>
      </footer>
    </div>
  )
}