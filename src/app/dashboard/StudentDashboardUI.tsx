'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend } from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { GraduationCap, TrendingUp, FileText } from 'lucide-react'

interface DashboardUIProps {
  studentName: string
  studentId: string
  marks: any[]
}

export default function StudentDashboardUI({ studentName, studentId, marks }: DashboardUIProps) {
  
  const chartData = (marks || []).map((m: any) => {
    const mcq = Number(m.mcq_score) || 0
    const seq_q1 = Number(m.seq_q1) || 0
    const seq_q2 = Number(m.seq_q2) || 0
    const seq_q3 = Number(m.seq_q3) || 0
    const seq_q4 = Number(m.seq_q4) || 0
    const ess_q1 = Number(m.ess_q1) || 0
    const ess_q2 = Number(m.ess_q2) || 0
    const ess_q3 = Number(m.ess_q3) || 0
    const ess_q4 = Number(m.ess_q4) || 0

    const structured = seq_q1 + seq_q2 + seq_q3 + seq_q4
    const essay = ess_q1 + ess_q2 + ess_q3 + ess_q4
    const total = mcq + structured + essay

    return {
      name: m.papers?.paper_name || 'පේපරය',
      mcq, structured, essay,
      seq_q1, seq_q2, seq_q3, seq_q4,
      ess_q1, ess_q2, ess_q3, ess_q4,
      total
    }
  })

  const latestResult = chartData[chartData.length - 1] || {}

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="container mx-auto px-3 sm:px-6 py-5 md:py-8 space-y-6">
        {/* Header Profile Card - Mobile Responsive */}
        <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 bg-blue-100">
                  <AvatarFallback className="text-blue-600 text-lg font-bold">
                    {studentName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{studentName}</h1>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5" /> සිසු අංකය: {studentId}
                  </p>
                </div>
              </div>
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 rounded-xl text-white shadow-sm w-full sm:w-auto text-center">
                <span className="text-xs font-medium opacity-90">පසුගිය පේපරයේ මුළු ලකුණු</span>
                <p className="text-2xl font-bold">{latestResult.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Progress Chart */}
        <Card className="shadow-md border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              මුළු ලකුණු ප්‍රගතිය
            </CardTitle>
            <CardDescription>පේපරයෙන් පේපරයට ඔබේ ලකුණු වර්ධනය</CardDescription>
          </CardHeader>
          <CardContent className="h-72 sm:h-80">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={3} dot={{ r: 5 }} name="මුළු ලකුණු" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground flex-col gap-2">
                <FileText className="h-12 w-12 text-slate-300" />
                තවමත් ලකුණු ඇතුලත් කර නැත.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs for Detailed Breakdown */}
        <Tabs defaultValue="sections" className="w-full">
          <TabsList className="grid w-full grid-cols-3 gap-1 bg-white p-1 rounded-xl shadow-sm">
            <TabsTrigger value="sections" className="text-xs sm:text-sm data-[state=active]:bg-blue-50">ප්‍රධාන කොටස්</TabsTrigger>
            <TabsTrigger value="structured" className="text-xs sm:text-sm">ව්‍යුහගත</TabsTrigger>
            <TabsTrigger value="essay" className="text-xs sm:text-sm">රචනා</TabsTrigger>
          </TabsList>

          <TabsContent value="sections" className="mt-4">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">කොටස් අනුව ලකුණු සැසඳීම</CardTitle>
              </CardHeader>
              <CardContent className="h-72 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={50} />
                    <YAxis />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="mcq" fill="#10b981" name="MCQ" />
                    <Bar dataKey="structured" fill="#f59e0b" name="ව්‍යුහගත" />
                    <Bar dataKey="essay" fill="#ec4899" name="රචනා" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="structured" className="mt-4">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">ව්‍යුහගත ප්‍රශ්න මට්ටම (Q1-Q4)</CardTitle>
              </CardHeader>
              <CardContent className="h-72 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={50} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="seq_q1" fill="#3b82f6" name="Q1" />
                    <Bar dataKey="seq_q2" fill="#6366f1" name="Q2" />
                    <Bar dataKey="seq_q3" fill="#a855f7" name="Q3" />
                    <Bar dataKey="seq_q4" fill="#ec4899" name="Q4" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="essay" className="mt-4">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">රචනා ප්‍රශ්න මට්ටම (Q1-Q4)</CardTitle>
              </CardHeader>
              <CardContent className="h-72 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={50} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="ess_q1" fill="#ef4444" name="Q1" />
                    <Bar dataKey="ess_q2" fill="#f97316" name="Q2" />
                    <Bar dataKey="ess_q3" fill="#eab308" name="Q3" />
                    <Bar dataKey="ess_q4" fill="#84cc16" name="Q4" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}