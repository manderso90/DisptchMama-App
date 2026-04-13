import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/layout/AdminSidebar'
import { AdminHeader } from '@/components/admin/layout/AdminHeader'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: rawProfile } = await supabase
    .from('team_members')
    .select('*')
    .eq('id', user.id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = rawProfile as any
  if (!profile?.is_active) redirect('/login?error=access_denied')

  // Get unassigned job count for sidebar badge
  const { count: unassignedCount } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .is('assigned_to', null)
    .in('status', ['pending'])

  return (
    <div className="flex min-h-screen bg-[#FFFDF5]">
      <AdminSidebar unassignedCount={unassignedCount ?? 0} />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader profile={profile} />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
