'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    // use URLSearchParams from window.location to avoid CSR bailout during
    // Next.js prerender. This keeps the component client-only without
    // relying on `useSearchParams` which can trigger a CSR bailout.
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')

    if (!code) {
      router.replace('/login')
      return
    }

    const exchange = async () => {
      try {
        await supabase.auth.exchangeCodeForSession(code)
        router.replace('/') // or '/dashboard'
      } catch (err) {
        console.error('Error exchanging code', err)
        router.replace('/login')
      }
    }

    exchange()
  // router and supabase are stable in this usage; omit search params from deps
  }, [router, supabase])

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      Signing you in…
    </div>
  )
}
