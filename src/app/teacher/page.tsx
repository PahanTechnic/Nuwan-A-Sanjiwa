// src/app/teacher/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import TeacherDashboardUI from './TeacherDashboardUI'

export const dynamic = 'force-dynamic'

export default async function TeacherPage() {
  const supabase = await createClient()

  // 1. Auth check (ලොග් වෙලාද බලනවා)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  // 2. Role check (ටේබල් එකක් නැති නිසා Middleware එකේ විදිහටම Email එකෙන් විතරක් චෙක් කරමු)
  const email = user.email || ''
  const isTeacher =
    email === process.env.TEACHER_EMAIL ||
    (email.includes('@') && !email.endsWith('@system.com'))

  // ටීචර් කෙනෙක් නෙවෙයි නම් ලොගින් පේජ් එකට හරවනවා
  if (!isTeacher) redirect('/login')

  // 3. Fetch data (ඩේටා ටික සේරම Admin Client එකෙන් ගන්නවා)
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
    .order('created_at', { ascending: false })

  return (
    <TeacherDashboardUI
      initialStudents={students || []}
      initialMarks={marks || []}
      initialPapers={papers || []}
    />
  )
}