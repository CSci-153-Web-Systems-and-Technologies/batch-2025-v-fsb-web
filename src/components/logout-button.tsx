// src/components/logout-button.tsx
'use client'

import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export function LogoutButton() {
  const supabase = createSupabaseBrowserClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleLogout}
      aria-label="Logout"
    >
      <LogOut className="h-5 w-5" />
    </Button>
  )
}
