// Pure geometry for the dispatch timeline's visible time window.
//
// The board covers a 9AM–5PM workday, but on a "today" view it hides the hours
// that have already passed — the scheduler books the future, not the past — so
// the remaining hours can flex to fill the width. All positioning is expressed
// as a PERCENTAGE of the visible span, so each region column fits whatever pixel
// width it's given and the board never needs a horizontal scrollbar.

export const DAY_START_HOUR = 9
export const END_HOUR = 17
/** Latest hour the window may start at, so there's always ≥ 2h of room to drop. */
export const MAX_START_HOUR = END_HOUR - 2 // 3PM

export interface DispatchWindow {
  /** First hour shown (integer). 9 for non-today; clamps toward 3PM late in the day. */
  visibleStartHour: number
  /** Hours of width the lane represents (END_HOUR − visibleStartHour, ≥ 2). */
  spanHours: number
  /** 0–100 position of the "now" line within the lane, or null when it shouldn't render. */
  nowPercent: number | null
  /** True once the workday is over on a today view (now ≥ 5PM). */
  dayComplete: boolean
  /**
   * Current wall-clock time in fractional hours (e.g. 13.5 = 1:30PM), or null
   * for SSR / non-today views. Job blocks cull finished work against this rather
   * than the clamped window start, so the late-day clamp doesn't resurrect
   * already-finished jobs.
   */
  nowHours: number | null
}

/**
 * Compute the visible window. Pass `now = null` — e.g. during SSR, or for any
 * date that isn't today — to get the full 9–5 day with no now-line.
 */
export function computeDispatchWindow(isToday: boolean, now: Date | null): DispatchWindow {
  if (!isToday || !now) {
    return {
      visibleStartHour: DAY_START_HOUR,
      spanHours: END_HOUR - DAY_START_HOUR,
      nowPercent: null,
      dayComplete: false,
      nowHours: null,
    }
  }

  const nowHours = now.getHours() + now.getMinutes() / 60
  const dayComplete = nowHours >= END_HOUR

  // Floor to the current hour so the in-progress hour stays visible (you can
  // still drop an "ASAP" job into it); clamp so there's always a usable window.
  const visibleStartHour = Math.max(
    DAY_START_HOUR,
    Math.min(Math.floor(nowHours), MAX_START_HOUR)
  )
  const spanHours = END_HOUR - visibleStartHour

  const nowPercent =
    !dayComplete && nowHours >= visibleStartHour
      ? ((nowHours - visibleStartHour) / spanHours) * 100
      : null

  return { visibleStartHour, spanHours, nowPercent, dayComplete, nowHours }
}

/** Percentage offset of a wall-clock time within the window, clamped to ≥ 0. */
export function timePercent(hour: number, minute: number, win: DispatchWindow): number {
  return Math.max(0, ((hour + minute / 60 - win.visibleStartHour) / win.spanHours) * 100)
}

/** Width (in %) that a duration in minutes occupies within the window. */
export function durationPercent(minutes: number, win: DispatchWindow): number {
  return (minutes / 60 / win.spanHours) * 100
}
