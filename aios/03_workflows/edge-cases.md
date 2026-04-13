# Edge Cases & Failure Modes

Real-world scheduling is messy. This documents known edge cases, how the system handles them, and where gaps remain.

## Scheduling Edge Cases

### Double-booking an inspector
**Scenario**: Two jobs dragged to the same inspector at overlapping times.
**Current behavior**: No conflict detection. Both jobs persist. Timeline visually overlaps them.
**Risk**: High — inspector can't be in two places.
**Mitigation needed**: `checkConflicts()` service function. Block or warn on overlap.

### Drag to past time slot
**Scenario**: User drags a job to a 9AM slot when it's already 2PM.
**Current behavior**: Accepted without warning.
**Risk**: Low — dispatcher knows real time. But confusing for audits.
**Mitigation needed**: Visual indicator for past time slots. Optional block.

### Unscheduling a confirmed job
**Scenario**: Drag a confirmed/in-progress job back to the unscheduled queue.
**Current behavior**: Job returns to queue. `dispatch_status` → `unscheduled`. `assigned_to` → null. Status is NOT reverted.
**Risk**: Medium — a job can be `confirmed` but `unscheduled`, which is logically inconsistent.
**Mitigation needed**: Revert status to `pending` when unscheduling, or block unscheduling for non-pending jobs.

### Deleting an inspector with active jobs
**Scenario**: Inspector is deleted while they have scheduled jobs.
**Current behavior**: `assigned_to` set to NULL (ON DELETE SET NULL). Jobs become orphaned on the timeline.
**Risk**: Medium — jobs vanish from timeline view but still exist in the database.
**Mitigation needed**: Pre-delete check: reassign or unschedule active jobs first.

### Job with 0 or negative duration
**Scenario**: `estimated_duration_minutes` is set to 0 or a negative value.
**Current behavior**: Trigger still fires; `scheduled_end = scheduled_time + 0 minutes`. Block appears with zero width.
**Risk**: Low — visual glitch.
**Mitigation needed**: Validation in `createJob()` — minimum 15 minutes.

## Status Lifecycle Edge Cases

### Skipping statuses
**Scenario**: Manually setting a `pending` job to `completed` without going through `confirmed` → `in_progress`.
**Current behavior**: Allowed. No status machine enforcement at the database level.
**Risk**: Medium — breaks audit trail expectations.
**Mitigation needed**: `isValidTransition()` in the planned lifecycle service.

### Reactivating a cancelled job
**Scenario**: A cancelled job needs to be rescheduled.
**Current behavior**: Status can be manually set back to `pending`. No special handling.
**Risk**: Low — works but leaves a confusing status history.
**Mitigation needed**: Clear "reactivate" action that resets dispatch fields.

### on_hold → what next?
**Scenario**: Job put on hold, then conditions are met.
**Current behavior**: Must be manually set back to `pending`.
**Risk**: Low — but easy to forget a held job.
**Mitigation needed**: Dashboard widget showing on-hold jobs with age.

## Real-Time Sync Edge Cases

### Stale data after reconnect
**Scenario**: Browser loses connection, misses realtime events, reconnects.
**Current behavior**: `router.refresh()` only fires on new events. Missed events during disconnection are lost.
**Risk**: Medium — dispatcher sees stale timeline.
**Mitigation needed**: Periodic polling fallback or reconnection-triggered full refresh.

### Race condition on concurrent drag
**Scenario**: Two dispatchers drag the same job simultaneously.
**Current behavior**: Last write wins. No optimistic locking.
**Risk**: Low (single primary dispatcher), but will matter at scale.
**Mitigation needed**: Optimistic locking via `updated_at` comparison.

## Data Integrity Edge Cases

### Missing required fields on legacy jobs
**Scenario**: A job created before validation was tightened may have empty `client_name` or `address`.
**Current behavior**: Database defaults to empty string `''`. UI renders empty.
**Risk**: Low — cosmetic.
**Mitigation needed**: Migration to backfill or validation on read.

### Timezone handling
**Scenario**: `scheduled_time` is stored as TIME (no timezone). `created_at` is TIMESTAMPTZ.
**Current behavior**: Times are treated as local (Pacific). No explicit timezone conversion.
**Risk**: Low while single-region. Would break with multi-timezone expansion.
**Mitigation needed**: Document assumed timezone. Consider TIMESTAMPTZ for scheduling if expanding.
