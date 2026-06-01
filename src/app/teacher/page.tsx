// src/app/teacher/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import TeacherDashboardUI from './TeacherDashboardUI'

export const dynamic = 'force-dynamic'

export default async function TeacherPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.TEACHER_EMAIL) {
    redirect('/login')
  }

  const supabaseAdmin = createAdminClient()
  const { data: pendingStudents, error } = await supabaseAdmin
    .from('students')
    .select('*')
    .eq('approved', false)

  if (error) console.error('Error fetching pending students:', error.message)

  return <TeacherDashboardUI pendingStudents={pendingStudents || []} />
}