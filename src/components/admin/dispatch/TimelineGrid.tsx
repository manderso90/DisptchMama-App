'use client'

import { useSyncExternalStore } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { JobBlock } from './JobBlock'
import {
  computeDispatchWindow,
  timePercent,
  END_HOUR,
  type DispatchWindow,
} from '@/lib/scheduling/dispatch-window'
import type { DispatchInspector, DispatchJob } from '@/lib/queries/dispatch'

interface RegionGroup {
  region: string
  inspectors: DispatchInspector[]
}

// Per-region accent palette. Region IS the column, so grouping costs no rows.
const REGION_STYLES: Record<string, { text: string; headerBg: string; nameTint: string }> = {
  Valley: { text: 'text-[#2563EB]', headerBg: 'bg-[#2563EB]/10', nameTint: 'bg-[#2563EB]/5' },
  'Los Angeles': { text: 'text-[#BE185D]', headerBg: 'bg-[#F9A8D4]/25', nameTint: 'bg-[#F9A8D4]/10' },
}
const DEFAULT_REGION_STYLE = { text: 'text-slate-600', headerBg: 'bg-slate-100', nameTint: 'bg-white' }

const NAME_COL = 'w-24' // 96px inspector name rail
const NAME_COL_LEFT = 'left-24' // matches NAME_COL for full-height lane overlays

function formatHour(hour: number): string {
  if (hour === 12) return '12PM'
  return hour > 12 ? `${hour - 12}PM` : `${hour}AM`
}

function formatClock(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  const period = h >= 12 ? 'PM' : 'AM'
  const dh = h % 12 || 12
  return `${dh}:${String(m).padStart(2, '0')} ${period}`
}

// A single shared minute-resolution clock, exposed via useSyncExternalStore so
// it's hydration-safe (server snapshot = 0 → the neutral full-day view) and
// ticks every minute without setState-in-effect cascades.
const clockListeners = new Set<() => void>()
let clockTimer: ReturnType<typeof setInterval> | null = null

function clockSubscribe(onChange: () => void): () => void {
  clockListeners.add(onChange)
  if (clockTimer == null) {
    clockTimer = setInterval(() => clockListeners.forEach((l) => l()), 60_000)
  }
  return () => {
    clockListeners.delete(onChange)
    if (clockListeners.size === 0 && clockTimer != null) {
      clearInterval(clockTimer)
      clockTimer = null
    }
  }
}
/** Minutes since the epoch — stable within a given minute, so renders only on tick. */
const clockClientSnapshot = () => Math.floor(Date.now() / 60_000)
const clockServerSnapshot = () => 0
/** No-op subscription so non-today views never register a listener or tick. */
const noopSubscribe = () => () => {}

/**
 * Live "now", or null during SSR/first paint and for any non-today view. The
 * window only reflows at hour boundaries; within an hour just the now-line
 * advances, so there's no need to freeze it during a drag. Non-today views use
 * a no-op subscription so they don't re-render every minute for no visual change.
 */
function useDispatchNow(active: boolean): Date | null {
  const minute = useSyncExternalStore(
    active ? clockSubscribe : noopSubscribe,
    clockClientSnapshot,
    clockServerSnapshot
  )
  if (!active || minute === 0) return null
  return new Date(minute * 60_000)
}

interface RegionAvailability {
  freeNow: number
  nextOpenLabel: string | null
}

/** "Who can take the next job, and when?" — computed live, no row re-sorting. */
function regionAvailability(
  inspectors: DispatchInspector[],
  nowMinutes: number | null
): RegionAvailability | null {
  if (nowMinutes == null) return null
  let freeNow = 0
  let earliestEnd: number | null = null
  for (const insp of inspectors) {
    let busy = false
    for (const j of insp.jobs) {
      if (!j.scheduled_time) continue
      const [h, m] = j.scheduled_time.split(':').map(Number)
      const start = h * 60 + m
      const end = start + (j.estimated_duration_minutes ?? 60)
      if (start <= nowMinutes && nowMinutes < end) {
        busy = true
        if (earliestEnd == null || end < earliestEnd) earliestEnd = end
      }
    }
    if (!busy) freeNow++
  }
  const nextOpenLabel = freeNow > 0 ? null : earliestEnd != null ? formatClock(earliestEnd) : null
  return { freeNow, nextOpenLabel }
}

function TimeSlot({
  inspectorId,
  timeLabel,
  leftPct,
  widthPct,
}: {
  inspectorId: string
  timeLabel: string
  leftPct: number
  widthPct: number
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${inspectorId}-${timeLabel}`,
    data: { inspectorId, time: timeLabel },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn('absolute top-0 bottom-0 transition-colors', isOver ? 'bg-[#FDE047]/40' : 'bg-transparent')}
      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
    />
  )
}

interface Slot {
  label: string
  leftPct: number
  widthPct: number
}
interface HourLine {
  hour: number
  leftPct: number
}

function InspectorRow({
  inspector,
  win,
  slots,
  hourLines,
  onEditJob,
  nameTint,
}: {
  inspector: DispatchInspector
  win: DispatchWindow
  slots: Slot[]
  hourLines: HourLine[]
  onEditJob: (job: DispatchJob, inspectorId: string) => void
  nameTint: string
}) {
  return (
    <div className="flex flex-1 min-h-0 border-b border-slate-100 last:border-b-0">
      {/* Name rail */}
      <div className={cn(NAME_COL, 'shrink-0 px-2 flex items-center gap-1.5 border-r-2 border-black', nameTint)}>
        <div
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            inspector.jobs.length > 0 ? 'bg-green-500' : 'bg-slate-300'
          )}
        />
        <p className="text-[11px] font-medium text-slate-700 truncate leading-tight min-w-0 flex-1">
          {inspector.full_name || 'Unknown'}
        </p>
        {inspector.jobs.length > 0 && (
          <span className="text-[10px] text-slate-400 shrink-0">{inspector.jobs.length}</span>
        )}
      </div>

      {/* Timeline lane */}
      <div className="flex-1 relative overflow-hidden">
        {hourLines.map(({ hour, leftPct }) => (
          <div
            key={hour}
            className="absolute top-0 bottom-0 border-l border-slate-100"
            style={{ left: `${leftPct}%` }}
          />
        ))}
        {slots.map((s) => (
          <TimeSlot
            key={s.label}
            inspectorId={inspector.id}
            timeLabel={s.label}
            leftPct={s.leftPct}
            widthPct={s.widthPct}
          />
        ))}
        {inspector.jobs.map((job) => (
          <JobBlock
            key={job.id}
            job={job}
            win={win}
            onEdit={() => onEditJob(job, inspector.id)}
            inspectorId={inspector.id}
          />
        ))}
      </div>
    </div>
  )
}

function RegionColumn({
  group,
  win,
  now,
  onEditJob,
}: {
  group: RegionGroup
  win: DispatchWindow
  now: Date | null
  onEditJob: (job: DispatchJob, inspectorId: string) => void
}) {
  const style = REGION_STYLES[group.region] ?? DEFAULT_REGION_STYLE
  const nowMinutes = now ? now.getHours() * 60 + now.getMinutes() : null
  const avail = regionAvailability(group.inspectors, nowMinutes)

  // Whole-hour gridlines + axis labels across the visible span.
  const hourLines: HourLine[] = []
  for (let h = win.visibleStartHour; h <= END_HOUR; h++) {
    hourLines.push({ hour: h, leftPct: timePercent(h, 0, win) })
  }

  // 30-minute drop slots within [visibleStartHour, END_HOUR).
  const slots: Slot[] = []
  const slotWidthPct = (0.5 / win.spanHours) * 100
  for (let h = win.visibleStartHour; h < END_HOUR; h++) {
    for (const m of [0, 30]) {
      const label = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      slots.push({ label, leftPct: timePercent(h, m, win), widthPct: slotWidthPct })
    }
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col min-h-0 border-r-2 border-black last:border-r-0">
      {/* Column header: region label + live availability + hour axis */}
      <div className={cn('shrink-0 border-b-2 border-black', style.headerBg)}>
        <div className="flex items-center gap-2 px-2 py-1">
          <span className={cn('text-[11px] font-semibold uppercase tracking-wide font-[Syne]', style.text)}>
            {group.region}
          </span>
          <span className="text-[10px] text-slate-500">{group.inspectors.length}</span>
          {avail && (
            <span className="ml-auto text-[10px] font-medium text-slate-600">
              {avail.freeNow > 0
                ? `${avail.freeNow} free now`
                : avail.nextOpenLabel
                  ? `next open ${avail.nextOpenLabel}`
                  : 'all booked'}
            </span>
          )}
        </div>
        <div className="flex">
          <div className={cn(NAME_COL, 'shrink-0 border-r-2 border-black')} />
          <div className="flex-1 relative h-4 overflow-hidden">
            {hourLines.map(({ hour, leftPct }) => (
              <span
                key={hour}
                className={cn(
                  'absolute top-0 text-[10px] text-slate-400 font-medium whitespace-nowrap',
                  leftPct >= 99 ? '-translate-x-full pr-0.5' : 'px-0.5'
                )}
                style={{ left: `${leftPct}%` }}
              >
                {formatHour(hour)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Body: flex-fill inspector lanes + a single now-line spanning all lanes */}
      <div className="flex-1 min-h-0 flex flex-col relative">
        {win.nowPercent != null && (
          <div className={cn('absolute top-0 bottom-0 right-0 pointer-events-none z-30', NAME_COL_LEFT)}>
            <div className="absolute top-0 bottom-0 w-0.5 bg-[#2563EB]" style={{ left: `${win.nowPercent}%` }}>
              <span className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#2563EB] text-white text-[8px] font-bold px-1 rounded-b leading-tight">
                NOW
              </span>
            </div>
          </div>
        )}
        {group.inspectors.map((inspector) => (
          <InspectorRow
            key={inspector.id}
            inspector={inspector}
            win={win}
            slots={slots}
            hourLines={hourLines}
            onEditJob={onEditJob}
            nameTint={style.nameTint}
          />
        ))}
      </div>
    </div>
  )
}

export function TimelineGrid({
  regionGroups,
  onEditJob,
  isToday,
}: {
  regionGroups: RegionGroup[]
  onEditJob: (job: DispatchJob, inspectorId: string) => void
  isToday: boolean
}) {
  const now = useDispatchNow(isToday)
  const win = computeDispatchWindow(isToday, now)

  return (
    <div className="bg-white border-2 border-black rounded-lg overflow-hidden h-full flex flex-col neo-shadow">
      {win.dayComplete && (
        <div className="shrink-0 bg-[#FDE047] border-b-2 border-black px-3 py-1.5 text-xs font-bold text-black">
          Workday complete — pick another date to schedule ahead.
        </div>
      )}
      {regionGroups.length > 0 ? (
        <div className="flex-1 min-h-0 flex">
          {regionGroups.map((group) => (
            <RegionColumn key={group.region} group={group} win={win} now={now} onEditJob={onEditJob} />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center py-12 text-center text-sm text-slate-400">
          No active inspectors found. Add inspectors on the Inspectors page.
        </div>
      )}
    </div>
  )
}
