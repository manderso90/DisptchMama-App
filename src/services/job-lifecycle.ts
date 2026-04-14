import type { JobStatus } from '@/types/database'

export const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  pending: ['confirmed', 'cancelled', 'on_hold'],
  confirmed: ['in_progress', 'cancelled', 'on_hold', 'pending'],
  in_progress: ['completed', 'cancelled', 'on_hold'],
  completed: [],
  cancelled: ['pending'],
  on_hold: ['pending'],
}

export const TERMINAL_STATUSES = ['completed', 'cancelled'] as const

export function isValidTransition(from: JobStatus, to: JobStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to)
}

export function shouldAutoConfirm(job: {
  status: string
  assigned_to: string | null
  scheduled_date: string | null
  scheduled_time: string | null
}): boolean {
  return (
    job.status === 'pending' &&
    job.assigned_to !== null &&
    job.scheduled_date !== null &&
    job.scheduled_time !== null
  )
}

/**
 * Returns the list of valid next statuses for a given current status.
 * Used by UI to populate status dropdown options.
 */
export function getNextStatuses(currentStatus: JobStatus): JobStatus[] {
  return VALID_TRANSITIONS[currentStatus]
}

// --- Job Creation Validation ---

const VALID_TITLES = ['Inspection', 'Work'] as const
const VALID_TIME_PREFERENCES = ['morning', 'afternoon', 'anytime', 'flexible'] as const
const MIN_DURATION_MINUTES = 15

export interface JobInputErrors {
  valid: boolean
  errors: string[]
}

/**
 * Validates job creation input. Returns { valid: true, errors: [] } on success,
 * or { valid: false, errors: [...] } with all validation failures.
 */
export function validateJobInput(data: {
  title?: string
  address?: string
  estimated_duration_minutes?: number
  requested_time_preference?: string | null
}): JobInputErrors {
  const errors: string[] = []

  if (!data.title || !(VALID_TITLES as readonly string[]).includes(data.title)) {
    errors.push('Title must be "Inspection" or "Work"')
  }

  if (!data.address || data.address.trim().length === 0) {
    errors.push('Address is required')
  }

  if (
    data.estimated_duration_minutes !== undefined &&
    data.estimated_duration_minutes < MIN_DURATION_MINUTES
  ) {
    errors.push(`Duration must be at least ${MIN_DURATION_MINUTES} minutes`)
  }

  if (
    data.requested_time_preference !== undefined &&
    data.requested_time_preference !== null &&
    data.requested_time_preference !== '' &&
    !(VALID_TIME_PREFERENCES as readonly string[]).includes(data.requested_time_preference)
  ) {
    errors.push('Invalid time preference')
  }

  return { valid: errors.length === 0, errors }
}
