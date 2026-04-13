'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { DispatchJob } from '@/lib/queries/dispatch'

interface EditTimeModalProps {
  open: boolean
  job: DispatchJob | null
  inspectorName: string | null
  currentDate: string
  onClose: () => void
  onSave: (time: string) => Promise<void>
}

export function EditTimeModal({ open, job, inspectorName, currentDate, onClose, onSave }: EditTimeModalProps) {
  const [editTime, setEditTime] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Sync editTime when job changes
  useEffect(() => {
    if (job?.scheduled_time) {
      setEditTime(job.scheduled_time.slice(0, 5))
    }
    setEditError(null)
  }, [job])

  if (!open || !job) return null

  const handleSave = async () => {
    setIsSaving(true)
    setEditError(null)
    try {
      await onSave(editTime)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update time')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !isSaving && onClose()}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl border-2 border-black neo-shadow w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">
          Edit Scheduled Time
        </h3>
        <p className="text-sm text-slate-500 mb-5">
          {inspectorName ?? 'Inspector'} &middot; {currentDate}
        </p>

        {/* Job info */}
        <div className="bg-[#FFFDF5] rounded-lg px-4 py-3 mb-5 text-sm">
          <p className="font-medium text-slate-800">
            {job.address ?? 'Unknown address'}
          </p>
          <p className="text-slate-500 text-xs mt-0.5">
            {job.city}, {job.zip_code}
          </p>
          {job.client_name && (
            <p className="text-slate-500 text-xs mt-0.5">
              Client: {job.client_name}
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
          Estimated duration: {job.estimated_duration_minutes ?? 60} minutes
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
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              'px-5 py-2 text-sm font-medium rounded-md transition-colors',
              'bg-[#FDE047] text-black border-2 border-black font-bold hover:bg-[#FDE047]/80',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
