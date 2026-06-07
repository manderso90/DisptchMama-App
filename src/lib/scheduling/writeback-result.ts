// GS Retrofit write-back result — shared, framework-agnostic.
//
// Lives apart from gsretrofit-writeback.ts (which imports the server-only
// Supabase client) so client components can import the type + helper safely.

/** Outcome of a write-back attempt. Advisory — local scheduling is authoritative. */
export type GsRetrofitWriteback =
  /** Job isn't linked to a GS Retrofit inspection request (e.g. a manual job). No POST made. */
  | { attempted: false; reason: 'job-not-linked' }
  /** POST succeeded. */
  | { attempted: true; ok: true; gsrInspectionRequestId: number }
  /** Attempted but failed — local schedule still stands. */
  | { attempted: true; ok: false; reason: 'inspector-not-linked' | 'api-error'; message: string }

/**
 * Turn a write-back result into a short, user-facing warning, or null when
 * there's nothing to warn about (no attempt, not linked, or success).
 */
export function gsRetrofitWarning(result?: GsRetrofitWriteback): string | null {
  if (!result || !result.attempted || result.ok) return null
  if (result.reason === 'inspector-not-linked') {
    return "saved locally, but the inspector isn't linked to GS Retrofit — not sent"
  }
  return "saved locally, but couldn't sync to GS Retrofit"
}
