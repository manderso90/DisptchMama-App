import { createClient } from '@/lib/supabase/server'
import { getDispatchTimeline, getUnscheduledJobs } from '@/lib/queries/dispatch'
import { DispatchClient } from '@/components/admin/dispatch/DispatchClient'

// GS Retrofit operates in the Pacific timezone (Valley / Los Angeles regions),
// and scheduled_time values are stored as Pacific wall-clock. Compute "today"
// in that zone so isToday — which drives the hide-past window and now-line —
// doesn't flip to false when the Vercel server's UTC clock rolls past midnight
// during the late-afternoon work hour. en-CA gives YYYY-MM-DD.
const BUSINESS_TZ = 'America/Los_Angeles'
function todayInBusinessTz(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export default async function DispatchPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const params = await searchParams
  const today = todayInBusinessTz()
  const currentDate = params.date || today
  const isToday = currentDate === today
  const supabase = await createClient()

  const [inspectors, unscheduledJobs] = await Promise.all([
    getDispatchTimeline(supabase, currentDate),
    getUnscheduledJobs(supabase, today),
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
