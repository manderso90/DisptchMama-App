'use client'

import { useState, useTransition } from 'react'
import type { Job } from '@/types/database'
import type { SchedulingSuggestion, SuggestionResult, ApplyResult, TimeConflict } from '@/services/scheduling/types'
import { getSchedulingSuggestions, applySuggestion } from '@/lib/actions/scheduling-actions'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

// ---------------------------------------------------------------------------
// Score bar component
// ---------------------------------------------------------------------------

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-[#FDE047]' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-bold text-slate-700">{score}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Suggestion card component
// ---------------------------------------------------------------------------

function SuggestionCard({
  suggestion,
  rank,
  onApply,
  isApplying,
}: {
  suggestion: SchedulingSuggestion
  rank: number
  onApply: (s: SchedulingSuggestion) => void
  isApplying: boolean
}) {
  return (
    <div className="border-2 border-black rounded-lg bg-white p-4 neo-shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold">
              {rank}
            </span>
            <span className="font-semibold text-slate-900">
              {suggestion.inspectorName}
            </span>
            <ScoreBar score={suggestion.score} />
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            <span>
              {suggestion.startTime} &ndash; {suggestion.endTime}
            </span>
            <span>{suggestion.estimatedDurationMinutes} min</span>
            <span>{suggestion.date}</span>
          </div>

          <ul className="text-xs text-slate-500 space-y-0.5 mt-1">
            {suggestion.reasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="text-slate-400 mt-0.5">&bull;</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>

        <Button
          variant="default"
          size="sm"
          disabled={isApplying}
          onClick={() => onApply(suggestion)}
        >
          {isApplying ? 'Applying...' : 'Apply'}
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Conflict alert
// ---------------------------------------------------------------------------

function ConflictAlert({ conflicts }: { conflicts: TimeConflict[] }) {
  return (
    <div className="border-2 border-red-400 bg-red-50 rounded-lg p-4">
      <p className="font-semibold text-red-800 text-sm">
        Schedule conflict detected
      </p>
      <p className="text-xs text-red-700 mt-1">
        Another job was scheduled in this slot since you generated suggestions.
        Please get fresh suggestions.
      </p>
      <ul className="text-xs text-red-600 mt-2 space-y-1">
        {conflicts.map((c) => (
          <li key={c.jobId}>
            Overlaps with job at {c.address} by {c.overlapMinutes} min
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component — Smart Scheduling only
// ---------------------------------------------------------------------------

interface JobDetailClientProps {
  job: Job & { inspector_name: string | null }
}

export function JobDetailClient({ job }: JobDetailClientProps) {
  const router = useRouter()
  const [suggestions, setSuggestions] = useState<SuggestionResult | null>(null)
  const [conflicts, setConflicts] = useState<TimeConflict[] | null>(null)
  const [applySuccess, setApplySuccess] = useState(false)
  const [gsrWarning, setGsrWarning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const canSuggest = job.status !== 'completed' && job.status !== 'cancelled'

  function handleGetSuggestions() {
    setError(null)
    setConflicts(null)
    setApplySuccess(false)
    setExpanded(true)
    startTransition(async () => {
      try {
        const result = await getSchedulingSuggestions(job.id)
        setSuggestions(result)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to get suggestions')
      }
    })
  }

  function handleCollapse() {
    setExpanded(false)
    setSuggestions(null)
    setError(null)
    setConflicts(null)
    setApplySuccess(false)
  }

  function handleApply(suggestion: SchedulingSuggestion) {
    setError(null)
    setConflicts(null)
    setApplySuccess(false)
    setGsrWarning(null)
    setApplyingId(suggestion.inspectorId + suggestion.startTime)
    startTransition(async () => {
      try {
        const result: ApplyResult = await applySuggestion(
          job.id,
          suggestion.inspectorId,
          suggestion.date,
          suggestion.startTime,
          suggestion.estimatedDurationMinutes
        )

        if (!result.success) {
          if (result.conflict && result.conflict.length > 0) {
            setConflicts(result.conflict)
          } else {
            setError(result.error || 'Failed to apply suggestion')
          }
        } else {
          setApplySuccess(true)
          setGsrWarning(result.gsRetrofitWarning ?? null)
          setSuggestions(null)
          router.refresh()
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to apply suggestion')
      } finally {
        setApplyingId(null)
      }
    })
  }

  if (!canSuggest) return null

  return (
    <div className="bg-white border-2 border-black rounded-lg neo-shadow">
      <div className="p-5">
        {!expanded ? (
          /* ---- Collapsed: label + Get Suggestions button ---- */
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide font-[Syne]">
              Smart Scheduling
            </h3>
            <Button
              variant="default"
              size="sm"
              onClick={handleGetSuggestions}
              disabled={isPending && !applyingId}
            >
              {isPending && !applyingId
                ? 'Finding best options...'
                : 'Get Suggestions'}
            </Button>
          </div>
        ) : (
          /* ---- Expanded: label + Collapse button + suggestions ---- */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide font-[Syne]">
                Smart Scheduling
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleGetSuggestions}
                  disabled={isPending && !applyingId}
                >
                  {isPending && !applyingId
                    ? 'Finding best options...'
                    : 'Refresh'}
                </Button>
                <button
                  type="button"
                  onClick={handleCollapse}
                  className="text-xs px-3 py-1.5 rounded-md border-2 border-black font-medium bg-white hover:bg-slate-100 transition-colors"
                >
                  Collapse &#9650;
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {error}
              </div>
            )}

            {conflicts && <ConflictAlert conflicts={conflicts} />}

            {applySuccess && (
              <div className="text-sm text-green-700 bg-green-50 border border-green-300 rounded-lg p-3">
                Suggestion applied successfully. Job has been scheduled.
              </div>
            )}

            {applySuccess && gsrWarning && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-300 rounded-lg p-3">
                Scheduled in DisptchMama, but {gsrWarning}. The GS Retrofit appointment was not updated.
              </div>
            )}

            {isPending && !applyingId && !suggestions && (
              <div className="text-sm text-slate-500">
                Loading suggestions...
              </div>
            )}

            {suggestions && suggestions.suggestions.length === 0 && (
              <div className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
                No available slots found for this date. Try a different date or
                check inspector availability.
              </div>
            )}

            {suggestions && suggestions.suggestions.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  {suggestions.suggestions.length} suggestion(s) for{' '}
                  {suggestions.suggestions[0].date} &mdash; ranked by fit score
                </p>
                {suggestions.suggestions.map((s, i) => (
                  <SuggestionCard
                    key={`${s.inspectorId}-${s.startTime}`}
                    suggestion={s}
                    rank={i + 1}
                    onApply={handleApply}
                    isApplying={
                      applyingId === s.inspectorId + s.startTime && isPending
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
