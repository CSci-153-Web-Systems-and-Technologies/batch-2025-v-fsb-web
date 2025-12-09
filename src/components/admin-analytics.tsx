"use client"

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import { CATEGORY_HEX, PRIORITY_HEX } from '@/lib/feedback-badges'

type FeedbackForAnalytics = {
  id: string
  title: string
  status: 'pending' | 'in_progress' | 'published' | 'rejected'
  is_anonymous: boolean
  category: string
  priority: string
  created_at: string
  response_text?: string | null
  profiles?: {
    display_name?: string | null
  } | null
}

type AdminAnalyticsProps = {
  feedback: FeedbackForAnalytics[]
}

// NOTE: color maps are now imported from the central `feedback-badges` helper

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function AdminAnalytics({ feedback }: AdminAnalyticsProps) {
  const analytics = useMemo(() => {
    const rows = feedback
    const total = rows.length

    let pending = 0
    let in_progress = 0
    let published = 0
    let rejected = 0
    let responded = 0
    let anonymous = 0

    const categoryCounts: Record<string, number> = {}
    const priorityCounts: Record<string, number> = {}

    for (const f of rows) {
      if (f.status === 'pending') pending++
      else if (f.status === 'in_progress') in_progress++
      else if (f.status === 'published') published++
      else if (f.status === 'rejected') rejected++

      if (f.response_text) responded++
      if (f.is_anonymous) anonymous++

      categoryCounts[f.category] = (categoryCounts[f.category] ?? 0) + 1
      priorityCounts[f.priority] = (priorityCounts[f.priority] ?? 0) + 1
    }

    const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0
    const anonymousRate = total > 0 ? Math.round((anonymous / total) * 100) : 0

    // category pie data
    const categoryData = Object.entries(categoryCounts).map(
      ([key, value]) => ({
        key,
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value,
      })
    )

    // priority distribution list
    const maxPriorityCount = Object.values(priorityCounts).reduce(
      (max, n) => (n > max ? n : max),
      0
    )

    // submission trends: last 6 months
    const now = new Date()
    const monthKeys: string[] = []
    const monthLabels: string[] = []
    const monthCounts: Record<string, number> = {}

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now)
      d.setMonth(d.getMonth() - i)
      d.setDate(1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        '0'
      )}`
      monthKeys.push(key)
      monthLabels.push(
        d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
      )
      monthCounts[key] = 0
    }

    for (const f of rows) {
      const d = new Date(f.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        '0'
      )}`
      if (key in monthCounts) {
        monthCounts[key]++
      }
    }

    const trendsData = monthKeys.map((key, idx) => ({
      key,
      label: monthLabels[idx],
      value: monthCounts[key],
    }))

    const maxTrend = trendsData.reduce(
      (max, d) => (d.value > max ? d.value : max),
      0
    )

    // recent activity (latest 5 submissions)
    const recent = [...rows]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 5)

    return {
      total,
      pending,
      in_progress,
      published,
      rejected,
      responded,
      responseRate,
      anonymous,
      anonymousRate,
      categoryData,
      priorityCounts,
      maxPriorityCount,
      trendsData,
      maxTrend,
      recent,
    }
  }, [feedback])

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-3xl">
          <CardContent className="py-4">
            <p className="text-xs font-medium text-muted-foreground">
              Total submissions
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {analytics.total}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Published: {analytics.published} • Pending:{' '}
              {analytics.pending}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardContent className="py-4">
            <p className="text-xs font-medium text-muted-foreground">
              Response rate
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {analytics.responseRate}%
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {analytics.responded} responded out of {analytics.total}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardContent className="py-4">
            <p className="text-xs font-medium text-muted-foreground">
              Anonymous submissions
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {analytics.anonymousRate}%
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {analytics.anonymous} anonymous out of {analytics.total}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardContent className="py-4">
            <p className="text-xs font-medium text-muted-foreground">
              Status breakdown
            </p>
            <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
              <p>In progress: {analytics.in_progress}</p>
              <p>Published: {analytics.published}</p>
              <p>Rejected: {analytics.rejected}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row: category + priorities */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Category pie chart */}
        <Card className="rounded-3xl">
          <CardContent className="py-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Feedback by category
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Distribution of submissions across areas
                </p>
              </div>
            </div>

            {analytics.categoryData.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No data yet.
              </p>
            ) : (
              <div className="flex gap-4">
                <div className="h-40 w-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.categoryData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={26}
                        outerRadius={40}
                        paddingAngle={2}
                      >
                        {analytics.categoryData.map((entry, index) => {
                          const hex = CATEGORY_HEX[entry.key.toLowerCase()] ?? '#9CA3AF'
                          return <Cell key={index} fill={hex} />
                        })}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex-1 space-y-1 text-[11px] text-muted-foreground">
                  {analytics.categoryData.map((entry) => {
                    const hex = CATEGORY_HEX[entry.key.toLowerCase()] ?? '#9CA3AF'
                    const percent = analytics.total
                      ? ((entry.value / analytics.total) * 100).toFixed(1)
                      : '0'
                    return (
                      <div
                        key={entry.key}
                        className="flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: hex }}
                          />
                          <span>{entry.name}</span>
                        </div>
                        <span>
                          {percent}% ({entry.value})
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Priority distribution (horizontal bars, not chart lib) */}
        <Card className="rounded-3xl">
          <CardContent className="py-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              Priority distribution
            </p>
            <p className="text-[11px] text-muted-foreground">
              Urgency levels of submitted feedback
            </p>

            {Object.keys(analytics.priorityCounts).length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No data yet.
              </p>
            ) : (
              Object.entries(analytics.priorityCounts)
                .sort((a, b) => {
                  const order = ['critical', 'high', 'medium', 'low']
                  return (
                    order.indexOf(a[0].toLowerCase()) -
                    order.indexOf(b[0].toLowerCase())
                  )
                })
                .map(([priority, count]) => {
                  const label =
                    priority.charAt(0).toUpperCase() +
                    priority.slice(1)
                  const percent =
                    analytics.maxPriorityCount > 0
                      ? (count / analytics.maxPriorityCount) * 100
                      : 0
                  const color = PRIORITY_HEX[priority.toLowerCase()] ?? '#9CA3AF'

                  return (
                    <div key={priority} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{label}</span>
                        <span>{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  )
                })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: trends (bar chart) + recent activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Submission trends bar chart */}
        <Card className="rounded-3xl">
          <CardContent className="py-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              Submission trends
            </p>
            <p className="text-[11px] text-muted-foreground">
              Monthly feedback over the last 6 months
            </p>

            {analytics.trendsData.every((d) => d.value === 0) ? (
              <p className="text-xs text-muted-foreground">
                No submissions in the last 6 months.
              </p>
            ) : (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.trendsData}>
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(148,163,184,0.2)' }}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="value" fill="#1AAE5C" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent activity list */}
        <Card className="rounded-3xl">
          <CardContent className="py-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              Recent activity
            </p>
            <p className="text-[11px] text-muted-foreground">
              Latest submissions and status
            </p>

            {analytics.recent.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No recent submissions.
              </p>
            ) : (
              <div className="space-y-2">
                {analytics.recent.map((f) => {
                  const name = f.is_anonymous
                    ? 'Anonymous'
                    : f.profiles?.display_name || 'Unknown'

                  const statusLabel =
                    f.status === 'in_progress'
                      ? 'In progress'
                      : f.status.charAt(0).toUpperCase() +
                        f.status.slice(1)

                  const statusColor =
                    f.status === 'pending'
                      ? 'bg-slate-200 text-slate-700'
                      : f.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-700'
                      : f.status === 'published'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'

                  return (
                    <div
                      key={f.id}
                      className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">
                          {f.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {name} • {formatDate(f.created_at)}
                        </p>
                      </div>
                      <span
                        className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor}`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
