/**
 * Scheduling suggestion engine — pure function, no framework imports.
 *
 * Takes a SchedulingContext and produces ranked, explainable suggestions.
 * Each suggestion includes a score (0–100), human-readable reasons,
 * inspector, date/time, and estimated duration.
 *
 * Scoring factors:
 *   - Region match (job zip/city vs inspector region)
 *   - Time preference alignment (morning/afternoon/anytime/flexible)
 *   - Inspector workload balance (fewer jobs = higher score)
 *   - Gap efficiency (prefer fitting into existing gaps tightly)
 *   - Earlier in the day (slight preference for morning slots)
 */

import type {
  SchedulingContext,
  SchedulingSuggestion,
  SuggestionResult,
  InspectorAvailability,
} from './types'
import { findAvailableGaps, minutesToTime, timeToMinutes } from './conflict-detection'

// ---------------------------------------------------------------------------
// Scoring weights
// ---------------------------------------------------------------------------

const WEIGHTS = {
  regionMatch: 25,
  timePreference: 20,
  workloadBalance: 20,
  gapEfficiency: 15,
  earlierSlot: 10,
  activeInspector: 10,
} as const

// ---------------------------------------------------------------------------
// Region matching heuristic
// ---------------------------------------------------------------------------

const REGION_ZIP_PREFIXES: Record<string, string[]> = {
  Valley: ['910', '913', '914', '915', '916', '917', '918'],
  'Los Angeles': ['900', '901', '902', '903', '904', '906', '907'],
}

function regionMatchScore(
  jobCity: string,
  jobZipCode: string,
  inspectorRegion: string
): { score: number; reason: string } {
  // Check zip code prefix match
  const prefixes = REGION_ZIP_PREFIXES[inspectorRegion]
  if (prefixes) {
    const jobPrefix = jobZipCode.substring(0, 3)
    if (prefixes.includes(jobPrefix)) {
      return { score: WEIGHTS.regionMatch, reason: `Zip ${jobZipCode} matches ${inspectorRegion} region` }
    }
  }

  // Fallback: simple city-in-region name check
  const cityLower = jobCity.toLowerCase()
  const regionLower = inspectorRegion.toLowerCase()
  if (cityLower.includes(regionLower) || regionLower.includes(cityLower)) {
    return { score: WEIGHTS.regionMatch * 0.7, reason: `City "${jobCity}" likely in ${inspectorRegion}` }
  }

  return { score: 0, reason: `Job location (${jobCity}, ${jobZipCode}) outside ${inspectorRegion} region` }
}

// ---------------------------------------------------------------------------
// Time preference scoring
// ---------------------------------------------------------------------------

function timePreferenceScore(
  slotStartMinutes: number,
  preference: string | null
): { score: number; reason: string } {
  if (!preference || preference === 'anytime' || preference === 'flexible') {
    return { score: WEIGHTS.timePreference, reason: 'No specific time preference — any slot works' }
  }

  const noon = 12 * 60 // 720 minutes

  if (preference === 'morning' && slotStartMinutes < noon) {
    return { score: WEIGHTS.timePreference, reason: 'Morning slot matches morning preference' }
  }
  if (preference === 'afternoon' && slotStartMinutes >= noon) {
    return { score: WEIGHTS.timePreference, reason: 'Afternoon slot matches afternoon preference' }
  }

  // Mismatch
  return { score: WEIGHTS.timePreference * 0.2, reason: `${preference} preference, but slot is ${slotStartMinutes < noon ? 'morning' : 'afternoon'}` }
}

// ---------------------------------------------------------------------------
// Workload balance scoring
// ---------------------------------------------------------------------------

function workloadScore(
  inspector: InspectorAvailability,
  allInspectors: InspectorAvailability[]
): { score: number; reason: string } {
  const jobCounts = allInspectors.map((i) => i.scheduledSlots.length)
  const maxJobs = Math.max(...jobCounts, 1)
  const inspectorJobs = inspector.scheduledSlots.length

  // Fewer jobs = higher score (linear scale)
  const ratio = 1 - inspectorJobs / (maxJobs + 1)
  const score = Math.round(ratio * WEIGHTS.workloadBalance)
  return {
    score,
    reason: `${inspector.inspectorName} has ${inspectorJobs} job(s) today (workload balance: ${score}/${WEIGHTS.workloadBalance})`,
  }
}

// ---------------------------------------------------------------------------
// Gap efficiency scoring
// ---------------------------------------------------------------------------

function gapEfficiencyScore(
  gapDurationMinutes: number,
  jobDurationMinutes: number
): { score: number; reason: string } {
  if (gapDurationMinutes <= 0) return { score: 0, reason: 'No gap available' }

  // Perfect fit = full score, bigger gap = lower score
  const efficiency = jobDurationMinutes / gapDurationMinutes
  const score = Math.round(Math.min(efficiency, 1) * WEIGHTS.gapEfficiency)
  const wastedMinutes = gapDurationMinutes - jobDurationMinutes
  return {
    score,
    reason: wastedMinutes <= 15
      ? 'Tight fit in available gap — minimal wasted time'
      : `${wastedMinutes} minutes unused in this gap`,
  }
}

// ---------------------------------------------------------------------------
// Earlier slot preference
// ---------------------------------------------------------------------------

function earlierSlotScore(
  slotStartMinutes: number,
  workdayStartMinutes: number,
  workdayEndMinutes: number
): { score: number; reason: string } {
  const range = workdayEndMinutes - workdayStartMinutes
  const position = slotStartMinutes - workdayStartMinutes
  const ratio = 1 - position / range
  const score = Math.round(ratio * WEIGHTS.earlierSlot)
  return { score, reason: `Slot starts at ${minutesToTime(slotStartMinutes)}` }
}

// ---------------------------------------------------------------------------
// Main suggestion generator
// ---------------------------------------------------------------------------

const MAX_SUGGESTIONS = 5
const SLOT_SNAP_MINUTES = 30 // Snap suggestions to 30-minute boundaries

export function generateSuggestions(context: SchedulingContext): SuggestionResult {
  const {
    job,
    inspectors,
    targetDate,
    workdayStart,
    workdayEnd,
  } = context

  const dayStartMinutes = timeToMinutes(workdayStart)
  const dayEndMinutes = timeToMinutes(workdayEnd)
  const candidates: SchedulingSuggestion[] = []

  // Only consider active inspectors
  const activeInspectors = inspectors.filter((i) => i.isActive)

  for (const inspector of activeInspectors) {
    // Find available gaps for this inspector on the target date
    const gaps = findAvailableGaps(
      inspector.scheduledSlots,
      workdayStart,
      workdayEnd,
      job.estimatedDurationMinutes,
      job.id // exclude self if rescheduling
    )

    for (const gap of gaps) {
      // Generate slot at start of gap, snapped to 30-minute boundary
      const snappedStart =
        Math.ceil(gap.startMinutes / SLOT_SNAP_MINUTES) * SLOT_SNAP_MINUTES

      // Ensure snapped start still fits within the gap
      if (snappedStart + job.estimatedDurationMinutes > gap.endMinutes) continue
      // Ensure within workday
      if (snappedStart + job.estimatedDurationMinutes > dayEndMinutes) continue

      const gapDuration = gap.endMinutes - snappedStart

      // Calculate individual scores
      const region = regionMatchScore(job.city, job.zipCode, inspector.region)
      const timePref = timePreferenceScore(snappedStart, job.requestedTimePreference)
      const workload = workloadScore(inspector, activeInspectors)
      const gapEff = gapEfficiencyScore(gapDuration, job.estimatedDurationMinutes)
      const earlier = earlierSlotScore(snappedStart, dayStartMinutes, dayEndMinutes)
      const activeScore = inspector.isActive
        ? { score: WEIGHTS.activeInspector, reason: 'Inspector is active' }
        : { score: 0, reason: 'Inspector is inactive' }

      const totalScore =
        region.score +
        timePref.score +
        workload.score +
        gapEff.score +
        earlier.score +
        activeScore.score

      const reasons = [
        region.reason,
        timePref.reason,
        workload.reason,
        gapEff.reason,
        earlier.reason,
      ]

      const endMinutes = snappedStart + job.estimatedDurationMinutes

      candidates.push({
        inspectorId: inspector.inspectorId,
        inspectorName: inspector.inspectorName,
        date: targetDate,
        startTime: minutesToTime(snappedStart),
        endTime: minutesToTime(endMinutes),
        estimatedDurationMinutes: job.estimatedDurationMinutes,
        score: totalScore,
        reasons,
      })
    }
  }

  // Sort by score descending, take top N
  candidates.sort((a, b) => b.score - a.score)
  const suggestions = candidates.slice(0, MAX_SUGGESTIONS)

  return {
    suggestions,
    generatedAt: new Date().toISOString(),
    jobId: job.id,
  }
}
