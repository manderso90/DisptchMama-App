import { createClient } from '@/lib/supabase/server'
import { getInspectors } from '@/lib/queries/inspectors'
import { InspectorTable } from '@/components/admin/inspectors/InspectorTable'

export default async function InspectorsPage() {
  const supabase = await createClient()
  const inspectors = await getInspectors(supabase)

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 font-[Syne]">Inspectors</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your inspection team.</p>
      </div>

      <InspectorTable inspectors={inspectors} />
    </div>
  )
}
