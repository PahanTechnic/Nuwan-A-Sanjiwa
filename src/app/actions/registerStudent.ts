'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function generateUniqueStudentId(className: string, supabaseAdmin: any): Promise<string> {
  const yy = className.slice(-2)
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  
  let isUnique = false
  let generatedId = ''

  while (!isUnique) {
    const randomLetter = letters.charAt(Math.floor(Math.random() * letters.length))
    const randomDigits = Math.floor(1000 + Math.random() * 9000).toString()
    generatedId = `ET${yy}-${randomLetter}${randomDigits}`

    const { data } = await supabaseAdmin
      .from('students')
      .select('student_id')
      .eq('student_id', generatedId)
      .maybeSingle()

    if (!data) isUnique = true
  }

  return generatedId
}

export async function registerStudent(formData: { name: string; className: string; bookNumber: string }) {
  const supabaseAdmin = createAdminClient()

  try {
    const studentId = await generateUniqueStudentId(formData.className, supabaseAdmin)
    const email = `${studentId.toLowerCase()}@system.com`
    const password = formData.bookNumber.trim()

    // 1. Auth User එක කලින්ම හදන්න (approved false වුනත්)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
    })

    if (authError) throw authError

    // 2. students table එකට insert කරන්න (id auto-generate වෙනවා, auth_user_id store කරන්න)
    const { error: dbError } = await supabaseAdmin.from('students').insert({
      student_id: studentId,
      name: formData.name.trim(),
      book_number: password,
      class_name: formData.className,
      auth_user_id: authData.user.id, // ✅ Auth UUID මෙතැන store කරන්න
      approved: false
    })

    if (dbError) {
      // DB error නම් Auth user delete කරන්න (rollback)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw dbError
    }

    revalidatePath('/teacher')
    return { success: true, studentId }
  } catch (error: any) {
    console.error('Registration Error:', error.message)
    return { success: false, error: 'ලියාපදිංචි වීම අසාර්ථකයි. නැවත උත්සාහ කරන්න.' }
  }
}