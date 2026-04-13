import { createClient } from '@/lib/supabase/server'
import type { JobStatus, DispatchStatus } from '@/types/database'

export interface RiskJob {
  id: string
  title: string
  address: string
  status: JobStatus
  dispatch_status: DispatchStatus
  assigned_to: string | null
  inspector_name: string | null
  scheduled_date: string | null
}

export interface InspectorWorkloadItem {
  id: string
  full_name: string
  region: string
  is_active: boolean
  totalAssigned: number
  todayCount: number
}

export interface CommandCenterData {
  // Summary counts
  totalActiveJobs: number
  byStatus: Record<string, number>
  unassignedPendingCount: number
  todayScheduledCount: number
  onHoldCount: number

  // At-risk jobs grouped by severity
  critical: {
    confirmedUnscheduled: RiskJob[]
    inactiveInspector: RiskJob[]
    overdueUnconfirmed: RiskJob[]
  }
  needsAttention: {
    unassignedPending: RiskJob[]
    onHold: RiskJob[]
    assignedNoSchedule: RiskJob[]
  }

  // Inspector workload
  inspectorWorkload: InspectorWorkloadItem[]
}

export async function getCommandCenterData(): Promise<CommandCenterData> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // Three parallel queries
  const [jobsResult, inspectorsResult, todayCountResult] = await Promise.all([
    // All non-terminal jobs
    supabase
      .from('jobs')
      .select('id, title, address, status, dispatch_status, assigned_to, scheduled_date')
      .not('status', 'in', '("completed","cancelled")'),
    // All inspectors
    supabase.from('inspectors').select('id, full_name, region, is_active'),
    // Today's scheduled count
    supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('scheduled_date', today)
      .not('status', 'in', '("completed","cancelled")'),
  ])

  if (jobsResult.error) throw jobsResult.error
  if (inspectorsResult.error) throw inspectorsResult.error

  const jobs = jobsResult.data ?? []
  const inspectors = inspectorsResult.data ?? []
  const todayScheduledCount = todayCountResult.count ?? 0

  // Build inspector lookup
  const inspectorMap = new Map(inspectors.map((i) => [i.id, i]))
  const inactiveIds = new Set(
    inspectors.filter((i) => !i.is_active).map((i) => i.id)
  )

  // --- Summary counts ---
  const byStatus: Record<string, number> = {}
  for (const job of jobs) {
    byStatus[job.status] = (byStatus[job.status] ?? 0) + 1
  }

  const unassignedPendingCount = jobs.filter(
    (j) => j.status === 'pending' && !j.assigned_to
  ).length

  const onHoldCount = byStatus['on_hold'] ?? 0

  // --- At-risk: Critical ---

  // R2: Confirmed but unscheduled
  const confirmedUnscheduled = jobs
    .filter(
      (j) => j.status === 'confirmed' && (!j.scheduled_date || !j.assigned_to)
    )
    .map((j) => toRiskJob(j, inspectorMap))

  // R3: Scheduled with inactive inspector
  const inactiveInspector = jobs
    .filter((j) => j.assigned_to && inactiveIds.has(j.assigned_to))
    .map((j) => toRiskJob(j, inspectorMap))

  // R5: Overdue unconfirmed
  const overdueUnconfirmed = jobs
    .filter(
      (j) =>
        j.status === 'pending' &&
        j.scheduled_date !== null &&
        j.scheduled_date < today
    )
    .map((j) => toRiskJob(j, inspectorMap))

  // --- At-risk: Needs Attention ---

  // R1: Unassigned pending
  const unassignedPending = jobs
    .filter((j) => j.status === 'pending' && !j.assigned_to)
    .map((j) => toRiskJob(j, inspectorMap))

  // R4: On hold
  const onHold = jobs
    .filter((j) => j.status === 'on_hold')
    .map((j) => toRiskJob(j, inspectorMap))

  // R6: Assigned but no schedule
  const assignedNoSchedule = jobs
    .filter((j) => j.assigned_to && !j.scheduled_date)
    .map((j) => toRiskJob(j, inspectorMap))

  // --- Inspector workload ---
  const workloadMap = new Map<
    string,
    { totalAssigned: number; todayCount: number }
  >()
  for (const inspector of inspectors) {
    workloadMap.set(inspector.id, { totalAssigned: 0, todayCount: 0 })
  }
  for (const job of jobs) {
    if (!job.assigned_to) continue
    const entry = workloadMap.get(job.assigned_to)
    if (entry) {
      entry.totalAssigned++
      if (job.scheduled_date === today) entry.todayCount++
    }
  }

  const inspectorWorkload: InspectorWorkloadItem[] = inspectors
    .map((i) => {
      const w = workloadMap.get(i.id) ?? { totalAssigned: 0, todayCount: 0 }
      return {
        id: i.id,
        full_name: i.full_name,
        region: i.region,
        is_active: i.is_active,
        totalAssigned: w.totalAssigned,
        todayCount: w.todayCount,
      }
    })
    .sort((a, b) => b.totalAssigned - a.totalAssigned)

  return {
    totalActiveJobs: jobs.length,
    byStatus,
    unassignedPendingCount,
    todayScheduledCount,
    onHoldCount,
    critical: {
      confirmedUnscheduled,
      inactiveInspector,
      overdueUnconfirmed,
    },
    needsAttention: {
      unassignedPending,
      onHold,
      assignedNoSchedule,
    },
    inspectorWorkload,
  }
}

function toRiskJob(
  job: {
    id: string
    title: string
    address: string
    status: string
    dispatch_status: string
    assigned_to: string | null
    scheduled_date: string | null
  },
  inspectorMap: Map<string, { id: string; full_name: string }>
): RiskJob {
  return {
    id: job.id,
    title: job.title,
    address: job.address,
    status: job.status as JobStatus,
    dispatch_status: job.dispatch_status as DispatchStatus,
    assigned_to: job.assigned_to,
    inspector_name: job.assigned_to
      ? (inspectorMap.get(job.assigned_to)?.full_name ?? null)
      : null,
    scheduled_date: job.scheduled_date,
  }
}
