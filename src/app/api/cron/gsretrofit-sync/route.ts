// Scheduled inbound sync — pulls new GS Retrofit inspection requests into the
// job queue without a logged-in user. Triggered by Vercel Cron (see vercel.json).
//
// Auth: Vercel Cron automatically sends `Authorization: Bearer <CRON_SECRET>`
// when the CRON_SECRET env var is set. We reject anything else, so the endpoint
// can't be triggered by the public.
//
// Runs with the service-role client (bypasses RLS); history entries are logged
// with changed_by = null (system actor).

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runInspectionSync } from '@/lib/actions/gsretrofit-sync-core'
import { revalidatePath } from 'next/cache'

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = createAdminClient()
  const result = await runInspectionSync(supabase, null)

  // Refresh server-rendered pages so open tabs pick up new rows promptly.
  revalidatePath('/admin/jobs')
  revalidatePath('/admin/dispatch')

  return NextResponse.json(result, { status: result.ok ? 200 : 502 })
}
