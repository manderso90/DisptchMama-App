'use client'

import { useState, useTransition } from 'react'
import { assignInspector } from '@/lib/actions/job-actions'
import type { Inspector } from '@/types/database'
import { UserCheck, X } from 'lucide-react'

interface InspectorAssignmentProps {
  jobId: string
  currentInspectorId: string | null
  currentInspectorName: string | null
  inspectors: Pick<Inspector, 'id' | 'full_name' | 'region'>[]
}

export function InspectorAssignment({
  jobId,
  currentInspectorId,
  currentInspectorName,
  inspectors,
}: InspectorAssignmentProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleAssign(inspectorId: string | null) {
    setError('')
    startTransition(async () => {
      try {
        await assignInspector(jobId, inspectorId)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to assign inspector')
      }
    })
  }

  // Group inspectors by region
  const byRegion = inspectors.reduce<Record<string, typeof inspectors>>((acc, insp) => {
    const region = insp.region || 'Other'
    if (!acc[region]) acc[region] = []
    acc[region].push(insp)
    return acc
  }, {})

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-500">Assigned To</span>
        {currentInspectorName ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-green-600" />
              {currentInspectorName}
            </span>
            <button
              onClick={() => handleAssign(null)}
              disabled={isPending}
              className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
              title="Unassign inspector"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <span className="text-sm text-slate-400 italic">Unassigned</span>
        )}
      </div>

      <div>
        <select
          value={currentInspectorId ?? ''}
          onChange={(e) => handleAssign(e.target.value || null)}
          disabled={isPending}
          className="w-full h-9 rounded-md border-2 border-black bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          <option value="">— Unassigned —</option>
          {Object.entries(byRegion).map(([region, regionInspectors]) => (
            <optgroup key={region} label={region}>
              {regionInspectors.map((insp) => (
                <option key={insp.id} value={insp.id}>
                  {insp.full_name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-md border border-red-300">{error}</p>
      )}
    </div>
  )
}
