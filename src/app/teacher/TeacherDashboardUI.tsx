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
  LayoutDashboard, UserCheck, Search, RefreshCw, Wifi, WifiOff
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

  const [importType, setImportType]     = useState<'marks' | 'students'>('marks')
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [importing, setImporting]       = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  useEffect(() => {
    console.log("📊 Received Initial Students:", initialStudents);
    console.log("📊 Received Initial Marks:", initialMarks);
  }, [initialStudents, initialMarks])

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
            setImportStatus(res.success ? `✅ Marks imported successfully!` : `❌ Import failed.`)
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
    // Mobile bottom nav එකට ඉඩ තැබීමට pb-28 එකතු කර ඇත
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

          {/* Desktop Navigation Links */}
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
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout} 
              disabled={isLoggingOut} 
              className="rounded-full text-rose-600 hover:bg-rose-50 px-4"
            >
              <LogOut className="h-3.5 w-3.5 mr-2" /> Logout
            </Button>
          </div>

          {/* Realtime Status (Mobile) */}
          <div className="md:hidden flex items-center gap-2">
            <span className={cn(
              "p-1.5 rounded-xl border flex items-center justify-center",
              isOnline ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200'
            )}>
              {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            </span>
            <button
              className="h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center text-rose-600"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile quick action menu (Logout Confirmation) */}
        {menuOpen && (
          <div className="md:hidden border-t border-slate-100 px-4 py-3 flex items-center justify-between bg-white animate-in fade-in duration-200">
            <span className="text-xs text-slate-400 font-medium">Sign out of your account?</span>
            <Button size="sm" onClick={handleLogout} disabled={isLoggingOut} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs h-8">
              {isLoggingOut ? 'Logging out…' : 'Confirm Logout'}
            </Button>
          </div>
        )}
      </nav>

      {/* ── HERO BANNER ── */}
      <section className="px-4 sm:px-6 py-6 sm:py-14 border-b border-slate-100 bg-gradient-to-b from-slate-50/50 to-white">
        <div className="max-w-7xl mx-auto text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-slate-400 mb-1 flex items-center justify-center sm:justify-start gap-1.5">
              <Sparkles className="h-3 w-3 text-yellow-500 animate-pulse" /> Live Administration
            </p>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#020617]">
              Hello, <span className="italic">{teacherName}</span>
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-sm">
            <span className={cn("h-2 w-2 rounded-full", isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
            <span className="text-slate-500">{isOnline ? "Connected to Supabase Realtime" : "Connection Disconnected"}</span>
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT AREA ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="space-y-8">
          
          {/* ══ OVERVIEW TAB ══ */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {[
                { label: 'Active Students', value: approvedStudents.length, sub: 'Registered and verified', icon: <Users className="h-4 w-4 sm:h-5 sm:w-5" />, color: 'border-slate-200' },
                { label: 'Pending Review', value: pendingStudents.length, sub: 'Awaiting authorization', icon: <Clock className="h-4 w-4 sm:h-5 sm:w-5" />, color: pendingStudents.length > 0 ? 'border-amber-300 bg-amber-50/20 text-amber-600' : 'border-slate-200' },
                { label: 'Total Marks Rows', value: totalMarksRows, sub: 'Imported database logs', icon: <FileText className="h-4 w-4 sm:h-5 sm:w-5" />, color: 'border-slate-200' }
              ].map((card, i) => (
                <div key={i} className={cn("border rounded-2xl sm:rounded-3xl p-4 sm:p-8 flex items-start justify-between gap-4 transition-all duration-200 shadow-none", card.color, i === 1 && pendingStudents.length > 0 && "animate-pulse")}>
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
          )}

          {/* ══ STUDENTS TAB ══ */}
          {activeTab === 'students' && (
            <div className="space-y-6">
              {/* Pending Approvals */}
              {pendingStudents.length > 0 && (
                <Card className="rounded-2xl sm:rounded-3xl border-amber-200 bg-amber-50/20 shadow-none overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-amber-900 text-lg sm:text-xl font-black flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-amber-600" /> Pending Approval Requests
                    </CardTitle>
                    <CardDescription className="text-amber-700/80 text-xs">Verify student directory records prior to publishing scores.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 border-t border-amber-200/50">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-600 min-w-[400px]">
                        <thead className="bg-amber-100/40 text-xs font-bold uppercase tracking-wider text-amber-900 border-b border-amber-200/50">
                          <tr>
                            <th className="px-6 py-3">Student Name</th>
                            <th className="px-6 py-3">Book ID</th>
                            <th className="px-6 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-100/50">
                          {pendingStudents.map(s => (
                            <tr key={s.id} className="hover:bg-amber-100/20 transition-colors">
                              <td className="px-6 py-4 font-bold text-slate-900">{s.name}</td>
                              <td className="px-6 py-4 font-mono text-xs font-bold">{s.student_id}</td>
                              <td className="px-6 py-4 text-right">
                                <Button size="sm" onClick={() => handleApprove(s)} disabled={approvingId === s.id} className="bg-[#020617] hover:bg-slate-800 text-white rounded-xl text-xs h-9">
                                  {approvingId === s.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5 mr-1.5" />} Approve
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

              {/* Active Directory */}
              <Card className="rounded-2xl sm:rounded-3xl border-slate-200 shadow-none overflow-hidden">
                <CardHeader className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center border-b border-slate-100 pb-5">
                  <div>
                    <CardTitle className="text-xl font-black text-[#020617]">Active Directory</CardTitle>
                    <CardDescription className="text-xs">Authorized students enrolled in Engine with NAS ecosystem.</CardDescription>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input placeholder="Search name or ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl border-slate-200 focus-visible:ring-[#020617] h-9 text-sm" />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 min-w-[500px]">
                      <thead className="bg-slate-50 text-xs font-medium uppercase tracking-widest text-slate-400 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-3.5">Student Details</th>
                          <th className="px-6 py-3.5">Book ID</th>
                          <th className="px-6 py-3.5">Class</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredApproved.length === 0 ? (
                          <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400 text-xs">No matching active records verified.</td></tr>
                        ) : (
                          filteredApproved.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-6 py-4 font-bold text-[#020617]">{s.name}</td>
                              <td className="px-6 py-4 font-mono text-xs text-slate-500 font-semibold">{s.student_id}</td>
                              <td className="px-6 py-4 text-slate-600 font-medium">{s.class_name}</td>
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

          {/* ══ LEADERBOARD TAB ══ */}
          {activeTab === 'leaderboard' && (
            <Card className="rounded-2xl sm:rounded-3xl border-slate-200 shadow-none overflow-hidden">
              <CardHeader className="bg-[#020617] text-white p-6 sm:p-8">
                <p className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-yellow-400" /> Top 10 Performance Rankings
                </p>
                <CardTitle className="text-xl sm:text-3xl font-black tracking-tight">Cumulative Leaderboard</CardTitle>
                <CardDescription className="text-slate-400 text-xs">Averages are dynamically calculated based on weighted paper scores & practical assessments.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600 min-w-[500px]">
                    <thead className="bg-slate-50 text-xs font-medium tracking-widest uppercase text-slate-400 border-b">
                      <tr>
                        <th className="w-24 px-6 py-4 text-center">Rank</th>
                        <th className="px-6 py-4">Student Name</th>
                        <th className="px-6 py-4">Book ID</th>
                        <th className="px-6 py-4 text-right">Avg Cumulative Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leaderboard.length === 0 ? (
                        <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-xs">No performance parameters logged to calculate rankings.</td></tr>
                      ) : (
                        leaderboard.map(e => {
                          const conf = rankColor(e.rank)
                          return (
                            <tr key={e.student_id} className="hover:bg-slate-50/50 transition-colors">
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
                        })
                      )}
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
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    සිසුන්ගේ වත්මන් නාමලේඛනය සහ Book ID ස්වයංක්‍රීයව ඇතුළත් කළ Dynamic CSV ආකෘතිය බාගත කරගන්න. ලකුණු ඇතුලත් කිරීම වඩාත් පහසු කරවයි.
                  </p>
                </div>
                <Button onClick={downloadSampleCSV} className="w-full bg-white hover:bg-slate-50 text-[#020617] border border-slate-200 rounded-xl mt-6 font-semibold transition-colors text-xs h-10">
                  <Download className="h-4 w-4 mr-2 text-slate-500" /> Download Dynamic CSV Matrix
                </Button>
              </Card>

              <Card className="rounded-2xl sm:rounded-3xl border-slate-200 shadow-none p-6 sm:p-8">
                <CardTitle className="text-lg sm:text-xl font-black text-[#020617]">Batch Processing Center</CardTitle>
                <div className="flex gap-1.5 bg-slate-100 p-1 border border-slate-200 rounded-xl mt-3">
                  <button onClick={() => setImportType('marks')} className={cn("flex-1 rounded-lg py-2 text-xs font-bold transition-all", importType === 'marks' ? 'bg-white text-[#020617] shadow-sm' : 'text-slate-400 hover:text-slate-600')}>Upload Marks</button>
                  <button onClick={() => setImportType('students')} className={cn("flex-1 rounded-lg py-2 text-xs font-bold transition-all", importType === 'students' ? 'bg-white text-[#020617] shadow-sm' : 'text-slate-400 hover:text-slate-600')}>Upload Directory</button>
                </div>
                <div className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center mt-4 bg-slate-50/50">
                  <Upload className="h-7 w-7 text-slate-300 mx-auto" />
                  <label className="mt-4 inline-flex items-center bg-[#020617] hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer shadow-sm transition-colors">
                    {importing ? 'Processing Matrix…' : 'Choose CSV Stream'}
                    <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileImport} disabled={importing} />
                  </label>
                  {importStatus && <div className={cn("mt-3 text-xs font-bold px-3 py-1.5 rounded-lg inline-block", importStatus.includes('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>{importStatus}</div>}
                </div>
              </Card>
            </div>
          )}
        </div>
      </section>

      {/* ── MOBILE BOTTOM NAVIGATION (Liquid Glass Morphology) ── */}
      <nav aria-label="Teacher Primary navigation" className="md:hidden fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-300">
        <div className="relative w-full max-w-md">
          
          {/* Floating Center Action Button (Leaderboard) */}
          <div className="pointer-events-none absolute inset-x-0 -top-7 z-10 flex justify-center">
            <button
              type="button"
              onClick={() => setActiveTab('leaderboard')}
              className="group pointer-events-auto flex flex-col items-center outline-none"
            >
              <span className="relative flex items-center justify-center">
                <span className={cn(
                  "absolute h-16 w-16 rounded-full bg-black/30 blur-xl transition-opacity duration-300 ease-out",
                  activeTab === 'leaderboard' ? "opacity-100" : "opacity-0 group-hover:opacity-70"
                )} />
                <span className={cn(
                  "relative flex h-16 w-16 items-center justify-center rounded-full transition-all duration-300 ease-out border-4 border-white/70 bg-[#020617] text-white shadow-xl",
                  activeTab === 'leaderboard' ? "-translate-y-1 scale-105" : "group-hover:-translate-y-0.5 group-hover:scale-105"
                )}>
                  <Trophy className="h-6 w-6" strokeWidth={2.5} />
                </span>
              </span>
              <span className={cn("mt-1 text-[10px] tracking-tight font-bold transition-colors", activeTab === 'leaderboard' ? "text-[#020617]" : "text-slate-400")}>
                Rankings
              </span>
            </button>
          </div>

          {/* Bottom Bar Shell */}
          <div className="relative flex w-full items-end justify-between gap-1 rounded-[2rem] border border-white/40 bg-white/60 backdrop-blur-xl backdrop-saturate-150 px-3 py-2 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.15),inset_0_1px_0_0_rgba(255,255,255,0.7)]">
            
            {/* Left Nav Tabs */}
            <div className="flex flex-1 justify-around">
              {/* Overview Tab */}
              <button onClick={() => setActiveTab('overview')} className="group flex flex-col flex-1 items-center gap-1 px-1 outline-none">
                <span className={cn("flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-300", activeTab === 'overview' ? "-translate-y-2 bg-[#020617] text-white shadow-lg" : "text-slate-400 hover:text-slate-900")}>
                  <LayoutDashboard className="h-5 w-5" />
                </span>
                <span className={cn("text-[10px] tracking-tight font-medium transition-all", activeTab === 'overview' ? "-translate-y-1 font-bold text-[#020617]" : "text-slate-400")}>Overview</span>
              </button>

              {/* Students Tab */}
              <button onClick={() => setActiveTab('students')} className="group flex flex-col flex-1 items-center gap-1 px-1 outline-none">
                <span className={cn("flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-300", activeTab === 'students' ? "-translate-y-2 bg-[#020617] text-white shadow-lg" : "text-slate-400 hover:text-slate-900")}>
                  <Users className="h-5 w-5" />
                </span>
                <span className={cn("text-[10px] tracking-tight font-medium transition-all", activeTab === 'students' ? "-translate-y-1 font-bold text-[#020617]" : "text-slate-400")}>Students</span>
              </button>
            </div>

            {/* Middle Spacer for FAB */}
            <div aria-hidden="true" className="w-16 shrink-0" />

            {/* Right Nav Tabs */}
            <div className="flex flex-1 justify-around">
              {/* Import Tab */}
              <button onClick={() => setActiveTab('import')} className="group flex flex-col flex-1 items-center gap-1 px-1 outline-none">
                <span className={cn("flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-300", activeTab === 'import' ? "-translate-y-2 bg-[#020617] text-white shadow-lg" : "text-slate-400 hover:text-slate-900")}>
                  <Upload className="h-5 w-5" />
                </span>
                <span className={cn("text-[10px] tracking-tight font-medium transition-all", activeTab === 'import' ? "-translate-y-1 font-bold text-[#020617]" : "text-slate-400")}>Manage</span>
              </button>

              {/* Refresh Indicators */}
              <div className="group flex flex-col flex-1 items-center justify-center gap-1 px-1 opacity-40">
                <span className="flex h-10 w-10 items-center justify-center text-slate-400">
                  <Activity className="h-5 w-5 animate-pulse" />
                </span>
                <span className="text-[10px] tracking-tight font-medium text-slate-400">Live API</span>
              </div>
            </div>

          </div>
        </div>
      </nav>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-100 py-6 sm:py-8 px-6 text-center text-slate-400 text-xs">
        © 2026 Engine with NAS. Powered by Engineering Technology Stream Management.
      </footer>
    </div>
  )
}