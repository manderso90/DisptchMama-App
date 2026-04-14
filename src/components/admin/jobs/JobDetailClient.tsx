'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import type { Job } from '@/types/database'
import type { SchedulingSuggestion, SuggestionResult, ApplyResult, TimeConflict } from '@/services/scheduling/types'
import { getSchedulingSuggestions, applySuggestion } from '@/lib/actions/scheduling-actions'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

// ---------------------------------------------------------------------------
// Status badge styles (reused from JobsTable)
// ---------------------------------------------------------------------------

const statusBadge: Record<string, string> = {
  pending: 'bg-[#FDE047]/20 text-amber-800 border border-amber-400',
  confirmed: 'bg-[#2563EB]/10 text-blue-800 border border-blue-400',
  in_progress: 'bg-purple-100 text-purple-800 border border-purple-400',
  completed: 'bg-green-100 text-green-800 border border-green-400',
  cancelled: 'bg-slate-100 text-slate-600 border border-slate-400',
  on_hold: 'bg-slate-100 text-slate-600 border border-slate-400',
}

const statusLabel: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  on_hold: 'On Hold',
}

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
// Main component
// ---------------------------------------------------------------------------

interface JobDetailClientProps {
  job: Job & { inspector_name: string | null }
}

export function JobDetailClient({ job }: JobDetailClientProps) {
  const router = useRouter()
  const [suggestions, setSuggestions] = useState<SuggestionResult | null>(null)
  const [conflicts, setConflicts] = useState<TimeConflict[] | null>(null)
  const [applySuccess, setApplySuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [applyingId, setApplyingId] = useState<string | null>(null)

  const canSuggest = job.status !== 'completed' && job.status !== 'cancelled'
  const [schedulingOpen, setSchedulingOpen] = useState(false)

  function handleGetSuggestions() {
    setError(null)
    setConflicts(null)
    setApplySuccess(false)
    startTransition(async () => {
      try {
        const result = await getSchedulingSuggestions(job.id)
        setSuggestions(result)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to get suggestions')
      }
    })
  }

  function handleApply(suggestion: SchedulingSuggestion) {
    setError(null)
    setConflicts(null)
    setApplySuccess(false)
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

  return (
    <div className="space-y-6">
      {/* Job header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-[Syne]">
              {job.title} &mdash; {job.client_name}
            </CardTitle>
            <span
              className={`text-xs px-2 py-1 rounded-md font-medium ${statusBadge[job.status] ?? statusBadge.pending}`}
            >
              {statusLabel[job.status] ?? job.status}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <DetailRow label="Address" value={`${job.address}, ${job.city}, ${job.state} ${job.zip_code}`} />
              <DetailRow label="Phone" value={job.client_phone} />
              <DetailRow label="Email" value={job.client_email} />
              <DetailRow label="Lockbox" value={job.has_lockbox ? 'Yes' : 'No'} />
            </div>
            <div className="space-y-2">
              <DetailRow label="Assigned To" value={job.inspector_name ?? 'Unassigned'} />
              <DetailRow
                label="Scheduled"
                value={
                  job.scheduled_date
                    ? `${format(new Date(job.scheduled_date + 'T12:00:00'), 'MMM d, yyyy')} at ${job.scheduled_time ?? 'TBD'}`
                    : 'Unscheduled'
                }
              />
              <DetailRow label="Duration" value={`${job.estimated_duration_minutes} min`} />
              <DetailRow label="Requested Date" value={job.requested_date ?? 'None'} />
              <DetailRow
                label="Time Preference"
                value={job.requested_time_preference ?? 'None'}
              />
            </div>
          </div>
          {job.notes && (
            <div className="mt-4 text-sm">
              <span className="font-medium text-slate-700">Notes: </span>
              <span className="text-slate-600">{job.notes}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Smart Scheduling section */}
      {canSuggest && (
        <Card>
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => setSchedulingOpen((prev) => !prev)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-[Syne] flex items-center gap-2">
                <span>Smart Scheduling</span>
              </CardTitle>
              <span
                className="text-slate-500 transition-transform duration-200 text-sm"
                style={{
                  display: 'inline-block',
                  transform: schedulingOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                &#9660;
              </span>
            </div>
          </CardHeader>
          {schedulingOpen && (
            <CardContent>
              <div className="space-y-4">
                <Button
                  variant="default"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleGetSuggestions()
                  }}
                  disabled={isPending}
                >
                  {isPending && !applyingId
                    ? 'Finding best options...'
                    : 'Get Suggestions'}
                </Button>

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
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="flex gap-2">
      <span className="font-medium text-slate-700 min-w-[120px]">{label}:</span>
      <span className="text-slate-600">{value || '\u2014'}</span>
    </div>
  )
}
