'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import {
  generateSuggestions,
  estimateDuration,
  checkConflicts,
  timeToMinutes,
  minutesToTime,
} from '@/services/scheduling'
import type {
  SchedulingContext,
  SuggestionResult,
  ApplyResult,
  InspectorAvailability,
  InspectorScheduleSlot,
  JobToSchedule,
} from '@/services/scheduling'
import { updateSchedule } from './schedule-mutations'

// ---------------------------------------------------------------------------
// Context builder — bridges Supabase data into pure SchedulingContext
// ---------------------------------------------------------------------------

async function buildSchedulingContext(
  jobId: string,
  targetDate?: string
): Promise<SchedulingContext> {
  const supabase = await createClient()

  // 1. Fetch the job
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, title, address, city, zip_code, estimated_duration_minutes, requested_date, requested_time_preference, has_lockbox')
    .eq('id', jobId)
    .single()

  if (jobError || !job) throw new Error('Job not found')

  // 2. Determine target date
  const date = targetDate || job.requested_date || format(new Date(), 'yyyy-MM-dd')

  // 3. Estimate duration if not set
  const duration = estimateDuration({
    title: job.title,
    existingDurationMinutes: job.estimated_duration_minutes,
  })

  // 4. Fetch active inspectors
  const { data: inspectors, error: inspError } = await supabase
    .from('inspectors')
    .select('id, full_name, region, is_active')
    .eq('is_active', true)
    .order('full_name')

  if (inspError) throw inspError

  // 5. Fetch all scheduled jobs for the target date (non-cancelled)
  const { data: dayJobs, error: dayJobsError } = await supabase
    .from('jobs')
    .select('id, assigned_to, scheduled_time, scheduled_end, estimated_duration_minutes, address')
    .eq('scheduled_date', date)
    .not('assigned_to', 'is', null)
    .not('status', 'eq', 'cancelled')

  if (dayJobsError) throw dayJobsError

  // 6. Group scheduled jobs by inspector as InspectorAvailability[]
  const jobsByInspector = new Map<string, InspectorScheduleSlot[]>()
  for (const dj of dayJobs ?? []) {
    if (!dj.assigned_to || !dj.scheduled_time) continue
    const slots = jobsByInspector.get(dj.assigned_to) ?? []
    const startMinutes = timeToMinutes(dj.scheduled_time)
    const durationMin = dj.estimated_duration_minutes ?? 60
    slots.push({
      jobId: dj.id,
      startTime: dj.scheduled_time,
      endTime: dj.scheduled_end ?? minutesToTime(startMinutes + durationMin),
      durationMinutes: durationMin,
      address: dj.address,
    })
    jobsByInspector.set(dj.assigned_to, slots)
  }

  const inspectorAvailabilities: InspectorAvailability[] = (inspectors ?? []).map(
    (insp: { id: string; full_name: string; region: string; is_active: boolean }) => ({
      inspectorId: insp.id,
      inspectorName: insp.full_name,
      region: insp.region || 'Valley',
      isActive: insp.is_active,
      scheduledSlots: jobsByInspector.get(insp.id) ?? [],
    })
  )

  const jobToSchedule: JobToSchedule = {
    id: job.id,
    title: job.title,
    address: job.address,
    city: job.city,
    zipCode: job.zip_code,
    estimatedDurationMinutes: duration.minutes,
    requestedDate: job.requested_date,
    requestedTimePreference: job.requested_time_preference as JobToSchedule['requestedTimePreference'],
    hasLockbox: job.has_lockbox,
  }

  return {
    job: jobToSchedule,
    inspectors: inspectorAvailabilities,
    targetDate: date,
    workdayStart: '09:00',
    workdayEnd: '17:00',
  }
}

// ---------------------------------------------------------------------------
// Public server actions
// ---------------------------------------------------------------------------

/**
 * Get scheduling suggestions for a job.
 * Called from the job detail page "Get Suggestions" button.
 */
export async function getSchedulingSuggestions(
  jobId: string,
  targetDate?: string
): Promise<SuggestionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const context = await buildSchedulingContext(jobId, targetDate)
  return generateSuggestions(context)
}

/**
 * Apply a scheduling suggestion to a job.
 * Performs a conflict recheck at apply-time before persisting.
 */
export async function applySuggestion(
  jobId: string,
  inspectorId: string,
  date: string,
  startTime: string,
  estimatedDurationMinutes: number
): Promise<ApplyResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // --- Apply-time conflict recheck ---
  // Fetch current schedule for this inspector on this date
  const { data: inspectorJobs, error: fetchError } = await supabase
    .from('jobs')
    .select('id, scheduled_time, scheduled_end, estimated_duration_minutes, address')
    .eq('scheduled_date', date)
    .eq('assigned_to', inspectorId)
    .not('status', 'eq', 'cancelled')

  if (fetchError) throw fetchError

  const existingSlots: InspectorScheduleSlot[] = (inspectorJobs ?? [])
    .filter((j: { scheduled_time: string | null }) => j.scheduled_time)
    .map((j: { id: string; scheduled_time: string; scheduled_end: string | null; estimated_duration_minutes: number; address: string }) => {
      const startMin = timeToMinutes(j.scheduled_time)
      const dur = j.estimated_duration_minutes ?? 60
      return {
        jobId: j.id,
        startTime: j.scheduled_time,
        endTime: j.scheduled_end ?? minutesToTime(startMin + dur),
        durationMinutes: dur,
        address: j.address,
      }
    })

  const conflicts = checkConflicts(
    existingSlots,
    startTime,
    estimatedDurationMinutes,
    jobId // exclude self (reschedule case)
  )

  if (conflicts.length > 0) {
    return {
      success: false,
      conflict: conflicts,
      error: `Conflict detected: overlaps with ${conflicts.length} existing job(s)`,
    }
  }

  // --- No conflicts — apply the schedule ---
  await updateSchedule({
    jobId,
    assignedTo: inspectorId,
    scheduledDate: date,
    scheduledTime: startTime,
    estimatedDurationMinutes,
  })

  revalidatePath('/admin/jobs')
  revalidatePath(`/admin/jobs/${jobId}`)
  revalidatePath('/admin/dispatch')

  return { success: true }
}
