// GS Retrofit Dispatch API — typed call functions.
//
// Phase 1 (reads): the four GET endpoints.
// Phase 2 (write-back): scheduleInspection() POST. The GET data is confirmed
// flowing (verified 2026-06-07), so the POST client wrapper is unblocked.
// Wiring it into the dispatch action still depends on the inspector-ID mapping.
//
// Every function returns a GsrResult<T> — branch on `.ok` rather than try/catch.

import { gsrRequest, type GsrResult } from './client'
import type {
  GsrInspectionRequest,
  GsrInspectionStatus,
  GsrInspector,
  GsrInspectorScheduleStop,
  GsrScheduleStop,
  GsrSchedulePayload,
} from './types'

/**
 * GET /inspection-requests — open/in-flight inspection requests.
 * All filters are optional.
 */
export function getInspectionRequests(params?: {
  /** ISO 8601 timestamp — only requests updated since this moment. */
  updated_since?: string
  status?: GsrInspectionStatus
  region?: string
}): Promise<GsrResult<GsrInspectionRequest[]>> {
  return gsrRequest<GsrInspectionRequest[]>('/inspection-requests', { query: params })
}

/**
 * GET /inspectors — canonical inspector roster.
 * Optionally filter to inspectors covering a given ZIP.
 */
export function getInspectors(params?: {
  zip_code?: string
}): Promise<GsrResult<GsrInspector[]>> {
  return gsrRequest<GsrInspector[]>('/inspectors', { query: params })
}

/**
 * GET /inspectors/{inspector_id}/schedule — one inspector's booked stops.
 * @param inspectorId GS Retrofit numeric inspector id.
 */
export function getInspectorSchedule(
  inspectorId: number,
  params?: {
    /** YYYY-MM-DD */
    date?: string
  }
): Promise<GsrResult<GsrInspectorScheduleStop[]>> {
  return gsrRequest<GsrInspectorScheduleStop[]>(
    `/inspectors/${inspectorId}/schedule`,
    { query: params }
  )
}

/**
 * GET /schedules?date=YYYY-MM-DD — all booked stops on a date.
 * @param date Required — YYYY-MM-DD.
 */
export function getSchedules(date: string): Promise<GsrResult<GsrScheduleStop[]>> {
  return gsrRequest<GsrScheduleStop[]>('/schedules', { query: { date } })
}

/**
 * POST /inspection-requests/{id}/schedule — write a scheduling assignment back.
 *
 * `payload.inspector_id` MUST be the GS Retrofit numeric inspector id — never a
 * name and never DisptchMama's local UUID. On success returns the updated
 * inspection record; on a 400 the typed error carries GS Retrofit's message.
 *
 * @param inspectionRequestId The numeric GS Retrofit inspection request id.
 */
export function scheduleInspection(
  inspectionRequestId: number,
  payload: GsrSchedulePayload
): Promise<GsrResult<GsrInspectionRequest>> {
  return gsrRequest<GsrInspectionRequest>(
    `/inspection-requests/${inspectionRequestId}/schedule`,
    { method: 'POST', body: payload }
  )
}
