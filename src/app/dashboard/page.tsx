// src/app/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StudentDashboardUI from './StudentDashboardUI'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) redirect('/login')

  // ✅ auth_user_id column එකෙන් search කරන්න (id replace නැහැ)
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('*')
    .eq('auth_user_id', user.id)  // මෙතන වෙනස!
    .maybeSingle()

  if (studentError) {
    console.error('Student fetch error:', JSON.stringify(studentError))
  }

  if (!student) {
    console.error(`No student found for auth user id: ${user.id}`)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 gap-3">
        <p className="text-red-500 font-medium text-lg">❌ ශිෂ්‍ය දත්ත සොයාගත නොහැක.</p>
        <p className="text-slate-500 text-sm">ගුරුවරයා අමතන්න. ඔබගේ ගිණුම තවමත් සම්බන්ධ කර නැත.</p>
      </div>
    )
  }

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

  if (marksError) console.error('Marks fetch error:', JSON.stringify(marksError))

  return (
    <StudentDashboardUI 
      studentName={student.name}
      studentId={student.student_id} 
      marks={marksData || []} 
    />
  )
}