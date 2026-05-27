// src/components/Navbar.tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

// Navigation link icon data
const NavLinks = [
  { name: 'Dashboard', href: '/dashboard', iconPath: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
]

export default async function Navbar() {
  const supabase = await createClient()
  
  // 1. ලොග් වෙලා ඉන්න යූසර්ව ගන්නවා
  const { data: { user } } = await supabase.auth.getUser()

  let displayId = null

  if (user) {
    // 2. ගුරුවරයා නම් 'Teacher Panel' කියලා පෙන්නනවා
    if (user.email === process.env.TEACHER_EMAIL) {
      displayId = 'Teacher Panel'
    } else {
      // 3. ශිෂ්‍යයෙක් නම් auth_user_id එකෙන් student_id එක හොයාගන්නවා
      const { data: student } = await supabase
        .from('students')
        .select('student_id')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      
      if (student) {
        displayId = student.student_id
      }
    }
  }

  return (
    <header className="fixed top-0 w-full bg-white/95 backdrop-blur-sm z-50 border-b border-gray-100">
      <nav className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
        
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-gray-100 p-2 rounded-xl border border-gray-200 shadow-inner">
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1H9L8 4zm.5 1h7a1.5 1.5 0 011.5 1.5v10.3c0 .828-.672 1.5-1.5 1.5h-7A1.5 1.5 0 017 17.3V6.5A1.5 1.5 0 018.5 5z" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900">
            Engine with NAS
          </span>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-6 text-sm font-medium text-gray-600">
            {NavLinks.map((link) => (
              <Link key={link.name} href={link.href} className="flex items-center gap-2 hover:text-black transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.iconPath} />
                </svg>
                {link.name}
              </Link>
            ))}
          </div>

          {/* 💡 ලොග් වෙලා නම් Student ID එක පෙන්නනවා, නැත්නම් 'ඇතුල්වන්න' බටන් එක පෙන්නනවා */}
          {displayId ? (
            <Link href={displayId === 'Teacher Panel' ? '/teacher' : '/dashboard'} className="bg-blue-50 border border-blue-200 text-blue-700 px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-blue-100 transition shadow-sm">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="font-mono tracking-wide">{displayId}</span>
            </Link>
          ) : (
            <Link href="/login" className="bg-black text-white px-5 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 hover:bg-black/90 transition shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              ඇතුල්වන්න
            </Link>
          )}
        </div>
      </nav>
    </header>
  )
}