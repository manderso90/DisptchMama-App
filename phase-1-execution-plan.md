# Phase 1 Execution Plan — DisptchMama Clean Architecture

> Generated from Phase 0 Audit findings. This is a design document — no code changes until approved.

---

## 1. Services Layer Design

### Structure

```
src/services/
├── job-lifecycle.ts        # Status transitions + validation
├── dispatch-scheduling.ts  # Schedule, reschedule, unschedule orchestration
└── conflict-detection.ts   # Inspector time overlap checks
```

### Service: `job-lifecycle.ts`

**Responsibility**: Own the job status state machine. No other file should directly mutate `status`.

```
Exports:
  VALID_TRANSITIONS: Record<JobStatus, JobStatus[]>
  TERMINAL_STATUSES: JobStatus[]
  isValidTransition(from: JobStatus, to: JobStatus): boolean
  getNextStatus(current: JobStatus): JobStatus | null
  shouldAutoConfirm(job: { status: JobStatus; assigned_to: string | null; scheduled_date: string | null; scheduled_time: string | null }): boolean
```

**Logic extracted from**:
- `schedule-mutations.ts` lines 27, 86-92 (EARLY_STATUSES, auto-confirm check)
- `job-actions.ts` lines 45-76 (updateJobStatus — needs transition validation wrapper)

**Rules**:
- Plain TypeScript — no `'use server'`, no `'use client'`
- Never imports from actions or components
- Only imports from types (`@/types/database`)

### Service: `dispatch-scheduling.ts`

**Responsibility**: Orchestrate all scheduling logic — compute dispatch status, track reassignment, coordinate with lifecycle service.

```
Exports:
  computeDispatchStatus(fields: { assignedTo: string | null; scheduledDate: string | null; scheduledTime: string | null }): DispatchStatus
  buildScheduleUpdate(current: CurrentJobState, update: ScheduleUpdate): { updateData: Record<string, unknown>; statusChanged: boolean; newStatus?: string }
  buildUnscheduleUpdate(current: CurrentJobState): { updateData: Record<string, unknown>; statusChanged: boolean; newStatus?: string }
```

**Logic extracted from**:
- `schedule-mutations.ts` lines 46-92 (update building, dispatch_status computation, reassignment tracking, auto-confirm)

**Key change**: The `buildUnscheduleUpdate` function will revert `status` to `'pending'` when unscheduling a confirmed/in_progress job — **fixing P1 issue F2**.

### Service: `conflict-detection.ts`

**Responsibility**: Check for inspector time overlaps before scheduling.

```
Exports:
  TimeConflict: { existingJobId: string; existingAddress: string; overlapMinutes: number }
  checkConflicts(inspectorId: string, date: string, startTime: string, durationMinutes: number, excludeJobId?: string): Promise<TimeConflict[]>
```

**Logic**: New code. Queries existing jobs for the inspector on the given date, computes time ranges, returns conflicts. The action layer decides whether to block or warn.

**This fixes P1 issue F1** (no conflict detection).

### What stays in actions

Actions become thin wrappers:
1. Authenticate user
2. Call service functions to build/validate the update
3. Execute Supabase mutation
4. Log to status history if needed
5. Revalidate paths

Actions **never** contain business logic directly. They are the "glue" between HTTP/form context and services.

---

## 2. Migration Strategy

### Classification of every source file

| File | Strategy | Notes |
|------|----------|-------|
| **Config files** | | |
| `package.json` | **Rewrite** | Remove `shadcn` from deps, evaluate `tw-animate-css`, keep rest |
| `tsconfig.json` | **Copy** | Identical config needed |
| `next.config.ts` | **Copy** | Empty config, identical |
| `postcss.config.mjs` | **Copy** | Identical |
| `.env.local` | **Manual** | User copies own env vars |
| **Types** | | |
| `src/types/database.ts` | **Copy** | Well-structured, no changes needed |
| **Supabase clients** | | |
| `src/lib/supabase/server.ts` | **Copy then type** | Add `Database` generic to `createServerClient<Database>()` |
| `src/lib/supabase/client.ts` | **Copy then type** | Add `Database` generic to `createBrowserClient<Database>()` |
| **Utilities** | | |
| `src/lib/utils.ts` | **Copy** | `cn()` helper, no changes |
| **Services (NEW)** | | |
| `src/services/job-lifecycle.ts` | **New** | Extracted from actions |
| `src/services/dispatch-scheduling.ts` | **New** | Extracted from schedule-mutations |
| `src/services/conflict-detection.ts` | **New** | Brand new logic |
| **Queries** | | |
| `src/lib/queries/dispatch.ts` | **Rewrite** | Replace `AnyClient` with typed `SupabaseClient<Database>` |
| `src/lib/queries/jobs.ts` | **Copy then fix** | Replace `as any` cast for inspector join |
| `src/lib/queries/inspectors.ts` | **Copy** | Already properly typed |
| **Actions** | | |
| `src/lib/actions/schedule-mutations.ts` | **Rewrite** | Extract business logic to services, keep as thin wrapper |
| `src/lib/actions/dispatch-actions.ts` | **Copy then adjust** | Update imports to new schedule-mutations |
| `src/lib/actions/job-actions.ts` | **Rewrite** | Add transition validation via `job-lifecycle` service |
| `src/lib/actions/inspector-actions.ts` | **Copy** | Clean as-is |
| `src/lib/actions/employee-actions.ts` | **Copy** | Clean as-is |
| **Hooks** | | |
| `src/lib/hooks/use-schedule-sync.ts` | **Move** | Relocate to `src/hooks/use-schedule-sync.ts` |
| **Auth** | | |
| `src/proxy.ts` | **Copy then fix** | Fix `as any` casts, evaluate rename to `middleware.ts` |
| `src/app/api/auth/callback/route.ts` | **Copy** | Standard Supabase OAuth |
| `src/app/api/auth/logout/route.ts` | **Copy** | Standard logout |
| **Pages** | | |
| `src/app/layout.tsx` | **Copy** | Root layout with fonts |
| `src/app/page.tsx` | **Copy** | Redirect to dispatch |
| `src/app/globals.css` | **Copy then clean** | Remove stale `@source not` paths |
| `src/app/login/page.tsx` | **Copy** | Login form, no changes |
| `src/app/admin/layout.tsx` | **Copy then fix** | Fix `as any` profile cast |
| `src/app/admin/page.tsx` | **Copy** | Redirect |
| `src/app/admin/dispatch/page.tsx` | **Copy** | Server component, clean |
| `src/app/admin/jobs/page.tsx` | **Copy** | Server component, clean |
| `src/app/admin/jobs/new/page.tsx` | **Copy** | Server component, clean |
| `src/app/admin/inspectors/page.tsx` | **Copy** | Needs inspection |
| `src/app/admin/settings/page.tsx` | **Copy** | Needs inspection |
| **Components** | | |
| `src/components/ui/*` (10 files) | **Copy** | shadcn primitives, no changes |
| `src/components/admin/dispatch/DispatchClient.tsx` | **Rewrite** | Extract edit modal, add conflict detection call |
| `src/components/admin/dispatch/TimelineGrid.tsx` | **Copy** | Clean |
| `src/components/admin/dispatch/JobBlock.tsx` | **Copy** | Clean |
| `src/components/admin/dispatch/UnscheduledQueue.tsx` | **Copy** | Clean |
| `src/components/admin/dispatch/UnscheduledJobChip.tsx` | **Copy** | Clean |
| `src/components/admin/dispatch/DispatchHeader.tsx` | **Copy** | Clean |
| `src/components/admin/dispatch/DispatchCalendar.tsx` | **Copy** | Clean |
| `src/components/admin/dispatch/EditTimeModal.tsx` | **New** | Extracted from DispatchClient |
| `src/components/admin/inspectors/*` (3 files) | **Copy** | Clean |
| `src/components/admin/jobs/*` (2 files) | **Copy** | Clean |
| `src/components/admin/layout/*` (2 files) | **Copy** | Clean |
| `src/components/admin/settings/*` (3 files) | **Copy** | Clean |
| `src/components/admin/shared/*` (3 files) | **Copy** | Clean |
| **AIOS context** | | |
| `aios/*` (all files) | **Copy** | AI context layer, no code changes |
| **Discarded** | | |
| `src/lib/hooks/` directory | **Discard** | Replaced by `src/hooks/` |

### Summary counts
- **Copy as-is**: ~35 files
- **Copy then fix**: ~6 files (type fixes, `any` removal)
- **Rewrite**: 4 files (schedule-mutations, job-actions, dispatch queries, DispatchClient)
- **New**: 4 files (3 services + EditTimeModal component)
- **Move**: 1 file (hook relocation)
- **Discard**: 1 directory (`src/lib/hooks/`)

---

## 3. Vertical Slice Selection

### Chosen slice: **Dispatch Scheduling Flow**

This is the drag-and-drop flow: unscheduled queue → timeline grid → schedule/reschedule/unschedule.

### Why this slice

1. **It's the core product** — DisptchMama exists for this flow. If this works correctly in the new architecture, everything else is simpler CRUD.
2. **It touches all new services** — job-lifecycle (auto-confirm), dispatch-scheduling (compute dispatch status, build updates), and conflict-detection (overlap check on drop).
3. **It contains all 4 P1 bugs** — conflict detection, unschedule state revert, status transition enforcement, and the missing services layer are all exercised by this flow.
4. **It has the highest complexity** — DnD, realtime sync, multi-step mutations. If the architecture works here, it works everywhere.

### Files involved

**Services (new)**:
- `src/services/job-lifecycle.ts`
- `src/services/dispatch-scheduling.ts`
- `src/services/conflict-detection.ts`

**Actions (rewrite)**:
- `src/lib/actions/schedule-mutations.ts`
- `src/lib/actions/dispatch-actions.ts`

**Queries (rewrite)**:
- `src/lib/queries/dispatch.ts`

**Components (rewrite/new)**:
- `src/components/admin/dispatch/DispatchClient.tsx`
- `src/components/admin/dispatch/EditTimeModal.tsx` (new)

**Hooks (move)**:
- `src/hooks/use-schedule-sync.ts`

**Pages (copy)**:
- `src/app/admin/dispatch/page.tsx`

### Success criteria

1. `tsc --noEmit` passes with zero errors
2. Drag from unscheduled queue → timeline creates a scheduled job with `status: confirmed`, `dispatch_status: scheduled`
3. Drag a scheduled job to a different time/inspector updates correctly
4. Drag a confirmed job back to queue reverts `status` to `pending` and `dispatch_status` to `unscheduled`
5. Dropping a job onto a time slot that conflicts with an existing job triggers a warning/block
6. No `any` types anywhere in the new/rewritten files
7. All business logic lives in `src/services/`, not in actions
8. Realtime sync updates the timeline when another user makes changes

---

## 4. Risk Mitigation Plan

### P1-1: Missing Services Layer

| Aspect | Detail |
|--------|--------|
| **Where** | `src/services/` (3 new files) |
| **How** | Extract logic from `schedule-mutations.ts` into pure functions. Services take typed inputs, return typed outputs. No Supabase imports — they receive data, not clients. |
| **Risk** | Over-abstracting. Mitigate by keeping services thin — each function does one thing. |
| **Validation** | Import direction check: services only import from `@/types/database`. No imports from actions, components, or lib/supabase. |

### P1-2: Conflict Detection

| Aspect | Detail |
|--------|--------|
| **Where** | `src/services/conflict-detection.ts` (new) + called from `schedule-mutations.ts` |
| **How** | `checkConflicts()` takes inspector ID, date, start time, duration. Queries existing jobs for that inspector+date. Converts times to minute-of-day integers. Checks for overlaps: `existingStart < proposedEnd && proposedStart < existingEnd`. Returns array of conflicts. |
| **Integration** | `schedule-mutations.ts` calls `checkConflicts()` before persisting. If conflicts exist, throws a descriptive error. `DispatchClient.tsx` catches the error and shows it in the toast. |
| **Edge case** | Self-overlap on reschedule: pass `excludeJobId` to ignore the job being moved. |

### P1-3: Unschedule State Bug (F2)

| Aspect | Detail |
|--------|--------|
| **Where** | `src/services/dispatch-scheduling.ts` → `buildUnscheduleUpdate()` |
| **How** | When building an unschedule update, check if `current.status` is `confirmed` or `in_progress`. If so, include `status: 'pending'` in the update payload and mark `statusChanged: true`. |
| **History** | The action layer logs the status revert to `job_status_history` with note: "Unscheduled — status reverted to pending". |

### P1-4: Status Transition Enforcement

| Aspect | Detail |
|--------|--------|
| **Where** | `src/services/job-lifecycle.ts` → `isValidTransition()` |
| **How** | Define the valid transitions map: |

```
VALID_TRANSITIONS = {
  pending:     ['confirmed', 'cancelled', 'on_hold'],
  confirmed:   ['in_progress', 'cancelled', 'on_hold', 'pending'],
  in_progress: ['completed', 'cancelled', 'on_hold'],
  completed:   [],  // terminal
  cancelled:   ['pending'],  // reactivation
  on_hold:     ['pending'],  // resume
}
```

| Aspect | Detail |
|--------|--------|
| **Integration** | `job-actions.ts` → `updateJobStatus()` calls `isValidTransition(current, target)` before mutation. Throws `InvalidTransitionError` if not allowed. |
| **Backward compat** | `confirmed → pending` is explicitly allowed (needed for unschedule revert). `cancelled → pending` allowed for reactivation. |

---

## 5. New Project Scaffold Plan

### Target location

```
/Users/morrisanderson/Projects-clean/DisptchMama/
```

### Folder structure (initial creation)

```
DisptchMama/
├── aios/                          # Copy from current project
│   ├── 00_overview/
│   ├── 01_context/
│   ├── 02_architecture/
│   ├── 03_workflows/
│   ├── 04_rules/
│   ├── 05_active/
│   ├── 06_history/
│   └── 07_commands/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── admin/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── dispatch/
│   │   │   │   └── page.tsx
│   │   │   ├── jobs/
│   │   │   │   ├── page.tsx
│   │   │   │   └── new/
│   │   │   │       └── page.tsx
│   │   │   ├── inspectors/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   └── api/
│   │       └── auth/
│   │           ├── callback/
│   │           │   └── route.ts
│   │           └── logout/
│   │               └── route.ts
│   ├── components/
│   │   ├── admin/
│   │   │   ├── dispatch/
│   │   │   │   ├── DispatchClient.tsx      # Rewritten
│   │   │   │   ├── DispatchCalendar.tsx
│   │   │   │   ├── DispatchHeader.tsx
│   │   │   │   ├── EditTimeModal.tsx       # NEW
│   │   │   │   ├── TimelineGrid.tsx
│   │   │   │   ├── JobBlock.tsx
│   │   │   │   ├── UnscheduledQueue.tsx
│   │   │   │   └── UnscheduledJobChip.tsx
│   │   │   ├── inspectors/
│   │   │   ├── jobs/
│   │   │   ├── layout/
│   │   │   ├── settings/
│   │   │   └── shared/
│   │   └── ui/                             # All 10 shadcn files
│   ├── hooks/                              # NEW location
│   │   └── use-schedule-sync.ts
│   ├── lib/
│   │   ├── actions/
│   │   │   ├── dispatch-actions.ts
│   │   │   ├── employee-actions.ts
│   │   │   ├── inspector-actions.ts
│   │   │   ├── job-actions.ts              # Rewritten
│   │   │   └── schedule-mutations.ts       # Rewritten
│   │   ├── queries/
│   │   │   ├── dispatch.ts                 # Rewritten
│   │   │   ├── inspectors.ts
│   │   │   └── jobs.ts
│   │   ├── supabase/
│   │   │   ├── client.ts                   # Typed
│   │   │   └── server.ts                   # Typed
│   │   └── utils.ts
│   ├── services/                           # NEW
│   │   ├── job-lifecycle.ts
│   │   ├── dispatch-scheduling.ts
│   │   └── conflict-detection.ts
│   ├── types/
│   │   └── database.ts
│   └── proxy.ts                            # Fixed (no `any`)
├── supabase/
│   └── schema.sql                          # Copy
├── public/                                 # Copy static assets
├── package.json                            # Cleaned
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
└── .env.local                              # User provides
```

### Config setup order

1. Create `Projects-clean/DisptchMama/` directory
2. Initialize `package.json` (cleaned version — no `shadcn` in deps)
3. Copy `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`
4. Run `npm install`
5. Verify `tsc --noEmit` with empty src (or just config validation)
6. Copy `src/types/database.ts` first (all other files depend on types)
7. Copy `src/lib/supabase/` (client factories — add `Database` generic)
8. Copy `src/lib/utils.ts`
9. Create `src/services/` (new files — no dependencies except types)
10. Proceed with actions, queries, hooks, components, pages

---

## 6. Execution Sequence (Step-by-Step)

### Phase 1A: Scaffold + Foundation (Steps 1-8)

```
Step 1: Create project directory
  - mkdir -p /Users/morrisanderson/Projects-clean/DisptchMama
  - Verify path exists

Step 2: Copy config files
  - package.json (modified: remove shadcn from dependencies)
  - tsconfig.json (as-is)
  - next.config.ts (as-is)
  - postcss.config.mjs (as-is)

Step 3: Install dependencies
  - npm install
  - Verify node_modules created successfully

Step 4: Copy foundation files
  - src/types/database.ts (as-is)
  - src/lib/utils.ts (as-is)
  - src/lib/supabase/server.ts (add Database generic)
  - src/lib/supabase/client.ts (add Database generic)

Step 5: Create services layer
  - src/services/job-lifecycle.ts (new — status machine, auto-confirm logic)
  - src/services/dispatch-scheduling.ts (new — schedule update building)
  - src/services/conflict-detection.ts (new — overlap detection)

Step 6: Type-check foundation
  - Run tsc --noEmit on services + types + utils
  - Fix any issues before proceeding
```

### Phase 1B: Vertical Slice — Dispatch Flow (Steps 7-14)

```
Step 7: Copy/rewrite queries
  - src/lib/queries/dispatch.ts (rewrite: replace AnyClient with typed client)
  - src/lib/queries/inspectors.ts (copy: already typed)
  - src/lib/queries/jobs.ts (copy then fix: remove as any)

Step 8: Rewrite actions
  - src/lib/actions/schedule-mutations.ts (rewrite: thin wrapper, delegates to services)
  - src/lib/actions/dispatch-actions.ts (copy then adjust: updated imports)
  - src/lib/actions/job-actions.ts (rewrite: add transition validation)

Step 9: Move hooks
  - src/hooks/use-schedule-sync.ts (moved from src/lib/hooks/)

Step 10: Copy UI primitives
  - All 10 files from src/components/ui/

Step 11: Copy/rewrite dispatch components
  - src/components/admin/dispatch/TimelineGrid.tsx (copy)
  - src/components/admin/dispatch/JobBlock.tsx (copy)
  - src/components/admin/dispatch/UnscheduledQueue.tsx (copy)
  - src/components/admin/dispatch/UnscheduledJobChip.tsx (copy)
  - src/components/admin/dispatch/DispatchHeader.tsx (copy)
  - src/components/admin/dispatch/DispatchCalendar.tsx (copy)
  - src/components/admin/dispatch/EditTimeModal.tsx (new: extracted from DispatchClient)
  - src/components/admin/dispatch/DispatchClient.tsx (rewrite: use services, use EditTimeModal, handle conflicts)

Step 12: Copy shared components
  - src/components/admin/shared/ScheduleToast.tsx
  - src/components/admin/shared/QuickScheduleActions.tsx
  - src/components/admin/shared/UnassignedBadge.tsx

Step 13: Copy auth + layout
  - src/proxy.ts (copy then fix: remove as any casts)
  - src/app/layout.tsx (copy)
  - src/app/globals.css (copy then clean: remove stale @source paths)
  - src/app/page.tsx (copy)
  - src/app/login/page.tsx (copy)
  - src/app/admin/layout.tsx (copy then fix: remove as any cast)
  - src/app/admin/page.tsx (copy)
  - src/app/admin/dispatch/page.tsx (copy — update DispatchClient import path if needed)
  - src/app/api/auth/callback/route.ts (copy)
  - src/app/api/auth/logout/route.ts (copy)

Step 14: Type-check vertical slice
  - Run tsc --noEmit
  - Fix ALL errors — zero tolerance
```

### Phase 1C: Remaining Pages (Steps 15-17)

```
Step 15: Copy remaining components
  - src/components/admin/jobs/* (2 files)
  - src/components/admin/inspectors/* (3 files)
  - src/components/admin/settings/* (3 files)
  - src/components/admin/layout/* (2 files)

Step 16: Copy remaining pages
  - src/app/admin/jobs/page.tsx
  - src/app/admin/jobs/new/page.tsx
  - src/app/admin/inspectors/page.tsx
  - src/app/admin/settings/page.tsx

Step 17: Copy remaining actions
  - src/lib/actions/inspector-actions.ts
  - src/lib/actions/employee-actions.ts
```

### Phase 1D: Static Assets + AIOS Context (Steps 18-19)

```
Step 18: Copy static assets and AIOS
  - public/* (all static assets — favicons, etc.)
  - aios/* (entire directory — AI context layer)
  - supabase/schema.sql

Step 19: Copy .claude/ config
  - .claude/commands/* (Claude commands)
  - .claude/skills/* (project skills)
  - .claude/settings.local.json
```

### Phase 1E: Validation (Steps 20-22)

```
Step 20: Full type check
  - tsc --noEmit
  - Must pass with ZERO errors

Step 21: Build check
  - npm run build
  - Verify successful build (may have Google Fonts sandbox warning — acceptable)

Step 22: Architecture validation
  - Verify: no file in src/services/ imports from src/lib/actions/ or src/components/
  - Verify: no 'any' types in new/rewritten files
  - Verify: hooks live in src/hooks/, not src/lib/hooks/
  - Verify: src/services/ contains 3 files
  - Verify: shadcn is NOT in package.json dependencies
  - Verify: DispatchClient.tsx no longer contains inline modal
```

---

## Appendix: File Count Summary

| Category | Count |
|----------|-------|
| Total files in new project | ~60 |
| Copied unchanged | ~35 |
| Copied + type fixes | ~6 |
| Rewritten | 4 |
| Brand new | 4 |
| Moved | 1 |
| Discarded | 1 directory |

---

*This plan is ready for review. No code will be written until approved.*
