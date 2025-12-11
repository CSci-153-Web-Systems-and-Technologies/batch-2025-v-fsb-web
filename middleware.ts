import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Paths we care about:
  const isDashboard = pathname.startsWith('/dashboard')
  const isSubmitFeedback = pathname.startsWith('/feedback')
  const isAuthPage = pathname === '/login' || pathname === '/signup'

  // If it's not one of those, just continue
  if (!isDashboard && !isSubmitFeedback && !isAuthPage) {
    return NextResponse.next()
  }

  // Prepare response we might mutate cookies on
  const res = NextResponse.next()

  // Supabase client for middleware using getAll/setAll cookies API
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return req.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          res.cookies.set(name, value, options)
        }
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let role: 'admin' | 'user' | null = null

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    role = (profile?.role as 'admin' | 'user' | undefined) ?? 'user'
  }

  // --- Auth rules ---

  // 1) Not logged in but trying to access dashboard or feedback pages
  if (!user && (isDashboard || isSubmitFeedback)) {
    const url = new URL('/login', req.url)
    return NextResponse.redirect(url)
  }

  // 2) Logged in user trying to visit /login or /signup → send home
  if (user && isAuthPage) {
    const url = new URL('/', req.url)
    return NextResponse.redirect(url)
  }

  // 3) Logged-in, non-admin user trying to access /dashboard → send home
  if (user && role !== 'admin' && isDashboard) {
    const url = new URL('/', req.url)
    return NextResponse.redirect(url)
  }

  // 4) Logged-in admin trying to access /feedback/* (submit pages) → send home
  if (user && role === 'admin' && isSubmitFeedback) {
    const url = new URL('/', req.url)
    return NextResponse.redirect(url)
  }

  // Otherwise, allow through (with updated cookies if needed)
  return res
}

// Only run middleware on these paths
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/feedback/:path*',
    '/login',
    '/signup',
  ],
}