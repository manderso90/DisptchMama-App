'use client'

import { useState, useTransition } from 'react'
import { syncInspectionRequests, type SyncResult } from '@/lib/actions/gsretrofit-sync'

export function SyncFromGsRetrofitButton() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<SyncResult | null>(null)
  const [error, setError] = useState('')

  function handleSync() {
    setError('')
    setResult(null)
    startTransition(async () => {
      try {
        const res = await syncInspectionRequests()
        if (!res.ok) {
          setError(res.error ?? 'Sync failed')
          return
        }
        setResult(res)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sync failed')
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleSync}
        disabled={isPending}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-black bg-white border-2 border-black rounded-md neo-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Syncing…' : '↻ Sync from GS Retrofit'}
      </button>

      {result && (
        <p className="text-xs text-slate-600">
          {result.fetched} fetched · {result.created} new · {result.updated} updated
          {result.skipped > 0 ? ` · ${result.skipped} skipped` : ''}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-300 max-w-xs text-right">
          {error}
        </p>
      )}
    </div>
  )
}
