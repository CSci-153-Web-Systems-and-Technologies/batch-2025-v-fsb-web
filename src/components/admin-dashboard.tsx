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
import { Search, Filter, Play, X, Check, MessageSquare } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'

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
          <Card className="rounded-3xl">
            <CardContent className="py-6">
              <p className="text-sm text-muted-foreground">
                Analytics charts coming soon.
              </p>
            </CardContent>
          </Card>
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
                            <Badge className="bg-emerald-500/90 text-xs font-medium text-white">
                              {item.category.charAt(0).toUpperCase() +
                                item.category.slice(1)}
                            </Badge>
                            <Badge className="bg-lime-500/90 text-xs font-medium text-white">
                              {item.priority.charAt(0).toUpperCase() +
                                item.priority.slice(1)}
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
                            onClick={() => handleUpdateStatus(item.id, 'in_progress')}
                            className={`flex items-center gap-1 rounded-xl border text-xs
                              ${item.status === 'in_progress'
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
                            onClick={() => handleUpdateStatus(item.id, 'rejected')}
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
                            onClick={() => handleUpdateStatus(item.id, 'published')}
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
                            // onClick={() => openRespondDialog(item)}
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
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          )
        )}
      </Tabs>
    </div>
  )
}
