// DEV-ONLY verification route for the GS Retrofit Dispatch API integration.
//
// Returns 404 in production. Exercises all four GET endpoints and returns the
// parsed results (with counts + a small sample) so we can confirm real data is
// flowing before wiring the POST write-back path.
//
//   GET /api/debug/gsretrofit
//   GET /api/debug/gsretrofit?date=2026-05-12   (probes /schedules for that date)
//
// This file lives under api/debug and is intentionally not linked from any UI.

import { NextRequest, NextResponse } from 'next/server'
import { format } from 'date-fns'
import {
  getInspectionRequests,
  getInspectors,
  getInspectorSchedule,
  getSchedules,
  type GsrResult,
} from '@/services/integrations/gsretrofit'

/** Summarize a GsrResult into something compact and human-readable. */
function summarize<T>(result: GsrResult<T[]>, sampleSize = 2) {
  if (!result.ok) {
    return { ok: false, error: result.error }
  }
  return {
    ok: true,
    count: result.data.length,
    sample: result.data.slice(0, sampleSize),
  }
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 })
  }

  // Fail loudly with a clear message if the key is missing (getApiKey throws).
  if (!process.env.GSRETROFIT_DISPATCH_API_KEY) {
    return NextResponse.json(
      { error: 'GSRETROFIT_DISPATCH_API_KEY is not set in .env.local' },
      { status: 500 }
    )
  }

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') ?? format(new Date(), 'yyyy-MM-dd')

  // 1. Inspection requests
  const inspectionRequests = await getInspectionRequests()

  // 2. Inspector roster
  const inspectors = await getInspectors()

  // 3. One inspector's schedule — probe using the first inspector returned above
  const firstInspectorId =
    inspectors.ok && inspectors.data[0] ? inspectors.data[0].id : undefined
  const inspectorSchedule: GsrResult<unknown[]> =
    firstInspectorId !== undefined
      ? await getInspectorSchedule(firstInspectorId, { date })
      : {
          ok: false,
          error: {
            status: null,
            message: 'No inspectors returned, so could not probe an inspector schedule.',
          },
        }

  // 4. All booked stops on a date
  const schedules = await getSchedules(date)

  return NextResponse.json({
    probedAt: new Date().toISOString(),
    date,
    probedInspectorId: firstInspectorId ?? null,
    results: {
      inspectionRequests: summarize(inspectionRequests),
      inspectors: summarize(inspectors),
      inspectorSchedule: summarize(inspectorSchedule),
      schedules: summarize(schedules),
    },
  })
}
