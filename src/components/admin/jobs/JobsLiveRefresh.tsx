'use client'

import { useScheduleSync } from '@/lib/hooks/use-schedule-sync'

/**
 * Mount-only component: subscribes to Supabase realtime on the jobs table and
 * calls router.refresh() on inserts/updates. Lets the Jobs page pick up rows
 * created by the scheduled sync (or another user) without a manual reload.
 */
export function JobsLiveRefresh() {
  useScheduleSync()
  return null
}
