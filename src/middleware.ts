// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 1. Middleware එක ඇතුලේ Supabase Client එක සාදාගැනීම
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 2. දැනට ලොග් වෙලා ඉන්න යූසර්ව චෙක් කිරීම
  const { data: { user } } = await supabase.auth.getUser()
  const url = request.nextUrl.clone()

  // 🚨 ආරක්ෂක රීති (Security Rules):
  
  // Rule A: ලොග් නොවී dashboard හෝ teacher පැනල් එකට යන්න හැදුවොත් කෙලින්ම Login එකට හරවනවා
  if (!user && (url.pathname.startsWith('/dashboard') || url.pathname.startsWith('/teacher'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Rule B: ලොග් වෙලා ඉන්නේ සර් නෙවෙයි නම් (ලමයෙක් නම්) හොරෙන් /teacher යන්න හැදුවොත් /dashboard එකට හරවනවා
  if (user && url.pathname.startsWith('/teacher') && user.email !== process.env.NEXT_PUBLIC_TEACHER_EMAIL) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Rule C: දැනටමත් ලොග් වෙලා ඉන්න කෙනෙක් ආයෙත් Landing Page (/) එකට හෝ Login පේජ් එකට ආවොත් එයාට අදාල පැනල් එකට යවනවා
  if (user && (url.pathname === '/login' || url.pathname === '/')) {
    if (user.email === process.env.NEXT_PUBLIC_TEACHER_EMAIL) {
      return NextResponse.redirect(new URL('/teacher', request.url))
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

// මේ Middleware එක රන් වෙන්න ඕන පීත් ටික විතරක් මෙතන දෙනවා
export const config = {
  matcher: ['/', '/login', '/dashboard/:path*', '/teacher/:path*'],
}