'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend } from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface DashboardUIProps {
  studentName: string
  studentId: string
  chartData: any[]
}

export default function StudentDashboardUI({ studentName, studentId, chartData }: DashboardUIProps) {
  
  // අන්තිමටම ලියපු පේපර් එකේ ලකුණු (Latest Score)
  const latestResult = chartData[chartData.length - 1] || {}

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      {/* Header Profile Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{studentName}</h1>
          <p className="text-sm text-muted-foreground">සිසු අංකය: {studentId}</p>
        </div>
        <div className="mt-4 md:mt-0 bg-primary/10 px-4 py-2 rounded-lg border border-primary/20">
          <span className="text-sm font-semibold text-primary">පසුගිය පේපරයේ මුළු ලකුණ: {latestResult.total || 0}</span>
        </div>
      </div>

      {/* 📊 Main Progress Chart (ඔයා ඇඳපු රේඛීය ප්‍රස්ථාරය) */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>මුළු ලකුණු මට්ටමේ වෙනස්වීම (Overall Progress Trend)</CardTitle>
          <CardDescription>පේපරයෙන් පේපරයට ඔබේ ලකුණු වර්ධනය වී ඇති ආකාරය</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} />
                <YAxis stroke="#888888" fontSize={12} domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={3} activeDot={{ r: 8 }} name="ముළු ලකුණු" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">තවමත් ලකුණු ඇතුලත් කර නැත.</div>
          )}
        </CardContent>
      </Card>

      {/* 🔍 Section Breakdown Tabs (MCQ, Structured, Essay වෙන වෙනම) */}
      <Tabs defaultValue="sections" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="sections">ප්‍රධාන කොටස්</TabsTrigger>
          <TabsTrigger value="structured">ව්‍යුහගත (SEQ)</TabsTrigger>
          <TabsTrigger value="essay">රචනා (Essay)</TabsTrigger>
        </TabsList>

        {/* 1. Main Sections Comparison */}
        <TabsContent value="sections" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>කොටස් අනුව ලකුණු සැසඳීම</CardTitle>
              <CardDescription>MCQ, ව්‍යුහගත සහ රචනා අතර වෙනස</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="mcq" fill="#10b981" name="MCQ Score" />
                  <Bar dataKey="structured" fill="#f59e0b" name="Structured Essay" />
                  <Bar dataKey="essay" fill="#ec4899" name="Essay Score" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Structured Questions Breakdown */}
        <TabsContent value="structured" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>ව්‍යුහගත රචනා ප්‍රශ්න මට්ටම (Question 1 - 4)</CardTitle>
              <CardDescription>සෑම ප්‍රශ්නයකටම ලැබුණු ලකුණු වෙනස්වීම්</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="seq_q1" fill="#3b82f6" name="Q1 ලකුණු" />
                  <Bar dataKey="seq_q2" fill="#6366f1" name="Q2 ලකුණු" />
                  <Bar dataKey="seq_q3" fill="#a855f7" name="Q3 ලකුණු" />
                  <Bar dataKey="seq_q4" fill="#ec4899" name="Q4 ලකුණු" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Essay Questions Breakdown */}
        <TabsContent value="essay" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>රචනා ප්‍රශ්න මට්ටම (Question 1 - 4)</CardTitle>
              <CardDescription>රචනා ප්‍රශ්නවල ලකුණු මට්ටම්</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ess_q1" fill="#ef4444" name="Q1 ලකුණු" />
                  <Bar dataKey="ess_q2" fill="#f97316" name="Q2 ලකුණු" />
                  <Bar dataKey="ess_q3" fill="#eab308" name="Q3 ලකුණු" />
                  <Bar dataKey="ess_q4" fill="#84cc16" name="Q4 ලකුණු" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}