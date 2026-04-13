'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkConflicts } from '@/services/conflict-detection'
import { buildScheduleUpdate, buildUnscheduleUpdate } from '@/services/dispatch-scheduling'
import type { Database } from '@/types/database'

type JobUpdate = Database['public']['Tables']['jobs']['Update']
type StatusHistoryInsert = Database['public']['Tables']['job_status_history']['Insert']

export interface ScheduleUpdate {
  jobId: string
  assignedTo?: string | null
  scheduledDate?: string | null
  scheduledTime?: string | null
  estimatedDurationMinutes?: number
  scheduleNotes?: string
}

export interface ScheduleResult {
  success: boolean
  jobId: string
  statusChanged?: boolean
  newStatus?: string
}

export async function updateSchedule(update: ScheduleUpdate): Promise<ScheduleResult> {
  // 1. Auth guard
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  // 2. Fetch current job state
  const { data: currentJob, error: jobError } = await supabase
    .from('jobs')
    .select('status, assigned_to, scheduled_date, scheduled_time, estimated_duration_minutes')
    .eq('id', update.jobId)
    .single()
  if (jobError || !currentJob) throw new Error('Job not found')

  // 3. Determine if this is an unschedule operation
  const isUnschedule = 'assignedTo' in update && update.assignedTo === null

  let updateData: Record<string, unknown>
  let statusChanged: boolean
  let newStatus: string | undefined

  if (isUnschedule) {
    // Unschedule path
    const result = buildUnscheduleUpdate(currentJob, user.id)
    updateData = result.updateData
    statusChanged = result.statusChanged
    newStatus = result.newStatus
  } else {
    // Schedule/reschedule path — run conflict detection
    const effectiveInspectorId = 'assignedTo' in update ? update.assignedTo : currentJob.assigned_to
    const effectiveDate = 'scheduledDate' in update ? update.scheduledDate : currentJob.scheduled_date
    const effectiveTime = 'scheduledTime' in update ? update.scheduledTime : currentJob.scheduled_time
    const effectiveDuration = update.estimatedDurationMinutes ?? currentJob.estimated_duration_minutes

    if (effectiveInspectorId && effectiveDate && effectiveTime) {
      // 4. Fetch existing jobs for conflict check
      const { data: existingJobs } = await supabase
        .from('jobs')
        .select('id, address, scheduled_time, scheduled_end, estimated_duration_minutes')
        .eq('assigned_to', effectiveInspectorId)
        .eq('scheduled_date', effectiveDate)
        .neq('status', 'cancelled')

      // 5. Check conflicts
      const conflicts = checkConflicts(
        existingJobs ?? [],
        effectiveTime,
        effectiveDuration,
        update.jobId
      )

      if (conflicts.length > 0) {
        const c = conflicts[0]
        throw new Error(
          `Schedule conflict: overlaps with job at ${c.address} by ${c.overlapMinutes} minutes`
        )
      }
    }

    // 6. Build schedule update
    const result = buildScheduleUpdate(currentJob, update, user.id)
    updateData = result.updateData
    statusChanged = result.statusChanged
    newStatus = result.newStatus
  }

  // 7. Persist to Supabase
  const { error: updateError } = await supabase
    .from('jobs')
    .update(updateData as JobUpdate)
    .eq('id', update.jobId)
  if (updateError) throw new Error('Failed to update job')

  // 8. Log status change to history
  if (statusChanged && newStatus) {
    await supabase.from('job_status_history').insert({
      job_id: update.jobId,
      changed_by: user.id,
      from_status: currentJob.status,
      to_status: newStatus,
      note: isUnschedule ? 'Status reverted on unschedule' : 'Auto-confirmed on schedule',
    } satisfies StatusHistoryInsert)
  }

  // 9. Revalidate
  revalidatePath('/admin/dispatch')
  revalidatePath('/admin/jobs')

  // 10. Return result
  return {
    success: true,
    jobId: update.jobId,
    statusChanged,
    newStatus,
  }
}
