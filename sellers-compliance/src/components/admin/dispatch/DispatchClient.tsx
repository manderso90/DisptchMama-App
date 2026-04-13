'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { DispatchHeader } from './DispatchHeader'
import { TimelineGrid } from './TimelineGrid'
import { UnscheduledQueue } from './UnscheduledQueue'
import { UnscheduledJobChip } from './UnscheduledJobChip'
import { EditTimeModal } from './EditTimeModal'
import { scheduleFromDispatch, updateJobTime } from '@/lib/actions/dispatch-actions'
import { updateSchedule } from '@/lib/actions/schedule-mutations'
import { useScheduleSync } from '@/hooks/use-schedule-sync'
import { ScheduleToast, useScheduleToast } from '@/components/admin/shared/ScheduleToast'
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
  const [isPending, startTransition] = useTransition()

  // Realtime sync across tabs
  useScheduleSync()

  // DnD state
  const [activeDrag, setActiveDrag] = useState<DragItem | null>(null)
  const [isScheduling, setIsScheduling] = useState(false)
  const { toastMessage, showToast, hideToast } = useScheduleToast()

  // Edit time modal state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editJob, setEditJob] = useState<DispatchJob | null>(null)
  const [editInspectorId, setEditInspectorId] = useState<string | null>(null)

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
        await scheduleFromDispatch(job.id, droppedInspectorId, currentDate, droppedTime)
        const inspector = inspectors.find((i) => i.id === droppedInspectorId)
        const [dh, dm] = droppedTime.split(':').map(Number)
        const dp = dh >= 12 ? 'PM' : 'AM'
        const displayTime = `${dh % 12 || 12}:${String(dm).padStart(2, '0')} ${dp}`
        showToast(`Scheduled at ${displayTime} with ${inspector?.full_name ?? 'inspector'}`)
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
        await updateSchedule({
          jobId: job.id,
          assignedTo: droppedInspectorId,
          scheduledTime: droppedTime,
        })
        const fromInspector = inspectors.find((i) => i.id === fromInspectorId)
        const toInspector = inspectors.find((i) => i.id === droppedInspectorId)
        const [dh, dm] = droppedTime.split(':').map(Number)
        const dp = dh >= 12 ? 'PM' : 'AM'
        const displayTime = `${dh % 12 || 12}:${String(dm).padStart(2, '0')} ${dp}`

        if (fromInspectorId !== droppedInspectorId) {
          showToast(`Moved to ${toInspector?.full_name ?? 'inspector'} at ${displayTime}`)
        } else {
          showToast(`Rescheduled to ${displayTime}`)
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
    setEditModalOpen(true)
  }

  const handleSaveEdit = async (time: string) => {
    await updateJobTime(editJob!.id, time)
    setEditModalOpen(false)
    showToast(`Time updated to ${time}`)
    startTransition(() => router.refresh())
  }

  const editInspector = inspectors.find((i) => i.id === editInspectorId)

  // Group inspectors by region for the timeline
  const regionGroups = [
    { region: 'Valley', inspectors: inspectors.filter(i => i.region === 'Valley') },
    { region: 'Los Angeles', inspectors: inspectors.filter(i => i.region === 'Los Angeles') },
  ].filter(g => g.inspectors.length > 0)

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] gap-4">
      {/* Header */}
      <DispatchHeader currentDate={currentDate} isToday={isToday} />

      {/* Timeline + DnD context */}
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 min-h-0">
          <TimelineGrid regionGroups={regionGroups} onEditJob={handleEditJob} />
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
      {toastMessage && (
        <ScheduleToast message={toastMessage} onDismiss={hideToast} />
      )}

      {/* Edit time modal */}
      <EditTimeModal
        open={editModalOpen}
        job={editJob}
        inspectorName={editInspector?.full_name ?? null}
        currentDate={currentDate}
        onClose={() => setEditModalOpen(false)}
        onSave={handleSaveEdit}
      />
    </div>
  )
}
