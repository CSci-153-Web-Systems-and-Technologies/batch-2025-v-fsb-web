import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { Sidebar } from '@/components/sidebar'

export default async function MainLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      
      <main className="ml-10 px-8 py-6">
        {children}
      </main>
    </div>
  )
}