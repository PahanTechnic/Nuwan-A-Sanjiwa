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
      email_confirm: true,
    })

    if (authError) {
      console.error(`Auth Error for ${student.student_id}:`, authError.message)
      errorCount++
      continue
    }

    // 2. Auth UUID එකම students table ට දානවා (මේකයි fix එක!)
    if (authUser.user) {
      const { error: dbError } = await supabaseAdmin.from('students').insert({
        id: authUser.user.id, // ✅ Auth UUID එක id column ට දානවා - මේක නැතිව dashboard fail වෙනවා
        student_id: student.student_id.trim(),
        name: student.name.trim(),
        book_number: password,
        class_name: student.class_name.trim(),
        approved: true, // import කරන ලමයි directly approved
      })

      if (dbError) {
        console.error(`DB Error for ${student.student_id}:`, dbError.message)
        // DB error නම් Auth user ත් delete කරනවා (rollback)
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
        errorCount++
      } else {
        successCount++
      }
    }
  }

  return { success: true, successCount, errorCount }
}