'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, BarChart, Bar, Legend
} from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  GraduationCap, TrendingUp, FileText,
  Wifi, WifiOff, Trophy, Target, BarChart2
} from 'lucide-react'

interface DashboardUIProps {
  studentName: string
  studentId: string
  studentDbId: string   // ✅ NEW — DB UUID, realtime filter සඳහා
  initialMarks: any[]
}

function buildChartData(marks: any[]) {
  return marks.map((m: any) => {
    const mcq    = Number(m.mcq_score) || 0
    const sq1    = Number(m.seq_q1) || 0
    const sq2    = Number(m.seq_q2) || 0
    const sq3    = Number(m.seq_q3) || 0
    const sq4    = Number(m.seq_q4) || 0
    const es1    = Number(m.ess_q1) || 0
    const es2    = Number(m.ess_q2) || 0
    const es3    = Number(m.ess_q3) || 0
    const es4    = Number(m.ess_q4) || 0
    const structured = sq1 + sq2 + sq3 + sq4
    const essay      = es1 + es2 + es3 + es4
    const total      = mcq + structured + essay
    return {
      name: m.papers?.paper_name || 'පේපරය',
      mcq, structured, essay,
      seq_q1: sq1, seq_q2: sq2, seq_q3: sq3, seq_q4: sq4,
      ess_q1: es1, ess_q2: es2, ess_q3: es3, ess_q4: es4,
      total
    }
  })
}

// ✅ Smooth custom tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white/95 backdrop-blur border border-slate-200 shadow-xl rounded-2xl p-3 text-sm">
      <p className="font-bold text-slate-800 mb-1 sinhala">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: p.color }} />
          <span className="text-slate-600 sinhala">{p.name}:</span>
          <span className="font-bold" style={{ color: p.color }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function StudentDashboardUI({
  studentName, studentId, studentDbId, initialMarks
}: DashboardUIProps) {

  const [marks, setMarks]           = useState(initialMarks)
  const [isLive, setIsLive]         = useState(false)
  const [flash, setFlash]           = useState(false)

  // ✅ Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`marks-${studentDbId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'marks', filter: `student_id=eq.${studentDbId}` },
        async () => {
          // Change detect → fresh data fetch
          const { data } = await supabase
            .from('marks')
            .select('*, papers(paper_name, exam_date)')
            .eq('student_id', studentDbId)
            .order('created_at', { ascending: true })

          if (data) {
            setMarks(data)
            setFlash(true)
            setTimeout(() => setFlash(false), 2500)
          }
        }
      )
      .subscribe(status => setIsLive(status === 'SUBSCRIBED'))

    return () => { supabase.removeChannel(channel) }
  }, [studentDbId])

  const chartData     = buildChartData(marks)
  const latest        = chartData[chartData.length - 1] || {}
  const best          = chartData.length > 0 ? Math.max(...chartData.map(d => d.total)) : 0
  const avg           = chartData.length > 0
    ? Math.round(chartData.reduce((s, d) => s + d.total, 0) / chartData.length)
    : 0
  const paperCount    = chartData.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30">
      <div className="container mx-auto px-3 sm:px-6 py-5 md:py-8 space-y-5">

        {/* ── Header ── */}
        <Card className={`border-0 shadow-lg bg-white/90 backdrop-blur-sm transition-all duration-700
          ${flash ? 'ring-2 ring-blue-400 ring-offset-2 shadow-blue-100' : ''}`}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">

              {/* Avatar + name */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-14 w-14 shadow-lg">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xl font-bold">
                      {studentName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {/* Live dot */}
                  <span className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white
                    ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 sinhala tracking-tight">
                      {studentName}
                    </h1>
                    <Badge
                      className={`text-[11px] gap-1 px-2 py-0.5 rounded-full font-semibold
                        ${isLive
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'}`}
                    >
                      {isLive ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                      {isLive ? 'Live' : 'Connecting...'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5 sinhala">
                    <GraduationCap className="h-3.5 w-3.5 text-blue-500" />
                    සිසු අංකය:
                    <span className="font-mono font-bold text-blue-600 ml-1">{studentId}</span>
                  </p>
                </div>
              </div>

              {/* Latest score pill */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 px-5 py-3 rounded-2xl
                text-white shadow-lg shadow-blue-200 w-full sm:w-auto text-center min-w-[120px]">
                <span className="text-[11px] font-medium opacity-80 sinhala block">අවසන් ලකුණු</span>
                <p className="text-3xl font-extrabold tracking-tight leading-tight">{latest.total ?? 0}</p>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Trophy,   color: 'amber',  label: 'ඉහළම',    value: best },
            { icon: Target,   color: 'blue',   label: 'සාමාන්‍ය', value: avg },
            { icon: BarChart2, color: 'violet', label: 'පේපර් ගණන', value: paperCount },
          ].map(({ icon: Icon, color, label, value }) => (
            <Card key={label} className="border-0 shadow-sm bg-white/80 backdrop-blur-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-4 text-center">
                <Icon className={`h-5 w-5 text-${color}-500 mx-auto mb-1`} />
                <p className="text-[11px] text-muted-foreground sinhala leading-tight">{label}</p>
                <p className={`text-xl sm:text-2xl font-extrabold text-${color}-600 leading-tight`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Main Progress Line Chart ── */}
        <Card className="shadow-md border-0 bg-white/90">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span className="sinhala">මුළු ලකුණු ප්‍රගතිය</span>
            </CardTitle>
            <CardDescription className="sinhala">
              පේපරයෙන් පේපරයට ඔබේ ලකුණු වර්ධනය — {isLive && <span className="text-emerald-600 font-semibold">● ජීවමාන දත්ත</span>}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72 sm:h-80 pr-2">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'Noto Sans Sinhala, sans-serif' }}
                    interval={0} angle={-15} textAnchor="end" height={52} />
                  <YAxis domain={[0, 'auto']} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={3}
                    dot={{ r: 6, fill: '#fff', stroke: '#2563eb', strokeWidth: 2.5 }}
                    activeDot={{ r: 8, fill: '#2563eb' }}
                    name="මුළු ලකුණු"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground flex-col gap-3">
                <FileText className="h-14 w-14 text-slate-200" />
                <p className="sinhala text-sm">තවමත් ලකුණු ඇතුලත් කර නැත.</p>
                {isLive && (
                  <p className="text-xs text-emerald-500 flex items-center gap-1">
                    <Wifi className="h-3 w-3" /> ලකුණු ඇතුලත් වූ විගස ස්වයංක්‍රීයව දිස්වේ
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Breakdown Tabs ── */}
        <Tabs defaultValue="sections" className="w-full">
          <TabsList className="grid w-full grid-cols-3 gap-1 bg-white p-1 rounded-xl shadow-sm border h-auto">
            {[
              { value: 'sections',    label: 'ප්‍රධාන කොටස්' },
              { value: 'structured',  label: 'ව්‍යුහගත' },
              { value: 'essay',       label: 'රචනා' },
            ].map(t => (
              <TabsTrigger
                key={t.value} value={t.value}
                className="text-xs sm:text-sm sinhala rounded-lg py-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:font-semibold"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab: Main sections */}
          <TabsContent value="sections" className="mt-4">
            <Card className="border-0 shadow-md bg-white/90">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg sinhala">කොටස් අනුව ලකුණු සැසඳීම</CardTitle>
              </CardHeader>
              <CardContent className="h-72 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ left: -10, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'Noto Sans Sinhala, sans-serif' }}
                      interval={0} angle={-15} textAnchor="end" height={52} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', fontFamily: 'Noto Sans Sinhala, sans-serif' }} />
                    <Bar dataKey="mcq"        fill="#10b981" name="MCQ"     radius={[4, 4, 0, 0]} />
                    <Bar dataKey="structured" fill="#f59e0b" name="ව්‍යුහගත" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="essay"      fill="#ec4899" name="රචනා"    radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Structured */}
          <TabsContent value="structured" className="mt-4">
            <Card className="border-0 shadow-md bg-white/90">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg sinhala">ව්‍යුහගත ප්‍රශ්න (Q1–Q4)</CardTitle>
              </CardHeader>
              <CardContent className="h-72 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ left: -10, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'Noto Sans Sinhala, sans-serif' }}
                      interval={0} angle={-15} textAnchor="end" height={52} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="seq_q1" fill="#3b82f6" name="Q1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="seq_q2" fill="#6366f1" name="Q2" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="seq_q3" fill="#a855f7" name="Q3" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="seq_q4" fill="#ec4899" name="Q4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Essay */}
          <TabsContent value="essay" className="mt-4">
            <Card className="border-0 shadow-md bg-white/90">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg sinhala">රචනා ප්‍රශ්න (Q1–Q4)</CardTitle>
              </CardHeader>
              <CardContent className="h-72 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ left: -10, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'Noto Sans Sinhala, sans-serif' }}
                      interval={0} angle={-15} textAnchor="end" height={52} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="ess_q1" fill="#ef4444" name="Q1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ess_q2" fill="#f97316" name="Q2" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ess_q3" fill="#eab308" name="Q3" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ess_q4" fill="#84cc16" name="Q4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── Marks History Table ── */}
        {chartData.length > 0 && (
          <Card className="border-0 shadow-md bg-white/90">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg sinhala">ලකුණු ඉතිහාසය</CardTitle>
              <CardDescription className="sinhala">සෑම පේපරයකම සවිස්තරාත්මක දත්ත</CardDescription>
            </CardHeader>
            <CardContent className="-mx-1 overflow-x-auto">
              <div className="min-w-[560px]">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['පේපරය', 'MCQ', 'ව්‍යුහගත', 'රචනා', 'මුළු'].map(h => (
                        <th key={h} className="sinhala text-left font-semibold text-slate-600 px-3 py-2.5 first:rounded-tl-lg last:rounded-tr-lg">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row, i) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-blue-50/40 transition-colors">
                        <td className="px-3 py-2.5 font-medium text-slate-800 sinhala">{row.name}</td>
                        <td className="px-3 py-2.5 text-emerald-600 font-semibold">{row.mcq}</td>
                        <td className="px-3 py-2.5 text-amber-600 font-semibold">{row.structured}</td>
                        <td className="px-3 py-2.5 text-pink-600 font-semibold">{row.essay}</td>
                        <td className="px-3 py-2.5">
                          <span className="bg-blue-100 text-blue-700 font-extrabold px-2.5 py-0.5 rounded-full text-sm">
                            {row.total}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}