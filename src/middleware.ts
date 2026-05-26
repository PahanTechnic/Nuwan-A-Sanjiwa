import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // ✅ Logged out users trying to access protected routes
  if (!user && (pathname.startsWith('/dashboard') || pathname.startsWith('/teacher'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ✅ Logged in users trying to access login or landing page
  if (user && (pathname === '/login' || pathname === '/')) {
    const destination = user.email === process.env.TEACHER_EMAIL ? '/teacher' : '/dashboard'
    // ✅ වැදගත්: එකම URL එකට redirect නොකරන්න
    if (pathname !== destination) {
      return NextResponse.redirect(new URL(destination, request.url))
    }
  }

  // ✅ Teacher එක /teacher නොවන වෙනත් protected route එකකට ගියොත්
  if (user && pathname.startsWith('/teacher') && user.email !== process.env.TEACHER_EMAIL) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/', '/login', '/dashboard/:path*', '/teacher/:path*'],
}