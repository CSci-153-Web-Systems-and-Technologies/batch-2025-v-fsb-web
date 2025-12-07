'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { PlusCircle } from 'lucide-react'

const CATEGORY_OPTIONS = [
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

const PRIORITY_OPTIONS = ['critical', 'high', 'medium', 'low'] as const

export function SubmitFeedbackDialog() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string | undefined>()
  const [priority, setPriority] = useState<string | undefined>('low')
  const [anonymous, setAnonymous] = useState(false)
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createSupabaseBrowserClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!category || !priority) {
      setError('Please select a category and priority.')
      return
    }

    setSubmitting(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setSubmitting(false)
      setError('You must be logged in to submit feedback.')
      return
    }

    // derive display name from auth metadata or email
    const fromMetadata =
      (user.user_metadata &&
        (user.user_metadata.full_name || user.user_metadata.name)) ||
      null
    const fromEmail = user.email ? user.email.split('@')[0] : null
    const displayName = fromMetadata || fromEmail

    const profilePayload: any = {
      id: user.id,
      email: user.email,
    }
    if (displayName) {
      profilePayload.display_name = displayName
    }

    const { error: profileError } = await supabase.from('profiles').upsert(
      profilePayload,
      { onConflict: 'id' }
    )

    if (profileError) {
      console.error(
        'Profile upsert error:',
        profileError.message,
        profileError.details
      )
      setSubmitting(false)
      setError('Could not create profile. Please try again.')
      return
    }

    const { error: insertError } = await supabase.from('feedback').insert({
      user_id: user.id,
      title,
      description,
      category,
      priority,
      is_anonymous: anonymous,
      // don’t store contact email when anonymous
      contact_email: anonymous ? null : email || null,
    })

    setSubmitting(false)

    if (insertError) {
      console.error('Insert error:', insertError.message, insertError.details)
      setError(insertError.message || 'Something went wrong. Please try again.')
      return
    }

    // reset + close
    setTitle('')
    setDescription('')
    setCategory(undefined)
    setPriority('low')
    setAnonymous(false)
    setEmail('')
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Trigger: round + icon */}
      <DialogTrigger asChild>
        <button
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow hover:opacity-90 transition"
          aria-label="Submit feedback"
        >
          <PlusCircle className="h-5 w-5" />
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl rounded-3xl px-8 py-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Submit Feedback
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Title */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Title</label>
            <Input
              placeholder=""
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* Category + Priority (two columns) */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Priority</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Anonymous toggle */}
          <div className="flex items-center gap-2 pt-1">
            <Switch
              checked={anonymous}
              onCheckedChange={(val: boolean) => setAnonymous(Boolean(val))}
            />
            <span className="text-sm">anonymous</span>
          </div>

          {/* Email only (no manual name) */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Email (Optional)</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={anonymous}
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full bg-black text-white hover:bg-black/90"
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
