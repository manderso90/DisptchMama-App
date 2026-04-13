'use client'

import { useState, useTransition } from 'react'
import { updateJobStatus } from '@/lib/actions/job-actions'
import { getNextStatuses, TERMINAL_STATUSES } from '@/services/job-lifecycle'
import type { JobStatus } from '@/types/database'

const statusLabel: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  on_hold: 'On Hold',
}

const statusBadge: Record<string, string> = {
  pending: 'bg-[#FDE047]/20 text-amber-800 border-amber-400',
  confirmed: 'bg-[#2563EB]/10 text-blue-800 border-blue-400',
  in_progress: 'bg-purple-100 text-purple-800 border-purple-400',
  completed: 'bg-green-100 text-green-800 border-green-400',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-400',
  on_hold: 'bg-slate-100 text-slate-600 border-slate-400',
}

interface JobStatusControlProps {
  jobId: string
  currentStatus: JobStatus
}

export function JobStatusControl({ jobId, currentStatus }: JobStatusControlProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const nextStatuses = getNextStatuses(currentStatus)
  const isTerminal = (TERMINAL_STATUSES as readonly string[]).includes(currentStatus)

  function handleStatusChange(newStatus: JobStatus) {
    setError('')
    startTransition(async () => {
      try {
        await updateJobStatus(jobId, newStatus)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update status')
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-500">Status</span>
        <span className={`text-xs px-2.5 py-1 rounded-md font-bold border-2 ${statusBadge[currentStatus] ?? statusBadge.pending}`}>
          {statusLabel[currentStatus] ?? currentStatus}
        </span>
      </div>

      {!isTerminal && nextStatuses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {nextStatuses.map((status) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              disabled={isPending}
              className="text-xs px-3 py-1.5 rounded-md border-2 border-black font-medium bg-white hover:bg-[#FDE047]/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? '...' : `→ ${statusLabel[status]}`}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-md border border-red-300">{error}</p>
      )}
    </div>
  )
}
