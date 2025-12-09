import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { PublicFeed, PublicFeedbackRow } from '@/components/public-feed'

export default async function HomePage() {
  const supabase = await createSupabaseServerClient()

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
        display_name
      )
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Public feed fetch error:', error.message, (error as any).details)
  }

  const feedback = (data ?? []) as PublicFeedbackRow[]

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Feedback feed</h1>
        <p className="text-sm text-muted-foreground">
          Published feedback from students, with reactions and admin responses.
        </p>
      </header>

      <PublicFeed initialFeedback={feedback} />
    </div>
  )
}