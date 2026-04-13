/**
 * Conflict detection — pure function, no framework imports.
 *
 * Checks whether a proposed time slot conflicts with existing
 * scheduled slots for a given inspector. Used both at suggestion
 * generation time and at apply-time recheck.
 */

import type { InspectorScheduleSlot, TimeConflict } from './types'

/**
 * Convert "HH:mm" to total minutes since midnight.
 */
export function timeToMinutes(time: string): number {
  const parts = time.split(':')
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
}

/**
 * Convert total minutes since midnight to "HH:mm".
 */
export function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Check if a proposed slot conflicts with any existing slots.
 *
 * @param existingSlots - Inspector's current schedule for the day
 * @param proposedStartTime - "HH:mm"
 * @param proposedDurationMinutes - duration in minutes
 * @param excludeJobId - optional job ID to skip (reschedule case)
 * @returns array of conflicts (empty = no conflicts)
 */
export function checkConflicts(
  existingSlots: InspectorScheduleSlot[],
  proposedStartTime: string,
  proposedDurationMinutes: number,
  excludeJobId?: string
): TimeConflict[] {
  const proposedStart = timeToMinutes(proposedStartTime)
  const proposedEnd = proposedStart + proposedDurationMinutes
  const conflicts: TimeConflict[] = []

  for (const slot of existingSlots) {
    if (excludeJobId && slot.jobId === excludeJobId) continue

    const existingStart = timeToMinutes(slot.startTime)
    const existingEnd = slot.endTime
      ? timeToMinutes(slot.endTime)
      : existingStart + slot.durationMinutes

    // Overlap: existingStart < proposedEnd && proposedStart < existingEnd
    if (existingStart < proposedEnd && proposedStart < existingEnd) {
      const overlapStart = Math.max(existingStart, proposedStart)
      const overlapEnd = Math.min(existingEnd, proposedEnd)
      conflicts.push({
        jobId: slot.jobId,
        address: slot.address,
        overlapMinutes: overlapEnd - overlapStart,
      })
    }
  }

  return conflicts
}

/**
 * Find available gaps in an inspector's schedule within work hours.
 *
 * Returns time windows (start/end in minutes) where a job of the
 * given duration could fit without conflicts.
 */
export function findAvailableGaps(
  existingSlots: InspectorScheduleSlot[],
  workdayStartTime: string,
  workdayEndTime: string,
  requiredDurationMinutes: number,
  excludeJobId?: string
): Array<{ startMinutes: number; endMinutes: number }> {
  const dayStart = timeToMinutes(workdayStartTime)
  const dayEnd = timeToMinutes(workdayEndTime)

  // Build sorted list of occupied intervals
  const occupied = existingSlots
    .filter((s) => !excludeJobId || s.jobId !== excludeJobId)
    .map((s) => {
      const start = timeToMinutes(s.startTime)
      const end = s.endTime
        ? timeToMinutes(s.endTime)
        : start + s.durationMinutes
      return { start, end }
    })
    .sort((a, b) => a.start - b.start)

  const gaps: Array<{ startMinutes: number; endMinutes: number }> = []
  let cursor = dayStart

  for (const interval of occupied) {
    // Gap before this interval
    if (interval.start > cursor) {
      const gapDuration = interval.start - cursor
      if (gapDuration >= requiredDurationMinutes) {
        gaps.push({ startMinutes: cursor, endMinutes: interval.start })
      }
    }
    // Move cursor past this interval
    cursor = Math.max(cursor, interval.end)
  }

  // Gap after last occupied interval
  if (dayEnd > cursor) {
    const gapDuration = dayEnd - cursor
    if (gapDuration >= requiredDurationMinutes) {
      gaps.push({ startMinutes: cursor, endMinutes: dayEnd })
    }
  }

  return gaps
}
