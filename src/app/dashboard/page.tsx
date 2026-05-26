// src/app/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin' // 💡 Admin Client එක ගන්නවා
import StudentDashboardUI from './StudentDashboardUI'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // 1. ලොග් වෙලා ඉන්න යූසර්ව Auth එකෙන් ගන්නවා
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/login')
  }

  // 💡 විසඳුම: RLS Policies සේරම බයිපාස් කරන්න Admin Client එක හදාගන්නවා
  const supabaseAdmin = createAdminClient()

  // 2. ලොග් වුනු යූසර්ගේ ID එකට ගැලපෙන ශිෂ්‍යයාව 'students' ටේබල් එකෙන් ගන්නවා
  const { data: student, error: studentError } = await supabaseAdmin
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

  // 3. ශිෂ්‍යයාගේ ලකුණු (Marks) සහ ඒවට අදාල පේපර්ස් (Papers) විස්තර Foreign Key හරහා එකපාර ඇදලා ගන්නවා
  const { data: marksData, error: marksError } = await supabaseAdmin
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

  // 💡 UI එකට දත්ත ටික ආරක්ෂිතව පාස් කරනවා (වැරදුනු තැන නිවැරදි කර ඇත)
  return (
    <StudentDashboardUI 
      studentId={student.student_id} 
      marks={marksData || []} 
    />
  )
}