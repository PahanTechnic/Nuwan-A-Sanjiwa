'use fancy-server' // Next.js Server Action
'use server'

import { createAdminClient } from '@/lib/supabase/admin'

interface StudentRow {
  student_id: string
  name: string
  book_number: string
  class_name: string
}

export async function importStudents(studentsList: StudentRow[]) {
  const supabaseAdmin = createAdminClient()
  
  let successCount = 0
  let errorCount = 0

  for (const student of studentsList) {
    const email = `${student.student_id.trim().toLowerCase()}@system.com`
    const password = student.book_number.trim()

    // 1. Supabase Auth එකේ User කෙනෙක් හදනවා
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Email Confirm කරන්න ඕන නැහැ කෙලින්ම Active වෙනවා
    })

    if (authError) {
      console.error(`Auth Error for ${student.student_id}:`, authError.message)
      errorCount++
      continue; // මේ ලමයාගේ අවුලක් නම් ඊළඟ ලමයාට යනවා
    }

    // 2. Auth එකේ හැදුන Userව අපේ 'students' ටේබල් එකටත් ඇතුලත් කරනවා
    if (authUser.user) {
      const { error: dbError } = await supabaseAdmin.from('students').insert({
        student_id: student.student_id.trim(),
        name: student.name.trim(),
        book_number: password,
        class_name: student.class_name.trim(),
      })

      if (dbError) {
        console.error(`DB Error for ${student.student_id}:`, dbError.message)
        errorCount++
      } else {
        successCount++
      }
    }
  }

  return { success: true, successCount, errorCount }
}