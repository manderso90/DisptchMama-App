'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { DispatchHeader } from './DispatchHeader'
import { TimelineGrid } from './TimelineGrid'
import { UnscheduledQueue } from './UnscheduledQueue'
import { UnscheduledJobChip } from './UnscheduledJobChip'
import { scheduleFromDispatch, updateJobTime } from '@/lib/actions/dispatch-actions'
import { updateSchedule } from '@/lib/actions/schedule-mutations'
import { useScheduleSync } from '@/lib/hooks/use-schedule-sync'
import { ScheduleToast, useScheduleToast } from '@/components/admin/shared/ScheduleToast'
import { gsRetrofitWarning } from '@/lib/scheduling/writeback-result'
import { cn } from '@/lib/utils'
import type { DispatchInspector, DispatchJob, UnscheduledJob } from '@/lib/queries/dispatch'

interface DispatchClientProps {
  currentDate: string
  isToday: boolean
  inspectors: DispatchInspector[]
  unscheduledJobs: UnscheduledJob[]
}

type DragItem =
  | { type: 'unscheduled'; job: UnscheduledJob }
  | { type: 'scheduled'; job: DispatchJob; inspectorId: string }

export function DispatchClient({
  currentDate,
  isToday,
  inspectors,
  unscheduledJobs,
}: DispatchClientProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  // Realtime sync across tabs
  useScheduleSync()

  // DnD state
  const [activeDrag, setActiveDrag] = useState<DragItem | null>(null)
  const [isScheduling, setIsScheduling] = useState(false)
  const { toast, showToast, hideToast } = useScheduleToast()

  // Show a success toast, or an error toast if the GS Retrofit write-back failed.
  function notifyScheduled(successMessage: string, gsRetrofit?: Parameters<typeof gsRetrofitWarning>[0]) {
    const warning = gsRetrofitWarning(gsRetrofit)
    if (warning) {
      showToast(`${successMessage} — ${warning}`, 'error')
    } else {
      showToast(successMessage)
    }
  }

  // Edit time modal state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editJob, setEditJob] = useState<DispatchJob | null>(null)
  const [editInspectorId, setEditInspectorId] = useState<string | null>(null)
  const [editTime, setEditTime] = useState('09:00')
  const [editError, setEditError] = useState<string | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current
    if (data?.type === 'scheduled') {
      setActiveDrag({ type: 'scheduled', job: data.job, inspectorId: data.inspectorId })
    } else {
      const job = data?.job as UnscheduledJob | undefined
      if (job) setActiveDrag({ type: 'unscheduled', job })
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const currentDrag = activeDrag
    setActiveDrag(null)

    const { over } = event
    if (!over || !currentDrag) return

    const overData = over.data.current

    // Case 1: Drop onto unscheduled zone (unschedule a scheduled job)
    if (overData?.type === 'unschedule' && currentDrag.type === 'scheduled') {
      const { job, inspectorId } = currentDrag
      const inspector = inspectors.find((i) => i.id === inspectorId)
      setIsScheduling(true)
      try {
        await updateSchedule({
          jobId: job.id,
          assignedTo: null,
          scheduledDate: null,
          scheduledTime: null,
        })
        showToast(`Unassigned from ${inspector?.full_name ?? 'inspector'}`)
        startTransition(() => router.refresh())
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to unschedule')
      } finally {
        setIsScheduling(false)
      }
      return
    }

    // Case 2: Drop onto a time slot (schedule or reschedule)
    const droppedInspectorId = overData?.inspectorId as string | undefined
    const droppedTime = overData?.time as string | undefined
    if (!droppedInspectorId || !droppedTime) return

    if (currentDrag.type === 'unscheduled') {
      // Unscheduled → Timeline
      const job = currentDrag.job
      setIsScheduling(true)
      try {
        const res = await scheduleFromDispatch(job.id, droppedInspectorId, currentDate, droppedTime)
        const inspector = inspectors.find((i) => i.id === droppedInspectorId)
        const [dh, dm] = droppedTime.split(':').map(Number)
        const dp = dh >= 12 ? 'PM' : 'AM'
        const displayTime = `${dh % 12 || 12}:${String(dm).padStart(2, '0')} ${dp}`
        notifyScheduled(`Scheduled at ${displayTime} with ${inspector?.full_name ?? 'inspector'}`, res.gsRetrofit)
        startTransition(() => router.refresh())
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to schedule')
      } finally {
        setIsScheduling(false)
      }
    } else {
      // Scheduled → Different slot/inspector (reschedule)
      const { job, inspectorId: fromInspectorId } = currentDrag
      setIsScheduling(true)
      try {
        const res = await updateSchedule({
          jobId: job.id,
          assignedTo: droppedInspectorId,
          scheduledTime: droppedTime,
        })
        const toInspector = inspectors.find((i) => i.id === droppedInspectorId)
        const [dh, dm] = droppedTime.split(':').map(Number)
        const dp = dh >= 12 ? 'PM' : 'AM'
        const displayTime = `${dh % 12 || 12}:${String(dm).padStart(2, '0')} ${dp}`

        if (fromInspectorId !== droppedInspectorId) {
          notifyScheduled(`Moved to ${toInspector?.full_name ?? 'inspector'} at ${displayTime}`, res.gsRetrofit)
        } else {
          notifyScheduled(`Rescheduled to ${displayTime}`, res.gsRetrofit)
        }
        startTransition(() => router.refresh())
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to reschedule')
      } finally {
        setIsScheduling(false)
      }
    }
  }

  function handleEditJob(job: DispatchJob, inspectorId: string) {
    setEditJob(job)
    setEditInspectorId(inspectorId)
    setEditTime(job.scheduled_time?.slice(0, 5) ?? '09:00')
    setEditError(null)
    setEditModalOpen(true)
  }

  async function handleSaveEdit() {
    if (!editJob) return

    setIsSavingEdit(true)
    setEditError(null)

    try {
      const res = await updateJobTime(editJob.id, editTime)
      setEditModalOpen(false)
      notifyScheduled(`Time updated to ${editTime}`, res.gsRetrofit)
      startTransition(() => router.refresh())
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update time')
    } finally {
      setIsSavingEdit(false)
    }
  }

  const editInspector = inspectors.find((i) => i.id === editInspectorId)

  // Group inspectors by region for the side-by-side timeline columns. Built
  // dynamically (Valley, then Los Angeles, then any other region) so no
  // inspector is ever dropped if a new region appears.
  const REGION_ORDER = ['Valley', 'Los Angeles']
  const byRegion = new Map<string, DispatchInspector[]>()
  for (const insp of inspectors) {
    const region = insp.region || 'Valley'
    if (!byRegion.has(region)) byRegion.set(region, [])
    byRegion.get(region)!.push(insp)
  }
  const regionGroups = [...byRegion.keys()]
    .sort((a, b) => {
      const ia = REGION_ORDER.indexOf(a)
      const ib = REGION_ORDER.indexOf(b)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b)
    })
    .map((region) => ({ region, inspectors: byRegion.get(region)! }))

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] gap-4">
      {/* Header */}
      <DispatchHeader currentDate={currentDate} isToday={isToday} />

      {/* Timeline + DnD context */}
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 min-h-0">
          <TimelineGrid regionGroups={regionGroups} onEditJob={handleEditJob} isToday={isToday} />
        </div>
        <UnscheduledQueue jobs={unscheduledJobs} />

        {/* Drag overlay */}
        <DragOverlay>
          {activeDrag?.type === 'unscheduled' && (
            <UnscheduledJobChip job={activeDrag.job} />
          )}
          {activeDrag?.type === 'scheduled' && (
            <div className="bg-blue-100 border border-blue-300 text-blue-800 rounded-md px-3 py-2 shadow-lg text-xs font-medium">
              {activeDrag.job.address ?? 'Moving...'}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Scheduling overlay */}
      {isScheduling && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#FDE047] text-black border-2 border-black px-5 py-2.5 rounded-lg neo-shadow text-sm font-bold">
          Scheduling...
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <ScheduleToast message={toast.message} variant={toast.variant} onDismiss={hideToast} />
      )}

      {/* Edit time modal */}
      {editModalOpen && editJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !isSavingEdit && setEditModalOpen(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-xl border-2 border-black neo-shadow w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              Edit Scheduled Time
            </h3>
            <p className="text-sm text-slate-500 mb-5">
              {editInspector?.full_name ?? 'Inspector'} &middot; {currentDate}
            </p>

            {/* Job info */}
            <div className="bg-[#FFFDF5] rounded-lg px-4 py-3 mb-5 text-sm">
              <p className="font-medium text-slate-800">
                {editJob.address ?? 'Unknown address'}
              </p>
              <p className="text-slate-500 text-xs mt-0.5">
                {editJob.city}, {editJob.zip_code}
              </p>
              {editJob.client_name && (
                <p className="text-slate-500 text-xs mt-0.5">
                  Client: {editJob.client_name}
                </p>
              )}
            </div>

            {/* Time picker */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Start Time
              </label>
              <input
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className="w-full border-2 border-black rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
              />
            </div>

            {/* Duration info */}
            <div className="mb-5 text-sm text-slate-500">
              Estimated duration: {editJob.estimated_duration_minutes ?? 60} minutes
            </div>

            {/* Error */}
            {editError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-sm text-red-700">
                {editError}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setEditModalOpen(false)}
                disabled={isSavingEdit}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className={cn(
                  'px-5 py-2 text-sm font-medium rounded-md transition-colors',
                  'bg-[#FDE047] text-black border-2 border-black font-bold hover:bg-[#FDE047]/80',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isSavingEdit ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
