// src/app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StudentDashboardUI from './StudentDashboardUI'

export default async function DashboardPage() {
  const supabase = await createClient()

  // 1. ලොග් වෙලා ඉන්න ශිෂ්‍යයාගේ Auth දත්ත ගන්නවා
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Auth Email එකෙන් 'students' ටේබල් එකේ ඉන්න ලමයාගේ විස්තර ගන්නවා
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('*')
    .eq('student_id', user.email?.split('@')[0].toUpperCase() || '')
    .single()

  if (studentError || !student) {
    return <div className="p-8 text-center text-red-500">ශිෂ්‍ය දත්ත සොයාගත නොහැක.</div>
  }

  // 3. ඒ ලමයාට අදාල සියලුම පේපර්ස්වල ලකුණු පේපර් එකේ නමත් එක්කම ගන්නවා (Ordered by date)
  const { data: marks, error: marksError } = await supabase
    .from('marks')
    .select(`
      *,
      papers (
        paper_name,
        exam_date
      )
    `)
    .eq('student_id', student.id)
    // මෙතනදි පේපර්ස්වල ID එක අනුව සෝට් කරන්නේ ප්‍රස්ථාරය පිළිවෙලට එන්න ඕන නිසා
    .order('created_at', { ascending: true })

  // ප්‍රස්ථාරයට ගැලපෙන විදිහට ඩේටා ටික Format කරගන්නවා
  const chartData = marks?.map((m: any) => ({
    name: m.papers?.paper_name || 'Unknown',
    total: m.total_marks,
    mcq: m.mcq_score,
    // ව්‍යුහගත එකතුව
    structured: m.seq_q1 + m.seq_q2 + m.seq_q3 + m.seq_q4,
    // රචනා එකතුව
    essay: m.ess_q1 + m.ess_q2 + m.ess_q3 + m.ess_q4,
    // ප්‍රශ්න වෙන වෙනම (Detailed Breakdown එකට)
    seq_q1: m.seq_q1, seq_q2: m.seq_q2, seq_q3: m.seq_q3, seq_q4: m.seq_q4,
    ess_q1: m.ess_q1, ess_q2: m.ess_q2, ess_q3: m.ess_q3, ess_q4: m.ess_q4,
  })) || []

  return (
    <StudentDashboardUI 
      studentName={student.name} 
      studentId={student.student_id} 
      chartData={chartData} 
    />
  )
}