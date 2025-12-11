'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Home, BarChart3, Settings } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { LogoutButton } from '@/components/logout-button'

const SubmitFeedbackDialog = dynamic(
  () =>
    import('@/components/submit-feedback-dialog').then(
      (m) => m.SubmitFeedbackDialog
    ),
  { ssr: false }
)

type Role = 'admin' | 'user'

function getInitials(name?: string | null) {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  const letters = parts.slice(0, 2).map((p) => p[0]).join('')
  return letters.toUpperCase() || 'U'
}

export function Sidebar() {
  const pathname = usePathname()
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [loadingRole, setLoadingRole] = useState(true)

  // hover / profile menu for expansion
  const [hovered, setHovered] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const expanded = hovered || profileMenuOpen

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setLoadingRole(false)
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, email, role')
        .eq('id', user.id)
        .single()

      if (!error && data) {
        setDisplayName(
          data.display_name || data.email?.split('@')[0] || 'Account'
        )
        setEmail(data.email ?? null)
        setRole((data.role as Role | undefined) ?? 'user')
      } else {
        setRole('user')
      }

      setLoadingRole(false)
    }

    load()
  }, [])

  const isAdmin = role === 'admin'

  return (
    <aside
      className={`
        fixed left-0 top-0 z-40
        h-screen
        border-r bg-background
        flex flex-col justify-between
        transition-[width] duration-200
        ${expanded ? 'w-55' : 'w-16'}
      `}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
      }}
    >
      {/* Top section */}
      <div className="space-y-6 px-2 pt-4">
        {/* Logo / title */}
        <div className="flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center">
            <Image
              src="/v-fsb_icon.svg"
              alt="V-FSB logo"
              width={28}
              height={28}
              priority
            />
          </div>
          {expanded && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight">
                Viscan
              </span>
              <span className="text-[10px] text-muted-foreground">
                Feedback &amp; Suggestion Box
              </span>
            </div>
          )}
        </div>

        {/* Main nav links */}
        <nav className="mt-4 flex flex-col gap-1">
          {/* Home – everyone */}
          <Link
            href="/"
            className={`
              flex items-center gap-3 rounded-md px-2 py-2 text-sm
              transition-colors
              ${
                pathname === '/'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }
            `}
            title={!expanded ? 'Home' : undefined}
          >
            <Home className="h-5 w-5 shrink-0" />
            {expanded && <span className="truncate">Home</span>}
          </Link>

          {/* Admin-only: Dashboard (after Home for admins) */}
          {!loadingRole && isAdmin && (
            <Link
              href="/dashboard"
              className={`
                flex items-center gap-3 rounded-md px-2 py-2 text-sm
                transition-colors
                ${
                  pathname === '/dashboard'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }
              `}
              title={!expanded ? 'Dashboard' : undefined}
            >
              <BarChart3 className="h-5 w-5 shrink-0" />
              {expanded && <span className="truncate">Dashboard</span>}
            </Link>
          )}

          {/* User-only: Submit Feedback – between Home and Account */}
          {!loadingRole && !isAdmin && (
            <div
              className={`
                flex items-center gap-3 rounded-md px-2 py-2 text-sm
                text-muted-foreground hover:bg-accent hover:text-accent-foreground
              `}
              title={!expanded ? 'Submit Feedback' : undefined}
            >
              <SubmitFeedbackDialog />
              {expanded && (
                <span className="truncate">Submit Feedback</span>
              )}
            </div>
          )}

          {/* Account – everyone */}
          <Link
            href="/settings"
            className={`
              flex items-center gap-3 rounded-md px-2 py-2 text-sm
              transition-colors
              ${
                pathname === '/settings'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }
            `}
            title={!expanded ? 'Account' : undefined}
          >
            <Settings className="h-5 w-5 shrink-0" />
            {expanded && <span className="truncate">Account</span>}
          </Link>
        </nav>
      </div>

      {/* Bottom: profile row with bubble menu */}
      <div className="px-2 pb-4">
        <DropdownMenu
          open={profileMenuOpen}
          onOpenChange={(open) => {
            setProfileMenuOpen(open)
          }}
        >
          <DropdownMenuTrigger asChild>
            <button
              suppressHydrationWarning
              className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              title={!expanded ? 'Account' : undefined}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              {expanded && (
                <div className="flex flex-col text-left min-w-0">
                  <span className="truncate text-sm font-medium">
                    {displayName ?? 'Account'}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {email ?? 'Account menu'}
                  </span>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="right"
            align="end"
            sideOffset={8}
            className="w-52 rounded-2xl"
          >
            <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
            <div className="flex items-center gap-2 px-2 pb-2 pt-1">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">
                  {displayName ?? 'Account'}
                </span>
                {email && (
                  <span className="truncate text-xs text-muted-foreground">
                    {email}
                  </span>
                )}
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <LogoutButton />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}