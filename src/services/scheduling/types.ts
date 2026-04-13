/**
 * Scheduling intelligence types — pure contracts, no framework imports.
 *
 * These types define the boundary between the pure scheduling engine
 * and the data-fetching layer (Supabase, Next.js actions, etc.).
 */

// ---------------------------------------------------------------------------
// Duration estimation
// ---------------------------------------------------------------------------

export interface DurationEstimate {
  minutes: number
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

// ---------------------------------------------------------------------------
// Inspector availability
// ---------------------------------------------------------------------------

export interface InspectorScheduleSlot {
  jobId: string
  startTime: string   // HH:mm
  endTime: string     // HH:mm
  durationMinutes: number
  address: string
}

export interface InspectorAvailability {
  inspectorId: string
  inspectorName: string
  region: string
  isActive: boolean
  scheduledSlots: InspectorScheduleSlot[]
}

// ---------------------------------------------------------------------------
// Job context (what we're scheduling)
// ---------------------------------------------------------------------------

export interface JobToSchedule {
  id: string
  title: string
  address: string
  city: string
  zipCode: string
  estimatedDurationMinutes: number
  requestedDate: string | null
  requestedTimePreference: 'morning' | 'afternoon' | 'anytime' | 'flexible' | null
  hasLockbox: boolean
}

// ---------------------------------------------------------------------------
// Scheduling context — the narrow contract pure services consume
// ---------------------------------------------------------------------------

export interface SchedulingContext {
  job: JobToSchedule
  inspectors: InspectorAvailability[]
  targetDate: string  // yyyy-MM-dd
  workdayStart: string // HH:mm — e.g. '09:00'
  workdayEnd: string   // HH:mm — e.g. '17:00'
}

// ---------------------------------------------------------------------------
// Suggestion output
// ---------------------------------------------------------------------------

export interface SchedulingSuggestion {
  inspectorId: string
  inspectorName: string
  date: string          // yyyy-MM-dd
  startTime: string     // HH:mm
  endTime: string       // HH:mm
  estimatedDurationMinutes: number
  score: number         // 0–100, higher is better
  reasons: string[]     // human-readable explanation of scoring
}

export interface SuggestionResult {
  suggestions: SchedulingSuggestion[]
  generatedAt: string   // ISO timestamp
  jobId: string
}

// ---------------------------------------------------------------------------
// Conflict types (for apply-time recheck)
// ---------------------------------------------------------------------------

export interface TimeConflict {
  jobId: string
  address: string
  overlapMinutes: number
}

export interface ApplyResult {
  success: boolean
  conflict?: TimeConflict[]
  error?: string
}
