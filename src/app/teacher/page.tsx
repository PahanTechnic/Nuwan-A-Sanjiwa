// src/app/teacher/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import TeacherDashboardUI from './TeacherDashboardUI'

export const dynamic = 'force-dynamic'

export default async function TeacherPage() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  // Teacher role check — adjust to your auth setup
  const { data: teacher } = await supabase
    .from('teachers')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!teacher) redirect('/login')

  const supabaseAdmin = createAdminClient()

  // All students
  const { data: students } = await supabaseAdmin
    .from('students')
    .select('*')
    .order('created_at', { ascending: false })

  // All marks with paper info
  const { data: marks } = await supabaseAdmin
    .from('marks')
    .select(`
      *,
      papers ( paper_name )
    `)

  // All papers
  const { data: papers } = await supabaseAdmin
    .from('papers')
    .select('*')
    .order('created_at', { ascending: true })

  return (
    <TeacherDashboardUI
      teacherName={teacher.name || 'Teacher'}
      initialStudents={students || []}
      initialMarks={marks || []}
      initialPapers={papers || []}
    />
  )
}