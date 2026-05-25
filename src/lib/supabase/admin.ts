// utils/supabase/admin.ts
import { createClient } from '@supabase/supabase-js'

// මේකෙන් තමයි සර්ට ලමයි වෙනුවෙන් Account හදන්න Admin බලය ලැබෙන්නේ
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Server-only Key
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}