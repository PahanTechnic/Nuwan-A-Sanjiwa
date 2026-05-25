'use server'

import { createAdminClient } from '@/lib/supabase/admin'

// Unique Student ID එකක් Generate කරන ෆන්ක්ෂන් එක
async function generateUniqueStudentId(className: string, supabaseAdmin: any): Promise<string> {
  const yy = className.slice(-2) // 2026 -> 26
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  
  let isUnique = false
  let generatedId = ''

  while (!isUnique) {
    const randomLetter = letters.charAt(Math.floor(Math.random() * letters.length))
    const randomDigits = Math.floor(1000 + Math.random() * 9000).toString() // ඉලක්කම් 4ක් (1000 - 9999)
    generatedId = `ET${yy}-${randomLetter}${randomDigits}`

    // ඩේටාබේස් එකේ දැනටමත් මේ ID එක තියෙනවද බලනවා
    const { data } = await supabaseAdmin
      .from('students')
      .select('student_id')
      .eq('student_id', generatedId)
      .single()

    if (!data) {
      isUnique = true // ඩේටාබේස් එකේ නැත්නම් විතරක් ලූප් එක නතර කරනවා
    }
  }

  return generatedId
}

export async function registerStudent(formData: { name: string; className: string; bookNumber: string }) {
  const supabaseAdmin = createAdminClient()

  try {
    // 1. Unique ID එකක් හදාගන්නවා
    const studentId = await generateUniqueStudentId(formData.className, supabaseAdmin)

    // 2. 'students' ටේබල් එකට දානවා (approved = false විදිහට)
    const { error } = await supabaseAdmin.from('students').insert({
      student_id: studentId,
      name: formData.name,
      book_number: formData.bookNumber.trim(),
      class_name: formData.className,
      approved: false // තවම සර් Approve කරලා නැහැ
    })

    revalidatePath('/teacher')


    if (error) throw error

    return { success: true, studentId }
  } catch (error: any) {
    console.error('Registration Error:', error.message)
    return { success: false, error: 'ලියාපදිංචි වීම අසාර්ථකයි. නැවත උත්සාහ කරන්න.' }
  }
}