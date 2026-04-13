export { estimateDuration } from './duration-estimation'
export { generateSuggestions } from './suggestion-engine'
export { checkConflicts, findAvailableGaps, timeToMinutes, minutesToTime } from './conflict-detection'
export type {
  SchedulingContext,
  SchedulingSuggestion,
  SuggestionResult,
  DurationEstimate,
  JobToSchedule,
  InspectorAvailability,
  InspectorScheduleSlot,
  TimeConflict,
  ApplyResult,
} from './types'
