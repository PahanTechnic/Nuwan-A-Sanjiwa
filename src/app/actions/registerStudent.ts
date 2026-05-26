'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

async function generateUniqueStudentId(className: string, supabaseAdmin: any): Promise<string> {
  const yy = className.slice(-2) // 2026 -> 26
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
      .single()

    if (!data) {
      isUnique = true
    }
  }

  return generatedId
}

export async function registerStudent(formData: { name: string; className: string; bookNumber: string }) {
  const supabaseAdmin = createAdminClient()

  try {
    // 1. Unique Student ID හදනවා
    const studentId = await generateUniqueStudentId(formData.className, supabaseAdmin)

    // 2. students table ට insert කරනවා (approved = false - teacher approve කරන්න ඕන)
    // ✅ id column: approve වෙනකොට authData.user.id update වෙනවා (approveStudent.ts ල)
    // Register step ල id auto-generate වෙනවා (UUID), approve step ල Auth UUID එකෙන් replace වෙනවා
    const { error } = await supabaseAdmin.from('students').insert({
      student_id: studentId,
      name: formData.name.trim(),
      book_number: formData.bookNumber.trim(),
      class_name: formData.className,
      approved: false
    })

    if (error) throw error

    revalidatePath('/teacher')
    return { success: true, studentId }
  } catch (error: any) {
    console.error('Registration Error:', error.message)
    return { success: false, error: 'ලියාපදිංචි වීම අසාර්ථකයි. නැවත උත්සාහ කරන්න.' }
  }
}