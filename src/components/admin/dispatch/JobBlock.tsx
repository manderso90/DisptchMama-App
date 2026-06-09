'use client'

import { useDraggable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { timePercent, durationPercent, type DispatchWindow } from '@/lib/scheduling/dispatch-window'
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
  /** Visible time window — drives responsive %-based positioning. */
  win: DispatchWindow
  onEdit: () => void
  inspectorId: string
}

export function JobBlock({ job, win, onEdit, inspectorId }: JobBlockProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `scheduled-${job.id}`,
    data: { job, inspectorId, type: 'scheduled' },
  })

  if (!job.scheduled_time) return null

  // Parse scheduled_time (HH:MM:SS or HH:MM format)
  const [hours, minutes] = job.scheduled_time.split(':').map(Number)
  const startHours = hours + minutes / 60
  const durationMinutes = job.estimated_duration_minutes ?? 60
  const endHours = startHours + durationMinutes / 60

  const windowEndHour = win.visibleStartHour + win.spanHours

  // On a today view, hide work that has already finished — it's the past, and
  // the scheduler books the future. On any other date, keep everything visible.
  if (win.nowHours != null && endHours <= win.nowHours) return null

  // A job that began before the visible window but is still running clamps to
  // the left edge with a lead-in marker, so in-progress work is never lost.
  const startsBeforeWindow = startHours < win.visibleStartHour
  // A job scheduled at/after the window's end (e.g. an after-5PM time) would
  // position at ≥100% and disappear past the lane's clip — anchor it to the
  // right edge as a grabbable sliver instead so it stays visible and editable.
  const startsAfterWindow = startHours >= windowEndHour

  const leftPct = timePercent(hours, minutes, win)
  const widthPct = startsBeforeWindow
    ? Math.max(0, ((endHours - win.visibleStartHour) / win.spanHours) * 100)
    : durationPercent(durationMinutes, win)

  const address = job.address ?? 'Unknown'
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 || 12
  const timeStr = `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`
  const colorClass = statusColors[job.status] ?? statusColors.confirmed

  const transformStyle = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 }
    : {}
  const style: React.CSSProperties = startsAfterWindow
    ? { right: 2, width: 'auto', minWidth: 44, maxWidth: '45%', ...transformStyle }
    : { left: `${leftPct}%`, width: `calc(${widthPct}% - 4px)`, minWidth: 44, ...transformStyle }

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
        'absolute top-1 bottom-1 rounded-md px-1.5 py-0.5 overflow-hidden',
        'cursor-grab active:cursor-grabbing transition-shadow flex flex-col justify-center text-left select-none',
        colorClass,
        isDragging ? 'shadow-lg opacity-80 ring-2 ring-[#2563EB]' : 'neo-shadow-sm hover:shadow-md'
      )}
      style={style}
      title={`${address} · ${timeStr} · ${durationMinutes}min · ${job.has_lockbox ? 'Lock Box' : 'No Lock Box'} — Drag to reschedule`}
    >
      <p className="text-xs font-medium truncate leading-tight">
        {startsBeforeWindow && <span className="opacity-60">◀ </span>}
        {startsAfterWindow && <span className="opacity-60">▶ </span>}
        {address}
      </p>
      <p className="text-[11px] opacity-70 truncate leading-tight">
        {timeStr}
        {job.has_lockbox ? ' · 🔒' : ''}
      </p>
    </div>
  )
}
