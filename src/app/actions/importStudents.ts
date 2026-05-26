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

    // 1. Auth User එක හදන්න
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
    })

    if (authError) {
      console.error(`Auth Error for ${student.student_id}:`, authError.message)
      errorCount++
      continue
    }

    // 2. students table එකට insert කරන්න (auth_user_id store කරන්න, id auto-generate වෙනවා)
    if (authUser.user) {
      const { error: dbError } = await supabaseAdmin.from('students').insert({
        student_id: student.student_id.trim(),
        name: student.name.trim(),
        book_number: password,
        class_name: student.class_name.trim(),
        auth_user_id: authUser.user.id,  // ✅ මෙතන වෙනස!
        approved: true,
      })

      if (dbError) {
        console.error(`DB Error for ${student.student_id}:`, dbError.message)
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
        errorCount++
      } else {
        successCount++
      }
    }
  }

  return { success: true, successCount, errorCount }
}