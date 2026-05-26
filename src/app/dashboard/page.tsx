// src/app/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StudentDashboardUI from './StudentDashboardUI'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // 1. Auth එකෙන් logged-in user ගන්නවා
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/login')
  }

  // 2. students table ෙකෝ query - id column Auth UUID එකට match වෙනවා
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  // ✅ Debug: error details log කරනවා (Vercel logs ල පේනවා)
  if (studentError) {
    console.error('Student fetch error:', JSON.stringify(studentError))
  }

  if (!student) {
    console.error(`No student found for auth user id: ${user.id}, email: ${user.email}`)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 gap-3">
        <p className="text-red-500 font-medium text-lg">❌ ශිෂ්‍ය දත්ත සොයාගත නොහැක.</p>
        <p className="text-slate-500 text-sm">User ID: {user.id}</p>
        <p className="text-slate-500 text-sm">Email: {user.email}</p>
        <p className="text-slate-400 text-xs mt-2">
          ගැටලුව: ඔබේ student record Auth UUID එකෙන් link වෙලා නැහැ. 
          Teacher ව contact කරන්න.
        </p>
      </div>
    )
  }

  // 3. ශිෂ්‍යයාගේ marks සහ paper details ගන්නවා
  const { data: marksData, error: marksError } = await supabase
    .from('marks')
    .select(`
      *,
      papers (
        paper_name,
        exam_date
      )
    `)
    .eq('student_id', student.id)
    .order('created_at', { ascending: true })

  if (marksError) {
    console.error('Marks fetch error:', JSON.stringify(marksError))
  }

  return (
    <StudentDashboardUI 
      studentName={student.name}
      studentId={student.student_id} 
      marks={marksData || []} 
    />
  )
}