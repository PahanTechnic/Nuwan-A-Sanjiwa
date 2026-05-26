'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function approveStudent(id: string, studentId: string, bookNumber: string) {
  const supabaseAdmin = createAdminClient()
  const email = `${studentId.toLowerCase()}@system.com`

  try {
    // 1. Supabase Auth එකේ Account හදනවා
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: bookNumber.trim(),
      email_confirm: true
    })

    if (authError) throw authError

    // 2. students table ල id ත් Auth UUID එකට update කරනවා + approved = true
    // ✅ id column update - මේක නැතිව dashboard ල .eq('id', user.id) fail වෙනවා
    const { error: dbError } = await supabaseAdmin
      .from('students')
      .update({ 
        approved: true,
        id: authData.user.id // ✅ Auth UUID එක students table id ට දානවා
      })
      .eq('id', id)

    if (dbError) {
      // DB error නම් Auth user delete කරනවා (rollback)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw dbError
    }

    revalidatePath('/teacher')
    return { success: true }
  } catch (error: any) {
    console.error('Approval Error:', error.message)
    return { success: false, error: error.message }
  }
}