import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react'

type PublicFeedbackRow = {
  id: string
  title: string
  description: string
  category: string
  priority: string
  status: 'pending' | 'in_progress' | 'published' | 'rejected'
  is_anonymous: boolean
  created_at: string
  response_text?: string | null
  response_visible_public?: boolean | null
  responded_at?: string | null
  profiles?: {
    display_name?: string | null
  } | null
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  })
}

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
    console.error('Public feed fetch error:', error.message, error.details)
  }

  const feedback = (data ?? []) as PublicFeedbackRow[]

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Feedback feed</h1>
        <p className="text-sm text-muted-foreground">
          Published feedback from students, plus admin responses.
        </p>
      </header>

      {feedback.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No published feedback yet.
        </p>
      ) : (
        <div className="space-y-3">
          {feedback.map((item) => (
            <Card
              key={item.id}
              className="rounded-[24px] border border-neutral-200"
            >
              <CardContent className="py-4 px-5 space-y-3">
                {/* Top row: name + label, date underneath */}
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {item.is_anonymous
                        ? 'Anonymous'
                        : item.profiles?.display_name || 'Unknown'}
                    </span>
                    <Badge className="rounded-full bg-[#F35A4A] px-3 py-1 text-[11px] font-medium text-white">
                      {item.category.charAt(0).toUpperCase() +
                        item.category.slice(1)}
                    </Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {formatDate(item.created_at)}
                  </span>
                </div>

                {/* Title */}
                <p className="text-sm font-semibold">{item.title}</p>

                {/* Description */}
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>

                {/* Admin response (public only) */}
                {item.response_visible_public && item.response_text && (
                  <div className="mt-1 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Admin response
                      {item.responded_at && (
                        <span className="ml-1 font-normal text-[10px]">
                          · {formatDate(item.responded_at)}
                        </span>
                      )}
                    </p>
                    <p>{item.response_text}</p>
                  </div>
                )}

                {/* Reactions row (UI only for now) */}
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white"
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white"
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-black text-black"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}