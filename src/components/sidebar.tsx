'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/settings', label: 'Account', icon: Settings },
]

function getInitials(name?: string | null) {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  const letters = parts.slice(0, 2).map((p) => p[0]).join('')
  return letters.toUpperCase() || 'U'
}

export function Sidebar() {
  const pathname = usePathname()
  const [displayName, setDisplayName] = useState<string | null>(null)

  // NEW: separate states
  const [hovered, setHovered] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)

  // expanded is derived: if hovering OR profile menu is open
  const expanded = hovered || profileMenuOpen

  // load current user's display name from profiles
  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('display_name, email')
        .eq('id', user.id)
        .single()

      if (data) {
        setDisplayName(
          data.display_name || data.email?.split('@')[0] || 'Account'
        )
      }
    }

    load()
  }, [])

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
        // only collapse when mouse leaves AND profile menu is not open
        setHovered(false)
      }}
    >
      {/* Top section */}
      <div className="space-y-6 px-2 pt-4">
        {/* Logo / title */}
        <div className="flex items-center gap-2 px-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
            V
          </div>
          {expanded && (
            <span className="text-sm font-semibold tracking-tight">
              V-FSB
            </span>
          )}
        </div>

        {/* Main nav links */}
        <nav className="flex flex-col gap-1 mt-4">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`
                  flex items-center gap-3 rounded-md px-2 py-2 text-sm
                  transition-colors
                  ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }
                `}
                title={!expanded ? label : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {expanded && <span className="truncate">{label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Submit Feedback */}
        <div className="mt-4 flex flex-col gap-2 px-2">
          <div className="flex items-center gap-3">
            <SubmitFeedbackDialog />
            {expanded && (
              <span className="text-sm text-muted-foreground">
                Submit Feedback
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: profile row with bubble menu */}
      <div className="px-2 pb-4">
        <DropdownMenu
          open={profileMenuOpen}
          onOpenChange={(open) => {
            setProfileMenuOpen(open)
            // when opening the profile menu, force sidebar expanded
            // when closing, let hover state decide (expanded = hovered || profileMenuOpen)
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
                <div className="flex flex-col text-left">
                  <span className="text-sm font-medium truncate">
                    {displayName ?? 'Account'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Account menu
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
              <span className="text-sm font-medium truncate">
                {displayName ?? 'Account'}
              </span>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              {/* reuse existing logout button inside the menu */}
              <LogoutButton />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
