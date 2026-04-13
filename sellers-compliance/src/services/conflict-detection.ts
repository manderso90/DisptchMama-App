export interface TimeConflict {
  jobId: string
  address: string
  overlapMinutes: number
}

function timeToMinutes(time: string): number {
  const parts = time.split(':')
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
}

export function checkConflicts(
  existingJobs: Array<{
    id: string
    address: string
    scheduled_time: string | null
    scheduled_end: string | null
    estimated_duration_minutes: number
  }>,
  proposedStartTime: string,
  proposedDurationMinutes: number,
  excludeJobId?: string
): TimeConflict[] {
  const proposedStart = timeToMinutes(proposedStartTime)
  const proposedEnd = proposedStart + proposedDurationMinutes
  const conflicts: TimeConflict[] = []

  for (const job of existingJobs) {
    // Skip excluded job (reschedule case)
    if (excludeJobId && job.id === excludeJobId) continue

    // Skip jobs without a scheduled time
    if (!job.scheduled_time) continue

    const existingStart = timeToMinutes(job.scheduled_time)
    const existingEnd = job.scheduled_end
      ? timeToMinutes(job.scheduled_end)
      : existingStart + job.estimated_duration_minutes

    // Check overlap: existingStart < proposedEnd && proposedStart < existingEnd
    if (existingStart < proposedEnd && proposedStart < existingEnd) {
      const overlapStart = Math.max(existingStart, proposedStart)
      const overlapEnd = Math.min(existingEnd, proposedEnd)
      conflicts.push({
        jobId: job.id,
        address: job.address,
        overlapMinutes: overlapEnd - overlapStart,
      })
    }
  }

  return conflicts
}
