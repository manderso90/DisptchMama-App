// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

import { format } from 'date-fns'

export interface DispatchJob {
  id: string
  status: string
  title: string
  scheduled_time: string | null
  scheduled_end: string | null
  estimated_duration_minutes: number
  dispatch_status: string
  client_name: string
  address: string
  city: string
  zip_code: string
  has_lockbox: boolean
}

export interface DispatchInspector {
  id: string
  full_name: string | null
  region: string
  jobs: DispatchJob[]
}

export async function getDispatchTimeline(
  supabase: AnyClient,
  date?: string
): Promise<DispatchInspector[]> {
  const targetDate = date || format(new Date(), 'yyyy-MM-dd')

  // Get all active inspectors
  const { data: inspectors, error: inspectorsError } = await supabase
    .from('inspectors')
    .select('id, full_name, region')
    .eq('is_active', true)
    .order('full_name')

  if (inspectorsError) throw inspectorsError

  // Get all scheduled jobs for the date
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select(
      `
      id, status, title, scheduled_time, scheduled_end, estimated_duration_minutes,
      dispatch_status, assigned_to, client_name, address, city, zip_code, has_lockbox
    `
    )
    .eq('scheduled_date', targetDate)
    .not('assigned_to', 'is', null)
    .not('status', 'eq', 'cancelled')
    .order('scheduled_time', { ascending: true, nullsFirst: false })

  if (jobsError) throw jobsError

  // Group jobs by inspector
  const jobsByInspector = new Map<string, DispatchJob[]>()
  for (const job of jobs ?? []) {
    const inspectorId = job.assigned_to
    if (!jobsByInspector.has(inspectorId)) {
      jobsByInspector.set(inspectorId, [])
    }
    jobsByInspector.get(inspectorId)!.push({
      id: job.id,
      status: job.status,
      title: job.title,
      scheduled_time: job.scheduled_time,
      scheduled_end: job.scheduled_end ?? null,
      estimated_duration_minutes: job.estimated_duration_minutes ?? 60,
      dispatch_status: job.dispatch_status ?? 'scheduled',
      client_name: job.client_name,
      address: job.address,
      city: job.city,
      zip_code: job.zip_code,
      has_lockbox: job.has_lockbox ?? false,
    })
  }

  return (inspectors ?? []).map((inspector: { id: string; full_name: string | null; region?: string }) => ({
    id: inspector.id,
    full_name: inspector.full_name,
    region: inspector.region || 'Valley',
    jobs: jobsByInspector.get(inspector.id) ?? [],
  }))
}

export interface UnscheduledJob {
  id: string
  status: string
  title: string
  requested_date: string | null
  requested_time_preference: string | null
  notes: string | null
  estimated_duration_minutes: number
  created_at: string
  client_name: string
  address: string
  city: string
  zip_code: string
  has_lockbox: boolean
}

/**
 * Jobs that still need a slot on the board. Two groups:
 *   - pending jobs that aren't fully placed (no date or no inspector), and
 *   - confirmed GS Retrofit appointments we couldn't auto-place (freeform time
 *     or an unmapped inspector). Without this second group those confirmed jobs
 *     would be invisible — not on the timeline (no scheduled_date) and excluded
 *     from a pending-only queue — which is exactly what hid them before.
 *
 * Confirmed jobs are floored at `today` so the queue stays focused on upcoming
 * work rather than years of historical confirmed records. `today` is the
 * business-timezone date (passed in from the page).
 */
export async function getUnscheduledJobs(
  supabase: AnyClient,
  today: string
): Promise<UnscheduledJob[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select(
      `
      id, status, title, requested_date, requested_time_preference, notes,
      estimated_duration_minutes, created_at,
      client_name, address, city, zip_code, has_lockbox
    `
    )
    .or(
      `and(status.eq.pending,or(scheduled_date.is.null,assigned_to.is.null)),` +
        `and(status.eq.confirmed,scheduled_date.is.null,or(requested_date.gte.${today},requested_date.is.null))`
    )
    .order('requested_date', { ascending: true, nullsFirst: false })

  if (error) throw error
  return (data ?? []) as UnscheduledJob[]
}
