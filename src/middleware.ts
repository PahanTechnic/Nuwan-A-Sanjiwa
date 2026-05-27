import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // =========================
  // SUPABASE CLIENT
  // =========================
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },

        setAll(cookiesToSet) {

          cookiesToSet.forEach(
            ({ name, value }) =>
              request.cookies.set(name, value)
          )

          response = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(
            ({ name, value, options }) =>
              response.cookies.set(
                name,
                value,
                {
                  ...options,
                  path: '/',
                }
              )
          )
        },
      },
    }
  )

  // =========================
  // GET USER
  // =========================
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    console.error(
      'Middleware Auth Error:',
      error.message
    )
  }

  const { pathname } = request.nextUrl

  // =========================
  // PUBLIC ROUTES
  // =========================
  const publicRoutes = [
    '/',
    '/login',
  ]

  const isPublicRoute =
    publicRoutes.includes(pathname)

  // =========================
  // PROTECTED ROUTES
  // =========================
  const isDashboardRoute =
    pathname.startsWith('/dashboard')

  const isTeacherRoute =
    pathname.startsWith('/teacher')

  // =========================
  // NOT LOGGED IN
  // =========================
  if (
    !user &&
    (isDashboardRoute || isTeacherRoute)
  ) {
    return NextResponse.redirect(
      new URL('/login', request.url)
    )
  }

  // =========================
  // USER EXISTS
  // =========================
  if (user) {

    const email = user.email || ''

    // =========================
    // CHECK TEACHER
    // =========================
    const isTeacher =
      email === process.env.TEACHER_EMAIL ||
      (
        email.includes('@') &&
        !email.endsWith('@system.com')
      )

    // =========================
    // CORRECT PATH
    // =========================
    const correctPath = isTeacher
      ? '/teacher'
      : '/dashboard'

    // =========================
    // REDIRECT LOGIN
    // =========================
    if (isPublicRoute) {

      return NextResponse.redirect(
        new URL(correctPath, request.url)
      )
    }

    // =========================
    // TEACHER ACCESS
    // =========================
    if (
      isTeacher &&
      isDashboardRoute
    ) {
      return NextResponse.redirect(
        new URL('/teacher', request.url)
      )
    }

    // =========================
    // STUDENT ACCESS
    // =========================
    if (
      !isTeacher &&
      isTeacherRoute
    ) {
      return NextResponse.redirect(
        new URL('/dashboard', request.url)
      )
    }
  }

  return response
}

// =========================
// MATCHER
// =========================
export const config = {
  matcher: [
    '/',
    '/login',
    '/dashboard/:path*',
    '/teacher/:path*',
  ],
}