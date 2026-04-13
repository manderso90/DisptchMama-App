'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { ChevronDown, ChevronUp, Undo2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UnscheduledJobChip } from './UnscheduledJobChip'
import type { UnscheduledJob } from '@/lib/queries/dispatch'

export function UnscheduledQueue({ jobs }: { jobs: UnscheduledJob[] }) {
  const [expanded, setExpanded] = useState(jobs.length > 0)

  const { setNodeRef, isOver } = useDroppable({
    id: 'unscheduled-drop-zone',
    data: { type: 'unschedule' },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'bg-white border-2 border-black rounded-lg overflow-hidden transition-colors neo-shadow-sm',
        isOver
          ? 'border-[#FDE047] bg-[#FDE047]/20 ring-2 ring-[#FDE047]'
          : 'border-black'
      )}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-800 font-[Syne]">Unscheduled Jobs</h3>
          {jobs.length > 0 && (
            <span className="bg-[#FDE047] text-black border border-black text-xs font-bold rounded-full px-2 py-0.5">
              {jobs.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isOver && (
            <span className="text-xs text-black font-medium flex items-center gap-1">
              <Undo2 className="w-3 h-3" /> Drop to unschedule
            </span>
          )}
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 py-3">
          {jobs.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {jobs.map((job) => (
                <UnscheduledJobChip key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-3">
              No unscheduled jobs. All caught up!
            </p>
          )}
        </div>
      )}
    </div>
  )
}
