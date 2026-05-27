'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client' // ඔයාගේ project එකේ තියෙන client path එක

export default function LogoutPage() {
  const supabase = createClient()

  useEffect(() => {
    const performLogout = async () => {
      try {
        // 1. Supabase session එක clear කරනවා
        await supabase.auth.signOut()
      } catch (error) {
        console.error('Logout error:', error)
      } finally {
        // 2. Middleware එකට ක්ෂණිකව අහුවෙන්න hard reload එකක් එක්කම login එකට යවනවා
        window.location.href = '/login'
      }
    }

    performLogout()
  }, [supabase])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="text-center space-y-4 bg-white p-8 rounded-xl shadow-sm border max-w-sm w-full">
        {/* Loading Spinner එකක් */}
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-800">ගිණුමෙන් ඉවත් වෙමින්...</h2>
          <p className="text-sm text-slate-500">මදක් රැඳී සිටින්න, ඔබව නැවත ඇතුල්වීමේ පිටුවට යොමු කරයි.</p>
        </div>
      </div>
    </div>
  )
}