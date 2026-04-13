'use client'

import { useDraggable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import type { DispatchJob } from '@/lib/queries/dispatch'

const statusColors: Record<string, string> = {
  pending: 'bg-[#FDE047] border-2 border-black text-black',
  confirmed: 'bg-[#2563EB]/20 border-2 border-[#2563EB] text-blue-900',
  in_progress: 'bg-[#F9A8D4] border-2 border-black text-black',
  completed: 'bg-green-200 border-2 border-green-700 text-green-900',
  cancelled: 'bg-slate-200 border-2 border-slate-500 text-slate-600',
  on_hold: 'bg-slate-200 border-2 border-slate-500 text-slate-700',
}

interface JobBlockProps {
  job: DispatchJob
  gridStartHour: number
  hourWidthPx: number
  onEdit: () => void
  inspectorId: string
}

export function JobBlock({ job, gridStartHour, hourWidthPx, onEdit, inspectorId }: JobBlockProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `scheduled-${job.id}`,
    data: { job, inspectorId, type: 'scheduled' },
  })

  if (!job.scheduled_time) return null

  // Parse scheduled_time (HH:MM:SS or HH:MM format)
  const [hours, minutes] = job.scheduled_time.split(':').map(Number)
  const startOffsetHours = hours + minutes / 60 - gridStartHour
  const durationHours = (job.estimated_duration_minutes ?? 60) / 60

  // Skip if outside visible range
  if (startOffsetHours + durationHours < 0) return null

  const left = Math.max(0, startOffsetHours * hourWidthPx)
  const width = Math.max(40, durationHours * hourWidthPx - 4) // min 40px, 4px gap

  const address = job.address ?? 'Unknown'
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 || 12
  const timeStr = `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`
  const colorClass = statusColors[job.status] ?? statusColors.confirmed

  const style: React.CSSProperties = {
    left,
    width,
    ...(transform
      ? {
          transform: `translate(${transform.x}px, ${transform.y}px)`,
          zIndex: 50,
        }
      : {}),
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        if (!isDragging) {
          e.stopPropagation()
          onEdit()
        }
      }}
      className={cn(
        'absolute top-1.5 bottom-1.5 rounded-lg px-2 py-1 overflow-hidden',
        'cursor-grab active:cursor-grabbing transition-shadow flex flex-col justify-center text-left select-none',
        colorClass,
        isDragging ? 'shadow-lg opacity-80 ring-2 ring-[#2563EB]' : 'neo-shadow-sm hover:shadow-md'
      )}
      style={style}
      title={`${address} · ${timeStr} · ${job.estimated_duration_minutes}min · ${job.has_lockbox ? 'Lock Box' : 'No Lock Box'} — Drag to reschedule`}
    >
      <p className="text-xs font-medium truncate leading-tight">{address}</p>
      <p className="text-xs opacity-70 truncate leading-tight">{timeStr}</p>
      <p className="text-[10px] opacity-60 truncate leading-tight">
        {job.has_lockbox ? 'Lock Box' : 'No Lock Box'}
      </p>
    </div>
  )
}
