'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function approveStudent(id: string, studentId: string, bookNumber: string) {
  const supabaseAdmin = createAdminClient()

  try {
    // 1. පළමුව student record එකේ auth_user_id එක check කරන්න
    const { data: student, error: fetchError } = await supabaseAdmin
      .from('students')
      .select('auth_user_id')
      .eq('id', id)
      .single()

    if (fetchError || !student) throw new Error('Student not found')
    if (!student.auth_user_id) throw new Error('Auth user not associated with this student')

    // 2. Auth user දැනටමත් පවතිනවා (register step එකේදී හැදුවා)
    //    අවශ්‍ය නම් email confirm කරන්න (already confirmed)
    
    // 3. students table එකේ approved flag එක true කරන්න (id replace නැතුව!)
    const { error: dbError } = await supabaseAdmin
      .from('students')
      .update({ approved: true })
      .eq('id', id)

    if (dbError) throw dbError

    revalidatePath('/teacher')
    return { success: true }
  } catch (error: any) {
    console.error('Approval Error:', error.message)
    return { success: false, error: error.message }
  }
}