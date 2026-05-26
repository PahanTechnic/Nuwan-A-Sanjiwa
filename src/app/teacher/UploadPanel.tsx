'use client'

import { useState, useEffect } from 'react'
import Papa from 'papaparse'
import { importStudents } from '../actions/importStudents'
import { importMarks } from '../actions/importMarks'
import { approveStudent } from '../actions/approveStudent'
import { createClient } from '@/lib/supabase/client' // ✅ Supabase client එක නිවැරදිව ඉම්පෝර්ට් කර ඇත

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Download, Check, UserCheck, AlertCircle, Upload, Users, FileSpreadsheet, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface UploadPanelProps {
  pendingStudents: any[]
}

export default function TeacherUploadPanel({ pendingStudents }: UploadPanelProps) {
  // 1. සේරම States ටික කම්පෝනන්ට් එක ඇතුලට ගත්තා
  const [localPending, setLocalPending] = useState<any[]>(pendingStudents)
  const [parsedStudents, setParsedStudents] = useState<any[]>([])
  const [parsedMarks, setParsedMarks] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Props වෙනස් වුණොත් local state එකත් අප්ඩේට් වෙන්න මේක වටිනවා
  useEffect(() => {
    setLocalPending(pendingStudents)
  }, [pendingStudents])

  // 2. Realtime Subscription එක කම්පෝනන්ට් එක ඇතුලට ගත්තා
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('pending-students-watch')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'students' },
        (payload) => {
          if (!payload.new.approved) {
            setLocalPending(prev => [...prev, payload.new]) // ✅ අලුත් සිසුවෙක් ආවොත් ඔටෝ ඇඩ් වෙනවා
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // CSV Handle කරන ෆන්ක්ෂන්ස්
  const handleStudentFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, { header: true, skipEmptyLines: true, complete: (results) => setParsedStudents(results.data) })
  }

  const handleMarksFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, { header: true, skipEmptyLines: true, complete: (results) => setParsedMarks(results.data) })
  }

  const uploadStudents = async () => {
    if (parsedStudents.length === 0) return
    setUploading(true)
    setMessage(null)
    const res = await importStudents(parsedStudents)
    setMessage({ text: `සාර්ථක: ${res.successCount}, වැරදුනු: ${res.errorCount}`, type: res.success ? 'success' : 'error' })
    setParsedStudents([])
    setUploading(false)
  }

  const uploadMarks = async () => {
    if (parsedMarks.length === 0) return
    setUploading(true)
    setMessage(null)
    const res = await importMarks(parsedMarks)
    setMessage({ text: `සාර්ථක: ${res.successCount}, වැරදුනු: ${res.errorCount}`, type: res.success ? 'success' : 'error' })
    setParsedMarks([])
    setUploading(false)
  }

  // 3. ෆන්ක්ෂන් දෙකම එකතු කරලා හදපු තනි Approve Handler එක (Optimistic + Message UI)
  const handleApprove = async (id: string, sId: string, bNum: string) => {
    setApprovingId(id)
    setMessage(null)
    
    const res = await approveStudent(id, sId, bNum)
    
    if (res.success) {
      setLocalPending(prev => prev.filter(s => s.id !== id)) // ✅ ලිස්ට් එකෙන් ඔටෝ අයින් වෙනවා
      setMessage({ text: `ශිෂ්‍ය ${sId} සාර්ථකව අනුමත කරා!`, type: 'success' })
    } else {
      setMessage({ text: `අනුමත කිරීම අසාර්ථකයි: ${res.error}`, type: 'error' })
    }
    setApprovingId(null)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-3 sm:px-6 py-6 md:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="h-7 w-7 text-blue-600" />
              ගුරු පාලක පැනලය
            </h1>
            <p className="text-slate-500 text-sm mt-1">#0E ශිෂ්‍ය හා ලකුණු කළමනාකරණය</p>
          </div>
        </div>

        {/* Alert Messages */}
        {message && (
          <div className={`p-4 rounded-xl font-medium shadow-sm border flex items-center gap-3 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {message.type === 'success' ? <Check className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            {message.text}
          </div>
        )}

        <Tabs defaultValue="students" className="w-full">
          <TabsList className="grid w-full grid-cols-3 gap-1 bg-white p-1 rounded-xl shadow-sm border h-auto">
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
              {/* 💡 `localPending` පාවිච්චි කරලා Badge එක රියල්ටයිම් කවුන්ට් වෙනවා */}
              {localPending.length > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 px-1.5 py-0.5 text-xs rounded-full">
                  {localPending.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Tab 1 - Students */}
          <TabsContent value="students" className="mt-6">
            <Card className="shadow-sm border-0 sm:border">
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

          {/* Tab 2 - Marks */}
          <TabsContent value="marks" className="mt-6">
            <Card className="shadow-sm border-0 sm:border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg sm:text-xl">ලකුණු CSV එක අප්ලෝඩ් කරන්න</CardTitle>
                <CardDescription className="text-xs sm:text-sm">student_id, paper_name, mcq_score, seq_q1..q4, ess_q1..q4</CardDescription>
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

          {/* Tab 3 - Approvals */}
          <TabsContent value="approvals" className="mt-6">
            <Card className="shadow-sm border-0 sm:border">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">අනුමැතිය සඳහා රැඳී සිටින සිසුන්</CardTitle>
                <CardDescription>Approve කිරීමෙන් පසු ඔවුන්ට ලොග් විය හැක.</CardDescription>
              </CardHeader>
              <CardContent>
                {/* 💡 `localPending` චෙක් කරයි */}
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
                          {/* 💡 `localPending` මැප් කරලා තියෙන්නේ, දැන් Realtime සුපිරියටම වැඩ */}
                          {localPending.map((student) => (
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