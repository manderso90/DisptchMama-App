# Phase 1 Implementation Prompt — DisptchMama Clean Architecture

You are implementing Phase 1 of a clean architecture migration for the DisptchMama project.

---

## CONSTRAINTS (read these first — they are non-negotiable)

1. **Work directory**: `/Users/morrisanderson/Projects-clean/DisptchMama` — all new files go here.
2. **Reference directory**: `/Users/morrisanderson/Projects-clean/DisptchMama-App` — READ-ONLY. Copy from here. Never modify.
3. **Scope**: Phase 1 ONLY — scaffold, services layer, dispatch vertical slice, validation gate.
4. **Stop at the validation gate**. Do NOT proceed to Phase 2.
5. **Do NOT push, deploy, or `git push`**.
6. **Do NOT create or migrate**: jobs pages, inspectors pages, settings pages, or their components/actions.
7. **`src/proxy.ts`**: Copy as-is from reference. No behavioral refactor. Minimal type fix only if trivial.
8. **`src/app/admin/layout.tsx`**: Copy as-is. The `as any` cast stays.
9. **`tw-animate-css`**: Keep as-is. Do not optimize unless it blocks build.
10. At the end, produce a **file manifest** summarizing every file created/copied/rewritten/moved.

---

## REFERENCE: The AIOS v2 documents are at:
```
/Users/morrisanderson/Projects-clean/DisptchMama-App/aios/
```
Read these if you need architectural context:
- `02_architecture/folder-structure.md` — target folder structure
- `02_architecture/data-model.md` — database schema
- `02_architecture/system-design.md` — architecture layers
- `04_rules/coding-rules.md` — coding standards
- `04_rules/data-rules.md` — data flow rules
- `03_workflows/core-flows.md` — dispatch scheduling workflows
- `03_workflows/edge-cases.md` — known edge cases

---

## EXECUTION SEQUENCE

Follow these steps in order. Each step must complete before the next begins.

---

### Step 1: Create project directory + config files

```bash
mkdir -p /Users/morrisanderson/Projects-clean/DisptchMama
```

Copy these from the reference project, with the noted modifications:

**`package.json`** — Copy from reference, then remove `"shadcn": "^4.0.0"` from `dependencies`. Keep everything else including `tw-animate-css`.

**`tsconfig.json`** — Copy as-is.

**`next.config.ts`** — Copy as-is.

**`postcss.config.mjs`** — Copy as-is.

The user will provide `.env.local` manually — do not create it.

---

### Step 2: Install dependencies

```bash
cd /Users/morrisanderson/Projects-clean/DisptchMama
npm install
```

Verify `node_modules/` is created and there are no install errors.

---

### Step 3: Foundation layer

Copy these files from the reference project:

**`src/types/database.ts`** — Copy as-is. This is the type source of truth.

**`src/lib/utils.ts`** — Copy as-is. Contains the `cn()` helper.

**`src/lib/supabase/server.ts`** — Copy from reference, then add the `Database` generic. The current version does not type the client. Add `import type { Database } from '@/types/database'` and change `createServerClient(` to `createServerClient<Database>(`.

**`src/lib/supabase/client.ts`** — Same fix: add `import type { Database } from '@/types/database'` and change `createBrowserClient(` to `createBrowserClient<Database>(`.

---

### Step 4: Create services layer

These are NEW files that do not exist in the reference project. Create them from scratch.

#### `src/services/job-lifecycle.ts`

Pure TypeScript. No `'use server'`, no `'use client'`.

Must export:
- `VALID_TRANSITIONS`: `Record<JobStatus, JobStatus[]>` with this map:
  ```
  pending     → [confirmed, cancelled, on_hold]
  confirmed   → [in_progress, cancelled, on_hold, pending]
  in_progress → [completed, cancelled, on_hold]
  completed   → []
  cancelled   → [pending]
  on_hold     → [pending]
  ```
- `TERMINAL_STATUSES`: `['completed', 'cancelled'] as const`
- `isValidTransition(from: JobStatus, to: JobStatus): boolean` — checks the map
- `shouldAutoConfirm(job: { status: string; assigned_to: string | null; scheduled_date: string | null; scheduled_time: string | null }): boolean` — returns true if status is `'pending'` AND all three scheduling fields are non-null

Only import from `@/types/database` (specifically `JobStatus`).

#### `src/services/dispatch-scheduling.ts`

Pure TypeScript. Imports from `@/types/database` and `@/services/job-lifecycle`.

Must export:
- `computeDispatchStatus(fields: { assignedTo: string | null; scheduledDate: string | null; scheduledTime: string | null }): DispatchStatus` — returns `'scheduled'` if all three are non-null, else `'unscheduled'`

- `buildScheduleUpdate(current: { status: string; assigned_to: string | null; scheduled_date: string | null; scheduled_time: string | null; estimated_duration_minutes: number }, update: { assignedTo?: string | null; scheduledDate?: string | null; scheduledTime?: string | null; estimatedDurationMinutes?: number; scheduleNotes?: string }, userId: string): { updateData: Record<string, unknown>; statusChanged: boolean; newStatus?: string }`

  This function:
  1. Builds the update object from explicitly passed fields (use `'key' in update` checks)
  2. Computes effective values by merging update with current state
  3. Calls `computeDispatchStatus()` to set `dispatch_status`
  4. Tracks reassignment (if `assignedTo` changed, set `last_reassigned_by` and `last_reassigned_at`)
  5. Calls `shouldAutoConfirm()` — if true, sets `status: 'confirmed'`
  6. Returns `{ updateData, statusChanged, newStatus }`

- `buildUnscheduleUpdate(current: { status: string }, userId: string): { updateData: Record<string, unknown>; statusChanged: boolean; newStatus?: string }`

  This function:
  1. Sets `assigned_to: null`, `scheduled_date: null`, `scheduled_time: null`
  2. Sets `dispatch_status: 'unscheduled'`
  3. **If current status is `'confirmed'` or `'in_progress'`, reverts `status` to `'pending'`** — this fixes the P1 unschedule bug
  4. Tracks reassignment metadata
  5. Returns `{ updateData, statusChanged, newStatus }`

#### `src/services/conflict-detection.ts`

Pure TypeScript. No imports from Supabase or actions.

Must export:
- `TimeConflict` type: `{ jobId: string; address: string; overlapMinutes: number }`

- `checkConflicts(existingJobs: Array<{ id: string; address: string; scheduled_time: string | null; scheduled_end: string | null; estimated_duration_minutes: number }>, proposedStartTime: string, proposedDurationMinutes: number, excludeJobId?: string): TimeConflict[]`

  This function:
  1. Filters out the `excludeJobId` if provided (for reschedule case)
  2. For each existing job, parses `scheduled_time` and computes end time (using `scheduled_end` if available, else `scheduled_time + estimated_duration_minutes`)
  3. Converts times to minutes-since-midnight for easy comparison
  4. Checks overlap: `existingStart < proposedEnd && proposedStart < existingEnd`
  5. Returns array of conflicts (empty if none)

Helper function `timeToMinutes(time: string): number` — parses "HH:MM" or "HH:MM:SS" to minutes since midnight.

---

### Step 5: Checkpoint — type-check services

```bash
cd /Users/morrisanderson/Projects-clean/DisptchMama
npx tsc --noEmit
```

Must pass with ZERO errors. Fix any issues before proceeding.

---

### Step 6: Data layer (queries + actions)

#### `src/lib/queries/dispatch.ts` — REWRITE

Take the logic from the reference file but fix these issues:
- Replace `type AnyClient = any` with a proper typed parameter: `supabase: SupabaseClient<Database>`
- Add import: `import { SupabaseClient } from '@supabase/supabase-js'` and `import type { Database } from '@/types/database'`
- Keep the same `DispatchInspector`, `DispatchJob`, `UnscheduledJob` interfaces and exports
- Keep the same query logic — just fix the typing

#### `src/lib/actions/schedule-mutations.ts` — REWRITE

This is the most important rewrite. The current version has business logic embedded. The new version delegates to services.

Must export:
- `ScheduleUpdate` interface (same as current)
- `ScheduleResult` interface (same as current)
- `updateSchedule(update: ScheduleUpdate): Promise<ScheduleResult>`

The new `updateSchedule` function:
1. Authenticates (same auth guard pattern as current)
2. Fetches current job state from Supabase
3. **Fetches existing jobs for the inspector+date** (for conflict detection) — query the jobs table for `assigned_to = inspector_id AND scheduled_date = date AND status != 'cancelled'`
4. Calls `checkConflicts()` from `@/services/conflict-detection` with the existing jobs, passing `update.jobId` as `excludeJobId`
5. If conflicts exist, throws an error with a descriptive message (e.g., "Schedule conflict: overlaps with job at {address} by {minutes} minutes")
6. Calls `buildScheduleUpdate()` or `buildUnscheduleUpdate()` from `@/services/dispatch-scheduling` depending on whether we're scheduling or unscheduling (unscheduling = `assignedTo` is explicitly null)
7. Persists the update to Supabase
8. Logs to `job_status_history` if status changed
9. Calls `revalidatePath` for `/admin/dispatch` and `/admin/jobs`
10. Returns `ScheduleResult`

The key difference: **all business logic (dispatch status computation, auto-confirm, status revert, conflict detection) lives in the services**. This action is just glue.

#### `src/lib/actions/dispatch-actions.ts` — COPY+FIX

Copy from reference. The `scheduleFromDispatch` and `updateJobTime` functions call `updateSchedule`. If the `ScheduleUpdate` interface hasn't changed, this file can be copied as-is. If it has, adjust imports/calls to match.

---

### Step 7: Hooks

#### `src/hooks/use-schedule-sync.ts` — MOVE

Copy the content from reference at `src/lib/hooks/use-schedule-sync.ts` into the new location `src/hooks/use-schedule-sync.ts`. The file content stays identical — the import path `@/lib/supabase/client` doesn't change since that's an absolute path.

---

### Step 8: UI primitives

Copy these 6 files as-is from the reference `src/components/ui/` directory:
- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/label.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/avatar.tsx`
- `src/components/ui/dropdown-menu.tsx`

Do NOT copy: badge.tsx, dialog.tsx, select.tsx, separator.tsx (Phase 2).

---

### Step 9: Dispatch components

Copy these 6 files as-is from reference `src/components/admin/dispatch/`:
- `src/components/admin/dispatch/TimelineGrid.tsx`
- `src/components/admin/dispatch/JobBlock.tsx`
- `src/components/admin/dispatch/UnscheduledQueue.tsx`
- `src/components/admin/dispatch/UnscheduledJobChip.tsx`
- `src/components/admin/dispatch/DispatchHeader.tsx`
- `src/components/admin/dispatch/DispatchCalendar.tsx`

#### `src/components/admin/dispatch/EditTimeModal.tsx` — NEW

Extract the edit-time modal from the current `DispatchClient.tsx` (lines 218-298 in the reference) into its own component.

Props interface:
```typescript
interface EditTimeModalProps {
  open: boolean
  job: DispatchJob | null
  inspectorName: string | null
  currentDate: string
  onClose: () => void
  onSave: (time: string) => Promise<void>
}
```

The component manages its own `editTime` state and `editError` state, and `isSaving` state. It calls `onSave(editTime)` when the save button is clicked. On error, it displays the error. On success, the parent closes the modal.

Mark as `'use client'`.

#### `src/components/admin/dispatch/DispatchClient.tsx` — REWRITE

Rewrite to use the clean architecture:

1. Import `useScheduleSync` from `@/hooks/use-schedule-sync` (not `@/lib/hooks/`)
2. Import `EditTimeModal` from `./EditTimeModal`
3. The DnD logic stays the same (DndContext, DragOverlay, handleDragStart, handleDragEnd)
4. The `handleDragEnd` function works the same way — it calls `scheduleFromDispatch`, `updateSchedule`, `updateJobTime` — but now those actions internally validate via services
5. Add conflict error handling: when `scheduleFromDispatch` or `updateSchedule` throws, display the error message in the toast (this already happens — the catch block shows `err.message`)
6. Replace the inline edit modal (lines 218-298) with `<EditTimeModal ... />`
7. The `handleSaveEdit` logic moves into a callback passed to `EditTimeModal`

Keep all the same DnD patterns, toast patterns, and region grouping.

---

### Step 10: Shared + layout components

Copy as-is from reference:
- `src/components/admin/shared/ScheduleToast.tsx`
- `src/components/admin/shared/UnassignedBadge.tsx`
- `src/components/admin/layout/AdminSidebar.tsx`
- `src/components/admin/layout/AdminHeader.tsx`

The sidebar has links to `/admin/jobs`, `/admin/inspectors`, `/admin/settings` — those pages don't exist yet and will 404. That is acceptable for Phase 1.

---

### Step 11: Auth + pages

Copy all of these as-is from reference (no modifications):
- `src/proxy.ts`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/login/page.tsx`
- `src/app/admin/layout.tsx` (keep `as any` — no refactor)
- `src/app/admin/page.tsx`
- `src/app/admin/dispatch/page.tsx`
- `src/app/api/auth/callback/route.ts`
- `src/app/api/auth/logout/route.ts`

**`src/app/globals.css`** — Copy from reference, then remove these stale `@source not` lines that reference directories that don't exist in the new project:
```css
@source not "../../.claude";
@source not "../../module-installs";
@source not "../../plans";
@source not "../../context";
```

---

### Step 12: Static assets + AIOS context

```bash
# Copy public assets
cp -r /Users/morrisanderson/Projects-clean/DisptchMama-App/public /Users/morrisanderson/Projects-clean/DisptchMama/

# Copy AIOS context (AI-only, never imported by src/)
cp -r /Users/morrisanderson/Projects-clean/DisptchMama-App/aios /Users/morrisanderson/Projects-clean/DisptchMama/

# Copy schema
mkdir -p /Users/morrisanderson/Projects-clean/DisptchMama/supabase
cp /Users/morrisanderson/Projects-clean/DisptchMama-App/supabase/schema.sql /Users/morrisanderson/Projects-clean/DisptchMama/supabase/
```

Also copy the `.claude/` directory if it exists (commands, skills, settings):
```bash
cp -r /Users/morrisanderson/Projects-clean/DisptchMama-App/.claude /Users/morrisanderson/Projects-clean/DisptchMama/
```

---

## HARD VALIDATION GATE

Phase 1 ends here. Run all 4 gates. Do NOT proceed past this point.

### Gate 1: Type check
```bash
cd /Users/morrisanderson/Projects-clean/DisptchMama
npx tsc --noEmit
```
**Required**: ZERO errors.

### Gate 2: Build
```bash
npm run build
```
**Required**: Successful build. Google Fonts fetch warning is acceptable (sandbox-only issue).

### Gate 3: Architecture audit

Verify each of these. Report pass/fail for each:
```
[ ] src/services/ exists with exactly 3 files (job-lifecycle.ts, dispatch-scheduling.ts, conflict-detection.ts)
[ ] No file in src/services/ imports from src/lib/actions/ or src/components/
[ ] No file in src/services/ contains 'use server' or 'use client'
[ ] src/hooks/use-schedule-sync.ts exists (NOT src/lib/hooks/)
[ ] DispatchClient.tsx imports from @/hooks/use-schedule-sync, not @/lib/hooks/
[ ] DispatchClient.tsx does NOT contain an inline edit modal (extracted to EditTimeModal.tsx)
[ ] dispatch.ts uses SupabaseClient<Database>, not AnyClient or any
[ ] schedule-mutations.ts imports and calls functions from @/services/
[ ] package.json does NOT list shadcn in dependencies
[ ] No new 'any' types in rewritten or new files (services, queries/dispatch, actions/schedule-mutations, DispatchClient, EditTimeModal)
```

### Gate 4: Dispatch slice code trace

Trace these 5 code paths and confirm the call chain is correct:
```
[ ] Schedule:    DispatchClient.handleDragEnd → scheduleFromDispatch → updateSchedule → checkConflicts + buildScheduleUpdate → Supabase persist
[ ] Reschedule:  DispatchClient.handleDragEnd → updateSchedule → checkConflicts + buildScheduleUpdate → Supabase persist
[ ] Unschedule:  DispatchClient.handleDragEnd → updateSchedule → buildUnscheduleUpdate (reverts status to pending) → Supabase persist
[ ] Conflict:    updateSchedule → checkConflicts → throws if overlap → DispatchClient catches → shows error in toast
[ ] Realtime:    useScheduleSync → subscribes to postgres_changes on jobs → router.refresh()
```

---

## FINAL OUTPUT

After the validation gate, produce a **file manifest** in this format:

```
=== Phase 1 File Manifest ===

CREATED (new files):
  src/services/job-lifecycle.ts
  src/services/dispatch-scheduling.ts
  src/services/conflict-detection.ts
  src/components/admin/dispatch/EditTimeModal.tsx

COPIED (unchanged from reference):
  [list every file copied as-is]

COPIED+FIXED (copied with targeted changes):
  [list every file with what was changed]

REWRITTEN (same purpose, new implementation):
  [list every file rewritten]

MOVED (relocated):
  src/lib/hooks/use-schedule-sync.ts → src/hooks/use-schedule-sync.ts

VALIDATION RESULTS:
  Gate 1 (tsc --noEmit):     PASS / FAIL
  Gate 2 (npm run build):    PASS / FAIL
  Gate 3 (architecture):     X/10 checks passed
  Gate 4 (code trace):       X/5 paths verified
```

**STOP HERE. Do not proceed to Phase 2. Do not push to any remote. Wait for review.**
