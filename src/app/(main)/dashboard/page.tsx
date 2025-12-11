import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { AdminDashboard } from '@/components/admin-dashboard'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()

  // 1) Require logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2) Check role from profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = (profile?.role as 'admin' | 'user' | undefined) ?? 'user'

  // If not admin (or profile lookup failed), kick them back to home
  if (profileError || role !== 'admin') {
    redirect('/')
  }

  // 3) Normal dashboard data fetch (unchanged)
  const { data, error } = await supabase
    .from('feedback')
    .select(`
      id,
      title,
      description,
      category,
      priority,
      status,
      is_anonymous,
      created_at,
      response_text,
      response_visible_public,
      responded_at,
      profiles:profiles!feedback_user_id_fkey (
        display_name,
        email
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.log(
      'Dashboard fetch error:',
      error.message,
      // @ts-ignore
      error.details
    )
  }

  return <AdminDashboard feedback={(data as any[]) ?? []} />
}