'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogoutButton } from '@/components/logout-button'
import { Home, BarChart3 } from 'lucide-react'
import { SubmitFeedbackDialog } from '@/components/submit-feedback-dialog'

// Only real pages here
const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
]

export function Sidebar() {
  const [expanded, setExpanded] = useState(false)
  const pathname = usePathname()

  return (
    <aside
      className={`
        fixed left-0 top-0 z-40
        h-screen
        border-r bg-background
        flex flex-col justify-between
        transition-[width] duration-200
        ${expanded ? 'w-64' : 'w-16'}
      `}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
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

        {/* Nav links */}
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

        {/* Submit Feedback button (opens dialog) */}
        <div className="mt-4 flex items-center gap-3 px-2">
          <SubmitFeedbackDialog />
          {expanded && (
            <span className="text-sm text-muted-foreground">
              Submit Feedback
            </span>
          )}
        </div>
      </div>

      {/* Bottom section */}
      <div className="px-2 pb-4">
        <LogoutButton />
      </div>
    </aside>
  )
}
