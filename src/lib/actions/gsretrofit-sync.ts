'use server'

// Authenticated entry point for the inbound sync — backs the "Sync from GS
// Retrofit" button. The actual pull/upsert logic lives in gsretrofit-sync-core
// so the cron route can reuse it without a user session.

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { runInspectionSync, type SyncResult } from './gsretrofit-sync-core'

export type { SyncResult }

export async function syncInspectionRequests(): Promise<SyncResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const result = await runInspectionSync(supabase, user.id)

  revalidatePath('/admin/jobs')
  revalidatePath('/admin/dispatch')
  return result
}
