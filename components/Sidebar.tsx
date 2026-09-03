'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  FileWarning,
  Clock,
  Settings,
  LogOut,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/segment-a', label: 'Segment A – No KYB', icon: Users },
  { href: '/segment-b', label: 'Segment B – Pending Docs', icon: FileWarning },
  { href: '/contacts', label: 'Contact History', icon: Clock },
]

const adminItems = [
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setOpen(false) }, [pathname])

  return (
    <>
      {/* Mobile hamburger — the sidebar itself is off-canvas below md */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 left-4 z-30 w-10 h-10 rounded-xl bg-[#13161e] border border-[#252836] flex items-center justify-center text-[#8b92a5]"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {/* Backdrop, mobile only */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'w-64 shrink-0 bg-[#13161e] border-r border-[#252836] flex flex-col h-full',
          'fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:relative md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="px-5 py-6 border-b border-[#252836] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6c63ff] to-[#a78bfa] flex items-center justify-center text-white font-bold">
              K
            </div>
            <div>
              <div className="text-white font-semibold text-sm leading-tight">KYB Agent</div>
              <div className="text-[#8b92a5] text-xs">by Ontop</div>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="md:hidden text-[#8b92a5] hover:text-white"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  active
                    ? 'bg-[#6c63ff]/15 text-[#a78bfa]'
                    : 'text-[#8b92a5] hover:bg-[#1a1e28] hover:text-[#f0f2f7]'
                )}
              >
                <Icon size={17} />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight size={14} className="opacity-60" />}
              </Link>
            )
          })}


          <div className="pt-4 pb-1 px-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8b92a5]">Admin</p>
          </div>

          {adminItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  active
                    ? 'bg-[#6c63ff]/15 text-[#a78bfa]'
                    : 'text-[#8b92a5] hover:bg-[#1a1e28] hover:text-[#f0f2f7]'
                )}
              >
                <Icon size={17} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-[#252836]">
          <div className="flex items-center gap-3 mb-3">
            {session?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="" className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#252836] flex items-center justify-center text-xs text-white">
                {session?.user?.name?.[0] ?? '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white font-medium truncate">{session?.user?.name}</div>
              <div className="text-xs text-[#8b92a5] truncate">{session?.user?.email}</div>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[#8b92a5] hover:text-red-400 hover:bg-red-400/10 text-sm transition-colors"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
