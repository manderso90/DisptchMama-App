'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateSchedule } from '@/lib/actions/schedule-mutations'
import { ScheduleToast, useScheduleToast } from './ScheduleToast'
import { CalendarX } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickScheduleActionsProps {
  jobId: string
  currentTeamMemberId: string | null
  currentTeamMemberName?: string | null
}

export function QuickScheduleActions({
  jobId,
  currentTeamMemberId,
  currentTeamMemberName,
}: QuickScheduleActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { toastMessage, showToast, hideToast } = useScheduleToast()

  async function handleUnschedule() {
    startTransition(async () => {
      await updateSchedule({
        jobId,
        assignedTo: null,
        scheduledDate: null,
        scheduledTime: null,
      })
      showToast(`Unscheduled${currentTeamMemberName ? ` from ${currentTeamMemberName}` : ''}`)
      router.refresh()
    })
  }

  const btnClass = cn(
    'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors',
    'border-2 border-black text-slate-600 hover:bg-[#FDE047]/20',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  )

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {currentTeamMemberId && (
        <button
          onClick={handleUnschedule}
          disabled={isPending}
          className={btnClass}
          title="Remove schedule and team member assignment"
        >
          <CalendarX className="w-3.5 h-3.5" />
          Unschedule
        </button>
      )}

      {toastMessage && <ScheduleToast message={toastMessage} onDismiss={hideToast} />}
    </div>
  )
}
