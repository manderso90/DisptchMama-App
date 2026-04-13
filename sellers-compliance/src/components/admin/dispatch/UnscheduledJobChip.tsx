'use client'

import { useDraggable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { MapPin, Calendar, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import type { UnscheduledJob } from '@/lib/queries/dispatch'

const TIME_LABELS: Record<string, string> = {
  morning: 'AM',
  afternoon: 'PM',
  anytime: 'Any',
  flexible: 'Flex',
}

function getCardRingClass(job: UnscheduledJob): string {
  if (job.requested_date) {
    const reqDate = new Date(job.requested_date + 'T12:00:00')
    const today = new Date()
    if (
      reqDate.getFullYear() === today.getFullYear() &&
      reqDate.getMonth() === today.getMonth() &&
      reqDate.getDate() === today.getDate()
    ) {
      return 'ring-2 ring-red-500 border-2 border-red-500'
    }
  }
  return 'ring-2 ring-[#2563EB] border-2 border-black'
}

export function UnscheduledJobChip({ job }: { job: UnscheduledJob }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `unscheduled-${job.id}`,
    data: { job },
  })

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
        zIndex: isDragging ? 50 : undefined,
      }
    : undefined

  const requestedStr = job.requested_date
    ? format(new Date(job.requested_date + 'T12:00:00'), 'EEE M/d')
    : null

  const timeLabel = job.requested_time_preference
    ? TIME_LABELS[job.requested_time_preference] ?? null
    : null

  const ringClass = getCardRingClass(job)

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={cn(
        'flex-shrink-0 bg-white rounded-lg px-3 py-2 min-w-[180px] max-w-[260px]',
        'cursor-grab active:cursor-grabbing select-none transition-shadow',
        ringClass,
        isDragging ? 'shadow-lg opacity-80 ring-2 ring-[#2563EB]' : 'neo-shadow-sm hover:shadow-md'
      )}
    >
      {/* Address */}
      <div className="flex items-start gap-1.5 mb-1">
        <MapPin className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
        <p className="text-xs font-medium text-slate-800 truncate">
          {job.address ?? 'Unknown'}
        </p>
      </div>

      {/* Lockbox indicator */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className={cn(
          'text-[10px] font-medium px-1.5 py-0.5 rounded',
          job.has_lockbox
            ? 'bg-green-50 text-green-700'
            : 'bg-orange-50 text-orange-600'
        )}>
          {job.has_lockbox ? 'Lock Box' : 'No Lock Box'}
        </span>
      </div>

      {/* Requested date, time preference, and duration */}
      <div className="flex items-center gap-1.5 mt-1">
        <Calendar className="w-3 h-3 text-slate-300 shrink-0" />
        <div className="flex items-center gap-1 text-xs text-slate-400 truncate">
          {requestedStr && <span>{requestedStr}</span>}
          {timeLabel && (
            <>
              <span className="text-slate-300">&middot;</span>
              <span>{timeLabel}</span>
            </>
          )}
          <span className="text-slate-300">&middot;</span>
          <span>{job.estimated_duration_minutes}m</span>
        </div>
      </div>

      {/* Notes */}
      {job.notes && (
        <div className="flex items-start gap-1.5 mt-1.5">
          <MessageSquare className="w-3 h-3 text-slate-300 mt-0.5 shrink-0" />
          <p className="text-[11px] text-slate-400 line-clamp-2 leading-tight">
            {job.notes}
          </p>
        </div>
      )}
    </div>
  )
}
