'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { UnassignedBadge } from '@/components/admin/shared/UnassignedBadge'
import {
  GanttChart,
  ClipboardList,
  Settings,
  Truck,
  UserCheck,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: typeof GanttChart
  badge?: boolean
}

const operationsNav: NavItem[] = [
  {
    label: 'Dispatch',
    href: '/admin/dispatch',
    icon: GanttChart,
    badge: true,
  },
]

const recordsNav: NavItem[] = [
  {
    label: 'Jobs',
    href: '/admin/jobs',
    icon: ClipboardList,
  },
  {
    label: 'Inspectors',
    href: '/admin/inspectors',
    icon: UserCheck,
  },
]

const systemNav: NavItem[] = [
  {
    label: 'Settings',
    href: '/admin/settings',
    icon: Settings,
  },
]

export function AdminSidebar({ unassignedCount = 0 }: { unassignedCount?: number }) {
  const pathname = usePathname()

  function renderNavItem(item: NavItem) {
    const isActive =
      item.href === '/admin/dispatch'
        ? pathname === '/admin/dispatch' || pathname === '/admin'
        : pathname.startsWith(item.href)

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-[#FDE047] text-black font-bold'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        )}
      >
        <item.icon className="w-4.5 h-4.5 shrink-0" />
        <span className="flex-1">{item.label}</span>
        {item.badge && <UnassignedBadge count={unassignedCount} />}
      </Link>
    )
  }

  return (
    <aside className="w-60 min-h-screen bg-slate-900 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        <Link href="/admin/dispatch" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#FDE047] rounded-lg flex items-center justify-center shrink-0 neo-shadow-sm">
            <Truck className="w-4.5 h-4.5 text-black" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-tight font-[Syne]">
              DisptchMama
            </p>
            <p className="text-[#F9A8D4] text-xs">Dispatch Board</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {/* Operations */}
        <div className="space-y-0.5">
          {operationsNav.map(renderNavItem)}
        </div>

        {/* Divider */}
        <div className="py-2">
          <div className="border-t border-slate-800" />
        </div>

        {/* Records */}
        <div className="space-y-0.5">
          {recordsNav.map(renderNavItem)}
        </div>

        {/* Divider */}
        <div className="py-2">
          <div className="border-t border-slate-800" />
        </div>

        {/* System */}
        <div className="space-y-0.5">
          {systemNav.map(renderNavItem)}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-800">
        <div className="flex items-center gap-2 text-slate-500 text-xs">
          <Truck className="w-3.5 h-3.5" />
          <span>DisptchMama &copy; 2026</span>
        </div>
      </div>
    </aside>
  )
}
