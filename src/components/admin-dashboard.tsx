'use client'

import { useMemo, useState } from 'react'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Search, Filter, Play, X, Check, MessageSquare } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import { categoryBadgeClass, priorityBadgeClass } from '@/lib/feedback-badges'
import { AdminAnalytics } from '@/components/admin-analytics'
import { useEffect } from 'react'

type FeedbackStatus = 'pending' | 'in_progress' | 'published' | 'rejected'

type FeedbackRow = {
  id: string
  title: string
  description: string
  category: string
  priority: string
  status: FeedbackStatus
  is_anonymous: boolean
  created_at: string
  response_text?: string | null
  response_visible_public?: boolean | null
  responded_at?: string | null
  profiles?: {
    display_name?: string | null
    email?: string | null
  } | null
}

type Props = {
  feedback: FeedbackRow[]
}

const CATEGORY_OPTIONS = [
  'all',
  'academics',
  'facilities',
  'infirmary',
  'cafeteria',
  'library',
  'dormitory',
  'events',
  'transportation',
  'technology',
  'administration',
  'safety',
  'other',
] as const

const PRIORITY_OPTIONS = ['all', 'critical', 'high', 'medium', 'low'] as const

export function AdminDashboard({ feedback }: Props) {
  const [rows, setRows] = useState<FeedbackRow[]>(feedback)
  const [activeTab, setActiveTab] = useState<
    'analytics' | 'pending' | 'in_progress' | 'published' | 'rejected' | 'all'
  >('pending')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [priority, setPriority] = useState<string>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // respond dialog state
  const [responseOpen, setResponseOpen] = useState(false)
  const [responseTarget, setResponseTarget] = useState<FeedbackRow | null>(null)
  const [responseText, setResponseText] = useState('')
  const [responsePublic, setResponsePublic] = useState(true)
  const [responseSubmitting, setResponseSubmitting] = useState(false)
  const [responseError, setResponseError] = useState<string | null>(null)

  const supabase = createSupabaseBrowserClient()

  async function handleUpdateStatus(id: string, status: FeedbackStatus) {
    try {
      setUpdatingId(id)

      const { error } = await supabase
        .from('feedback')
        .update({ status })
        .eq('id', id)

      if (error) {
        console.error('Update status error:', error.message, error.details)
        return
      }

      setRows((prev) =>
        prev.map((row) => (row.id === id ? { ...row, status } : row))
      )
    } finally {
      setUpdatingId(null)
    }
  }

  // open respond dialog
  function openRespondDialog(item: FeedbackRow) {
    setResponseTarget(item)
    setResponseText(item.response_text ?? '')
    if (item.is_anonymous) {
      setResponsePublic(true) // anonymous feedback => always public
    } else {
      setResponsePublic(item.response_visible_public ?? false)
    }
    setResponseError(null)
    setResponseOpen(true)
  }

  // submit response
  async function handleSubmitResponse(e: React.FormEvent) {
  e.preventDefault()
  if (!responseTarget) return

  setResponseSubmitting(true)
  setResponseError(null)

  const hasEmail =
    !responseTarget.is_anonymous && !!responseTarget.profiles?.email

  // anonymous -> always public; non-anonymous -> use toggle
  const isPublic = responseTarget.is_anonymous ? true : responsePublic
  const now = new Date().toISOString()

  // 1) update feedback row in Supabase
  const { error } = await supabase
    .from('feedback')
    .update({
      response_text: responseText,
      response_visible_public: isPublic,
      responded_at: now,
    })
    .eq('id', responseTarget.id)

  if (error) {
    console.error('Response update error:', error.message, error.details)
    setResponseSubmitting(false)
    setResponseError(error.message || 'Could not save response.')
    return
  }

  // 2) If we have an email, open the user's email app with a pre-filled draft
  if (hasEmail && typeof window !== 'undefined') {
    const to = responseTarget.profiles?.email as string
    const subject = `Response to your feedback: ${responseTarget.title}`

    const body = `
Thank you for sending your feedback.

Title:
${responseTarget.title}

Description:
${responseTarget.description}

Our response:
${responseText}
    `.trim()

    const mailtoUrl =
      'mailto:' +
      encodeURIComponent(to) +
      '?subject=' +
      encodeURIComponent(subject) +
      '&body=' +
      encodeURIComponent(body)

    // Use location instead of window.open so it's less likely to be blocked
    console.log('mailtoUrl', mailtoUrl)

    window.location.href = mailtoUrl
  }

  setResponseSubmitting(false)

  // 3) update local state so the UI shows the new response / visibility
  setRows((prev) =>
    prev.map((row) =>
      row.id === responseTarget.id
        ? {
            ...row,
            response_text: responseText,
            response_visible_public: isPublic,
            responded_at: now,
          }
        : row
    )
  )

  setResponseOpen(false)
  setResponseTarget(null)
  setResponseText('')
}



  const counts = useMemo(() => {
    const base = { pending: 0, in_progress: 0, published: 0, rejected: 0 }
    rows.forEach((f) => {
      if (f.status in base) {
        // @ts-ignore
        base[f.status]++
      }
    })
    return base
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((f) => {
      if (activeTab !== 'all' && activeTab !== 'analytics') {
        if (f.status !== activeTab) return false
      }

      if (category !== 'all' && f.category !== category) return false
      if (priority !== 'all' && f.priority !== priority) return false

      if (search.trim()) {
        const q = search.toLowerCase()
        const author = f.is_anonymous
          ? 'anonymous'
          : f.profiles?.display_name || f.profiles?.email || ''
        return (
          f.title.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          author.toLowerCase().includes(q)
        )
      }

      return true
    })
  }, [rows, activeTab, search, category, priority])

  function formatDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-4">
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as typeof activeTab)}
      >
        <TabsList className="w-full justify-between rounded-full bg-muted px-1 py-1">
          <TabsTrigger
            value="analytics"
            className="flex-1 rounded-full data-[state=active]:bg-background"
          >
            Analytics
          </TabsTrigger>
          <TabsTrigger
            value="pending"
            className="flex-1 rounded-full data-[state=active]:bg-background"
          >
            Pending ({counts.pending})
          </TabsTrigger>
          <TabsTrigger
            value="in_progress"
            className="flex-1 rounded-full data-[state=active]:bg-background"
          >
            In Progress ({counts.in_progress})
          </TabsTrigger>
          <TabsTrigger
            value="published"
            className="flex-1 rounded-full data-[state=active]:bg-background"
          >
            Published ({counts.published})
          </TabsTrigger>
          <TabsTrigger
            value="rejected"
            className="flex-1 rounded-full data-[state=active]:bg-background"
          >
            Rejected ({counts.rejected})
          </TabsTrigger>
          <TabsTrigger
            value="all"
            className="flex-1 rounded-full data-[state=active]:bg-background"
          >
            All ({rows.length})
          </TabsTrigger>
        </TabsList>

        {/* Analytics tab placeholder */}
        <TabsContent value="analytics" className="mt-4">
          <AdminAnalytics feedback={rows} />
        </TabsContent>


        {(['pending', 'in_progress', 'published', 'rejected', 'all'] as const).map(
          (tab) => (
            <TabsContent key={tab} value={tab} className="mt-4 space-y-4">
              {/* Search + filters */}
              <Card className="rounded-3xl">
                <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex w-full items-center gap-2 md:w-1/2">
                    <div className="relative w-full">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-8"
                        placeholder="Search by title, description, or author..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex w-full flex-wrap gap-2 md:w-auto md:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Filter className="h-4 w-4" />
                      Filters
                    </Button>

                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="flex">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat === 'all'
                              ? 'All Categories'
                              : cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger className="flex">
                        <SelectValue placeholder="All Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p === 'all'
                              ? 'All Priority'
                              : p.charAt(0).toUpperCase() + p.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Feedback list */}
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No feedback found for this view.
                </p>
              ) : (
                filtered.map((item) => (
                  <Card
                    key={item.id}
                    className="rounded-3xl border border-neutral-200"
                  >
                    <CardContent className="space-y-2 py-4">
                      {/* Top row: title + meta */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-1">
                          {/* Title FIRST */}
                          <h2 className="text-lg md:text-xl font-semibold">
                            {item.title}
                          </h2>

                          {/* Badges + name + date */}
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              className={
                                'text-xs font-medium ' + categoryBadgeClass(item.category)
                              }
                            >
                              {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                            </Badge>
                            <Badge
                              className={
                                'text-xs font-medium rounded-full px-2 ' +
                                priorityBadgeClass(item.priority)
                              }
                            >
                              {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              by{' '}
                              {item.is_anonymous
                                ? 'anonymous'
                                : item.profiles?.display_name ||
                                  item.profiles?.email ||
                                  'Unknown'}{' '}
                              • {formatDate(item.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Status buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                          {/* In Progress */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={updatingId === item.id}
                            onClick={() =>
                              handleUpdateStatus(item.id, 'in_progress')
                            }
                            className={`flex items-center gap-1 rounded-xl border text-xs
                              ${
                                item.status === 'in_progress'
                                  ? 'border-sky-300 bg-sky-50 text-sky-700'
                                  : 'border-slate-200 text-sky-700 hover:bg-sky-50'
                              }`}
                          >
                            <Play className="h-3 w-3" />
                            <span>In Progress</span>
                          </Button>

                          {/* Reject */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={updatingId === item.id}
                            onClick={() =>
                              handleUpdateStatus(item.id, 'rejected')
                            }
                            className="flex items-center gap-1 rounded-xl border border-slate-200 text-xs text-red-600 hover:bg-red-50"
                          >
                            <X className="h-3 w-3" />
                            <span>Reject</span>
                          </Button>

                          {/* Accept / Publish */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={updatingId === item.id}
                            onClick={() =>
                              handleUpdateStatus(item.id, 'published')
                            }
                            className="flex items-center gap-1 rounded-xl border border-slate-200 text-xs text-emerald-600 hover:bg-emerald-50"
                          >
                            <Check className="h-3 w-3" />
                            <span>Accept</span>
                          </Button>

                          {/* Respond */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1 rounded-xl border border-slate-300 text-xs hover:bg-slate-50"
                            onClick={() => openRespondDialog(item)}
                          >
                            <MessageSquare className="h-3 w-3" />
                            <span>Respond</span>
                          </Button>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>

                      {/* Existing response preview */}
                      {item.response_text && (
                        <div className="mt-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
                          <span className="font-semibold">Response: </span>
                          {item.response_text}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          )
        )}
      </Tabs>

      {/* Respond dialog */}
      <Dialog open={responseOpen} onOpenChange={setResponseOpen}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Respond to feedback
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitResponse} className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {responseTarget?.title}
              </p>

              {responseTarget && (
                <div className="text-xs text-muted-foreground space-y-1">
                  {responseTarget.is_anonymous ? (
                    <>
                      <p>
                        Recipient:{' '}
                        <span className="font-semibold">
                          Anonymous (no email)
                        </span>
                      </p>
                      <p>
                        Your response will be posted{' '}
                        <span className="font-semibold">publicly</span> in the
                        feed because there is no email address.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        Recipient:{' '}
                        <span className="font-semibold">
                          {responseTarget.profiles?.display_name ||
                            responseTarget.profiles?.email ||
                            'Unknown'}
                        </span>
                      </p>
                      <p>
                        Via email:{' '}
                        <span className="font-mono">
                          {responseTarget.profiles?.email ?? 'No email saved'}
                        </span>
                      </p>
                      <p>
                        By default this response will be sent via email only.
                        You can also choose to make it public in the feed using
                        the toggle below.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Response</label>
              <Textarea
                rows={4}
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                required
              />
            </div>

            {!responseTarget?.is_anonymous && (
              <div className="flex items-center gap-2 pt-1">
                <Switch
                  checked={responsePublic}
                  onCheckedChange={(val: boolean) =>
                    setResponsePublic(Boolean(val))
                  }
                />
                <span className="text-xs text-muted-foreground">
                  Make this response visible in the public feed
                </span>
              </div>
            )}

            {responseError && (
              <p className="text-sm text-red-500">{responseError}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setResponseOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={responseSubmitting}>
                {responseSubmitting ? 'Sending…' : 'Send response'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
