'use client'

import { formatDistanceToNow, format } from 'date-fns'
import type { JobStatusHistory } from '@/types/database'

const statusLabel: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  on_hold: 'On Hold',
}

interface JobHistoryProps {
  history: (JobStatusHistory & { changed_by_name: string | null })[]
}

export function JobHistory({ history }: JobHistoryProps) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-4">No status history recorded.</p>
    )
  }

  return (
    <div className="space-y-3">
      {history.map((entry) => (
        <div
          key={entry.id}
          className="flex items-start gap-3 text-sm"
        >
          <div className="w-2 h-2 rounded-full bg-slate-400 mt-1.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-slate-700">
              {entry.from_status ? (
                <>
                  <span className="font-medium">{statusLabel[entry.from_status] ?? entry.from_status}</span>
                  {' → '}
                  <span className="font-medium">{statusLabel[entry.to_status] ?? entry.to_status}</span>
                </>
              ) : (
                <span className="font-medium">{statusLabel[entry.to_status] ?? entry.to_status}</span>
              )}
            </p>
            {entry.note && (
              <p className="text-slate-500 text-xs mt-0.5">{entry.note}</p>
            )}
            <p className="text-slate-400 text-xs mt-0.5">
              {entry.changed_by_name ?? 'System'}
              {' · '}
              <span title={format(new Date(entry.created_at), 'PPpp')}>
                {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
              </span>
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
