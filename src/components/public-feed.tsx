'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react'
import { categoryBadgeClass, priorityBadgeClass } from '@/lib/feedback-badges'


export type PublicFeedbackRow = {
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

type ReactionState = {
  likes: number
  dislikes: number
  userReaction: 'like' | 'dislike' | null
}

type CommentRow = {
  id: string
  content: string
  created_at: string
}

type Props = {
  initialFeedback: PublicFeedbackRow[]
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  })
}

export function PublicFeed({ initialFeedback }: Props) {
  const supabase = createSupabaseBrowserClient()

  const [feedback] = useState(initialFeedback)
  const [userId, setUserId] = useState<string | null>(null)

  const [reactions, setReactions] = useState<Record<string, ReactionState>>({})
  const [commentsByFeedback, setCommentsByFeedback] = useState<
    Record<string, CommentRow[]>
  >({})
  const [commentFor, setCommentFor] = useState<PublicFeedbackRow | null>(null)
  const [commentText, setCommentText] = useState('')
  const [loadingCommentsFor, setLoadingCommentsFor] = useState<string | null>(
    null
  )
  const [submittingComment, setSubmittingComment] = useState(false)
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})

  // Load current user + reaction counts
  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return
      setUserId(user.id)

      if (!feedback.length) return

      const ids = feedback.map((f) => f.id)

      const { data: reactionRows, error } = await supabase
        .from('feedback_reactions')
        .select('feedback_id, user_id, reaction')
        .in('feedback_id', ids)

      if (error || !reactionRows) {
        if (error) {
          console.error(
            'Reaction fetch error:',
            error.message,
            (error as any).details
          )
        }
        // still ensure defaults
        const emptyMap: Record<string, ReactionState> = {}
        ids.forEach((id) => {
          emptyMap[id] = { likes: 0, dislikes: 0, userReaction: null }
        })
        setReactions(emptyMap)
        return
      }

      const map: Record<string, ReactionState> = {}

      for (const row of reactionRows as any[]) {
        const fid = row.feedback_id as string
        const reaction = row.reaction as 'like' | 'dislike'

        if (!map[fid]) {
          map[fid] = { likes: 0, dislikes: 0, userReaction: null }
        }

        if (reaction === 'like') map[fid].likes++
        else map[fid].dislikes++

        if (row.user_id === user.id) {
          map[fid].userReaction = reaction
        }
      }

      // ensure all feedback IDs exist in the map
      ids.forEach((id) => {
        if (!map[id]) {
          map[id] = { likes: 0, dislikes: 0, userReaction: null }
        }
      })

      setReactions(map)
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback.length])

  // Load comment counts for each feedback item using a grouped/count RPC for efficiency.
  // Expects a Postgres function `feedback_comment_counts(feedback_ids uuid[])` that
  // returns rows: { feedback_id uuid, count bigint }
  useEffect(() => {
    const loadCounts = async () => {
      if (!feedback.length) return

      const ids = feedback.map((f) => f.id)

      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'feedback_comment_counts',
          { feedback_ids: ids }
        )

        if (rpcError || !rpcData) {
          // If RPC missing or failed, fallback to client-side grouped fetch
          console.warn('RPC feedback_comment_counts unavailable, falling back', rpcError?.message)

          const { data: rows, error } = await supabase
            .from('feedback_comments')
            .select('feedback_id')
            .in('feedback_id', ids)

          if (error) {
            console.error('Comments count fetch error:', error.message)
            const empty: Record<string, number> = {}
            ids.forEach((id) => (empty[id] = 0))
            setCommentCounts(empty)
            return
          }

          const map: Record<string, number> = {}
          ids.forEach((id) => (map[id] = 0))

          for (const row of (rows ?? []) as any[]) {
            const fid = row.feedback_id as string
            map[fid] = (map[fid] || 0) + 1
          }

          setCommentCounts(map)
          return
        }

        const map: Record<string, number> = {}
        ids.forEach((id) => (map[id] = 0))

        for (const row of (rpcData ?? []) as any[]) {
          const fid = row.feedback_id as string
          const cnt = Number(row.count ?? 0)
          map[fid] = cnt
        }

        setCommentCounts(map)
      } catch (err) {
        console.error('Unexpected error fetching comment counts:', err)
        const empty: Record<string, number> = {}
        feedback.forEach((f) => (empty[f.id] = 0))
        setCommentCounts(empty)
      }
    }

    loadCounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback.length])

  const handleReaction = async (
    feedbackId: string,
    type: 'like' | 'dislike'
  ) => {
    if (!userId) return

    const current =
      reactions[feedbackId] || ({
        likes: 0,
        dislikes: 0,
        userReaction: null,
      } as ReactionState)

    const previous = current.userReaction
    const next = previous === type ? null : type

    let likes = current.likes
    let dislikes = current.dislikes

    if (previous === 'like') likes--
    if (previous === 'dislike') dislikes--

    if (next === 'like') likes++
    if (next === 'dislike') dislikes++

    // optimistic UI
    setReactions((prev) => ({
      ...prev,
      [feedbackId]: { likes, dislikes, userReaction: next },
    }))

    if (next === null) {
      const { error } = await supabase
        .from('feedback_reactions')
        .delete()
        .match({ feedback_id: feedbackId, user_id: userId })

      if (error) {
        console.error(
          'Remove reaction error:',
          error.message,
          (error as any).details
        )
      }
    } else {
      const { error } = await supabase.from('feedback_reactions').upsert(
        {
          feedback_id: feedbackId,
          user_id: userId,
          reaction: type,
        },
        { onConflict: 'feedback_id,user_id' }
      )

      if (error) {
        console.error(
          'Upsert reaction error:',
          error.message,
          (error as any).details
        )
      }
    }
  }

  const openComments = async (item: PublicFeedbackRow) => {
    setCommentFor(item)

    if (commentsByFeedback[item.id]) return // already loaded

    setLoadingCommentsFor(item.id)
    const { data, error } = await supabase
      .from('feedback_comments')
      .select('id, content, created_at')
      .eq('feedback_id', item.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error(
        'Comments fetch error:',
        error.message,
        (error as any).details
      )
    }

    setCommentsByFeedback((prev) => ({
      ...prev,
      [item.id]: (data ?? []) as CommentRow[],
    }))
    setLoadingCommentsFor(null)
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentFor || !userId || !commentText.trim()) return

    setSubmittingComment(true)

    const { data, error } = await supabase
      .from('feedback_comments')
      .insert({
        feedback_id: commentFor.id,
        user_id: userId,
        content: commentText.trim(),
      })
      .select('id, content, created_at')
      .single()

    setSubmittingComment(false)

    if (error) {
      console.error(
        'Insert comment error:',
        error.message,
        (error as any).details
      )
      return
    }

    const newComment = data as CommentRow

    setCommentsByFeedback((prev) => ({
      ...prev,
      [commentFor.id]: [...(prev[commentFor.id] ?? []), newComment],
    }))

    // increment comment count optimistically
    setCommentCounts((prev) => ({
      ...prev,
      [commentFor.id]: (prev[commentFor.id] || 0) + 1,
    }))

    setCommentText('')
  }

  return (
    <>
      <div className="space-y-2">
        {feedback.map((item, idx) => {
          const reactionState =
            reactions[item.id] ??
            ({ likes: 0, dislikes: 0, userReaction: null } as ReactionState)

          const likeActive = reactionState.userReaction === 'like'
          const dislikeActive = reactionState.userReaction === 'dislike'

          return (
            <Card
              key={item.id}
              className="rounded-[24px] border border-neutral-200"
            >
              <CardContent
                className={
                  idx === 0 ? 'py-2 px-5 space-y-2' : 'py-3 px-5 space-y-2'
                }
              >
                {/* Top row: title + category, name + date underneath */}
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <Badge
                        className={
                            'rounded-full px-3 py-1 text-[11px] font-medium ' +
                            categoryBadgeClass(item.category)
                        }
                        >
                        {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                    </Badge>

                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {item.is_anonymous
                        ? 'Anonymous'
                        : item.profiles?.display_name || 'Unknown'}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      · {formatDate(item.created_at)}
                    </span>
                  </div>
                </div>

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

                {/* Reactions row (pill style: icon + count, and comments text) */}
                <div className="mt-2 flex items-center gap-4">
                  {/* Like pill */}
                  <button
                    type="button"
                    onClick={() => handleReaction(item.id, 'like')}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1 text-sm font-medium transition-all duration-150 shadow-sm ${
                      likeActive
                        ? 'bg-emerald-500 text-white border border-emerald-500 hover:bg-emerald-600'
                        : 'bg-white text-emerald-700 border border-neutral-200 hover:bg-emerald-50'
                    }`}
                    aria-pressed={likeActive}
                    aria-label={likeActive ? 'Unlike' : 'Like'}
                  >
                    <ThumbsUp className="h-4 w-4" />
                    <span className="text-xs">
                      {reactionState.likes || ''}
                    </span>
                  </button>

                  {/* Dislike pill */}
                  <button
                    type="button"
                    onClick={() => handleReaction(item.id, 'dislike')}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1 text-sm font-medium transition-all duration-150 shadow-sm ${
                      dislikeActive
                        ? 'bg-red-500 text-white border border-red-500 hover:bg-red-600'
                        : 'bg-white text-red-700 border border-neutral-200 hover:bg-red-50'
                    }`}
                    aria-pressed={dislikeActive}
                    aria-label={dislikeActive ? 'Remove dislike' : 'Dislike'}
                  >
                    <ThumbsDown className="h-4 w-4" />
                    <span className="text-xs">
                      {reactionState.dislikes || ''}
                    </span>
                  </button>

                  {/* Comments: small icon box + text */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openComments(item)}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 text-black transition-all duration-150 hover:bg-slate-100"
                      aria-label="Open comments"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openComments(item)}
                      className="text-xs text-muted-foreground"
                    >
                      {(commentCounts[item.id] || 0) > 0
                        ? `${commentCounts[item.id]} comment${commentCounts[item.id] === 1 ? '' : 's'}`
                        : '0 comments'}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Comments dialog */}
      <Dialog
        open={!!commentFor}
        onOpenChange={(open) => {
          if (!open) {
            setCommentFor(null)
            setCommentText('')
          }
        }}
      >
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Comments
            </DialogTitle>
            <DialogDescription>
              Share your thoughts about this feedback.
            </DialogDescription>
          </DialogHeader>

          {commentFor && (
            <div className="space-y-3">
              <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
                <p className="text-[11px] font-semibold mb-1">
                  {commentFor.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {commentFor.description}
                </p>
              </div>

              <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-slate-100 p-2 text-xs">
                {loadingCommentsFor === commentFor.id ? (
                  <p className="text-muted-foreground">Loading comments…</p>
                ) : (commentsByFeedback[commentFor.id] ?? []).length === 0 ? (
                  <p className="text-muted-foreground">
                    No comments yet. Be the first to comment.
                  </p>
                ) : (
                  (commentsByFeedback[commentFor.id] ?? []).map((c) => (
                    <div key={c.id} className="space-y-0.5">
                      <p>{c.content}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDate(c.created_at)}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSubmitComment} className="space-y-2">
                <Textarea
                  rows={3}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment…"
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCommentFor(null)
                      setCommentText('')
                    }}
                  >
                    Close
                  </Button>
                  <Button type="submit" disabled={submittingComment}>
                    {submittingComment ? 'Posting…' : 'Post comment'}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
