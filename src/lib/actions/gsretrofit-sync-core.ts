// Core inbound-sync logic, decoupled from how it's triggered.
//
// Takes a Supabase client + an actor id so it can run two ways:
//  - from the authenticated "Sync now" button (cookie client + user.id)
//  - from the unattended cron route (service-role client + changedBy = null)
//
// Pull GS Retrofit inspection requests -> upsert local jobs keyed on
// gsretrofit_inspection_request_id. See gsretrofit-sync.ts / the cron route for
// the two entry points.

import type { SupabaseClient } from '@supabase/supabase-js'
import { getInspectionRequests } from '@/services/integrations/gsretrofit'
import { mapInspectionRequestToJob } from '@/services/integrations/gsretrofit/mapping'
import { isValidTransition, TERMINAL_STATUSES } from '@/services/job-lifecycle'
import type { JobStatus } from '@/types/database'

/**
 * How far back to sync, in days. One-line change to widen/narrow the window.
 * The GS Retrofit dataset is mostly deep history (2022–2025 completed work); the
 * actively-worked set is all updated within the last few weeks. 30 days captures
 * the live queue with margin while keeping years of stale records out.
 */
export const SYNC_WINDOW_DAYS = 30

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Parse a GS Retrofit timestamp into epoch ms. The live API returns
 * Postgres-style timestamps ("2026-06-09 05:44:46.37765+00" — note the space
 * separator and the short "+00" offset) which `Date` won't reliably parse as-is.
 * Returns NaN for missing/unparseable input.
 */
function parseGsrTimestamp(ts: string | null | undefined): number {
  if (!ts) return NaN
  // Space → 'T', and pad a bare 2-digit offset ("+00" / "-07") to "+00:00" so
  // Date.parse accepts it. Already-full offsets ("+00:00", "-0700", "Z") are
  // left untouched. Handle either sign so the parse never silently NaNs.
  const normalized = ts.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00')
  return Date.parse(normalized)
}

export interface SyncResult {
  ok: boolean
  fetched: number
  created: number
  updated: number
  skipped: number
  error?: string
}

/**
 * Run one inbound sync pass. Never assumes a user session — pass `changedBy`
 * (a team_member id, or null for system/cron) for the history entries.
 */
export async function runInspectionSync(
  supabase: SupabaseClient,
  changedBy: string | null
): Promise<SyncResult> {
  const empty = { fetched: 0, created: 0, updated: 0, skipped: 0 }

  // 1. Pull inspection requests and apply the recency window.
  // NOTE: GS Retrofit's `updated_since` query param currently returns HTTP 500,
  // so we fetch all and window client-side on `updatedAt`. The dataset is small
  // (~230); revisit if it grows or the server-side filter is fixed.
  const sinceMs = Date.now() - SYNC_WINDOW_DAYS * MS_PER_DAY
  const reqResult = await getInspectionRequests()
  if (!reqResult.ok) {
    return { ok: false, ...empty, error: reqResult.error.message }
  }
  const requests = reqResult.data.filter(
    (r) => parseGsrTimestamp(r.updatedAt) >= sinceMs
  )

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
        changedBy,
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
        changedBy,
        onCreate: false,
      })
    }
  }

  return { ok: true, fetched: requests.length, created, updated, skipped }
}

async function logHistory(
  supabase: SupabaseClient,
  entry: {
    jobId: string
    gsrRequestId: number
    fromStatus: string | null
    toStatus: string
    changedBy: string | null
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
