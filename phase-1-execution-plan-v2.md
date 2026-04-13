# Phase 1 Execution Plan v2 — DisptchMama Clean Architecture

> Revised per approval constraints. Phase 1 proves the clean architecture through the dispatch vertical slice only. No feature parity. No code written until approved.

---

## Scope Boundary

**Phase 1 includes:**
- Project scaffold + foundation
- Services layer (3 new modules)
- Dispatch scheduling vertical slice (schedule, reschedule, unschedule with conflict detection)
- Hard validation gate

**Phase 1 explicitly defers:**
- Jobs page migration (page.tsx, new/page.tsx, JobsTable, NewJobForm)
- Inspectors page migration
- Settings page migration
- `tw-animate-css` optimization (kept as-is unless it blocks build)
- `proxy.ts` behavioral refactor (copy as-is, minimal type fix only if trivial)
- Secondary dependency cleanup

**Phase 2 will handle** everything deferred above.

---

## 1. Services Layer Design

### Structure

```
src/services/
├── job-lifecycle.ts        # Status state machine + validation
├── dispatch-scheduling.ts  # Schedule/reschedule/unschedule orchestration
└── conflict-detection.ts   # Inspector time overlap checks
```

### Service: `job-lifecycle.ts`

Pure TypeScript. No `'use server'`, no `'use client'`. Only imports from `@/types/database`.

```
Exports:
  VALID_TRANSITIONS   — Record<JobStatus, JobStatus[]>
  TERMINAL_STATUSES   — JobStatus[]
  isValidTransition(from, to)          → boolean
  shouldAutoConfirm(job state fields)  → boolean
```

Valid transitions map:
```
pending     → [confirmed, cancelled, on_hold]
confirmed   → [in_progress, cancelled, on_hold, pending]
in_progress → [completed, cancelled, on_hold]
completed   → []
cancelled   → [pending]
on_hold     → [pending]
```

Logic extracted from:
- `schedule-mutations.ts` lines 27, 86-92 (EARLY_STATUSES, auto-confirm)
- `job-actions.ts` (updateJobStatus needs this for transition validation — but job-actions.ts itself is deferred to Phase 2; the service is built now so it's ready)

### Service: `dispatch-scheduling.ts`

Pure TypeScript. Imports from `@/types/database` and `@/services/job-lifecycle`.

```
Exports:
  computeDispatchStatus(fields)          → DispatchStatus
  buildScheduleUpdate(current, update)   → { updateData, statusChanged, newStatus? }
  buildUnscheduleUpdate(current)         → { updateData, statusChanged, newStatus? }
```

Key behaviors:
- `computeDispatchStatus`: returns `'scheduled'` if inspector + date + time all present, else `'unscheduled'`
- `buildScheduleUpdate`: merges update fields with current state, computes dispatch_status, calls `shouldAutoConfirm()`, tracks reassignment
- `buildUnscheduleUpdate`: clears schedule fields, reverts `status` to `'pending'` if currently `confirmed` or `in_progress` — **fixes P1 issue F2**

Logic extracted from `schedule-mutations.ts` lines 46-92.

### Service: `conflict-detection.ts`

Pure TypeScript. This one is unique — it needs Supabase data but shouldn't import the client directly.

Design decision: `checkConflicts()` receives the existing jobs array as input (fetched by the caller). It does not query the database itself.

```
Exports:
  TimeConflict = { jobId, address, overlapMinutes }
  checkConflicts(existingJobs[], proposedStart, proposedDuration, excludeJobId?) → TimeConflict[]
```

The action layer fetches existing jobs for the inspector+date, then passes them to this service. This keeps the service pure and testable.

---

## 2. Minimum Boot Dependency Map

I traced every import from the dispatch page entry point recursively. These are the **31 project files** required for the app to boot and render the dispatch page:

### Boot chain (5 files)
```
src/app/layout.tsx             — root layout (fonts, metadata)
src/app/page.tsx               — redirect to /admin/dispatch
src/app/login/page.tsx         — login form (user passes through here)
src/app/admin/layout.tsx       — admin shell (sidebar + header + auth check)
src/proxy.ts                   — auth middleware
```

### Dispatch page (1 file)
```
src/app/admin/dispatch/page.tsx — server component, fetches data, renders DispatchClient
```

### Dispatch components (7 files → 8 in clean version)
```
src/components/admin/dispatch/DispatchClient.tsx       — REWRITE (extract modal, add conflict handling)
src/components/admin/dispatch/DispatchHeader.tsx        — copy
src/components/admin/dispatch/DispatchCalendar.tsx      — copy
src/components/admin/dispatch/TimelineGrid.tsx          — copy
src/components/admin/dispatch/JobBlock.tsx              — copy
src/components/admin/dispatch/UnscheduledQueue.tsx      — copy
src/components/admin/dispatch/UnscheduledJobChip.tsx    — copy
src/components/admin/dispatch/EditTimeModal.tsx         — NEW (extracted from DispatchClient)
```

### Admin layout components (2 files)
```
src/components/admin/layout/AdminSidebar.tsx            — copy (sidebar links to jobs/inspectors/settings still render, pages just won't exist yet)
src/components/admin/layout/AdminHeader.tsx             — copy
```

### Shared components (2 files)
```
src/components/admin/shared/ScheduleToast.tsx           — copy
src/components/admin/shared/UnassignedBadge.tsx         — copy
```

### UI primitives — only 6 of 10 needed (6 files)
```
src/components/ui/button.tsx         — login page
src/components/ui/input.tsx          — login page
src/components/ui/label.tsx          — login page
src/components/ui/card.tsx           — login page
src/components/ui/avatar.tsx         — AdminHeader
src/components/ui/dropdown-menu.tsx  — AdminHeader
```

Not needed for dispatch slice: badge.tsx, dialog.tsx, select.tsx, separator.tsx (deferred to Phase 2).

### Data layer (1 query)
```
src/lib/queries/dispatch.ts         — REWRITE (replace AnyClient with typed SupabaseClient<Database>)
```

### Actions (2 files)
```
src/lib/actions/schedule-mutations.ts  — REWRITE (thin wrapper delegating to services)
src/lib/actions/dispatch-actions.ts    — copy then adjust imports
```

### Supabase clients (2 files)
```
src/lib/supabase/server.ts          — copy, add Database generic
src/lib/supabase/client.ts          — copy, add Database generic
```

### Hooks (1 file, relocated)
```
src/hooks/use-schedule-sync.ts      — moved from src/lib/hooks/, update import path
```

### Utilities + Types (2 files)
```
src/lib/utils.ts                    — copy
src/types/database.ts               — copy
```

### Auth routes (2 files)
```
src/app/api/auth/callback/route.ts  — copy
src/app/api/auth/logout/route.ts    — copy
```

### Redirect stub (1 file)
```
src/app/admin/page.tsx              — copy (redirects to /admin/dispatch)
```

### CSS (1 file)
```
src/app/globals.css                 — copy, clean stale @source paths
```

### Services — NEW (3 files)
```
src/services/job-lifecycle.ts
src/services/dispatch-scheduling.ts
src/services/conflict-detection.ts
```

---

## 3. File-by-File Strategy

### Legend
- **COPY** — identical to source
- **COPY+FIX** — copy then make targeted type/import fixes
- **REWRITE** — same purpose, new implementation
- **NEW** — does not exist in current codebase

| # | File | Strategy | Change description |
|---|------|----------|--------------------|
| 1 | `package.json` | COPY+FIX | Remove `shadcn` from dependencies. Keep `tw-animate-css`. |
| 2 | `tsconfig.json` | COPY | — |
| 3 | `next.config.ts` | COPY | — |
| 4 | `postcss.config.mjs` | COPY | — |
| 5 | `src/types/database.ts` | COPY | — |
| 6 | `src/lib/utils.ts` | COPY | — |
| 7 | `src/lib/supabase/server.ts` | COPY+FIX | Add `Database` generic to `createServerClient<Database>()` |
| 8 | `src/lib/supabase/client.ts` | COPY+FIX | Add `Database` generic to `createBrowserClient<Database>()` |
| 9 | `src/services/job-lifecycle.ts` | NEW | Status machine, transition validation, auto-confirm |
| 10 | `src/services/dispatch-scheduling.ts` | NEW | Schedule update building, unschedule revert |
| 11 | `src/services/conflict-detection.ts` | NEW | Time overlap detection (pure function) |
| 12 | `src/lib/queries/dispatch.ts` | REWRITE | Replace `type AnyClient = any` with `SupabaseClient<Database>` |
| 13 | `src/lib/actions/schedule-mutations.ts` | REWRITE | Thin wrapper: auth → call services → persist → revalidate |
| 14 | `src/lib/actions/dispatch-actions.ts` | COPY+FIX | Adjust if schedule-mutations interface changes |
| 15 | `src/hooks/use-schedule-sync.ts` | COPY+FIX | Move from `src/lib/hooks/`, update import path in `DispatchClient` |
| 16 | `src/components/ui/button.tsx` | COPY | — |
| 17 | `src/components/ui/input.tsx` | COPY | — |
| 18 | `src/components/ui/label.tsx` | COPY | — |
| 19 | `src/components/ui/card.tsx` | COPY | — |
| 20 | `src/components/ui/avatar.tsx` | COPY | — |
| 21 | `src/components/ui/dropdown-menu.tsx` | COPY | — |
| 22 | `src/components/admin/dispatch/TimelineGrid.tsx` | COPY | — |
| 23 | `src/components/admin/dispatch/JobBlock.tsx` | COPY | — |
| 24 | `src/components/admin/dispatch/UnscheduledQueue.tsx` | COPY | — |
| 25 | `src/components/admin/dispatch/UnscheduledJobChip.tsx` | COPY | — |
| 26 | `src/components/admin/dispatch/DispatchHeader.tsx` | COPY | — |
| 27 | `src/components/admin/dispatch/DispatchCalendar.tsx` | COPY | — |
| 28 | `src/components/admin/dispatch/EditTimeModal.tsx` | NEW | Extracted from DispatchClient lines 218-298 |
| 29 | `src/components/admin/dispatch/DispatchClient.tsx` | REWRITE | Use EditTimeModal, import from `src/hooks/`, add conflict error handling |
| 30 | `src/components/admin/shared/ScheduleToast.tsx` | COPY | — |
| 31 | `src/components/admin/shared/UnassignedBadge.tsx` | COPY | — |
| 32 | `src/components/admin/layout/AdminSidebar.tsx` | COPY | Links to jobs/inspectors/settings still render (pages 404 — acceptable) |
| 33 | `src/components/admin/layout/AdminHeader.tsx` | COPY | — |
| 34 | `src/proxy.ts` | COPY | As-is. Minimal type fix only if trivial. No behavioral refactor. |
| 35 | `src/app/layout.tsx` | COPY | — |
| 36 | `src/app/globals.css` | COPY+FIX | Remove stale `@source not` paths that reference non-existent dirs |
| 37 | `src/app/page.tsx` | COPY | — |
| 38 | `src/app/login/page.tsx` | COPY | — |
| 39 | `src/app/admin/layout.tsx` | COPY | `as any` stays — proxy.ts constraint applies here too |
| 40 | `src/app/admin/page.tsx` | COPY | Redirect to /admin/dispatch |
| 41 | `src/app/admin/dispatch/page.tsx` | COPY | — |
| 42 | `src/app/api/auth/callback/route.ts` | COPY | — |
| 43 | `src/app/api/auth/logout/route.ts` | COPY | — |

**Totals**: 43 files. 29 COPY, 7 COPY+FIX, 3 REWRITE, 4 NEW.

---

## 4. Execution Sequence

### Step 1: Create project directory + configs

```
Action: mkdir -p /Users/morrisanderson/Projects-clean/DisptchMama
Copy:   package.json (remove shadcn from dependencies)
Copy:   tsconfig.json, next.config.ts, postcss.config.mjs
Note:   User provides .env.local manually
```

### Step 2: Install dependencies

```
Action: cd Projects-clean/DisptchMama && npm install
Verify: node_modules/ created, no install errors
```

### Step 3: Foundation layer

```
Copy:   src/types/database.ts
Copy:   src/lib/utils.ts
Copy:   src/lib/supabase/server.ts  (+ add Database generic)
Copy:   src/lib/supabase/client.ts  (+ add Database generic)
```

### Step 4: Create services layer

```
Create: src/services/job-lifecycle.ts
Create: src/services/dispatch-scheduling.ts
Create: src/services/conflict-detection.ts
```

### Step 5: Checkpoint — type-check services

```
Action: npx tsc --noEmit
Expect: Zero errors on types + utils + supabase + services
Fix:    Any issues before proceeding
```

### Step 6: Data layer (queries + actions)

```
Rewrite: src/lib/queries/dispatch.ts   (typed client param)
Rewrite: src/lib/actions/schedule-mutations.ts  (delegates to services)
Copy:    src/lib/actions/dispatch-actions.ts     (adjust if interface changed)
```

### Step 7: Hooks

```
Create: src/hooks/use-schedule-sync.ts  (content from src/lib/hooks/, import path: @/lib/supabase/client)
```

### Step 8: UI primitives

```
Copy: src/components/ui/button.tsx
Copy: src/components/ui/input.tsx
Copy: src/components/ui/label.tsx
Copy: src/components/ui/card.tsx
Copy: src/components/ui/avatar.tsx
Copy: src/components/ui/dropdown-menu.tsx
```

### Step 9: Dispatch components

```
Copy:    TimelineGrid.tsx, JobBlock.tsx, UnscheduledQueue.tsx
Copy:    UnscheduledJobChip.tsx, DispatchHeader.tsx, DispatchCalendar.tsx
Create:  EditTimeModal.tsx (extracted from DispatchClient)
Rewrite: DispatchClient.tsx (use EditTimeModal, use src/hooks/ import, add conflict error handling)
```

### Step 10: Shared + layout components

```
Copy: src/components/admin/shared/ScheduleToast.tsx
Copy: src/components/admin/shared/UnassignedBadge.tsx
Copy: src/components/admin/layout/AdminSidebar.tsx
Copy: src/components/admin/layout/AdminHeader.tsx
```

### Step 11: Auth + pages

```
Copy: src/proxy.ts                          (as-is, no refactor)
Copy: src/app/layout.tsx
Copy: src/app/globals.css                   (clean stale @source paths)
Copy: src/app/page.tsx
Copy: src/app/login/page.tsx
Copy: src/app/admin/layout.tsx              (as-is, no type refactor)
Copy: src/app/admin/page.tsx
Copy: src/app/admin/dispatch/page.tsx
Copy: src/app/api/auth/callback/route.ts
Copy: src/app/api/auth/logout/route.ts
```

### Step 12: Static assets + AIOS context

```
Copy: public/*  (favicons, static assets)
Copy: aios/*    (entire AI context directory)
Copy: supabase/schema.sql
```

---

## 5. Hard Validation Gate

Phase 1 ends here. The following checks must ALL pass before any further work:

### Gate 1: Type check
```
npx tsc --noEmit
Required: ZERO errors
```

### Gate 2: Build
```
npm run build
Required: Successful build
Acceptable: Google Fonts fetch warning in sandbox (known issue B1, does not affect production)
```

### Gate 3: Architecture audit
```
Verify manually:
  [ ] src/services/ exists with 3 files
  [ ] No file in src/services/ imports from src/lib/actions/ or src/components/
  [ ] No file in src/services/ uses 'use server' or 'use client'
  [ ] src/hooks/use-schedule-sync.ts exists (not src/lib/hooks/)
  [ ] DispatchClient.tsx imports from @/hooks/, not @/lib/hooks/
  [ ] DispatchClient.tsx does NOT contain inline edit modal (extracted to EditTimeModal)
  [ ] dispatch.ts query uses SupabaseClient<Database>, not AnyClient/any
  [ ] schedule-mutations.ts delegates to services for business logic
  [ ] package.json does NOT have shadcn in dependencies
  [ ] No new 'any' types introduced in rewritten/new files
```

### Gate 4: Dispatch slice smoke test (manual review)
```
Trace the code paths:
  [ ] Unscheduled → Timeline: scheduleFromDispatch → updateSchedule → buildScheduleUpdate → computeDispatchStatus + shouldAutoConfirm
  [ ] Timeline → Different slot: updateSchedule → buildScheduleUpdate (reschedule path)
  [ ] Timeline → Unscheduled: updateSchedule → buildUnscheduleUpdate (status revert to pending)
  [ ] Conflict: schedule-mutations calls checkConflicts before persist, throws on overlap
  [ ] Realtime: use-schedule-sync subscribes to jobs table changes
```

**Only after all 4 gates pass** do we proceed to Phase 2 (jobs, inspectors, settings, remaining components, proxy.ts refactor).

---

## 6. What Phase 1 Does NOT Produce

To be explicit about what's missing after this phase:

- `/admin/jobs` → 404 (page not migrated)
- `/admin/jobs/new` → 404
- `/admin/inspectors` → 404
- `/admin/settings` → 404
- Sidebar links to those pages render but navigate to 404s
- `job-actions.ts` not migrated (no transition validation on manual status changes yet)
- `inspector-actions.ts` not migrated
- `employee-actions.ts` not migrated
- 4 UI primitives not copied (badge, dialog, select, separator)
- `proxy.ts` still has `as any` casts
- `admin/layout.tsx` still has `as any` cast

All of the above is Phase 2 scope.

---

## Appendix: P1 Issue Resolution Map

| Issue | Where it's fixed | Phase |
|-------|-------------------|-------|
| F1: No conflict detection | `src/services/conflict-detection.ts` + `schedule-mutations.ts` calls it | **Phase 1** |
| F2: Unschedule doesn't revert status | `src/services/dispatch-scheduling.ts` → `buildUnscheduleUpdate()` | **Phase 1** |
| P1: Missing services layer | `src/services/` (3 files) | **Phase 1** |
| P1: Status transition enforcement | `src/services/job-lifecycle.ts` → `isValidTransition()` (service built; wired into `job-actions.ts` in Phase 2) | **Service: Phase 1. Wiring: Phase 2** |
| S1: Hooks in wrong location | `src/hooks/use-schedule-sync.ts` | **Phase 1** |
| S2: shadcn as runtime dep | Removed from `dependencies` in package.json | **Phase 1** |
| V3: `any` in dispatch queries | Replaced with `SupabaseClient<Database>` | **Phase 1** |
| V4: `any` in proxy.ts | Deferred — copy as-is | **Phase 2** |

---

*Ready for final approval. No code will be written until confirmed.*
