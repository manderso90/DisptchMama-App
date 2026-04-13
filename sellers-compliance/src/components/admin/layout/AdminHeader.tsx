'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, User } from 'lucide-react'
import type { TeamMember } from '@/types/database'

const roleLabel: Record<string, string> = {
  admin: 'Admin',
  dispatcher: 'Dispatcher',
  field_tech: 'Field Tech',
}

interface AdminHeaderProps {
  profile: TeamMember
}

export function AdminHeader({ profile }: AdminHeaderProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = profile.full_name
    ? profile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : profile.email[0].toUpperCase()

  return (
    <header className="h-14 bg-[#FFFDF5] border-b-2 border-black px-6 flex items-center justify-between shrink-0">
      <div />

      {mounted ? (
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            <div className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-[#F9A8D4] text-black text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-slate-800 leading-tight">
                  {profile.full_name || 'Team Member'}
                </p>
                <p className="text-xs text-slate-500 leading-tight">{roleLabel[profile.role] || profile.role}</p>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-0.5">
                  <p className="text-sm font-medium">{profile.full_name || 'Team Member'}</p>
                  <p className="text-xs text-slate-500 truncate">{profile.email}</p>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push('/admin/settings')} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile & Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-red-600 focus:text-red-600 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex items-center gap-2.5">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-[#F9A8D4] text-black text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium text-slate-800 leading-tight">
              {profile.full_name || 'Team Member'}
            </p>
            <p className="text-xs text-slate-500 leading-tight">{roleLabel[profile.role] || profile.role}</p>
          </div>
        </div>
      )}
    </header>
  )
}
