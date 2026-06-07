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
  /** Reverse-mapped local inspector UUID, or null. Applied on INSERT only. */
  assigned_to: string | null
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
    req.assigned_inspector_id != null
      ? localInspectorIdByGsrId.get(req.assigned_inspector_id) ?? null
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
    `GS Retrofit #${req.id} · requested ${normalizeDate(req.requested_date) ?? '—'} ${req.requested_time ?? ''}`.trim() +
    (req.source_url ? ` · ${req.source_url}` : '')

  return {
    title: mapType(req.type),
    address: req.property_address,
    city: req.city,
    state: req.state,
    zip_code: req.zip,
    requested_date: normalizeDate(req.requested_date),
    requested_time_preference: null,
    status: mapGsrStatusToLocal(req.status),
    assigned_to: assignedTo,
    notes,
    schedule_notes: scheduleNotes,
    gsretrofit_inspection_request_id: req.id,
  }
}
