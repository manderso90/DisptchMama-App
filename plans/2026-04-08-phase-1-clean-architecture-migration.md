# Plan: Phase 1 — DisptchMama Clean Architecture Migration

**Created:** 2026-04-08
**Status:** Implemented
**Request:** Scaffold a clean project at `/Users/morrisanderson/Projects-clean/DisptchMama` with a services layer, rewritten dispatch vertical slice, and validation gate — Phase 1 only.

---

## Overview

### What This Plan Accomplishes

Migrates the DisptchMama dispatch scheduling system into a clean architecture by creating a fresh project directory, extracting business logic into a pure services layer, rewriting the data/action layer to delegate to services, and copying/fixing all UI and infrastructure files needed for the dispatch vertical slice to build and run.

### Why This Matters

The current codebase has business logic embedded directly in server actions (`schedule-mutations.ts`). This makes it untestable, hard to reason about, and prone to bugs (e.g., the P1 unschedule bug where status doesn't revert to pending). The clean architecture separates concerns: pure services handle logic, actions handle persistence, components handle UI. This also adds conflict detection — a missing safety feature.

---

## Current State

### Relevant Existing Structure

**Reference project** (`/Users/morrisanderson/Projects-clean/DisptchMama-App`):
```
src/
├── types/database.ts              # Type source of truth (JobStatus, DispatchStatus, etc.)
├── proxy.ts                       # Auth middleware for /admin/* routes
├── lib/
│   ├── utils.ts                   # cn() helper
│   ├── supabase/server.ts         # Untyped createServerClient
│   ├── supabase/client.ts         # Untyped createBrowserClient
│   ├── queries/dispatch.ts        # Uses `type AnyClient = any`
│   ├── actions/schedule-mutations.ts  # Business logic embedded in server action
│   ├── actions/dispatch-actions.ts    # Thin wrappers around updateSchedule
│   └── hooks/use-schedule-sync.ts     # Realtime subscription hook
├── components/
│   ├── ui/ (button, input, label, card, avatar, dropdown-menu, badge, dialog, select, separator)
│   └── admin/
│       ├── dispatch/ (DispatchClient, TimelineGrid, JobBlock, UnscheduledQueue, etc.)
│       ├── shared/ (ScheduleToast, UnassignedBadge, QuickScheduleActions)
│       └── layout/ (AdminSidebar, AdminHeader)
└── app/
    ├── layout.tsx, page.tsx, globals.css
    ├── login/page.tsx
    ├── admin/ (layout, page, dispatch/page, jobs/*, inspectors/*)
    └── api/auth/ (callback, logout)
```

### Gaps or Problems Being Addressed

1. **Embedded business logic** — `schedule-mutations.ts` contains dispatch status computation, auto-confirm, and status management inline. Not testable in isolation.
2. **No conflict detection** — Nothing prevents double-booking an inspector at the same time.
3. **Untyped Supabase clients** — `createServerClient()` and `createBrowserClient()` lack the `Database` generic, so query results are `any`.
4. **`type AnyClient = any`** — `dispatch.ts` uses `any` for the Supabase client parameter.
5. **P1 unschedule bug** — Unscheduling a confirmed/in_progress job doesn't revert status to pending.
6. **Hook location** — `use-schedule-sync.ts` is in `src/lib/hooks/` but should be in `src/hooks/` per architecture rules.
7. **Inline modal** — The edit-time modal is embedded in DispatchClient.tsx (lines 218-298), making it a 302-line component.
8. **shadcn dependency** — `package.json` lists `shadcn: ^4.0.0` as a runtime dependency (it's a CLI tool, not needed at runtime).

---

## Proposed Changes

### Summary of Changes

- Create fresh project at `/Users/morrisanderson/Projects-clean/DisptchMama`
- Copy config files (package.json minus shadcn, tsconfig, next.config, postcss)
- Copy foundation files with Supabase typing fixes
- **Create 3 new service files** (job-lifecycle, dispatch-scheduling, conflict-detection)
- **Rewrite** dispatch query with proper typing
- **Rewrite** schedule-mutations to delegate all logic to services
- Copy+fix dispatch-actions
- Move hook to `src/hooks/`
- Copy 6 UI primitives
- Copy 6 dispatch components, **create** EditTimeModal, **rewrite** DispatchClient
- Copy shared/layout components
- Copy auth pages, app pages, proxy, globals.css (with stale lines removed)
- Copy static assets, AIOS context, schema, .claude directory

### New Files to Create

| File Path | Purpose |
| --- | --- |
| `src/services/job-lifecycle.ts` | Status transition rules, terminal statuses, auto-confirm logic |
| `src/services/dispatch-scheduling.ts` | Dispatch status computation, schedule/unschedule update builders |
| `src/services/conflict-detection.ts` | Time overlap detection for inspector scheduling |
| `src/components/admin/dispatch/EditTimeModal.tsx` | Extracted edit-time modal (was inline in DispatchClient) |

### Files to Modify (copied with targeted changes)

| File Path | Changes |
| --- | --- |
| `package.json` | Remove `"shadcn": "^4.0.0"` from dependencies |
| `src/lib/supabase/server.ts` | Add `Database` generic to `createServerClient<Database>()` |
| `src/lib/supabase/client.ts` | Add `Database` generic to `createBrowserClient<Database>()` |
| `src/app/globals.css` | Remove 4 stale `@source not` lines |

### Files to Rewrite (same purpose, new implementation)

| File Path | Changes |
| --- | --- |
| `src/lib/queries/dispatch.ts` | Replace `type AnyClient = any` with `SupabaseClient<Database>` |
| `src/lib/actions/schedule-mutations.ts` | Delegate all business logic to services; add conflict detection |
| `src/components/admin/dispatch/DispatchClient.tsx` | Use `@/hooks/use-schedule-sync`, use `EditTimeModal` component |

### Files to Move

| From | To |
| --- | --- |
| `src/lib/hooks/use-schedule-sync.ts` | `src/hooks/use-schedule-sync.ts` |

### Files Copied As-Is (no changes)

- `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`
- `src/types/database.ts`, `src/lib/utils.ts`, `src/proxy.ts`
- `src/lib/actions/dispatch-actions.ts`
- `src/components/ui/` — button, input, label, card, avatar, dropdown-menu (6 files)
- `src/components/admin/dispatch/` — TimelineGrid, JobBlock, UnscheduledQueue, UnscheduledJobChip, DispatchHeader, DispatchCalendar (6 files)
- `src/components/admin/shared/` — ScheduleToast, UnassignedBadge (2 files)
- `src/components/admin/layout/` — AdminSidebar, AdminHeader (2 files)
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/login/page.tsx`
- `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`, `src/app/admin/dispatch/page.tsx`
- `src/app/api/auth/callback/route.ts`, `src/app/api/auth/logout/route.ts`
- `public/` directory, `aios/` directory, `supabase/schema.sql`, `.claude/` directory

### Files NOT Included (Phase 2+)

- `src/app/admin/jobs/**` — jobs pages and components
- `src/app/admin/inspectors/**` — inspectors pages and components
- `src/app/admin/settings/**` — settings pages
- `src/components/ui/badge.tsx`, `dialog.tsx`, `select.tsx`, `separator.tsx`
- `src/lib/queries/jobs.ts`, `inspectors.ts`
- `src/lib/actions/job-actions.ts`, `inspector-actions.ts`, `employee-actions.ts`
- `src/components/admin/shared/QuickScheduleActions.tsx`

---

## Design Decisions

### Key Decisions Made

1. **Services are pure TypeScript with zero framework imports** — No `'use server'`, no `'use client'`, no Supabase, no React. This makes them unit-testable without any mocking. Services import only from `@/types/database` and each other.

2. **Actions become thin glue** — `schedule-mutations.ts` handles auth, data fetching, service calls, persistence, revalidation. All business decisions (what status to set, whether to auto-confirm, conflict checking) happen in services.

3. **Conflict detection integrated into updateSchedule** — Every schedule/reschedule operation checks for time overlaps with the inspector's existing jobs. Conflicts throw descriptive errors that surface in the UI toast.

4. **P1 unschedule bug fixed in `buildUnscheduleUpdate`** — When unscheduling a job with status `confirmed` or `in_progress`, the service reverts status to `pending`. This is the correct behavior that was missing.

5. **EditTimeModal extracted** — Reduces DispatchClient from 302 lines. The modal manages its own state (editTime, editError, isSaving) and delegates save to a parent callback.

6. **Hook moved to `src/hooks/`** — Per the AIOS architecture rules, client hooks belong in `src/hooks/`, not `src/lib/hooks/`.

7. **`dispatch-actions.ts` copied as-is** — The `scheduleFromDispatch` and `updateJobTime` wrappers call `updateSchedule` with the same `ScheduleUpdate` interface. No changes needed since the interface is preserved.

### Alternatives Considered

- **Gradual refactor in-place**: Rejected because the reference project has other pages/components that would create noise. A clean project isolates Phase 1 scope.
- **Creating a shared services package**: Over-engineering for this stage. Direct imports within `src/services/` are sufficient.
- **Adding conflict detection as a separate middleware**: Would add complexity. Integrating it into `updateSchedule` is simpler and ensures it's always called.

### Open Questions

1. **Conflict detection strictness**: Should conflicts be hard errors (block the operation) or warnings (allow override)? Plan assumes hard errors. Can be softened later.
2. **`.env.local`**: User must manually copy or create this file — it contains secrets and is never committed or auto-generated.

---

## Step-by-Step Tasks

Execute these tasks in order during implementation.

---

### Step 1: Create Project Directory + Config Files

Create the target directory and copy config files with modifications.

**Actions:**

- `mkdir -p /Users/morrisanderson/Projects-clean/DisptchMama`
- Copy `package.json` from reference, then remove `"shadcn": "^4.0.0"` from `dependencies`
- Copy `tsconfig.json` as-is
- Copy `next.config.ts` as-is
- Copy `postcss.config.mjs` as-is
- Copy `eslint.config.mjs` as-is (if it exists)

**Files affected:**
- `/Users/morrisanderson/Projects-clean/DisptchMama/package.json` (COPIED+FIXED)
- `/Users/morrisanderson/Projects-clean/DisptchMama/tsconfig.json` (COPIED)
- `/Users/morrisanderson/Projects-clean/DisptchMama/next.config.ts` (COPIED)
- `/Users/morrisanderson/Projects-clean/DisptchMama/postcss.config.mjs` (COPIED)
- `/Users/morrisanderson/Projects-clean/DisptchMama/eslint.config.mjs` (COPIED)

**Verification:** All 5 config files exist in target directory. `package.json` does not contain `shadcn`.

---

### Step 2: Install Dependencies

**Actions:**

```bash
cd /Users/morrisanderson/Projects-clean/DisptchMama
npm install
```

**Verification:** `node_modules/` exists. No install errors. Exit code 0.

---

### Step 3: Foundation Layer

Copy type definitions, utilities, and Supabase clients with typing fixes.

**Actions:**

- Copy `src/types/database.ts` as-is
- Copy `src/lib/utils.ts` as-is
- Copy `src/lib/supabase/server.ts`, then:
  - Add `import type { Database } from '@/types/database'` at top
  - Change `createServerClient(` to `createServerClient<Database>(`
- Copy `src/lib/supabase/client.ts`, then:
  - Add `import type { Database } from '@/types/database'` at top
  - Change `createBrowserClient(` to `createBrowserClient<Database>(`

**Files affected:**
- `src/types/database.ts` (COPIED)
- `src/lib/utils.ts` (COPIED)
- `src/lib/supabase/server.ts` (COPIED+FIXED)
- `src/lib/supabase/client.ts` (COPIED+FIXED)

**Verification:** All 4 files exist. Supabase files contain `<Database>` generic.

---

### Step 4: Create Services Layer

Create 3 new pure TypeScript service files from scratch.

#### 4a: `src/services/job-lifecycle.ts`

```typescript
import type { JobStatus } from '@/types/database'

export const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  pending: ['confirmed', 'cancelled', 'on_hold'],
  confirmed: ['in_progress', 'cancelled', 'on_hold', 'pending'],
  in_progress: ['completed', 'cancelled', 'on_hold'],
  completed: [],
  cancelled: ['pending'],
  on_hold: ['pending'],
}

export const TERMINAL_STATUSES = ['completed', 'cancelled'] as const

export function isValidTransition(from: JobStatus, to: JobStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to)
}

export function shouldAutoConfirm(job: {
  status: string
  assigned_to: string | null
  scheduled_date: string | null
  scheduled_time: string | null
}): boolean {
  return (
    job.status === 'pending' &&
    job.assigned_to !== null &&
    job.scheduled_date !== null &&
    job.scheduled_time !== null
  )
}
```

**Constraints:** No `'use server'`, no `'use client'`. Only imports from `@/types/database`.

#### 4b: `src/services/dispatch-scheduling.ts`

```typescript
import type { DispatchStatus } from '@/types/database'
import { shouldAutoConfirm } from '@/services/job-lifecycle'

export function computeDispatchStatus(fields: {
  assignedTo: string | null
  scheduledDate: string | null
  scheduledTime: string | null
}): DispatchStatus {
  return fields.assignedTo !== null &&
    fields.scheduledDate !== null &&
    fields.scheduledTime !== null
    ? 'scheduled'
    : 'unscheduled'
}

export function buildScheduleUpdate(
  current: {
    status: string
    assigned_to: string | null
    scheduled_date: string | null
    scheduled_time: string | null
    estimated_duration_minutes: number
  },
  update: {
    assignedTo?: string | null
    scheduledDate?: string | null
    scheduledTime?: string | null
    estimatedDurationMinutes?: number
    scheduleNotes?: string
  },
  userId: string
): { updateData: Record<string, unknown>; statusChanged: boolean; newStatus?: string } {
  const updateData: Record<string, unknown> = {}

  // 1. Build update from explicitly passed fields
  if ('assignedTo' in update) updateData.assigned_to = update.assignedTo
  if ('scheduledDate' in update) updateData.scheduled_date = update.scheduledDate
  if ('scheduledTime' in update) updateData.scheduled_time = update.scheduledTime
  if ('estimatedDurationMinutes' in update) updateData.estimated_duration_minutes = update.estimatedDurationMinutes
  if ('scheduleNotes' in update) updateData.schedule_notes = update.scheduleNotes

  // 2. Compute effective values (merge update over current)
  const effective = {
    assignedTo: 'assignedTo' in update ? update.assignedTo! : current.assigned_to,
    scheduledDate: 'scheduledDate' in update ? update.scheduledDate! : current.scheduled_date,
    scheduledTime: 'scheduledTime' in update ? update.scheduledTime! : current.scheduled_time,
  }

  // 3. Compute dispatch_status
  updateData.dispatch_status = computeDispatchStatus(effective)

  // 4. Track reassignment
  if ('assignedTo' in update && update.assignedTo !== current.assigned_to) {
    updateData.last_reassigned_by = userId
    updateData.last_reassigned_at = new Date().toISOString()
  }

  // 5. Auto-confirm check
  let statusChanged = false
  let newStatus: string | undefined
  const effectiveJob = {
    status: current.status,
    assigned_to: effective.assignedTo,
    scheduled_date: effective.scheduledDate,
    scheduled_time: effective.scheduledTime,
  }

  if (shouldAutoConfirm(effectiveJob)) {
    updateData.status = 'confirmed'
    statusChanged = true
    newStatus = 'confirmed'
  }

  // 6. Set updated_at
  updateData.updated_at = new Date().toISOString()

  return { updateData, statusChanged, newStatus }
}

export function buildUnscheduleUpdate(
  current: { status: string },
  userId: string
): { updateData: Record<string, unknown>; statusChanged: boolean; newStatus?: string } {
  const updateData: Record<string, unknown> = {
    assigned_to: null,
    scheduled_date: null,
    scheduled_time: null,
    dispatch_status: 'unscheduled',
    last_reassigned_by: userId,
    last_reassigned_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  let statusChanged = false
  let newStatus: string | undefined

  // P1 bug fix: revert confirmed/in_progress to pending on unschedule
  if (current.status === 'confirmed' || current.status === 'in_progress') {
    updateData.status = 'pending'
    statusChanged = true
    newStatus = 'pending'
  }

  return { updateData, statusChanged, newStatus }
}
```

**Constraints:** No `'use server'`, no `'use client'`. Imports from `@/types/database` and `@/services/job-lifecycle`.

#### 4c: `src/services/conflict-detection.ts`

```typescript
export interface TimeConflict {
  jobId: string
  address: string
  overlapMinutes: number
}

function timeToMinutes(time: string): number {
  const parts = time.split(':')
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
}

export function checkConflicts(
  existingJobs: Array<{
    id: string
    address: string
    scheduled_time: string | null
    scheduled_end: string | null
    estimated_duration_minutes: number
  }>,
  proposedStartTime: string,
  proposedDurationMinutes: number,
  excludeJobId?: string
): TimeConflict[] {
  const proposedStart = timeToMinutes(proposedStartTime)
  const proposedEnd = proposedStart + proposedDurationMinutes
  const conflicts: TimeConflict[] = []

  for (const job of existingJobs) {
    // Skip excluded job (reschedule case)
    if (excludeJobId && job.id === excludeJobId) continue

    // Skip jobs without a scheduled time
    if (!job.scheduled_time) continue

    const existingStart = timeToMinutes(job.scheduled_time)
    const existingEnd = job.scheduled_end
      ? timeToMinutes(job.scheduled_end)
      : existingStart + job.estimated_duration_minutes

    // Check overlap: existingStart < proposedEnd && proposedStart < existingEnd
    if (existingStart < proposedEnd && proposedStart < existingEnd) {
      const overlapStart = Math.max(existingStart, proposedStart)
      const overlapEnd = Math.min(existingEnd, proposedEnd)
      conflicts.push({
        jobId: job.id,
        address: job.address,
        overlapMinutes: overlapEnd - overlapStart,
      })
    }
  }

  return conflicts
}
```

**Constraints:** No `'use server'`, no `'use client'`. No Supabase or action imports.

**Files affected:**
- `src/services/job-lifecycle.ts` (CREATED)
- `src/services/dispatch-scheduling.ts` (CREATED)
- `src/services/conflict-detection.ts` (CREATED)

---

### Step 5: Checkpoint — Type-Check Services

**Actions:**

```bash
cd /Users/morrisanderson/Projects-clean/DisptchMama
npx tsc --noEmit
```

**Verification:** Exit code 0, zero errors. If errors, fix before proceeding.

---

### Step 6: Data Layer (Queries + Actions)

#### 6a: `src/lib/queries/dispatch.ts` — REWRITE

Copy the reference file, then apply these changes:

- Remove `type AnyClient = any`
- Add imports:
  ```typescript
  import { SupabaseClient } from '@supabase/supabase-js'
  import type { Database } from '@/types/database'
  ```
- Change function signatures from `supabase: AnyClient` to `supabase: SupabaseClient<Database>`
- Keep all `DispatchInspector`, `DispatchJob`, `UnscheduledJob` interfaces identical
- Keep all query logic identical

#### 6b: `src/lib/actions/schedule-mutations.ts` — REWRITE

This is the most critical rewrite. The new implementation:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkConflicts } from '@/services/conflict-detection'
import { buildScheduleUpdate, buildUnscheduleUpdate } from '@/services/dispatch-scheduling'

export interface ScheduleUpdate {
  jobId: string
  assignedTo?: string | null
  scheduledDate?: string | null
  scheduledTime?: string | null
  estimatedDurationMinutes?: number
  scheduleNotes?: string
}

export interface ScheduleResult {
  success: boolean
  jobId: string
  statusChanged?: boolean
  newStatus?: string
}

export async function updateSchedule(update: ScheduleUpdate): Promise<ScheduleResult> {
  // 1. Auth guard
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  // 2. Fetch current job state
  const { data: currentJob, error: jobError } = await supabase
    .from('jobs')
    .select('status, assigned_to, scheduled_date, scheduled_time, estimated_duration_minutes')
    .eq('id', update.jobId)
    .single()
  if (jobError || !currentJob) throw new Error('Job not found')

  // 3. Determine if this is an unschedule operation
  const isUnschedule = 'assignedTo' in update && update.assignedTo === null

  let updateData: Record<string, unknown>
  let statusChanged: boolean
  let newStatus: string | undefined

  if (isUnschedule) {
    // Unschedule path
    const result = buildUnscheduleUpdate(currentJob, user.id)
    updateData = result.updateData
    statusChanged = result.statusChanged
    newStatus = result.newStatus
  } else {
    // Schedule/reschedule path — run conflict detection
    const effectiveInspectorId = 'assignedTo' in update ? update.assignedTo : currentJob.assigned_to
    const effectiveDate = 'scheduledDate' in update ? update.scheduledDate : currentJob.scheduled_date
    const effectiveTime = 'scheduledTime' in update ? update.scheduledTime : currentJob.scheduled_time
    const effectiveDuration = update.estimatedDurationMinutes ?? currentJob.estimated_duration_minutes

    if (effectiveInspectorId && effectiveDate && effectiveTime) {
      // 4. Fetch existing jobs for conflict check
      const { data: existingJobs } = await supabase
        .from('jobs')
        .select('id, address, scheduled_time, scheduled_end, estimated_duration_minutes')
        .eq('assigned_to', effectiveInspectorId)
        .eq('scheduled_date', effectiveDate)
        .neq('status', 'cancelled')

      // 5. Check conflicts
      const conflicts = checkConflicts(
        existingJobs ?? [],
        effectiveTime,
        effectiveDuration,
        update.jobId
      )

      if (conflicts.length > 0) {
        const c = conflicts[0]
        throw new Error(
          `Schedule conflict: overlaps with job at ${c.address} by ${c.overlapMinutes} minutes`
        )
      }
    }

    // 6. Build schedule update
    const result = buildScheduleUpdate(currentJob, update, user.id)
    updateData = result.updateData
    statusChanged = result.statusChanged
    newStatus = result.newStatus
  }

  // 7. Persist to Supabase
  const { error: updateError } = await supabase
    .from('jobs')
    .update(updateData)
    .eq('id', update.jobId)
  if (updateError) throw new Error('Failed to update job')

  // 8. Log status change to history
  if (statusChanged && newStatus) {
    await supabase.from('job_status_history').insert({
      job_id: update.jobId,
      changed_by: user.id,
      from_status: currentJob.status,
      to_status: newStatus,
      note: isUnschedule ? 'Status reverted on unschedule' : 'Auto-confirmed on schedule',
    })
  }

  // 9. Revalidate
  revalidatePath('/admin/dispatch')
  revalidatePath('/admin/jobs')

  // 10. Return result
  return {
    success: true,
    jobId: update.jobId,
    statusChanged,
    newStatus,
  }
}
```

#### 6c: `src/lib/actions/dispatch-actions.ts` — COPY+FIX

Copy from reference. Verify it imports `updateSchedule` from `@/lib/actions/schedule-mutations` and that the `ScheduleUpdate` interface is compatible. The reference file's `scheduleFromDispatch` and `updateJobTime` functions pass fields matching the `ScheduleUpdate` interface, so this should work as-is. If the reference imports `ScheduleUpdate` type explicitly, ensure the import path is correct.

**Files affected:**
- `src/lib/queries/dispatch.ts` (REWRITTEN)
- `src/lib/actions/schedule-mutations.ts` (REWRITTEN)
- `src/lib/actions/dispatch-actions.ts` (COPIED or COPIED+FIX)

---

### Step 7: Hooks

**Actions:**

- Copy content from reference `src/lib/hooks/use-schedule-sync.ts` to new location `src/hooks/use-schedule-sync.ts`
- Content stays identical — the `@/lib/supabase/client` import path doesn't change

**Files affected:**
- `src/hooks/use-schedule-sync.ts` (MOVED)

---

### Step 8: UI Primitives

Copy these 6 files as-is from reference `src/components/ui/`:

**Actions:**

- `mkdir -p /Users/morrisanderson/Projects-clean/DisptchMama/src/components/ui`
- Copy: `button.tsx`, `input.tsx`, `label.tsx`, `card.tsx`, `avatar.tsx`, `dropdown-menu.tsx`

**Do NOT copy:** `badge.tsx`, `dialog.tsx`, `select.tsx`, `separator.tsx` (Phase 2)

**Files affected:**
- `src/components/ui/button.tsx` (COPIED)
- `src/components/ui/input.tsx` (COPIED)
- `src/components/ui/label.tsx` (COPIED)
- `src/components/ui/card.tsx` (COPIED)
- `src/components/ui/avatar.tsx` (COPIED)
- `src/components/ui/dropdown-menu.tsx` (COPIED)

---

### Step 9: Dispatch Components

#### 9a: Copy 6 existing components as-is

- `mkdir -p /Users/morrisanderson/Projects-clean/DisptchMama/src/components/admin/dispatch`
- Copy from reference: `TimelineGrid.tsx`, `JobBlock.tsx`, `UnscheduledQueue.tsx`, `UnscheduledJobChip.tsx`, `DispatchHeader.tsx`, `DispatchCalendar.tsx`

#### 9b: Create `EditTimeModal.tsx` — NEW

Extract the edit-time modal (reference DispatchClient.tsx lines 218-298) into a standalone component:

```typescript
'use client'

import { useState, useEffect } from 'react'
import type { DispatchJob } from '@/lib/queries/dispatch'

interface EditTimeModalProps {
  open: boolean
  job: DispatchJob | null
  inspectorName: string | null
  currentDate: string
  onClose: () => void
  onSave: (time: string) => Promise<void>
}

export function EditTimeModal({ open, job, inspectorName, currentDate, onClose, onSave }: EditTimeModalProps) {
  const [editTime, setEditTime] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Sync editTime when job changes
  useEffect(() => {
    if (job?.scheduled_time) {
      setEditTime(job.scheduled_time.slice(0, 5))
    }
    setEditError(null)
  }, [job])

  if (!open || !job) return null

  const handleSave = async () => {
    setIsSaving(true)
    setEditError(null)
    try {
      await onSave(editTime)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update time')
    } finally {
      setIsSaving(false)
    }
  }

  // Render the modal overlay with:
  // - Inspector name + current date header
  // - Job address, city, zip, client_name in yellow info box
  // - Time input (type="time")
  // - Duration info (read-only)
  // - Error display
  // - Cancel + Save buttons
  // Match the exact UI from reference DispatchClient.tsx lines 218-298
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-[#FFFDF5] border-2 border-black rounded-xl shadow-[6px_6px_0px_black] p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold">Edit Scheduled Time</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-black text-xl leading-none">&times;</button>
        </div>

        {/* Inspector + date */}
        {inspectorName && (
          <p className="text-sm text-gray-600 mb-2">{inspectorName} &middot; {currentDate}</p>
        )}

        {/* Job info */}
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-4 text-sm">
          <p className="font-semibold">{job.address}</p>
          <p className="text-gray-600">{job.city}, {job.zip_code}</p>
          {job.client_name && <p className="text-gray-600">{job.client_name}</p>}
        </div>

        {/* Time input */}
        <label className="block text-sm font-medium mb-1">Scheduled Time</label>
        <input
          type="time"
          value={editTime}
          onChange={(e) => setEditTime(e.target.value)}
          className="w-full border-2 border-black rounded-lg px-3 py-2 mb-2 bg-white"
        />

        {/* Duration info */}
        <p className="text-xs text-gray-500 mb-4">
          Duration: {job.estimated_duration_minutes} minutes
        </p>

        {/* Error */}
        {editError && (
          <p className="text-sm text-red-600 mb-3">{editError}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border-2 border-black rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-[#FDE047] border-2 border-black rounded-lg font-semibold hover:bg-yellow-400 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Note:** The exact JSX should match the visual style from the reference's inline modal. The above is the structure — during implementation, compare against the reference lines 218-298 and replicate the exact class names and layout.

#### 9c: Rewrite `DispatchClient.tsx`

Key changes from reference:

1. **Import change:** `useScheduleSync` from `@/hooks/use-schedule-sync` (not `@/lib/hooks/`)
2. **Import `EditTimeModal`** from `./EditTimeModal`
3. **Remove inline modal** (lines 218-298 in reference) — replace with `<EditTimeModal />`
4. **Extract `handleSaveEdit` into a callback** passed to `EditTimeModal`:
   ```typescript
   const handleSaveEdit = async (time: string) => {
     await updateJobTime(editJob!.id, time)
     setEditModalOpen(false)
     showToast(`Updated to ${time}`)
     router.refresh()
   }
   ```
5. **Keep identical:** DndContext setup, handleDragStart, handleDragEnd case logic, toast patterns, region grouping, DragOverlay, scheduling overlay
6. **Error handling stays the same** — catch blocks already show `err.message` in toast, which now includes conflict messages

**Files affected:**
- `src/components/admin/dispatch/TimelineGrid.tsx` (COPIED)
- `src/components/admin/dispatch/JobBlock.tsx` (COPIED)
- `src/components/admin/dispatch/UnscheduledQueue.tsx` (COPIED)
- `src/components/admin/dispatch/UnscheduledJobChip.tsx` (COPIED)
- `src/components/admin/dispatch/DispatchHeader.tsx` (COPIED)
- `src/components/admin/dispatch/DispatchCalendar.tsx` (COPIED)
- `src/components/admin/dispatch/EditTimeModal.tsx` (CREATED)
- `src/components/admin/dispatch/DispatchClient.tsx` (REWRITTEN)

---

### Step 10: Shared + Layout Components

**Actions:**

- `mkdir -p src/components/admin/shared src/components/admin/layout`
- Copy as-is from reference:
  - `src/components/admin/shared/ScheduleToast.tsx`
  - `src/components/admin/shared/UnassignedBadge.tsx`
  - `src/components/admin/layout/AdminSidebar.tsx`
  - `src/components/admin/layout/AdminHeader.tsx`

**Note:** Sidebar links to `/admin/jobs`, `/admin/inspectors`, `/admin/settings` will 404 — acceptable for Phase 1.

**Files affected:**
- `src/components/admin/shared/ScheduleToast.tsx` (COPIED)
- `src/components/admin/shared/UnassignedBadge.tsx` (COPIED)
- `src/components/admin/layout/AdminSidebar.tsx` (COPIED)
- `src/components/admin/layout/AdminHeader.tsx` (COPIED)

---

### Step 11: Auth + Pages

**Actions:**

Copy all as-is from reference (no modifications):
- `src/proxy.ts`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/login/page.tsx`
- `src/app/admin/layout.tsx` (keep `as any` cast)
- `src/app/admin/page.tsx`
- `src/app/admin/dispatch/page.tsx`
- `src/app/api/auth/callback/route.ts`
- `src/app/api/auth/logout/route.ts`

Copy `src/app/globals.css` from reference, then remove these 4 stale lines:
```css
@source not "../../.claude";
@source not "../../module-installs";
@source not "../../plans";
@source not "../../context";
```

**Files affected:**
- `src/proxy.ts` (COPIED)
- `src/app/layout.tsx` (COPIED)
- `src/app/page.tsx` (COPIED)
- `src/app/globals.css` (COPIED+FIXED)
- `src/app/login/page.tsx` (COPIED)
- `src/app/admin/layout.tsx` (COPIED)
- `src/app/admin/page.tsx` (COPIED)
- `src/app/admin/dispatch/page.tsx` (COPIED)
- `src/app/api/auth/callback/route.ts` (COPIED)
- `src/app/api/auth/logout/route.ts` (COPIED)

---

### Step 12: Static Assets + AIOS Context

**Actions:**

```bash
# Copy public assets
cp -r /Users/morrisanderson/Projects-clean/DisptchMama-App/public /Users/morrisanderson/Projects-clean/DisptchMama/

# Copy AIOS context (AI-only, never imported by src/)
cp -r /Users/morrisanderson/Projects-clean/DisptchMama-App/aios /Users/morrisanderson/Projects-clean/DisptchMama/

# Copy schema
mkdir -p /Users/morrisanderson/Projects-clean/DisptchMama/supabase
cp /Users/morrisanderson/Projects-clean/DisptchMama-App/supabase/schema.sql /Users/morrisanderson/Projects-clean/DisptchMama/supabase/

# Copy .claude directory
cp -r /Users/morrisanderson/Projects-clean/DisptchMama-App/.claude /Users/morrisanderson/Projects-clean/DisptchMama/
```

**Files affected:**
- `public/` directory (COPIED)
- `aios/` directory (COPIED)
- `supabase/schema.sql` (COPIED)
- `.claude/` directory (COPIED)

---

### Step 13: Hard Validation Gate

#### Gate 1: Type check

```bash
cd /Users/morrisanderson/Projects-clean/DisptchMama
npx tsc --noEmit
```

**Required:** ZERO errors.

#### Gate 2: Build

```bash
npm run build
```

**Required:** Successful build. Google Fonts fetch warning is acceptable.

#### Gate 3: Architecture audit

Verify each check:

| # | Check | How to verify |
|---|-------|---------------|
| 1 | `src/services/` has exactly 3 files | `ls src/services/` → job-lifecycle.ts, dispatch-scheduling.ts, conflict-detection.ts |
| 2 | No service imports from actions/components | `grep -r "from '@/lib/actions\|from '@/components" src/services/` → no results |
| 3 | No `'use server'`/`'use client'` in services | `grep -r "'use server'\|'use client'" src/services/` → no results |
| 4 | Hook at correct location | `test -f src/hooks/use-schedule-sync.ts` → exists |
| 5 | DispatchClient uses correct hook import | `grep "from '@/hooks/use-schedule-sync'" src/components/admin/dispatch/DispatchClient.tsx` → match |
| 6 | No inline edit modal in DispatchClient | `grep "Edit Scheduled Time" src/components/admin/dispatch/DispatchClient.tsx` → no results (it's in EditTimeModal.tsx) |
| 7 | dispatch.ts uses typed client | `grep "SupabaseClient<Database>" src/lib/queries/dispatch.ts` → match |
| 8 | schedule-mutations imports services | `grep "from '@/services/" src/lib/actions/schedule-mutations.ts` → matches |
| 9 | No shadcn in package.json | `grep "shadcn" package.json` → no results |
| 10 | No new `any` types | `grep -n ": any\|as any\|= any" src/services/*.ts src/lib/queries/dispatch.ts src/lib/actions/schedule-mutations.ts src/components/admin/dispatch/DispatchClient.tsx src/components/admin/dispatch/EditTimeModal.tsx` → no results |

#### Gate 4: Dispatch slice code trace

Trace and confirm these 5 call chains:

1. **Schedule:** `DispatchClient.handleDragEnd` → `scheduleFromDispatch()` → `updateSchedule()` → `checkConflicts()` + `buildScheduleUpdate()` → Supabase `.update()` + history log → `revalidatePath`
2. **Reschedule:** `DispatchClient.handleDragEnd` → `updateSchedule()` → `checkConflicts()` + `buildScheduleUpdate()` → Supabase `.update()` + history log → `revalidatePath`
3. **Unschedule:** `DispatchClient.handleDragEnd` → `updateSchedule({ assignedTo: null, ... })` → `buildUnscheduleUpdate()` (reverts status to pending) → Supabase `.update()` + history log → `revalidatePath`
4. **Conflict:** `updateSchedule()` → `checkConflicts()` → `throw new Error("Schedule conflict: ...")` → `DispatchClient` catch → `showToast(err.message)`
5. **Realtime:** `useScheduleSync()` → subscribes to `postgres_changes` on `jobs` → `router.refresh()`

---

## Connections & Dependencies

### Files That Reference This Area

- `src/app/admin/dispatch/page.tsx` imports `getDispatchTimeline`, `getUnscheduledJobs` from queries and renders `DispatchClient`
- `src/app/admin/layout.tsx` imports `AdminSidebar`, `AdminHeader`, and calls a query for unassigned count
- `DispatchClient.tsx` imports from actions (`schedule-mutations`, `dispatch-actions`), hooks (`use-schedule-sync`), and 7 child components
- `dispatch-actions.ts` imports `updateSchedule` from `schedule-mutations`

### Updates Needed for Consistency

- None for Phase 1. CLAUDE.md lives in the reference project and is not modified.
- The new project will get its own CLAUDE.md in a future phase if needed.

### Impact on Existing Workflows

- **No impact on reference project** — it is read-only
- Phase 2 will add jobs pages, inspectors pages, and remaining UI components
- Phase 3 will add settings, employee management, and remaining features

---

## Validation Checklist

- [ ] Target directory created at `/Users/morrisanderson/Projects-clean/DisptchMama`
- [ ] `npm install` succeeds with no errors
- [ ] `npx tsc --noEmit` passes with zero errors (Step 5 checkpoint)
- [ ] `npx tsc --noEmit` passes with zero errors (Gate 1)
- [ ] `npm run build` succeeds (Gate 2)
- [ ] Architecture audit: 10/10 checks pass (Gate 3)
- [ ] Code trace: 5/5 paths verified (Gate 4)
- [ ] File manifest produced
- [ ] No files modified in reference directory
- [ ] No `git push` executed
- [ ] No Phase 2 files created (jobs, inspectors, settings pages)

---

## Success Criteria

The implementation is complete when:

1. **All 4 validation gates pass** — tsc zero errors, build succeeds, 10/10 architecture checks, 5/5 code traces verified
2. **Services layer exists** with 3 pure TypeScript files containing zero framework imports
3. **schedule-mutations.ts delegates all logic to services** — no inline dispatch status computation, no inline auto-confirm, no inline status management
4. **Conflict detection is wired in** — scheduling/rescheduling operations check for time overlaps
5. **P1 unschedule bug is fixed** — unscheduling a confirmed/in_progress job reverts status to pending
6. **File manifest is produced** documenting every file created/copied/fixed/rewritten/moved

---

## Notes

- **`.env.local` must be provided manually** by the user. It contains `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Without it, the build will succeed but the app won't connect to Supabase at runtime.
- **Google Fonts warning** during build is expected in sandboxed/offline environments — not a real error.
- **Sidebar 404s** for jobs/inspectors/settings are expected and acceptable in Phase 1.
- **`components.json`** (shadcn config) is NOT copied — it's no longer needed since shadcn is removed from dependencies.
- **Phase 2 scope** (not to be started yet): jobs vertical slice, inspectors vertical slice, remaining UI components (badge, dialog, select, separator), remaining queries and actions.
- **The `as any` cast in `admin/layout.tsx`** is a known type workaround that will be addressed in a future phase. Do not touch it now.

---

## Implementation Notes

**Implemented:** 2026-04-08

### Summary

Phase 1 clean architecture migration completed. Created fresh project at `/Users/morrisanderson/Projects-clean/DisptchMama` with a services layer (3 files), rewritten data layer with conflict detection, extracted EditTimeModal component, moved hook to correct location, typed Supabase clients, and P1 unschedule bug fix. All 4 validation gates pass: zero type errors, successful build, 10/10 architecture checks, 5/5 code traces verified.

### Deviations from Plan

1. **Database type `Relationships` field** — Added `Relationships: []` to all 4 table definitions in `database.ts`. Required by `@supabase/postgrest-js` (bundled with supabase-js v2.98+) which expects `GenericTable` to include a `Relationships` array. Without this, all query results resolved to `never`.
2. **Select string formatting** — Changed multi-line template literal `.select()` strings to single-line strings in `dispatch.ts`. Tailwind-style multi-line template literals weren't parsed correctly by the Supabase type system.
3. **Typed update/insert casts** — Added `JobUpdate` and `StatusHistoryInsert` type aliases in `schedule-mutations.ts` and used `as JobUpdate` / `satisfies StatusHistoryInsert` to satisfy the typed Supabase client for dynamic update objects.
4. **`@source not` directives in globals.css** — Plan called these "stale" but they are needed to prevent Tailwind v4 from scanning `.claude/`, `aios/`, `supabase/`, and `public/` directories. Updated paths to match the clean project's directory structure (`../../.claude`, `../../aios`, `../../supabase`, `../../public`).
5. **`components.json` not copied** — per plan notes, not needed since shadcn removed from dependencies.

### Issues Encountered

1. **Supabase typed client `never` resolution** — All `.from().select()` calls returned `never` because the Database type lacked `Relationships` arrays on table definitions. Fixed by adding `Relationships: []` to each table.
2. **Tailwind scanning HTML files** — Build failed with "Can't resolve ''" because `.claude/skills/frontend-design/examples/*.html` files were being scanned by Tailwind v4. Fixed by adding `@source not` directives.
