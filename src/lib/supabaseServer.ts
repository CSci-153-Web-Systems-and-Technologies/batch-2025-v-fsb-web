import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/auth-helpers-nextjs'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // 🔹 READ-ONLY: allowed in Server Components
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        // no set/remove here – those are only allowed in Server Actions / Route Handlers
      },
    }
  )
}