'use server'

import { updateSchedule, type ScheduleResult } from './schedule-mutations'

export async function scheduleFromDispatch(
  jobId: string,
  inspectorId: string,
  scheduledDate: string,
  scheduledTime: string,
  durationOverride?: number
): Promise<ScheduleResult> {
  return updateSchedule({
    jobId,
    assignedTo: inspectorId,
    scheduledDate,
    scheduledTime,
    ...(durationOverride ? { estimatedDurationMinutes: durationOverride } : {}),
  })
}

export async function updateJobTime(
  jobId: string,
  scheduledTime: string
): Promise<ScheduleResult> {
  return updateSchedule({
    jobId,
    scheduledTime,
  })
}
