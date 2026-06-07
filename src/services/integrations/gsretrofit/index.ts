// GS Retrofit Dispatch API integration — public surface.
//
// GS Retrofit is the system of record for inspection requests, inspectors, and
// schedules. DisptchMama reads from it (Phase 1) and writes scheduling
// assignments back (Phase 2). All calls are server-side only.

export {
  getInspectionRequests,
  getInspectors,
  getInspectorSchedule,
  getSchedules,
  scheduleInspection,
} from './calls'

export { gsrRequest } from './client'
export type { GsrResult, GsrError } from './client'

export type {
  GsrInspectionRequest,
  GsrInspectionStatus,
  GsrInspector,
  GsrInspectorScheduleStop,
  GsrScheduleStop,
  GsrSchedulePayload,
} from './types'
