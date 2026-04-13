'use client'

import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { JobBlock } from './JobBlock'
import type { DispatchInspector, DispatchJob } from '@/lib/queries/dispatch'

// Time grid: 9AM to 5PM = 9 hours
const HOURS = Array.from({ length: 9 }, (_, i) => i + 9)
const GRID_START_HOUR = 9
const HOUR_WIDTH_PX = 120 // pixels per hour

// 30-minute time slots for drop targets
const TIME_SLOTS: { hour: number; minute: number; label: string }[] = []
for (let h = GRID_START_HOUR; h < 18; h++) {
  for (const m of [0, 30]) {
    const hh = String(h).padStart(2, '0')
    const mm = String(m).padStart(2, '0')
    TIME_SLOTS.push({ hour: h, minute: m, label: `${hh}:${mm}` })
  }
}

function formatHour(hour: number): string {
  if (hour === 12) return '12 PM'
  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`
}

function TimeSlot({
  inspectorId,
  hour,
  minute,
  timeLabel,
}: {
  inspectorId: string
  hour: number
  minute: number
  timeLabel: string
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${inspectorId}-${timeLabel}`,
    data: { inspectorId, time: timeLabel },
  })

  const left = (hour + minute / 60 - GRID_START_HOUR) * HOUR_WIDTH_PX

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'absolute top-0 bottom-0 transition-colors',
        isOver ? 'bg-[#FDE047]/40' : 'bg-transparent'
      )}
      style={{ left, width: HOUR_WIDTH_PX / 2 }}
    />
  )
}

function InspectorRow({
  inspector,
  onEditJob,
}: {
  inspector: DispatchInspector
  onEditJob: (job: DispatchJob, inspectorId: string) => void
}) {
  return (
    <div className="flex border-b border-slate-100 min-h-[60px]">
      {/* Inspector name (sticky) */}
      <div className="w-40 shrink-0 px-3 py-2.5 bg-white border-r-2 border-black sticky left-0 z-10 flex items-center gap-2">
        <div
          className={cn(
            'w-2 h-2 rounded-full shrink-0',
            inspector.jobs.length > 0 ? 'bg-green-500' : 'bg-slate-300'
          )}
        />
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-700 truncate">
            {inspector.full_name || 'Unknown'}
          </p>
          <p className="text-xs text-slate-400">
            {inspector.jobs.length} {inspector.jobs.length === 1 ? 'job' : 'jobs'}
          </p>
        </div>
      </div>

      {/* Timeline lane */}
      <div
        className="flex-1 relative bg-white"
        style={{ minWidth: HOURS.length * HOUR_WIDTH_PX }}
      >
        {/* Hour gridlines */}
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="absolute top-0 bottom-0 border-l border-slate-100"
            style={{ left: (hour - GRID_START_HOUR) * HOUR_WIDTH_PX }}
          />
        ))}

        {/* Droppable time slots */}
        {TIME_SLOTS.map((slot) => (
          <TimeSlot
            key={slot.label}
            inspectorId={inspector.id}
            hour={slot.hour}
            minute={slot.minute}
            timeLabel={slot.label}
          />
        ))}

        {/* Job blocks */}
        {inspector.jobs.map((job) => (
          <JobBlock
            key={job.id}
            job={job}
            gridStartHour={GRID_START_HOUR}
            hourWidthPx={HOUR_WIDTH_PX}
            onEdit={() => onEditJob(job, inspector.id)}
            inspectorId={inspector.id}
          />
        ))}
      </div>
    </div>
  )
}

interface RegionGroup {
  region: string
  inspectors: DispatchInspector[]
}

export function TimelineGrid({
  regionGroups,
  onEditJob,
}: {
  regionGroups: RegionGroup[]
  onEditJob: (job: DispatchJob, inspectorId: string) => void
}) {
  return (
    <div className="bg-white border-2 border-black rounded-lg overflow-hidden h-full flex flex-col neo-shadow">
      <div className="overflow-x-auto flex-1 min-h-0 flex flex-col">
        {/* Time axis header — sticky at top */}
        <div className="flex border-b-2 border-black bg-[#FFFDF5] sticky top-0 z-20">
          <div className="w-40 shrink-0 px-3 py-2 border-r-2 border-black sticky left-0 z-30 bg-[#FFFDF5]">
            <span className="text-xs font-medium text-slate-500 font-[Syne]">Inspector</span>
          </div>
          <div className="flex-1 relative" style={{ minWidth: HOURS.length * HOUR_WIDTH_PX }}>
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute top-0 bottom-0 flex items-center border-l border-slate-200"
                style={{ left: (hour - GRID_START_HOUR) * HOUR_WIDTH_PX }}
              >
                <span className="text-xs text-slate-400 font-medium px-2 py-2">
                  {formatHour(hour)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Inspector rows — scrollable with max height, grouped by region */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {regionGroups.length > 0 ? (
            regionGroups.map((group) => (
              <div key={group.region}>
                {/* Region header */}
                <div className="flex border-b-2 border-black bg-[#2563EB]/10">
                  <div className="w-40 shrink-0 px-3 py-1.5 border-r-2 border-black sticky left-0 z-10 bg-[#2563EB]/10">
                    <span className="text-xs font-semibold text-[#2563EB] uppercase tracking-wide font-[Syne]">
                      {group.region}
                    </span>
                  </div>
                  <div className="flex-1" style={{ minWidth: HOURS.length * HOUR_WIDTH_PX }} />
                </div>
                {/* Inspector rows for this region */}
                {group.inspectors.map((inspector) => (
                  <InspectorRow key={inspector.id} inspector={inspector} onEditJob={onEditJob} />
                ))}
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-sm text-slate-400">
              No active inspectors found. Add inspectors on the Inspectors page.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
