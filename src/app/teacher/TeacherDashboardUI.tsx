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
  LayoutDashboard, UserCheck, Search, RefreshCw,
} from 'lucide-react'
import Papa from 'papaparse'

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

export default function TeacherDashboardUI({ teacherName, initialStudents = [], initialMarks = [], initialPapers = [] }: any) {
  const [students, setStudents]   = useState<any[]>(initialStudents)
  const [marks, setMarks]         = useState<any[]>(initialMarks)
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'leaderboard' | 'import'>('overview')
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

  // 🛠️ DIAGNOSTIC LOGS: පේජ් එක ලෝඩ් වෙනකොට ඩේටා එනවාද නැද්ද බලන්න F12 Console එක බලන්න
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

  // 🛡️ SAFE FILTER: මෙතන තමයි කලින් Crash වෙන්න ඉඩ තිබ්බේ
  const filteredApproved = approvedStudents.filter(s => {
    const studentName = s?.name?.toLowerCase() || '';
    const studentId = s?.student_id?.toLowerCase() || '';
    const query = search.toLowerCase();
    return studentName.includes(query) || studentId.includes(query);
  });

  return (
    <div className="min-h-screen bg-white">
      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex h-9 w-9 items-center justify-between rounded-xl bg-gradient-to-tr from-slate-900 to-slate-800 p-2 text-white shadow-md">
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

            <div className="hidden md:flex md:items-center md:gap-1">
              <button onClick={() => setActiveTab('overview')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'overview' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                <LayoutDashboard className="h-4 w-4" /> Overview
              </button>
              <button onClick={() => setActiveTab('students')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'students' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Users className="h-4 w-4" /> Students
              </button>
              <button onClick={() => setActiveTab('leaderboard')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'leaderboard' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Trophy className="h-4 w-4" /> Top 10 Rank
              </button>
              <button onClick={() => setActiveTab('import')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'import' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Upload className="h-4 w-4" /> Data Management
              </button>
              <div className="mx-2 h-4 w-px bg-slate-200" />
              <Button variant="ghost" size="sm" onClick={handleLogout} disabled={isLoggingOut} className="rounded-xl text-rose-600 hover:bg-rose-50">
                <LogOut className="h-4 w-4 mr-2" /> Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── MAIN BANNER ── */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 rounded-3xl bg-slate-900 p-6 text-white shadow-xl sm:p-8 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Sparkles className="h-4 w-4 text-yellow-400" /> Dashboard Live
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Hello, {teacherName}!</h1>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="space-y-8">
          {activeTab === 'overview' && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="rounded-3xl border border-slate-100 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-bold text-slate-500 uppercase">Active Students</CardTitle>
                  <div className="rounded-2xl bg-emerald-50 p-2.5 text-emerald-600"><Users className="h-5 w-5" /></div>
                </CardHeader>
                <CardContent><p className="text-3xl font-black text-slate-900">{approvedStudents.length}</p></CardContent>
              </Card>

              <Card className="rounded-3xl border border-slate-100 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-bold text-slate-500 uppercase">Pending Review</CardTitle>
                  <div className="rounded-2xl bg-amber-50 p-2.5 text-amber-600"><Clock className="h-5 w-5" /></div>
                </CardHeader>
                <CardContent><p className="text-3xl font-black text-slate-900">{pendingStudents.length}</p></CardContent>
              </Card>

              <Card className="rounded-3xl border border-slate-100 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-bold text-slate-500 uppercase">Total Marks Rows</CardTitle>
                  <div className="rounded-2xl bg-blue-50 p-2.5 text-blue-600"><FileText className="h-5 w-5" /></div>
                </CardHeader>
                <CardContent><p className="text-3xl font-black text-slate-900">{totalMarksRows}</p></CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'students' && (
            <div className="space-y-6">
              {pendingStudents.length > 0 && (
                <Card className="rounded-3xl border-amber-200 bg-amber-50/20">
                  <CardHeader><CardTitle className="text-amber-800 text-lg font-bold">Approval Requests</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-amber-100/50 text-xs font-bold uppercase text-amber-900">
                        <tr>
                          <th className="px-6 py-3">Student Name</th>
                          <th className="px-6 py-3">Book ID</th>
                          <th className="px-6 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingStudents.map(s => (
                          <tr key={s.id} className="border-b border-amber-100/50">
                            <td className="px-6 py-4 font-bold text-slate-900">{s.name}</td>
                            <td className="px-6 py-4 font-mono">{s.student_id}</td>
                            <td className="px-6 py-4 text-right">
                              <Button size="sm" onClick={() => handleApprove(s)} disabled={approvingId === s.id} className="bg-amber-600 text-white rounded-xl">
                                {approvingId === s.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4 mr-1.5" />} Approve
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}

              <Card className="rounded-3xl border border-slate-100 overflow-hidden">
                <CardHeader className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <CardTitle className="text-xl font-black text-slate-900">Active Directory</CardTitle>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input placeholder="Search name or ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl border-slate-200" />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
                      <tr>
                        <th className="px-6 py-3">Student Details</th>
                        <th className="px-6 py-3">Book ID</th>
                        <th className="px-6 py-3">Class</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredApproved.length === 0 ? (
                        <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400">No active students found.</td></tr>
                      ) : (
                        filteredApproved.map(s => (
                          <tr key={s.id}>
                            <td className="px-6 py-4 font-bold text-slate-900">{s.name}</td>
                            <td className="px-6 py-4 font-mono text-xs">{s.student_id}</td>
                            <td className="px-6 py-4">{s.class_name}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <Card className="rounded-3xl border border-slate-100 overflow-hidden">
              <CardHeader className="bg-slate-900 text-white p-6">
                <CardTitle className="text-2xl font-black">Top 10 Performance Leaderboard</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-500 border-b">
                    <tr>
                      <th className="w-20 px-6 py-4 text-center">Rank</th>
                      <th className="px-6 py-4">Student Name</th>
                      <th className="px-6 py-4 text-right">Avg Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leaderboard.length === 0 ? (
                      <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400">No marks recorded yet.</td></tr>
                    ) : (
                      leaderboard.map(e => {
                        const conf = rankColor(e.rank)
                        return (
                          <tr key={e.student_id}>
                            <td className="px-6 py-4 text-center">
                              <div className={`mx-auto flex h-7 w-7 items-center justify-center rounded-xl border ${conf.bg} ${conf.text} ${conf.border} font-bold`}>
                                {rankIcon(e.rank)}
                              </div>
                            </td>
                            <td className="px-6 py-4 font-black text-slate-900">{e.name}</td>
                            <td className="px-6 py-4 text-right font-black text-emerald-600">{e.avgTotal}%</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {activeTab === 'import' && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="rounded-3xl border border-slate-100 p-6 flex flex-col justify-between">
                <div>
                  <CardTitle className="text-xl font-black">Download Template</CardTitle>
                  <p className="text-sm text-slate-500 mt-2">සිසුන්ගේ නම් සහ Book ID ස්වයංක්‍රීයව ඇතුළත් කළ Dynamic CSV එක ලබාගන්න.</p>
                </div>
                <Button onClick={downloadSampleCSV} className="w-full bg-slate-900 text-white rounded-2xl mt-4">
                  <Download className="h-4 w-4 mr-2" /> Get Dynamic Sample CSV
                </Button>
              </Card>

              <Card className="rounded-3xl border border-slate-100 p-6">
                <CardTitle className="text-xl font-black">Upload CSV File</CardTitle>
                <div className="flex gap-2 bg-slate-50 p-1 border rounded-2xl mt-2">
                  <button onClick={() => setImportType('marks')} className={`flex-1 rounded-xl py-2 text-xs font-bold ${importType === 'marks' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Marks</button>
                  <button onClick={() => setImportType('students')} className={`flex-1 rounded-xl py-2 text-xs font-bold ${importType === 'students' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Students</button>
                </div>
                <div className="rounded-2xl border-2 border-dashed p-6 text-center mt-4">
                  <Upload className="h-8 w-8 text-slate-300 mx-auto" />
                  <label className="mt-4 inline-flex items-center bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer">
                    {importing ? 'Importing…' : 'Choose CSV File'}
                    <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileImport} disabled={importing} />
                  </label>
                  {importStatus && <div className="mt-2 text-xs font-bold">{importStatus}</div>}
                </div>
              </Card>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}