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
  Upload, Download, LogOut, Menu, X, TrendingUp, Medal, Crown, Sparkles, 
  LayoutDashboard, UserCheck, Search, RefreshCw, Wifi, WifiOff, BarChart3
} from 'lucide-react'
import Papa from 'papaparse'
import { cn } from "@/lib/utils"

// ── Marking Scheme ────────────────────────────────────────────────────────────
const MCQ_PER_Q       = 0.7
const SQ_COUNT        = 4
const SQ_PER_Q        = 75
const SQ_MAX          = SQ_COUNT * SQ_PER_Q   
const EQ_COUNT        = 4
const EQ_PER_Q        = 100
const EQ_MAX          = EQ_COUNT * EQ_PER_Q   
const PAPER2_RAW_MAX  = SQ_MAX + EQ_MAX        
const PAPER2_SCALED   = 35
const P2_DIVISOR      = PAPER2_RAW_MAX / PAPER2_SCALED  

function calcTotal(m: any): number {
  const mcqScaled  = (Number(m.mcq_score) || 0) * MCQ_PER_Q
  const str        = (Number(m.seq_q1)||0)+(Number(m.seq_q2)||0)+(Number(m.seq_q3)||0)+(Number(m.seq_q4)||0)
  const ess        = (Number(m.ess_q1)||0)+(Number(m.ess_q2)||0)+(Number(m.ess_q3)||0)+(Number(m.ess_q4)||0)
  const p2Scaled   = (str + ess) / P2_DIVISOR
  const practical  = Number(m.practical_score) || 0
  return Number((mcqScaled + p2Scaled + practical).toFixed(2))
}

function buildLeaderboard(students: any[], marks: any[]): any[] {
  const map: Record<string, number[]> = {}
  if (!marks || !Array.isArray(marks)) return [];

  marks.forEach(m => {
    const sid = m.student_id
    if (sid) {
      if (!map[sid]) map[sid] = []
      map[sid].push(calcTotal(m))
    }
  });

  if (!students || !Array.isArray(students)) return [];

  return students
    .filter(s => s && s.approved)
    .map(s => {
      const totals = map[s.id] || []
      const avg = totals.length
        ? Number((totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1))
        : 0
      return {
        rank: 0,
        student_uid: s.id,
        student_id: s.student_id || 'N/A',
        name: s.name || 'Unknown',
        class_name: s.class_name || 'N/A',
        avgTotal: avg,
        paperCount: totals.length,
      }
    })
    .sort((a, b) => b.avgTotal - a.avgTotal)
    .slice(0, 10) 
    .map((e, i) => ({ ...e, rank: i + 1 }))
}

function rankColor(rank: number) {
  if (rank === 1) return { bg: 'bg-yellow-500/10', text: 'text-yellow-600', border: 'border-yellow-200' }
  if (rank === 2) return { bg: 'bg-slate-500/10', text: 'text-slate-500', border: 'border-slate-200' }
  if (rank === 3) return { bg: 'bg-amber-700/10', text: 'text-amber-700', border: 'border-amber-200' }
  return { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-100' }
}

function rankIcon(rank: number) {
  if (rank === 1) return <Crown className="h-4 w-4 text-yellow-500 animate-pulse" />
  if (rank === 2) return <Medal className="h-4 w-4 text-slate-400" />
  if (rank === 3) return <Trophy className="h-4 w-4 text-amber-700" />
  return <span className="text-xs font-black text-slate-400">#{rank}</span>
}

type Tab = 'overview' | 'students' | 'leaderboard' | 'import'

export default function TeacherDashboardUI({ teacherName, initialStudents = [], initialMarks = [], initialPapers = [] }: any) {
  const [students, setStudents]   = useState<any[]>(initialStudents)
  const [marks, setMarks]         = useState<any[]>(initialMarks)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [isOnline, setIsOnline]   = useState(true)
  const [menuOpen, setMenuOpen]   = useState(false)
  const [isLoggingOut, setLoggingOut] = useState(false)
  const [search, setSearch]       = useState('')
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [hoveredBar, setHoveredBar] = useState<string | null>(null)

  const [importType, setImportType]     = useState<'marks' | 'students'>('marks')
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [importing, setImporting]       = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  const leaderboard = buildLeaderboard(students, marks)
  const pendingStudents  = students ? students.filter(s => s && !s.approved) : []
  const approvedStudents = students ? students.filter(s => s && s.approved) : []
  const totalMarksRows   = marks ? marks.length : 0

  // Realtime Listeners
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

  // ── Processing Chart Analytics Data ─────────────────────────────────────────
  const getChartAnalytics = () => {
    const paperMap: Record<string, { total: number; count: number }> = {}
    marks.forEach(m => {
      const name = m.paper_name || m.papers?.paper_name || 'Evaluation'
      const finalScore = calcTotal(m)
      if (!paperMap[name]) {
        paperMap[name] = { total: 0, count: 0 }
      }
      paperMap[name].total += finalScore
      paperMap[name].count += 1
    })

    const data = Object.keys(paperMap).map(name => ({
      name,
      avg: Number((paperMap[name].total / paperMap[name].count).toFixed(1)),
      submissions: paperMap[name].count
    }))

    if (data.length === 0) {
      return [
        { name: 'Paper 01', avg: 74, submissions: 12 },
        { name: 'Paper 02', avg: 62, submissions: 15 },
        { name: 'Paper 03', avg: 85, submissions: 9 },
        { name: 'Paper 04', avg: 45, submissions: 20 },
      ]
    }
    return data;
  }

  const chartData = getChartAnalytics()

  const handleApprove = async (s: any) => {
    setApprovingId(s.id)
    const res = await approveStudent(s.id, s.student_id, s.book_number)
    if (res.success) {
      setStudents(prev => prev.map(st => st.id === s.id ? { ...st, approved: true } : st))
    }
    setApprovingId(null)
  }

  const downloadSampleCSV = () => {
    const headers = [
      'student_id', 'student_name', 'paper_name', 'mcq_score',
      'seq_q1', 'seq_q2', 'seq_q3', 'seq_q4',
      'ess_q1', 'ess_q2', 'ess_q3', 'ess_q4', 'practical_score'
    ]
    const rows = approvedStudents.map(s => [
      s.student_id || '', s.name || '', '', '', '', '', '', '', '', '', '', '', ''
    ])
    const csvContent = [headers, ...rows].map(e => e.map(val => `"${val}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `template_${new Date().toISOString().slice(0,10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // ✅ FIX: transformHeader lowercase කරනවා — Student_id vs student_id issue fix
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportStatus(null)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().trim(), // ✅ FIX
      complete: async (result) => {
        try {
          if (importType === 'marks') {
            const res = await importMarks(result.data as any)
            setImportStatus(
              res.success
                ? `✅ Import සාර්ථකයි! ${res.successCount} rows imported${res.errorCount > 0 ? `, ${res.errorCount} errors` : ''}.`
                : `❌ Import failed. ${res.error || ''}`
            )
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

  const filteredApproved = approvedStudents.filter(s => {
    const studentName = s?.name?.toLowerCase() || '';
    const studentId = s?.student_id?.toLowerCase() || '';
    const query = search.toLowerCase();
    return studentName.includes(query) || studentId.includes(query);
  });

  const desktopTabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview',    label: 'Overview',        icon: LayoutDashboard },
    { id: 'students',    label: 'Students',        icon: Users },
    { id: 'leaderboard', label: 'Top 10 Rank',     icon: Trophy },
    { id: 'import',      label: 'Data Management', icon: Upload },
  ]

  return (
    <div className="min-h-screen bg-white pb-28 sm:pb-0">
      
      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl border border-slate-200 flex items-center justify-center shrink-0">
              <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <div>
              <p className="font-bold text-sm leading-none text-[#020617]">Engine with NAS</p>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">Teacher Control Panel</p>
            </div>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-2">
            {desktopTabs.map(t => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all border whitespace-nowrap flex items-center gap-2",
                    activeTab === t.id
                      ? "bg-[#020617] text-white border-[#020617]"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              )
            })}
            <div className="mx-2 h-4 w-px bg-slate-200" />
            <Button variant="ghost" size="sm" onClick={handleLogout} disabled={isLoggingOut} className="rounded-full text-rose-600 hover:bg-rose-50 px-4">
              <LogOut className="h-3.5 w-3.5 mr-2" /> Logout
            </Button>
          </div>

          {/* Mobile Right Controls */}
          <div className="md:hidden flex items-center gap-2">
            <span className={cn(
              "p-1.5 rounded-xl border flex items-center justify-center",
              isOnline ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200'
            )}>
              {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            </span>
            <button className="h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center text-rose-600" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-slate-100 px-4 py-3 flex items-center justify-between bg-white">
            <span className="text-xs text-slate-400 font-medium">Sign out of your account?</span>
            <Button size="sm" onClick={handleLogout} disabled={isLoggingOut} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs h-8">
              Confirm Logout
            </Button>
          </div>
        )}
      </nav>

      {/* ── HERO BANNER ── */}
      <section className="px-4 sm:px-6 py-6 sm:py-14 border-b border-slate-100 bg-gradient-to-b from-slate-50/50 to-white">
        <div className="max-w-7xl mx-auto text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-slate-400 mb-1 flex items-center justify-center sm:justify-start gap-1.5">
              <Sparkles className="h-3 w-3 text-yellow-500" /> Live Administration
            </p>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#020617]">
              Hello, <span className="italic">{teacherName}</span>
            </h1>
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT AREA ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="space-y-8">
          
          {/* ══ OVERVIEW TAB ══ */}
          {activeTab === 'overview' && (
            <div className="space-y-6 sm:space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {[
                  { label: 'Active Students', value: approvedStudents.length, sub: 'Registered and verified', icon: <Users className="h-4 w-4 sm:h-5 sm:w-5" /> },
                  { label: 'Pending Review', value: pendingStudents.length, sub: 'Awaiting authorization', icon: <Clock className="h-4 w-4 sm:h-5 sm:w-5" />, color: pendingStudents.length > 0 ? 'border-amber-300 bg-amber-50/20 text-amber-600' : '' },
                  { label: 'Total Marks Rows', value: totalMarksRows, sub: 'Imported database logs', icon: <FileText className="h-4 w-4 sm:h-5 sm:w-5" /> }
                ].map((card, i) => (
                  <div key={i} className={cn("border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-8 flex items-start justify-between gap-4 bg-white", card.color)}>
                    <div>
                      <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest font-medium truncate">{card.label}</p>
                      <p className="text-2xl sm:text-5xl font-black text-[#020617] mt-1 sm:mt-2 leading-none">{card.value}</p>
                      <p className="text-[10px] sm:text-xs text-slate-400 mt-1 sm:mt-2">{card.sub}</p>
                    </div>
                    <div className="h-8 w-8 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl border border-slate-200 flex items-center justify-center text-slate-600 shrink-0 bg-white">
                      {card.icon}
                    </div>
                  </div>
                ))}
              </div>

              {/* ANALYTICS CHART */}
              <Card className="rounded-2xl sm:rounded-3xl border-slate-200 shadow-none overflow-hidden">
                <CardHeader className="border-b border-slate-100 pb-5">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-[#020617]">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-lg sm:text-xl font-black text-[#020617]">Class Performance Batch Analytics</CardTitle>
                      <CardDescription className="text-xs">පවත්වන ලද සෑම පරීක්ෂණයකම ශිෂ්‍ය ලකුණු මට්ටම්වල සාමාන්‍යය (Class Average) සජීවීව නිරූපණය වේ.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-8 px-4 sm:px-8 pb-6">
                  <div className="relative h-64 w-full flex flex-col justify-between">
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                      {[100, 75, 50, 25, 0].map((line) => (
                        <div key={line} className="w-full flex items-center gap-4">
                          <span className="w-8 text-[10px] font-mono font-bold text-slate-300 text-right">{line}%</span>
                          <div className="flex-1 border-b border-dashed border-slate-100" />
                        </div>
                      ))}
                    </div>
                    <div className="relative z-10 flex-1 ml-12 flex items-end justify-around h-full pt-2 pb-1">
                      {chartData.map((item, idx) => (
                        <div 
                          key={idx} 
                          className="relative flex flex-col items-center group h-full justify-end w-full max-w-[60px] sm:max-w-[80px] px-1"
                          onMouseEnter={() => setHoveredBar(item.name)}
                          onMouseLeave={() => setHoveredBar(null)}
                        >
                          <div className={cn(
                            "absolute -top-10 z-20 bg-[#020617] text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl shadow-xl transition-all duration-200 pointer-events-none flex flex-col items-center gap-0.5 whitespace-nowrap",
                            hoveredBar === item.name ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95"
                          )}>
                            <span>Avg: {item.avg}%</span>
                            <span className="text-[8px] text-slate-400 font-normal">{item.submissions} Papers Logged</span>
                            <div className="w-1.5 h-1.5 bg-[#020617] rotate-45 absolute -bottom-0.5 left-1/2 -translate-x-1/2" />
                          </div>
                          <div 
                            className={cn(
                              "w-full rounded-t-xl transition-all duration-500 ease-out relative overflow-hidden cursor-pointer",
                              item.avg >= 75 ? "bg-[#020617]" : item.avg >= 50 ? "bg-slate-700" : "bg-slate-400"
                            )}
                            style={{ height: `${item.avg}%` }}
                          >
                            <div className="absolute inset-x-0 top-0 h-1 bg-white/20" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="ml-12 mt-3 flex justify-around border-t border-slate-100 pt-3 text-center">
                    {chartData.map((item, idx) => (
                      <div key={idx} className="w-full max-w-[60px] sm:max-w-[80px] px-1 truncate">
                        <p className="text-[11px] font-bold text-[#020617] truncate">{item.name}</p>
                        <p className="text-[9px] font-mono font-bold text-emerald-600 mt-0.5">{item.avg}%</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ══ STUDENTS TAB ══ */}
          {activeTab === 'students' && (
            <div className="space-y-6">
              {pendingStudents.length > 0 && (
                <Card className="rounded-2xl sm:rounded-3xl border-amber-200 bg-amber-50/20 shadow-none overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-amber-900 text-lg sm:text-xl font-black flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-amber-600" /> Pending Approval Requests
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 border-t border-amber-200/50">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm min-w-[400px]">
                        <thead className="bg-amber-100/40 text-xs font-bold uppercase text-amber-900 border-b">
                          <tr>
                            <th className="px-6 py-3">Student Name</th>
                            <th className="px-6 py-3">Book ID</th>
                            <th className="px-6 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-100/50">
                          {pendingStudents.map(s => (
                            <tr key={s.id}>
                              <td className="px-6 py-4 font-bold text-slate-900">{s.name}</td>
                              <td className="px-6 py-4 font-mono text-xs font-bold">{s.student_id}</td>
                              <td className="px-6 py-4 text-right">
                                <Button size="sm" onClick={() => handleApprove(s)} disabled={approvingId === s.id} className="bg-[#020617] text-white rounded-xl text-xs h-9">
                                  {approvingId === s.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Approve'}
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

              <Card className="rounded-2xl sm:rounded-3xl border-slate-200 shadow-none overflow-hidden">
                <CardHeader className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center border-b border-slate-100 pb-5">
                  <div>
                    <CardTitle className="text-xl font-black text-[#020617]">Active Directory</CardTitle>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input placeholder="Search name or ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl border-slate-200 h-9 text-sm" />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[500px]">
                      <thead className="bg-slate-50 text-xs tracking-widest text-slate-400 border-b">
                        <tr>
                          <th className="px-6 py-3.5">Student Details</th>
                          <th className="px-6 py-3.5">Book ID</th>
                          <th className="px-6 py-3.5">Class</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredApproved.map(s => (
                          <tr key={s.id} className="hover:bg-slate-50/80">
                            <td className="px-6 py-4 font-bold text-[#020617]">{s.name}</td>
                            <td className="px-6 py-4 font-mono text-xs text-slate-500">{s.student_id}</td>
                            <td className="px-6 py-4 text-slate-600">{s.class_name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ══ LEADERBOARD TAB ══ */}
          {activeTab === 'leaderboard' && (
            <Card className="rounded-2xl sm:rounded-3xl border-slate-200 shadow-none overflow-hidden">
              <CardHeader className="bg-[#020617] text-white p-6 sm:p-8">
                <CardTitle className="text-xl sm:text-3xl font-black tracking-tight">Cumulative Leaderboard</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[500px]">
                    <thead className="bg-slate-50 text-xs tracking-widest uppercase text-slate-400 border-b">
                      <tr>
                        <th className="w-24 px-6 py-4 text-center">Rank</th>
                        <th className="px-6 py-4">Student Name</th>
                        <th className="px-6 py-4">Book ID</th>
                        <th className="px-6 py-4 text-right">Avg Cumulative Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leaderboard.map(e => {
                        const conf = rankColor(e.rank)
                        return (
                          <tr key={e.student_id} className="hover:bg-slate-50/50">
                            <td className="px-6 py-4 text-center">
                              <div className={cn("mx-auto flex h-7 w-7 items-center justify-center rounded-xl border font-bold text-xs", conf.bg, conf.text, conf.border)}>
                                {rankIcon(e.rank)}
                              </div>
                            </td>
                            <td className="px-6 py-4 font-black text-[#020617]">{e.name}</td>
                            <td className="px-6 py-4 font-mono text-xs text-slate-400">{e.student_id}</td>
                            <td className="px-6 py-4 text-right font-black text-emerald-600 text-base">{e.avgTotal}%</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ══ DATA MANAGEMENT TAB ══ */}
          {activeTab === 'import' && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="rounded-2xl sm:rounded-3xl border-slate-200 shadow-none p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <CardTitle className="text-lg sm:text-xl font-black text-[#020617]">Dynamic Data Export</CardTitle>
                  <p className="text-xs text-slate-400 mt-1.5">සිසුන්ගේ වත්මන් නාමලේඛනය සහ Book ID ස්වයංක්‍රීයව ඇතුළත් කළ Dynamic CSV ආකෘතිය බාගත කරගන්න.</p>
                </div>
                <Button onClick={downloadSampleCSV} className="w-full bg-white text-[#020617] border border-slate-200 rounded-xl mt-6 text-xs h-10">
                  <Download className="h-4 w-4 mr-2" /> Download Dynamic CSV Matrix
                </Button>
              </Card>

              <Card className="rounded-2xl sm:rounded-3xl border-slate-200 shadow-none p-6 sm:p-8">
                <CardTitle className="text-lg sm:text-xl font-black text-[#020617]">Batch Processing Center</CardTitle>
                <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl mt-3">
                  <button onClick={() => setImportType('marks')} className={cn("flex-1 rounded-lg py-2 text-xs font-bold transition-all", importType === 'marks' ? 'bg-white text-[#020617] shadow-sm' : 'text-slate-400')}>Upload Marks</button>
                  <button onClick={() => setImportType('students')} className={cn("flex-1 rounded-lg py-2 text-xs font-bold transition-all", importType === 'students' ? 'bg-white text-[#020617] shadow-sm' : 'text-slate-400')}>Upload Directory</button>
                </div>
                <div className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center mt-4 bg-slate-50/50">
                  <Upload className="h-7 w-7 text-slate-300 mx-auto" />
                  <label className="mt-4 inline-flex items-center bg-[#020617] text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer">
                    {importing ? 'Processing Matrix…' : 'Choose CSV Stream'}
                    <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileImport} disabled={importing} />
                  </label>
                  {importStatus && (
                    <div className={cn(
                      "mt-3 text-xs font-bold px-3 py-2 rounded-xl inline-block",
                      importStatus.startsWith('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    )}>
                      {importStatus}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      </section>

      {/* ── MOBILE NAVIGATION ── */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="relative w-full max-w-md">
          <div className="pointer-events-none absolute inset-x-0 -top-7 z-10 flex justify-center">
            <button type="button" onClick={() => setActiveTab('leaderboard')} className="pointer-events-auto flex flex-col items-center">
              <span className="relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/70 bg-[#020617] text-white shadow-xl">
                <Trophy className="h-6 w-6" />
              </span>
            </button>
          </div>
          <div className="relative flex w-full items-end justify-between bg-white/60 backdrop-blur-xl px-3 py-2 rounded-[2rem] border border-white/40 shadow-lg">
            <div className="flex flex-1 justify-around">
              <button onClick={() => setActiveTab('overview')} className="flex flex-col items-center gap-1">
                <span className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", activeTab === 'overview' ? "bg-[#020617] text-white" : "text-slate-400")}><LayoutDashboard className="h-5 w-5" /></span>
                <span className="text-[10px]">Overview</span>
              </button>
              <button onClick={() => setActiveTab('students')} className="flex flex-col items-center gap-1">
                <span className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", activeTab === 'students' ? "bg-[#020617] text-white" : "text-slate-400")}><Users className="h-5 w-5" /></span>
                <span className="text-[10px]">Students</span>
              </button>
            </div>
            <div className="w-16" />
            <div className="flex flex-1 justify-around">
              <button onClick={() => setActiveTab('import')} className="flex flex-col items-center gap-1">
                <span className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", activeTab === 'import' ? "bg-[#020617] text-white" : "text-slate-400")}><Upload className="h-5 w-5" /></span>
                <span className="text-[10px]">Manage</span>
              </button>
              <div className="flex flex-col items-center justify-center opacity-40">
                <Activity className="h-5 w-5 text-slate-400 animate-pulse" />
                <span className="text-[10px]">Live</span>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </div>
  )
}