'use server'

import { createClient } from '@/lib/supabase/server'

export async function deleteMarkRow(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('marks')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[deleteMarkRow] Supabase error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    console.error('[deleteMarkRow] Unexpected error:', err)
    return { success: false, error: err.message ?? 'Unknown error' }
  }
}