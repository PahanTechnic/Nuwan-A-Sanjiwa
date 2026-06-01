'use client'

import { useState, useEffect } from 'react'
import Papa from 'papaparse'
import { importStudents } from '../actions/importStudents'
import { importMarks } from '../actions/importMarks'
import { approveStudent } from '../actions/approveStudent'
import { createClient } from '@/lib/supabase/client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Download, Check, UserCheck, AlertCircle, Upload,
  Users, FileSpreadsheet, Clock, Trophy, RefreshCw,
  Medal, Crown, Star,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface UploadPanelProps {
  pendingStudents: any[]
}

interface TopStudent {
  rank: number
  student_id: string
  name: string
  book_number: string
  class_name: string
  total_marks: number
  paper_count: number
  avg_total: number
}

// ── Marking scheme (same as StudentDashboardUI) ───────────────────────────────
const MCQ_PER_Q      = 0.7
const MCQ_MAX        = 50 * MCQ_PER_Q        // 35
const SQ_MAX         = 4 * 75               // 300
const EQ_MAX         = 4 * 100              // 400
const PAPER2_RAW_MAX = SQ_MAX + EQ_MAX      // 700
const PAPER2_SCALED  = 35
const P2_DIVISOR     = PAPER2_RAW_MAX / PAPER2_SCALED
const PRACTICAL_MAX  = 30

function computeTotal(m: any): number {
  const mcqScaled  = (Number(m.mcq_score) || 0) * MCQ_PER_Q
  const structured = ['seq_q1','seq_q2','seq_q3','seq_q4'].reduce((a, k) => a + (Number(m[k]) || 0), 0)
  const essay      = ['ess_q1','ess_q2','ess_q3','ess_q4'].reduce((a, k) => a + (Number(m[k]) || 0), 0)
  const paper2Scaled = (structured + essay) / P2_DIVISOR
  const practical  = Number(m.practical_score) || 0
  return Number((mcqScaled + paper2Scaled + practical).toFixed(2))
}

function rankColor(rank: number) {
  if (rank === 1) return 'text-amber-500'
  if (rank === 2) return 'text-slate-400'
  if (rank === 3) return 'text-orange-400'
  return 'text-slate-500'
}

function rankIcon(rank: number) {
  if (rank === 1) return <Crown className="h-4 w-4 text-amber-500" />
  if (rank === 2) return <Medal className="h-4 w-4 text-slate-400" />
  if (rank === 3) return <Medal className="h-4 w-4 text-orange-400" />
  return <span className="text-xs font-bold text-slate-400 w-4 text-center">{rank}</span>
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TeacherDashboardUI({ pendingStudents }: UploadPanelProps) {
  const [localPending, setLocalPending]   = useState<any[]>(pendingStudents)
  const [parsedStudents, setParsedStudents] = useState<any[]>([])
  const [parsedMarks, setParsedMarks]     = useState<any[]>([])
  const [uploading, setUploading]         = useState(false)
  const [approvingId, setApprovingId]     = useState<string | null>(null)
  const [message, setMessage]             = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [topStudents, setTopStudents]     = useState<TopStudent[]>([])
  const [loadingTop, setLoadingTop]       = useState(false)
  const [topFetched, setTopFetched]       = useState(false)

  useEffect(() => { setLocalPending(pendingStudents) }, [pendingStudents])

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('pending-students-watch')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'students' },
        (payload) => {
          if (!payload.new.approved) setLocalPending(prev => [...prev, payload.new])
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // ── Fetch top 10 students ──────────────────────────────────────────────────
  const fetchTopStudents = async () => {
    setLoadingTop(true)
    setMessage(null)
    try {
      const supabase = createClient()

      // Get all approved students
      const { data: students, error: sErr } = await supabase
        .from('students')
        .select('id, student_id, name, book_number, class_name')
        .eq('approved', true)

      if (sErr || !students) throw new Error(sErr?.message || 'Failed to load students')

      // Get all marks
      const { data: marks, error: mErr } = await supabase
        .from('marks')
        .select('student_id, mcq_score, seq_q1, seq_q2, seq_q3, seq_q4, ess_q1, ess_q2, ess_q3, ess_q4, practical_score')

      if (mErr) throw new Error(mErr.message)

      // Group marks by student DB id → sum totals
      const marksByStudent: Record<string, { sum: number; count: number }> = {}
      for (const m of (marks || [])) {
        const sid = m.student_id
        if (!marksByStudent[sid]) marksByStudent[sid] = { sum: 0, count: 0 }
        marksByStudent[sid].sum   += computeTotal(m)
        marksByStudent[sid].count += 1
      }

      const ranked: TopStudent[] = students
        .map(s => {
          const entry = marksByStudent[s.id] || { sum: 0, count: 0 }
          return {
            rank: 0,
            student_id:  s.student_id,
            name:        s.name,
            book_number: s.book_number,
            class_name:  s.class_name,
            total_marks: Number(entry.sum.toFixed(2)),
            paper_count: entry.count,
            avg_total:   entry.count > 0 ? Number((entry.sum / entry.count).toFixed(2)) : 0,
          }
        })
        .sort((a, b) => b.total_marks - a.total_marks)
        .slice(0, 10)
        .map((s, i) => ({ ...s, rank: i + 1 }))

      setTopStudents(ranked)
      setTopFetched(true)
    } catch (err: any) {
      setMessage({ text: `දත්ත ලැබීමේ දෝෂය: ${err.message}`, type: 'error' })
    } finally {
      setLoadingTop(false)
    }
  }

  // ── CSV download ───────────────────────────────────────────────────────────
  const downloadCSV = () => {
    if (topStudents.length === 0) return
    const rows = topStudents.map(s => ({
      rank:        s.rank,
      student_id:  s.student_id,
      name:        s.name,
      book_number: s.book_number,
      class_name:  s.class_name,
      total_marks: s.total_marks,
      papers_done: s.paper_count,
      avg_per_paper: s.avg_total,
    }))
    const csv = Papa.unparse(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href     = url
    link.download = `top10_students_${new Date().toISOString().slice(0,10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // ── CSV handlers ──────────────────────────────────────────────────────────
  const handleStudentFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, { header: true, skipEmptyLines: true, complete: r => setParsedStudents(r.data as any[]) })
  }
  const handleMarksFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, { header: true, skipEmptyLines: true, complete: r => setParsedMarks(r.data as any[]) })
  }

  const uploadStudents = async () => {
    if (!parsedStudents.length) return
    setUploading(true); setMessage(null)
    const res = await importStudents(parsedStudents)
    setMessage({ text: `සාර්ථක: ${res.successCount}, වැරදුනු: ${res.errorCount}`, type: res.success ? 'success' : 'error' })
    setParsedStudents([]); setUploading(false)
  }
  const uploadMarks = async () => {
    if (!parsedMarks.length) return
    setUploading(true); setMessage(null)
    const res = await importMarks(parsedMarks)
    setMessage({ text: `සාර්ථක: ${res.successCount}, වැරදුනු: ${res.errorCount}`, type: res.success ? 'success' : 'error' })
    setParsedMarks([]); setUploading(false)
  }
  const handleApprove = async (id: string, sId: string, bNum: string) => {
    setApprovingId(id); setMessage(null)
    const res = await approveStudent(id, sId, bNum)
    if (res.success) {
      setLocalPending(prev => prev.filter(s => s.id !== id))
      setMessage({ text: `ශිෂ්‍ය ${sId} සාර්ථකව අනුමත කරා!`, type: 'success' })
    } else {
      setMessage({ text: `අනුමත කිරීම අසාර්ථකයි: ${res.error}`, type: 'error' })
    }
    setApprovingId(null)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-3 sm:px-6 py-6 md:py-8 space-y-6 max-w-5xl">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="h-7 w-7 text-blue-600" />
              ගුරු පාලක පැනලය
            </h1>
            <p className="text-slate-500 text-sm mt-1">#0E ශිෂ්‍ය හා ලකුණු කළමනාකරණය</p>
          </div>
        </div>

        {/* ── Alert ── */}
        {message && (
          <div className={`p-4 rounded-xl font-medium shadow-sm border flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {message.type === 'success' ? <Check className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
            {message.text}
          </div>
        )}

        {/* ── Tabs ── */}
        <Tabs defaultValue="top10" className="w-full">
          <TabsList className="grid w-full grid-cols-4 gap-1 bg-white p-1 rounded-xl shadow-sm border h-auto">
            <TabsTrigger value="top10" className="rounded-lg py-2 text-xs sm:text-sm data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700">
              <Trophy className="h-4 w-4 mr-1 hidden sm:inline" />
              Top 10
            </TabsTrigger>
            <TabsTrigger value="students" className="rounded-lg py-2 text-xs sm:text-sm data-[state=active]:bg-blue-50">
              <Upload className="h-4 w-4 mr-1 hidden sm:inline" />
              සිසුන්
            </TabsTrigger>
            <TabsTrigger value="marks" className="rounded-lg py-2 text-xs sm:text-sm">
              <FileSpreadsheet className="h-4 w-4 mr-1 hidden sm:inline" />
              ලකුණු
            </TabsTrigger>
            <TabsTrigger value="approvals" className="rounded-lg py-2 text-xs sm:text-sm relative">
              <Clock className="h-4 w-4 mr-1 hidden sm:inline" />
              අනුමැති
              {localPending.length > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 px-1.5 py-0.5 text-xs rounded-full">
                  {localPending.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ══ TAB: TOP 10 ══ */}
          <TabsContent value="top10" className="mt-6 space-y-4">

            {/* Stats summary row (visible after fetch) */}
            {topFetched && topStudents.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 text-center">
                  <p className="text-xs text-amber-600 font-medium mb-1">1 වන ස්ථානය</p>
                  <p className="text-lg font-black text-amber-700 truncate">{topStudents[0]?.name}</p>
                  <p className="text-xs text-amber-500 font-mono">{topStudents[0]?.total_marks} pts</p>
                </div>
                <div className="rounded-2xl bg-slate-100 border border-slate-200 p-4 text-center">
                  <p className="text-xs text-slate-500 font-medium mb-1">2 වන ස්ථානය</p>
                  <p className="text-lg font-black text-slate-700 truncate">{topStudents[1]?.name || '—'}</p>
                  <p className="text-xs text-slate-500 font-mono">{topStudents[1]?.total_marks ?? '—'} pts</p>
                </div>
                <div className="rounded-2xl bg-orange-50 border border-orange-100 p-4 text-center">
                  <p className="text-xs text-orange-600 font-medium mb-1">3 වන ස්ථානය</p>
                  <p className="text-lg font-black text-orange-700 truncate">{topStudents[2]?.name || '—'}</p>
                  <p className="text-xs text-orange-500 font-mono">{topStudents[2]?.total_marks ?? '—'} pts</p>
                </div>
              </div>
            )}

            <Card className="shadow-sm border-0 sm:border rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-amber-500" />
                      ඉහළම ලකුණු ලැබූ සිසුන් 10 දෙනා
                    </CardTitle>
                    <CardDescription className="mt-1">
                      සියලු papers හරහා ගණනය කළ සමුළු ලකුණු (MCQ scaled + Paper 2 scaled + Practical)
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={fetchTopStudents}
                      disabled={loadingTop}
                      className="bg-slate-900 hover:bg-slate-700 text-white rounded-xl gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${loadingTop ? 'animate-spin' : ''}`} />
                      {loadingTop ? 'ලබා ගනිමින්...' : topFetched ? 'නැවත ගන්න' : 'Get Data'}
                    </Button>
                    {topFetched && topStudents.length > 0 && (
                      <Button
                        onClick={downloadCSV}
                        variant="outline"
                        className="rounded-xl gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      >
                        <Download className="h-4 w-4" />
                        CSV Download
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {!topFetched ? (
                  <div className="text-center py-16 text-slate-400">
                    <Trophy className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium text-slate-500">දත්ත ලබා ගැනීමට <strong>Get Data</strong> ඔබන්න</p>
                    <p className="text-xs mt-1">DB එකෙන් ලකුණු ගෙන rank කරනවා</p>
                  </div>
                ) : topStudents.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Star className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p>ලකුණු ඇතුලත් කළ සිසුන් නොමැත</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-1">
                    <div className="min-w-[560px] border rounded-xl overflow-hidden bg-white shadow-sm">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="w-12 text-center font-semibold">#</TableHead>
                            <TableHead className="font-semibold">Student ID</TableHead>
                            <TableHead className="font-semibold">නම</TableHead>
                            <TableHead className="font-semibold hidden sm:table-cell">Class</TableHead>
                            <TableHead className="font-semibold hidden md:table-cell">Book ID</TableHead>
                            <TableHead className="font-semibold text-right">Papers</TableHead>
                            <TableHead className="font-semibold text-right">Avg / Paper</TableHead>
                            <TableHead className="font-semibold text-right">සමුළු ලකුණු</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {topStudents.map(s => (
                            <TableRow
                              key={s.student_id}
                              className={`hover:bg-slate-50/50 ${s.rank <= 3 ? 'font-semibold' : ''}`}
                            >
                              <TableCell className="text-center">
                                <span className="flex items-center justify-center">
                                  {rankIcon(s.rank)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="font-mono text-blue-600 font-bold text-sm">{s.student_id}</span>
                              </TableCell>
                              <TableCell className="max-w-[140px] truncate">{s.name}</TableCell>
                              <TableCell className="hidden sm:table-cell text-slate-500 text-sm">{s.class_name}</TableCell>
                              <TableCell className="hidden md:table-cell">
                                <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{s.book_number}</span>
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-slate-500 text-sm">{s.paper_count}</TableCell>
                              <TableCell className="text-right tabular-nums text-slate-600 text-sm">{s.avg_total}</TableCell>
                              <TableCell className="text-right">
                                <span className={`tabular-nums font-black text-base ${
                                  s.rank === 1 ? 'text-amber-500' :
                                  s.rank === 2 ? 'text-slate-500' :
                                  s.rank === 3 ? 'text-orange-500' :
                                  'text-slate-800'
                                }`}>
                                  {s.total_marks}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══ TAB: STUDENTS ══ */}
          <TabsContent value="students" className="mt-6">
            <Card className="shadow-sm border-0 sm:border rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg sm:text-xl">සිසුන් CSV එක අප්ලෝඩ් කරන්න</CardTitle>
                <CardDescription>Format: student_id, name, book_number, class_name</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-4">
                <Input type="file" accept=".csv" onChange={handleStudentFile} disabled={uploading} className="bg-white flex-1" />
                <Button onClick={uploadStudents} disabled={parsedStudents.length === 0 || uploading} className="sm:w-auto w-full">
                  {uploading ? 'ඇතුලත් කරමින්...' : 'Students Upload කරන්න'}
                </Button>
                <Button variant="outline" size="sm" asChild className="sm:w-auto w-full">
                  <a href="/templates/students_sample.csv" download className="flex items-center justify-center gap-2">
                    <Download className="h-4 w-4" /> Sample CSV
                  </a>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══ TAB: MARKS ══ */}
          <TabsContent value="marks" className="mt-6">
            <Card className="shadow-sm border-0 sm:border rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg sm:text-xl">ලකුණු CSV එක අප්ලෝඩ් කරන්න</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  student_id, paper_name, mcq_score, seq_q1..q4, ess_q1..q4
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-4">
                <Input type="file" accept=".csv" onChange={handleMarksFile} disabled={uploading} className="bg-white flex-1" />
                <Button onClick={uploadMarks} disabled={parsedMarks.length === 0 || uploading} className="sm:w-auto w-full">
                  {uploading ? 'ඇතුලත් කරමින්...' : 'Marks Upload කරන්න'}
                </Button>
                <Button variant="outline" size="sm" asChild className="sm:w-auto w-full">
                  <a href="/templates/marks_sample.csv" download className="flex items-center justify-center gap-2">
                    <Download className="h-4 w-4" /> Sample CSV
                  </a>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══ TAB: APPROVALS ══ */}
          <TabsContent value="approvals" className="mt-6">
            <Card className="shadow-sm border-0 sm:border rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">අනුමැතිය සඳහා රැඳී සිටින සිසුන්</CardTitle>
                <CardDescription>Approve කිරීමෙන් පසු ඔවුන්ට ලොග් විය හැක.</CardDescription>
              </CardHeader>
              <CardContent>
                {localPending.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground bg-white border border-dashed rounded-xl">
                    <Check className="h-10 w-10 mx-auto text-green-500 mb-2" />
                    අනුමැතිය සඳහා දැනට කිසිදු ශිෂ්‍යයෙක් නොමැත.
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-1">
                    <div className="min-w-[640px] border rounded-xl overflow-hidden bg-white shadow-sm">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="font-semibold">Student ID</TableHead>
                            <TableHead className="font-semibold">Name</TableHead>
                            <TableHead className="font-semibold hidden sm:table-cell">Class</TableHead>
                            <TableHead className="font-semibold hidden md:table-cell">Book ID</TableHead>
                            <TableHead className="font-semibold text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {localPending.map(student => (
                            <TableRow key={student.id} className="hover:bg-slate-50/50">
                              <TableCell className="font-mono font-bold text-blue-600 text-sm">{student.student_id}</TableCell>
                              <TableCell className="font-medium truncate max-w-[120px]">{student.name}</TableCell>
                              <TableCell className="hidden sm:table-cell text-slate-600">{student.class_name}</TableCell>
                              <TableCell className="hidden md:table-cell text-slate-500 text-sm">{student.book_number}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 rounded-full px-3"
                                  disabled={approvingId === student.id}
                                  onClick={() => handleApprove(student.id, student.student_id, student.book_number)}
                                >
                                  <UserCheck className="h-3.5 w-3.5 mr-1" />
                                  {approvingId === student.id ? '...' : 'Approve'}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}