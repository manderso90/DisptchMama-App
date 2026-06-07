'use server'

// Inbound sync: pull GS Retrofit inspection requests into the DisptchMama job
// queue. GS Retrofit is the system of record; this creates/updates local jobs
// so the dispatcher has something to schedule (and so write-back has a
// gsretrofit_inspection_request_id to target).
//
// Rules:
//  - Recency window: only requests active within SYNC_WINDOW_DAYS (keeps the
//    old backlog out of the queue). Uses the API's updated_since filter.
//  - New request   -> insert a job (status + assignment reverse-mapped).
//  - Known request -> refresh source/customer fields and mirror status (only on
//    a valid, non-terminal transition). NEVER overwrite local scheduling
//    (assigned_to, scheduled_*, dispatch_status) — the dispatcher owns those.

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getInspectionRequests } from '@/services/integrations/gsretrofit'
import { mapInspectionRequestToJob } from '@/services/integrations/gsretrofit/mapping'
import { isValidTransition, TERMINAL_STATUSES } from '@/services/job-lifecycle'
import type { JobStatus } from '@/types/database'

/** How far back to sync, in days. One-line change to widen/narrow the window. */
const SYNC_WINDOW_DAYS = 10

const MS_PER_DAY = 24 * 60 * 60 * 1000

export interface SyncResult {
  ok: boolean
  fetched: number
  created: number
  updated: number
  skipped: number
  error?: string
}

type ServerSupabase = Awaited<ReturnType<typeof createClient>>

export async function syncInspectionRequests(): Promise<SyncResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const empty = { fetched: 0, created: 0, updated: 0, skipped: 0 }

  // 1. Pull inspection requests and apply the recency window.
  // NOTE: GS Retrofit's `updated_since` query param currently returns HTTP 500,
  // so we fetch all and window client-side on `updated_at`. The dataset is small
  // (~230); revisit if it grows or the server-side filter is fixed.
  const since = new Date(Date.now() - SYNC_WINDOW_DAYS * MS_PER_DAY).toISOString()
  const reqResult = await getInspectionRequests()
  if (!reqResult.ok) {
    return { ok: false, ...empty, error: reqResult.error.message }
  }
  const requests = reqResult.data.filter((r) => r.updated_at >= since)

  // 2. Build GS Retrofit inspector id -> local inspector UUID reverse map.
  const { data: inspectors } = await supabase
    .from('inspectors')
    .select('id, gsretrofit_inspector_id')
  const inspectorByGsrId = new Map<number, string>()
  for (const insp of inspectors ?? []) {
    if (insp.gsretrofit_inspector_id != null) {
      inspectorByGsrId.set(insp.gsretrofit_inspector_id, insp.id)
    }
  }

  // 3. Find which requests already exist locally.
  const requestIds = requests.map((r) => r.id)
  const { data: existingJobs } = requestIds.length
    ? await supabase
        .from('jobs')
        .select('id, status, gsretrofit_inspection_request_id')
        .in('gsretrofit_inspection_request_id', requestIds)
    : { data: [] }
  const jobByGsrId = new Map<number, { id: string; status: string }>()
  for (const job of existingJobs ?? []) {
    if (job.gsretrofit_inspection_request_id != null) {
      jobByGsrId.set(job.gsretrofit_inspection_request_id, { id: job.id, status: job.status })
    }
  }

  // 4. Upsert each request.
  let created = 0
  let updated = 0
  let skipped = 0
  for (const req of requests) {
    const mapped = mapInspectionRequestToJob(req, inspectorByGsrId)
    const existing = jobByGsrId.get(req.id)

    if (!existing) {
      const { data: inserted, error } = await supabase
        .from('jobs')
        .insert(mapped)
        .select('id')
        .single()
      if (error || !inserted) {
        skipped++
        continue
      }
      created++
      await logHistory(supabase, {
        jobId: inserted.id,
        gsrRequestId: req.id,
        fromStatus: null,
        toStatus: mapped.status,
        changedBy: user.id,
        onCreate: true,
      })
      continue
    }

    // Existing job: refresh GS-Retrofit-owned fields, protect local scheduling.
    const updateFields: Record<string, unknown> = {
      title: mapped.title,
      address: mapped.address,
      city: mapped.city,
      state: mapped.state,
      zip_code: mapped.zip_code,
      requested_date: mapped.requested_date,
      notes: mapped.notes,
      schedule_notes: mapped.schedule_notes,
    }

    // Mirror status only when it's a safe forward transition for a non-terminal job.
    const current = existing.status as JobStatus
    const mirrorStatus =
      !(TERMINAL_STATUSES as readonly string[]).includes(current) &&
      current !== mapped.status &&
      isValidTransition(current, mapped.status)
    if (mirrorStatus) {
      updateFields.status = mapped.status
    }

    const { error } = await supabase.from('jobs').update(updateFields).eq('id', existing.id)
    if (error) {
      skipped++
      continue
    }
    updated++
    if (mirrorStatus) {
      await logHistory(supabase, {
        jobId: existing.id,
        gsrRequestId: req.id,
        fromStatus: current,
        toStatus: mapped.status,
        changedBy: user.id,
        onCreate: false,
      })
    }
  }

  revalidatePath('/admin/jobs')
  revalidatePath('/admin/dispatch')
  return { ok: true, fetched: requests.length, created, updated, skipped }
}

async function logHistory(
  supabase: ServerSupabase,
  entry: {
    jobId: string
    gsrRequestId: number
    fromStatus: string | null
    toStatus: string
    changedBy: string
    onCreate: boolean
  }
): Promise<void> {
  await supabase.from('job_status_history').insert({
    job_id: entry.jobId,
    changed_by: entry.changedBy,
    from_status: entry.fromStatus,
    to_status: entry.toStatus,
    note: entry.onCreate
      ? `Imported from GS Retrofit inspection #${entry.gsrRequestId}`
      : `Status mirrored from GS Retrofit inspection #${entry.gsrRequestId}`,
  })
}
