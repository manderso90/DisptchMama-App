import type { DispatchStatus } from '@/types/database'
import { shouldAutoConfirm } from '@/services/job-lifecycle'

export function computeDispatchStatus(fields: {
  assignedTo: string | null
  scheduledDate: string | null
  scheduledTime: string | null
}): DispatchStatus {
  return fields.assignedTo !== null &&
    fields.scheduledDate !== null &&
    fields.scheduledTime !== null
    ? 'scheduled'
    : 'unscheduled'
}

export function buildScheduleUpdate(
  current: {
    status: string
    assigned_to: string | null
    scheduled_date: string | null
    scheduled_time: string | null
    estimated_duration_minutes: number
  },
  update: {
    assignedTo?: string | null
    scheduledDate?: string | null
    scheduledTime?: string | null
    estimatedDurationMinutes?: number
    scheduleNotes?: string
  },
  userId: string
): { updateData: Record<string, unknown>; statusChanged: boolean; newStatus?: string } {
  const updateData: Record<string, unknown> = {}

  // 1. Build update from explicitly passed fields
  if ('assignedTo' in update) updateData.assigned_to = update.assignedTo
  if ('scheduledDate' in update) updateData.scheduled_date = update.scheduledDate
  if ('scheduledTime' in update) updateData.scheduled_time = update.scheduledTime
  if ('estimatedDurationMinutes' in update) updateData.estimated_duration_minutes = update.estimatedDurationMinutes
  if ('scheduleNotes' in update) updateData.schedule_notes = update.scheduleNotes

  // 2. Compute effective values (merge update over current)
  const effective = {
    assignedTo: 'assignedTo' in update ? update.assignedTo! : current.assigned_to,
    scheduledDate: 'scheduledDate' in update ? update.scheduledDate! : current.scheduled_date,
    scheduledTime: 'scheduledTime' in update ? update.scheduledTime! : current.scheduled_time,
  }

  // 3. Compute dispatch_status
  updateData.dispatch_status = computeDispatchStatus(effective)

  // 4. Track reassignment
  if ('assignedTo' in update && update.assignedTo !== current.assigned_to) {
    updateData.last_reassigned_by = userId
    updateData.last_reassigned_at = new Date().toISOString()
  }

  // 5. Auto-confirm check
  let statusChanged = false
  let newStatus: string | undefined
  const effectiveJob = {
    status: current.status,
    assigned_to: effective.assignedTo,
    scheduled_date: effective.scheduledDate,
    scheduled_time: effective.scheduledTime,
  }

  if (shouldAutoConfirm(effectiveJob)) {
    updateData.status = 'confirmed'
    statusChanged = true
    newStatus = 'confirmed'
  }

  // 6. Set updated_at
  updateData.updated_at = new Date().toISOString()

  return { updateData, statusChanged, newStatus }
}

export function buildUnscheduleUpdate(
  current: { status: string },
  userId: string
): { updateData: Record<string, unknown>; statusChanged: boolean; newStatus?: string } {
  const updateData: Record<string, unknown> = {
    assigned_to: null,
    scheduled_date: null,
    scheduled_time: null,
    dispatch_status: 'unscheduled',
    last_reassigned_by: userId,
    last_reassigned_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  let statusChanged = false
  let newStatus: string | undefined

  // P1 bug fix: revert confirmed/in_progress to pending on unschedule
  if (current.status === 'confirmed' || current.status === 'in_progress') {
    updateData.status = 'pending'
    statusChanged = true
    newStatus = 'pending'
  }

  return { updateData, statusChanged, newStatus }
}
