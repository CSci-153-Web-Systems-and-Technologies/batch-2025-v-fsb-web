// src/lib/supabaseServer.ts
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // called by Supabase to read cookies
        getAll() {
          return cookieStore.getAll()
        },
        // called by Supabase to write/refresh cookies
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // In Server Components, cookies are read-only.
            // It's okay to ignore setAll here as long as you
            // refresh sessions via middleware or route handlers.
          }
        },
      },
    }
  )
}
