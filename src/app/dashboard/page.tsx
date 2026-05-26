// src/app/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StudentDashboardUI from './StudentDashboardUI'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // 1. ලොග් වෙලා ඉන්න යූසර්ව Auth එකෙන් ගන්නවා
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/login')
  }

  // 2. Regular client පාවිච්චි කරනවා (RLS Policies ඔටෝමැටිකව ඇප්ලයි වෙනවා)
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

  // 3. ශිෂ්‍යයාගේ ලකුණු (Marks) සහ පේපර්ස් විස්තර ගන්නවා
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

  // 💡 `chartData={[]}` ඉවත් කර ඇත. දැන් මෙතන කිසිම ටයිප් ප්‍රශ්නයක් එන්නේ නැහැ.
  return (
    <StudentDashboardUI 
      studentName={student.name}
      studentId={student.student_id} 
      marks={marksData || []} 
    />
  )
}