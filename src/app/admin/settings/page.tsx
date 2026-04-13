import { createClient } from '@/lib/supabase/server'
import { EmployeeTable } from '@/components/admin/settings/EmployeeTable'

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: employees } = await supabase
    .from('team_members')
    .select('*')
    .order('created_at', { ascending: true })

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 font-[Syne]">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your team and account settings.</p>
      </div>

      <EmployeeTable employees={employees ?? []} currentUserId={user?.id ?? ''} />
    </div>
  )
}
