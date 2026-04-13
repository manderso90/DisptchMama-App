'use server'

import { updateSchedule } from './schedule-mutations'

export async function scheduleFromDispatch(
  jobId: string,
  inspectorId: string,
  scheduledDate: string,
  scheduledTime: string,
  durationOverride?: number
) {
  await updateSchedule({
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
) {
  await updateSchedule({
    jobId,
    scheduledTime,
  })
}
