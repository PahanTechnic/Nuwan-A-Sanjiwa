// src/app/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server' // Regular client vapra
import StudentDashboardUI from './StudentDashboardUI'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // 1. Logged in user auth madhun ghyava
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/login')
  }

  // 2. Regular client vapra - RLS automatically apply hoil
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (studentError || !student) {
    console.error('Student fetch error:', studentError)
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <p className="text-red-500 font-medium">❌ ශිෂ්‍ය දත්ත සොයාගත නොහැක. (Database Error)</p>
      </div>
    )
  }

  // 3. Shishyache marks ani papers RLS chya madatine secure paddhatine ghyava
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

  if (marksError) {
    console.error('Marks fetch error:', marksError)
  }

  // UI sathi data pass kara
  return (
    <StudentDashboardUI 
      studentName={student.name}
      studentId={student.student_id} 
      marks={marksData || []} 
      chartData={[]} // Ithe tumcha chartData logic add kara
    />
  )
}