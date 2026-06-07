// Schedule write-back to GS Retrofit (the system of record).
//
// Orchestration that sits between DisptchMama's local scheduling mutation and
// the GS Retrofit HTTP client. Called from updateSchedule() after a local
// schedule is persisted. Translates local identity (inspector UUID, job UUID)
// into GS Retrofit's numeric ids and POSTs the assignment back.
//
// Business rules (non-negotiable):
//  - The assignment is INTERNAL/PENDING. We never tell GS Retrofit to confirm —
//    the POST carries only date/time/inspector/job-id, no status. Customer-facing
//    confirmation is GS Retrofit's separate workflow.
//  - We log an append-only status-history entry noting it was scheduled from
//    DisptchMama, without overwriting the job's customer-facing status.
//  - Graceful degradation: a GS Retrofit failure must NOT break local dispatch.
//    Callers treat the returned result as advisory; the local schedule stands.

import { createClient } from '@/lib/supabase/server'
import { scheduleInspection } from '@/services/integrations/gsretrofit'
import type { GsRetrofitWriteback } from '@/lib/scheduling/writeback-result'

export type { GsRetrofitWriteback }

export interface WriteBackParams {
  jobId: string
  /** GS Retrofit inspection-request id from the job, or null if not linked. */
  gsrInspectionRequestId: number | null
  /** Local inspector UUID currently assigned (jobs.assigned_to). */
  inspectorUuid: string
  /** Effective scheduled date — normalized to YYYY-MM-DD before sending. */
  scheduledDate: string
  /** Effective scheduled time — normalized to HH:mm before sending. */
  scheduledTime: string
  /** Auth user id, recorded as changed_by on the history entry. */
  changedBy: string
  /** Job's current status — recorded unchanged on the history entry (no transition). */
  currentStatus: string
}

/**
 * Write a DisptchMama scheduling assignment back to GS Retrofit.
 * Never throws — returns a typed result so the caller can degrade gracefully.
 */
export async function writeBackSchedule(
  params: WriteBackParams
): Promise<GsRetrofitWriteback> {
  const {
    jobId,
    gsrInspectionRequestId,
    inspectorUuid,
    scheduledDate,
    scheduledTime,
    changedBy,
    currentStatus,
  } = params

  // Manual / non-GS-Retrofit job — nothing to write back to.
  if (gsrInspectionRequestId == null) {
    return { attempted: false, reason: 'job-not-linked' }
  }

  try {
    const supabase = await createClient()

    // Resolve the assigned inspector's GS Retrofit numeric id.
    const { data: inspector } = await supabase
      .from('inspectors')
      .select('gsretrofit_inspector_id')
      .eq('id', inspectorUuid)
      .single()

    const gsrInspectorId = inspector?.gsretrofit_inspector_id ?? null
    if (gsrInspectorId == null) {
      return {
        attempted: true,
        ok: false,
        reason: 'inspector-not-linked',
        message:
          'The assigned inspector is not linked to a GS Retrofit inspector id, so the schedule could not be written back.',
      }
    }

    // Normalize to the formats GS Retrofit expects (local values may carry
    // seconds or an ISO date prefix).
    const date = scheduledDate.slice(0, 10) // YYYY-MM-DD
    const time = scheduledTime.slice(0, 5) // HH:mm

    const result = await scheduleInspection(gsrInspectionRequestId, {
      scheduled_date: date,
      scheduled_time: time,
      inspector_id: gsrInspectorId,
      dispatchmama_job_id: jobId,
    })

    if (!result.ok) {
      return { attempted: true, ok: false, reason: 'api-error', message: result.error.message }
    }

    // Append-only log. from/to status are identical (no transition) — this is an
    // annotation that the internal/pending assignment was pushed to GS Retrofit.
    await supabase.from('job_status_history').insert({
      job_id: jobId,
      changed_by: changedBy,
      from_status: currentStatus,
      to_status: currentStatus,
      note: `Scheduled from DisptchMama → GS Retrofit inspection #${gsrInspectionRequestId} (internal/pending; ${date} ${time})`,
    })

    return { attempted: true, ok: true, gsrInspectionRequestId }
  } catch (err) {
    return {
      attempted: true,
      ok: false,
      reason: 'api-error',
      message: err instanceof Error ? err.message : String(err),
    }
  }
}
