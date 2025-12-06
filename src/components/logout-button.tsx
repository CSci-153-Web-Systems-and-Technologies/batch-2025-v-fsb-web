'use client'

import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const supabase = createSupabaseBrowserClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <Button variant="outline" size="sm" onClick={handleLogout}>
      Logout
    </Button>
  )
}