// src/app/(main)/layout.tsx
import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { Sidebar } from '@/components/sidebar'

export default async function MainLayout({ children }: { children: ReactNode }) {
  const supabase =await createSupabaseServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen">
      <Sidebar />

      {/* content starts after the *collapsed* sidebar width (w-16) */}
      <main className="ml-16">
        {/* centered container so left/right space feels even */}
        <div className="mx-auto w-full max-w-5xl px-6 md:px-10 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
