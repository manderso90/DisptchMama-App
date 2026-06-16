// Pure translation: GS Retrofit inspection request -> DisptchMama job fields.
//
// No I/O — the inbound-sync action supplies the inspector reverse-map and
// performs the upsert. This keeps the (status enum, date, notes) translation
// rules in one testable place. GS Retrofit status uses SPACES; the local job
// status enum is snake_case — this file is the explicit translation layer the
// data rules call for.

import type { JobStatus } from '@/types/database'
import type { GsrInspectionRequest, GsrInspectionStatus } from './types'

/**
 * GS Retrofit status -> local job status. GS Retrofit owns the customer-facing
 * status; locally we collapse its in-flight states onto our lifecycle:
 *   - everything still needing scheduling action -> pending
 *   - 'info needed' / 'on hold'                  -> on_hold
 *   - 'confirmed'                                -> confirmed
 */
const STATUS_MAP: Record<GsrInspectionStatus, JobStatus> = {
  requested: 'pending',
  'awaiting confirmation': 'pending',
  'alternatives offered': 'pending',
  'needs rescheduling': 'pending',
  'info needed': 'on_hold',
  'on hold': 'on_hold',
  confirmed: 'confirmed',
}

export function mapGsrStatusToLocal(status: GsrInspectionStatus): JobStatus {
  // Defensive default: an unknown/new status lands in the queue as pending.
  return STATUS_MAP[status] ?? 'pending'
}

/** GS Retrofit `type` -> local job title ('Inspection' | 'Work'). */
function mapType(type: string): string {
  return type.toLowerCase() === 'inspection' ? 'Inspection' : 'Work'
}

/** ISO timestamp or YYYY-MM-DD -> YYYY-MM-DD (the live API returns timestamps). */
function normalizeDate(value: string | null): string | null {
  if (!value) return null
  return value.slice(0, 10)
}

/**
 * Strict HH:mm clock time, or null. The live API's requestedTime is often
 * freeform — "anytime/lockbox", "2pm", "9:00-9:30/MG", "2:00/DAVID" (a name, not
 * a time) — none of which is a safe, unambiguous slot. We only auto-place a job
 * on the timeline when the time is an exact HH:mm; everything else stays in the
 * unscheduled queue for the dispatcher to place by hand. Returns "HH:mm".
 */
function parseClockTime(value: string | null): string | null {
  if (!value) return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return `${String(h).padStart(2, '0')}:${m[2]}`
}

/** Fields produced from a GS Retrofit request. The sync action picks subsets of
 *  this for insert vs. update (update never touches scheduling-owned fields). */
export interface MappedJob {
  title: string
  address: string
  city: string
  state: string
  zip_code: string
  requested_date: string | null
  requested_time_preference: string | null
  status: JobStatus
  /** Reverse-mapped local inspector UUID, or null. */
  assigned_to: string | null
  /**
   * GS Retrofit's confirmed appointment, mirrored onto our scheduling fields so
   * the job lands on the dispatch timeline. Non-null only when GS Retrofit has a
   * confirmed request with an exact HH:mm time and a mapped inspector — i.e. a
   * fully placeable appointment. Otherwise null and the job sits in the queue.
   */
  scheduled_date: string | null
  scheduled_time: string | null
  dispatch_status: 'scheduled' | 'unscheduled'
  notes: string | null
  schedule_notes: string | null
  gsretrofit_inspection_request_id: number
}

/**
 * Map a GS Retrofit inspection request to local job fields.
 * @param localInspectorIdByGsrId GS Retrofit numeric id -> local inspector UUID.
 */
export function mapInspectionRequestToJob(
  req: GsrInspectionRequest,
  localInspectorIdByGsrId: Map<number, string>
): MappedJob {
  const assignedTo =
    req.assignedInspectorId != null
      ? localInspectorIdByGsrId.get(req.assignedInspectorId) ?? null
      : null

  // GS Retrofit notes + access annotation (no dedicated access column locally).
  const notes =
    [req.notes?.trim() || null, req.access ? `Access: ${req.access}` : null]
      .filter(Boolean)
      .join('\n') || null

  // Keep the GS Retrofit reference, the (possibly freeform) requested time, and
  // the source link where the dispatcher can see them. requested_time can be
  // freeform (e.g. "2:00/DAVID"), so we surface it rather than guess a preference.
  const scheduleNotes =
    `GS Retrofit #${req.id} · requested ${normalizeDate(req.requestedDate) ?? '—'} ${req.requestedTime ?? ''}`.trim() +
    (req.sourceUrl ? ` · ${req.sourceUrl}` : '')

  // Mirror GS Retrofit's confirmed appointment onto our scheduling fields.
  // GS Retrofit is the system of record for confirmation, so a confirmed request
  // with an exact time and a mapped inspector is a real, placed appointment —
  // surface it on the timeline. Anything short of that (not confirmed, freeform
  // time, or an unmapped inspector) stays unscheduled and the dispatcher places
  // it from the queue.
  const confirmedDate = req.status === 'confirmed' ? normalizeDate(req.requestedDate) : null
  const confirmedTime = req.status === 'confirmed' ? parseClockTime(req.requestedTime) : null
  const placeable = Boolean(confirmedDate && confirmedTime && assignedTo)

  return {
    title: mapType(req.type),
    address: req.propertyAddress,
    city: req.city,
    state: req.state,
    zip_code: req.zip,
    requested_date: normalizeDate(req.requestedDate),
    requested_time_preference: null,
    status: mapGsrStatusToLocal(req.status),
    assigned_to: assignedTo,
    scheduled_date: placeable ? confirmedDate : null,
    scheduled_time: placeable ? confirmedTime : null,
    dispatch_status: placeable ? 'scheduled' : 'unscheduled',
    notes,
    schedule_notes: scheduleNotes,
    gsretrofit_inspection_request_id: req.id,
  }
}
