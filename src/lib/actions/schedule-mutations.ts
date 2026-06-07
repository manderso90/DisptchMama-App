'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { writeBackSchedule, type GsRetrofitWriteback } from './gsretrofit-writeback'

export interface ScheduleUpdate {
  jobId: string
  assignedTo?: string | null
  scheduledDate?: string | null
  scheduledTime?: string | null
  estimatedDurationMinutes?: number
  scheduleNotes?: string
}

export interface ScheduleResult {
  success: true
  updatedFields: Record<string, unknown>
  statusChanged: boolean
  newStatus?: string
  /** Result of the GS Retrofit write-back, when the job is fully scheduled. Advisory. */
  gsRetrofit?: GsRetrofitWriteback
}

const SCHEDULING_PATHS = [
  '/admin/dispatch',
  '/admin/jobs',
]

const EARLY_STATUSES = ['pending']

export async function updateSchedule(update: ScheduleUpdate): Promise<ScheduleResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Fetch current job state
  const { data: current, error: fetchError } = await supabase
    .from('jobs')
    .select('status, assigned_to, scheduled_date, scheduled_time, estimated_duration_minutes, gsretrofit_inspection_request_id')
    .eq('id', update.jobId)
    .single()

  if (fetchError || !current) throw new Error('Job not found')

  // Whether this job originated from GS Retrofit (system of record).
  const isGsrLinked = current.gsretrofit_inspection_request_id != null

  // Build update object — only include fields that were explicitly passed
  const updateData: Record<string, unknown> = {}

  if ('assignedTo' in update) {
    updateData.assigned_to = update.assignedTo
  }
  if ('scheduledDate' in update) {
    updateData.scheduled_date = update.scheduledDate
  }
  if ('scheduledTime' in update) {
    updateData.scheduled_time = update.scheduledTime
  }
  if (update.estimatedDurationMinutes !== undefined) {
    updateData.estimated_duration_minutes = update.estimatedDurationMinutes
  }
  if (update.scheduleNotes !== undefined) {
    updateData.schedule_notes = update.scheduleNotes
  }

  // Compute effective values (merged with current state)
  const effectiveMemberId = 'assignedTo' in update
    ? update.assignedTo
    : current.assigned_to
  const effectiveDate = 'scheduledDate' in update
    ? update.scheduledDate
    : current.scheduled_date
  const effectiveTime = 'scheduledTime' in update
    ? update.scheduledTime
    : current.scheduled_time

  // Compute dispatch_status
  const fullyScheduled = effectiveMemberId && effectiveDate && effectiveTime
  updateData.dispatch_status = fullyScheduled ? 'scheduled' : 'unscheduled'

  // Track reassignment
  if ('assignedTo' in update && update.assignedTo !== current.assigned_to) {
    updateData.last_reassigned_by = user.id
    updateData.last_reassigned_at = new Date().toISOString()
  }

  // Auto-advance status to confirmed if scheduling from early status and fully
  // scheduled — but ONLY for local (non-GS-Retrofit) jobs. For GS Retrofit jobs,
  // confirmation is GS Retrofit's customer-facing workflow; a DisptchMama
  // assignment is internal/pending and must not flip the customer-facing status.
  let statusChanged = false
  let newStatus: string | undefined
  if (!isGsrLinked && fullyScheduled && EARLY_STATUSES.includes(current.status)) {
    updateData.status = 'confirmed'
    statusChanged = true
    newStatus = 'confirmed'
  }

  // Persist update
  const { error: updateError } = await supabase
    .from('jobs')
    .update(updateData)
    .eq('id', update.jobId)

  if (updateError) throw updateError

  // Log to status history if status changed
  if (statusChanged) {
    await supabase.from('job_status_history').insert({
      job_id: update.jobId,
      changed_by: user.id,
      from_status: current.status,
      to_status: newStatus!,
      note: `Scheduled: ${effectiveDate} at ${effectiveTime}`,
    })
  }

  // Write the assignment back to GS Retrofit when the job is fully scheduled.
  // Advisory + graceful: a failure here does not roll back the local schedule.
  // writeBackSchedule no-ops for jobs not linked to a GS Retrofit request.
  let gsRetrofit: GsRetrofitWriteback | undefined
  if (fullyScheduled) {
    gsRetrofit = await writeBackSchedule({
      jobId: update.jobId,
      gsrInspectionRequestId: current.gsretrofit_inspection_request_id,
      inspectorUuid: effectiveMemberId as string,
      scheduledDate: effectiveDate as string,
      scheduledTime: effectiveTime as string,
      changedBy: user.id,
      currentStatus: current.status,
    })
  }

  // Revalidate scheduling-related paths
  for (const path of SCHEDULING_PATHS) {
    revalidatePath(path)
  }

  return {
    success: true,
    updatedFields: updateData,
    statusChanged,
    newStatus,
    gsRetrofit,
  }
}
