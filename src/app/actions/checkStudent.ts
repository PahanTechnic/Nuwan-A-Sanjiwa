'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export type StudentStatus = 'success' | 'not_found' | 'not_approved' | 'error'

export async function checkStudentStatus(studentId: string): Promise<{ status: StudentStatus }> {
  const supabaseAdmin = createAdminClient()
  const upperId = studentId.trim().toUpperCase()

  try {
    const { data, error } = await supabaseAdmin
      .from('students')
      .select('approved')
      .eq('student_id', upperId)
      .maybeSingle()

    if (error) return { status: 'error' }
    if (!data) return { status: 'not_found' }
    if (!data.approved) return { status: 'not_approved' }
    
    return { status: 'success' }
  } catch (err) {
    return { status: 'error' }
  }
}