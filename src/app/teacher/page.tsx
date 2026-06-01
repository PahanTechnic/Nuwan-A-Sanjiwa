// src/app/teacher/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import TeacherDashboardUI from './TeacherDashboardUI'

export const dynamic = 'force-dynamic'

export default async function TeacherPage() {
  const supabase = await createClient()

  // 1. Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  // 2. Role check
  const { data: teacher } = await supabase
    .from('teachers')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!teacher) redirect('/login')

  const supabaseAdmin = createAdminClient()

  // 3. Fetch data
  const { data: students } = await supabaseAdmin
    .from('students')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: marks } = await supabaseAdmin
    .from('marks')
    .select(`
      *,
      papers ( paper_name )
    `)

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