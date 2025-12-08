import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { AdminDashboard } from '@/components/admin-dashboard'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
  .from('feedback')
  .select(
    `
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
    profiles:profiles (
      display_name,
      email
    )
  `
  )
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
