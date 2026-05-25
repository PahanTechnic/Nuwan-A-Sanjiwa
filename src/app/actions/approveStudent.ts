'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function approveStudent(id: string, studentId: string, bookNumber: string) {
  const supabaseAdmin = createAdminClient()
  const email = `${studentId.toLowerCase()}@system.com`

  try {
    // 1. Supabase Auth එකේ නිල වශයෙන් Account එකක් හදනවා
    const { error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: bookNumber.trim(),
      email_confirm: true
    })

    if (authError) throw authError

    // 2. 'students' ටේබල් එකේ approved ස්ටේටස් එක true කරනවා
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