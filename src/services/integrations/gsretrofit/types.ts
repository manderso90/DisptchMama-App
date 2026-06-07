// GS Retrofit Dispatch API — response/request types.
//
// These mirror the live OpenAPI spec EXACTLY. GS Retrofit is the system of
// record; do not reshape these to match DisptchMama's internal models here.
// Any translation to local types happens in the queries/actions layer.
//
// OpenAPI: https://gsretrofit.com/api/rest/dispatch/open-api.json

/**
 * Inspection-request status enum — note these use SPACES, not underscores.
 * Do NOT map these to DisptchMama's internal snake_case JobStatus without an
 * explicit, intentional translation layer.
 */
export type GsrInspectionStatus =
  | 'requested'
  | 'awaiting confirmation'
  | 'alternatives offered'
  | 'confirmed'
  | 'needs rescheduling'
  | 'on hold'
  | 'info needed'

/** GET /inspection-requests — one open/in-flight inspection request. */
export interface GsrInspectionRequest {
  id: number
  type: string
  property_address: string
  city: string
  state: string
  zip: string
  /** Live API returns a full ISO 8601 timestamp (doc says YYYY-MM-DD). Normalize before date-equality. */
  requested_date: string
  /** Usually HH:mm, but can be freeform (e.g. "2:00/DAVID"). */
  requested_time: string
  status: GsrInspectionStatus
  source_url: string
  access: string
  notes: string | null
  /** ISO 8601 timestamp */
  created_at: string
  /** ISO 8601 timestamp */
  updated_at: string
  /** GS Retrofit numeric inspector id, or null if unassigned. */
  assigned_inspector_id: number | null
}

/** GET /inspectors — one canonical roster entry. */
export interface GsrInspector {
  id: number
  name: string
  /** ZIP codes this inspector covers. Coverage is zip-based, not region-based. */
  zip_codes: string[]
}

/** GET /inspectors/{inspector_id}/schedule — one booked stop for an inspector. */
export interface GsrInspectorScheduleStop {
  /** Live API returns a full ISO 8601 timestamp (doc says YYYY-MM-DD). Normalize before date-equality. */
  date: string
  /** Usually HH:mm, but can be freeform. */
  time: string
  address: string
  city: string
  state: string
  zip: string
}

/** GET /schedules?date=YYYY-MM-DD — one booked stop across all inspectors. */
export interface GsrScheduleStop {
  /**
   * GS Retrofit numeric inspector id.
   * NOTE: the live API returns this as camelCase `inspectorId`, not the
   * `inspector_id` shown in the OpenAPI doc — we match the live response.
   */
  inspectorId: number
  address: string
  city: string
  state: string
  zip: string
  /** Live API returns a full ISO 8601 timestamp here (the `date` filter still takes YYYY-MM-DD). */
  date: string
  /** Usually HH:mm, but can be freeform (e.g. "2:00/DAVID"). */
  time: string
}

/**
 * POST /inspection-requests/{id}/schedule — request body.
 * `inspector_id` is the GS Retrofit numeric id — NOT a name, NOT our local UUID.
 * Used in Phase 2 (write-back).
 */
export interface GsrSchedulePayload {
  /** YYYY-MM-DD */
  scheduled_date: string
  /** HH:mm */
  scheduled_time: string
  /** GS Retrofit numeric inspector id. */
  inspector_id: number
  /** DisptchMama job id (our job's identifier). */
  dispatchmama_job_id: string
}
