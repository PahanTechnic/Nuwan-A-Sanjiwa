// src/app/teacher/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server' 
import { createAdminClient } from '@/lib/supabase/admin' // 💡 Admin Client එක ඉම්පෝර්ට් කරගන්නවා
import TeacherUploadPanel from './UploadPanel'

// පේජ් එක හැමවෙලේම අලුත්ම ඩේටා ගන්න Force Dynamic කරනවා
export const dynamic = 'force-dynamic' 

export default async function TeacherPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // ලොග් වෙලා ඉන්නේ සර්ද කියලා චෙක් කිරීම
  if (!user || user.email !== process.env.NEXT_PUBLIC_TEACHER_EMAIL) {
    redirect('/login')
  }

  // 💡 විසඳුම: සාමාන්‍ය supabase ක්ලයන්ට් එක වෙනුවට createAdminClient එක ගන්නවා.
  // ඒකෙන් Supabase RLS Policies සේරම බයිපාස් කරලා සර්වර් එක ඇතුලෙන්ම ඩේටා ටික ඇදලා දෙනවා.
  const supabaseAdmin = createAdminClient()
  
  const { data: pendingStudents, error } = await supabaseAdmin
    .from('students')
    .select('*')
    .eq('approved', false)

  if (error) {
    console.error("Error fetching pending students:", error.message)
  }

  return <TeacherUploadPanel pendingStudents={pendingStudents || []} />
}