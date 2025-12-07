'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export default function SettingsPage() {
  const supabase = createSupabaseBrowserClient()

  const [loadingProfile, setLoadingProfile] = useState(true)
  const [displayName, setDisplayName] = useState('')
  const [profileMessage, setProfileMessage] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)

  // load current profile name
  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setLoadingProfile(false)
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()

      if (data?.display_name) {
        setDisplayName(data.display_name)
      }
      setLoadingProfile(false)
    }

    loadProfile()
  }, [supabase])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileMessage(null)
    setSavingProfile(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setProfileMessage('You must be logged in.')
      setSavingProfile(false)
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName || null })
      .eq('id', user.id)

    setSavingProfile(false)

    if (error) {
      console.error(error)
      setProfileMessage('Could not update profile. Please try again.')
      return
    }

    setProfileMessage('Profile updated.')
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordMessage(null)

    if (!newPassword || newPassword.length < 6) {
      setPasswordMessage('Password must be at least 6 characters.')
      return
    }

    setSavingPassword(true)

    // Supabase only needs the new password here
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    setSavingPassword(false)

    if (error) {
      console.error(error)
      setPasswordMessage(error.message || 'Could not update password.')
      return
    }

    setCurrentPassword('')
    setNewPassword('')
    setPasswordMessage('Password updated.')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Account settings</h1>

      {/* Profile card */}
      <Card className="rounded-3xl">
        <CardContent className="space-y-4 py-6">
          <h2 className="text-base font-semibold">Profile</h2>

          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
            <div className="space-y-1">
              <Label htmlFor="display_name">Display name</Label>
              <Input
                id="display_name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loadingProfile || savingProfile}
              />
            </div>

            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? 'Saving…' : 'Save profile'}
            </Button>

            {profileMessage && (
              <p className="text-sm text-muted-foreground">{profileMessage}</p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Password card */}
      <Card className="rounded-3xl max-w-md">
        <CardContent className="space-y-4 py-6">
          <h2 className="text-base font-semibold">Password</h2>

          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* keep current password field for UX, even though Supabase
                doesn't actually use it in this simple update flow */}
            <div className="space-y-1">
              <Label htmlFor="current_password">Current password</Label>
              <Input
                id="current_password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="new_password">New password</Label>
              <Input
                id="new_password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" disabled={savingPassword}>
              {savingPassword ? 'Updating…' : 'Update password'}
            </Button>

            {passwordMessage && (
              <p className="text-sm text-muted-foreground">
                {passwordMessage}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
