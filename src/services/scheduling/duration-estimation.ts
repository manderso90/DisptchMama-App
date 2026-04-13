/**
 * Duration estimation service — pure function, no framework imports.
 *
 * Estimates how long a job will take based on job type and known patterns.
 * GSRetrofit context: "Inspection" jobs are typically shorter than "Work" jobs.
 */

import type { DurationEstimate } from './types'

// ---------------------------------------------------------------------------
// Baseline durations by job title (minutes)
// ---------------------------------------------------------------------------

const BASELINE_DURATIONS: Record<string, { minutes: number; confidence: 'high' | 'medium' }> = {
  Inspection: { minutes: 60, confidence: 'high' },
  Work: { minutes: 120, confidence: 'medium' },
}

const DEFAULT_DURATION: { minutes: number; confidence: 'low' } = {
  minutes: 90,
  confidence: 'low',
}

/**
 * Estimate the duration for a job based on its title.
 *
 * If the job already has an explicit duration override, we return that
 * with high confidence. Otherwise we use the baseline lookup.
 */
export function estimateDuration(params: {
  title: string
  existingDurationMinutes?: number | null
}): DurationEstimate {
  const { title, existingDurationMinutes } = params

  // Explicit override takes precedence
  if (existingDurationMinutes && existingDurationMinutes > 0) {
    return {
      minutes: existingDurationMinutes,
      confidence: 'high',
      reason: `Using existing duration of ${existingDurationMinutes} minutes`,
    }
  }

  const baseline = BASELINE_DURATIONS[title]
  if (baseline) {
    return {
      minutes: baseline.minutes,
      confidence: baseline.confidence,
      reason: `Standard ${title.toLowerCase()} duration: ${baseline.minutes} minutes`,
    }
  }

  return {
    minutes: DEFAULT_DURATION.minutes,
    confidence: DEFAULT_DURATION.confidence,
    reason: `Default estimate for unknown job type "${title}": ${DEFAULT_DURATION.minutes} minutes`,
  }
}
