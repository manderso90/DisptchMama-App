'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const SCHEDULING_FIELDS = [
  'assigned_to',
  'scheduled_date',
  'scheduled_time',
  'scheduled_end',
  'estimated_duration_minutes',
  'dispatch_status',
  'status',
]

/**
 * Subscribe to jobs table changes via Supabase realtime.
 * Triggers router.refresh() when scheduling-related fields change,
 * enabling cross-tab / cross-user sync on any scheduling page.
 */
export function useScheduleSync() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('schedule-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
        },
        (payload) => {
          const oldData = payload.old as Record<string, unknown>
          const newData = payload.new as Record<string, unknown>

          const changed =
            payload.eventType === 'INSERT' ||
            payload.eventType === 'DELETE' ||
            SCHEDULING_FIELDS.some((f) => oldData[f] !== newData[f])

          if (changed) {
            router.refresh()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])
}
