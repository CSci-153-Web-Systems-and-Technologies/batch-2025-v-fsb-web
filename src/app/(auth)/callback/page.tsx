'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    const code = searchParams.get('code')

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
  }, [searchParams, router, supabase])

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      Signing you in…
    </div>
  )
}
