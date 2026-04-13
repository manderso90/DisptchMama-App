import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { getDispatchTimeline, getUnscheduledJobs } from '@/lib/queries/dispatch'
import { DispatchClient } from '@/components/admin/dispatch/DispatchClient'

export default async function DispatchPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const params = await searchParams
  const today = format(new Date(), 'yyyy-MM-dd')
  const currentDate = params.date || today
  const isToday = currentDate === today
  const supabase = await createClient()

  const [inspectors, unscheduledJobs] = await Promise.all([
    getDispatchTimeline(supabase, currentDate),
    getUnscheduledJobs(supabase),
  ])

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dispatch Timeline</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Drag unscheduled jobs onto inspector rows to assign and schedule.
        </p>
      </div>

      {/* Client component handles DnD */}
      <DispatchClient
        currentDate={currentDate}
        isToday={isToday}
        inspectors={inspectors}
        unscheduledJobs={unscheduledJobs}
      />
    </div>
  )
}
