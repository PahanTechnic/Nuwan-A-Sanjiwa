// src/app/teacher/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import TeacherDashboardUI from './TeacherDashboardUI'

export const dynamic = 'force-dynamic'

export default async function TeacherPage() {
  const supabase = await createClient()

  // 1. පරිශීලකයා ලොග් වී ඇත්දැයි පරීක්ෂා කිරීම
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  // 2. ගුරුවරයෙකු බව තහවුරු කරගැනීම
  const { data: teacher } = await supabase
    .from('teachers')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!teacher) redirect('/login')

  const supabaseAdmin = createAdminClient()

  // 3. සියලුම සිසුන්ගේ දත්ත ලබාගැනීම
  const { data: students } = await supabaseAdmin
    .from('students')
    .select('*')
    .order('created_at', { ascending: false })

  // 4. සියලුම ලකුණු සහ ඊට අදාළ ප්‍රශ්න පත්‍ර දත්ත ලබාගැනීම
  const { data: marks } = await supabaseAdmin
    .from('marks')
    .select(`
      *,
      papers ( paper_name )
    `)

  // 5. ප්‍රශ්න පත්‍ර දත්ත ලබාගැනීම
  const { data: papers } = await supabaseAdmin
    .from('papers')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <TeacherDashboardUI 
      teacherName={teacher.name || 'Teacher'} 
      initialStudents={students || []}
      initialMarks={marks || []}
      initialPapers={papers || []}
    />
  )
}