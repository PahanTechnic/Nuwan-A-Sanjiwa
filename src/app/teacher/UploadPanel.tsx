'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import { importStudents } from '../actions/importStudents'
import { importMarks } from '../actions/importMarks'
import { approveStudent } from '../actions/approveStudent'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Download, Check, UserCheck, AlertCircle } from 'lucide-react'

interface UploadPanelProps {
  pendingStudents: any[]
}

export default function TeacherUploadPanel({ pendingStudents }: UploadPanelProps) {
  const [parsedStudents, setParsedStudents] = useState<any[]>([])
  const [parsedMarks, setParsedMarks] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Students CSV කියවීමට
  const handleStudentFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => setParsedStudents(results.data),
    })
  }

  // Marks CSV කියවීමට
  const handleMarksFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => setParsedMarks(results.data),
    })
  }

  // Students Upload කිරීම
  const uploadStudents = async () => {
    if (parsedStudents.length === 0) return
    setUploading(true)
    setMessage(null)
    const res = await importStudents(parsedStudents)
    if (res.success) {
      setMessage({ text: `සිසුන් ඇතුලත් කිරීම අවසන්! සාර්ථක: ${res.successCount}, වැරදුනු: ${res.errorCount}`, type: 'success' })
    } else {
      setMessage({ text: 'ඇතුලත් කිරීමේ දෝෂයක් පවතී.', type: 'error' })
    }
    setParsedStudents([])
    setUploading(false)
  }

  // Marks Upload කිරීම
  const uploadMarks = async () => {
    if (parsedMarks.length === 0) return
    setUploading(true)
    setMessage(null)
    const res = await importMarks(parsedMarks)
    if (res.success) {
      setMessage({ text: `ලකුණු ඇතුලත් කිරීම අවසන්! සාර්ථක: ${res.successCount}, වැරදුනු: ${res.errorCount}`, type: 'success' })
    } else {
      setMessage({ text: 'ඇතුලත් කිරීමේ දෝෂයක් පවතී.', type: 'error' })
    }
    setParsedMarks([])
    setUploading(false)
  }

  // සිසුවෙකු අනුමත (Approve) කිරීම
  const handleApprove = async (id: string, sId: string, bNum: string) => {
    setApprovingId(id)
    setMessage(null)
    const res = await approveStudent(id, sId, bNum)
    if (res.success) {
      setMessage({ text: `ශිෂ්‍ය ${sId} සාර්ථකව අනුමත කරා!`, type: 'success' })
    } else {
      setMessage({ text: `අනුමත කිරීම අසාර්ථකයි: ${res.error}`, type: 'error' })
    }
    setApprovingId(null)
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">ගුරු පාලක පැනලය (Teacher Panel)</h1>
      </div>

      {/* Dynamic Alert Messages */}
      {message && (
        <div className={`p-4 rounded-lg font-medium shadow-sm border flex items-center gap-3 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {message.type === 'success' ? <Check className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {message.text}
        </div>
      )}

      <Tabs defaultValue="students" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-xl bg-white p-1 rounded-xl shadow-sm border">
          <TabsTrigger value="students" className="rounded-lg">නව සිසුන් ඇතුලත් කිරීම</TabsTrigger>
          <TabsTrigger value="marks" className="rounded-lg">ලකුණු (Marks) ඇතුලත් කිරීම</TabsTrigger>
          <TabsTrigger value="approvals" className="rounded-lg relative">
            Pending Approvals
            {pendingStudents.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold animate-pulse">
                {pendingStudents.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 1. Students Tab */}
        <TabsContent value="students" className="mt-6">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>සිසුන් CSV එක අප්ලෝඩ් කරන්න</CardTitle>
                <CardDescription>Format: student_id, name, book_number, class_name</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild className="shadow-sm">
                <a href="/templates/students_sample.csv" download="students_template.csv" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Get Sheet
                </a>
              </Button>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <Input type="file" accept=".csv" onChange={handleStudentFile} disabled={uploading} className="bg-white" />
              <Button onClick={uploadStudents} disabled={parsedStudents.length === 0 || uploading}>
                {uploading ? 'ඇතුලත් කරමින්...' : 'Students Upload'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Marks Tab */}
        <TabsContent value="marks" className="mt-6">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>ලකුණු CSV එක අප්ලෝඩ් කරන්න</CardTitle>
                <CardDescription>
                  Format: student_id, paper_name, mcq_score, seq_q1, seq_q2, seq_q3, seq_q4, ess_q1, ess_q2, ess_q3, ess_q4
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild className="shadow-sm">
                <a href="/templates/marks_sample.csv" download="marks_template.csv" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Get Sheet
                </a>
              </Button>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <Input type="file" accept=".csv" onChange={handleMarksFile} disabled={uploading} className="bg-white" />
              <Button onClick={uploadMarks} disabled={parsedMarks.length === 0 || uploading}>
                {uploading ? 'ඇතුලත් කරමින්...' : 'Marks Upload'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Approvals Tab */}
        <TabsContent value="approvals" className="mt-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>ලියාපදිංචි වීමට අවසර ඉල්ලන සිසුන්</CardTitle>
              <CardDescription>මෙහි සිටින සිසුන් පද්ධතියට ඇතුලත් කරගැනීමට 'Approve' කරන්න.</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingStudents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground bg-white border border-dashed rounded-xl">
                  අනුමැතිය සඳහා දැනට කිසිදු ශිෂ්‍යයෙක් නොමැත.
                </div>
              ) : (
                <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-semibold">Student ID</TableHead>
                        <TableHead className="font-semibold">Name</TableHead>
                        <TableHead className="font-semibold">Class Year</TableHead>
                        <TableHead className="font-semibold">Book ID</TableHead>
                        <TableHead className="font-semibold text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingStudents.map((student) => (
                        <TableRow key={student.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-mono font-bold text-blue-600">{student.student_id}</TableCell>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>{student.class_name}</TableCell>
                          <TableCell className="text-slate-600">{student.book_number}</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              size="sm" 
                              className="bg-emerald-600 hover:bg-emerald-700 font-semibold gap-1.5 transition-all shadow-sm"
                              disabled={approvingId === student.id}
                              onClick={() => handleApprove(student.id, student.student_id, student.book_number)}
                            >
                              <UserCheck className="h-4 w-4" />
                              {approvingId === student.id ? 'Approving...' : 'Approve'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}