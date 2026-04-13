# Known Issues

Bugs, tech debt, and structural problems identified in the DisptchMama codebase.

## Structural Issues

### S1: Hooks in wrong location
**Severity**: Low (cosmetic/convention)
**File**: `src/lib/hooks/use-schedule-sync.ts`
**Problem**: React hooks belong in `src/hooks/`, not nested under `src/lib/hooks/`. Convention mismatch with the target architecture.
**Fix**: Move to `src/hooks/use-schedule-sync.ts`, update import in `DispatchClient.tsx`.
**Blocked by**: Nothing. Planned for Phase 2 of migration.

### S2: `shadcn` as runtime dependency
**Severity**: Low
**File**: `package.json`
**Problem**: `"shadcn": "^4.0.0"` is listed as a dependency. shadcn is a CLI code generator — its components are copied into `src/components/ui/` at generation time. It should not be a runtime dependency.
**Fix**: Remove from `dependencies`. It can remain as a devDependency if needed for component generation.

### S3: `tw-animate-css` dependency
**Severity**: Low
**File**: `package.json`
**Problem**: Same issue identified in Seller's Compliance. Evaluate whether it's actively used. If animations can be achieved with standard Tailwind, remove it.
**Fix**: Audit usage, replace with Tailwind native animations if possible.

### S4: `proxy.ts` naming convention
**Severity**: Low
**File**: `src/proxy.ts`
**Problem**: Acts as Next.js middleware but is named `proxy.ts` instead of the standard `middleware.ts`. It exports a `proxy` function and a `config` object, which is the correct middleware pattern, but the file name doesn't match Next.js conventions.
**Fix**: Evaluate renaming to `src/middleware.ts` and exporting as the default `middleware` function. Need to check if anything imports `proxy` by name.

### S5: No services layer
**Severity**: Medium
**Problem**: Business logic lives directly in server actions. No orchestration layer for multi-step workflows.
**Impact**: Logic duplication risk as actions grow. Testing is harder.
**Fix**: Phase 3 of migration — create `src/services/` with job lifecycle, dispatch scheduling, and auto-confirm modules.

## Functional Issues

### F1: No conflict detection on dispatch
**Severity**: High
**Problem**: Two jobs can be scheduled to the same inspector at overlapping times with no warning.
**Impact**: Real-world scheduling errors.
**Fix**: `checkConflicts()` service function. See `03_workflows/edge-cases.md`.

### F2: Inconsistent status after unschedule
**Severity**: Medium
**Problem**: Dragging a confirmed job back to the unscheduled queue clears `assigned_to` and `dispatch_status`, but leaves `status` as `confirmed`. Logically inconsistent.
**Fix**: Revert status to `pending` when unscheduling, or prevent unscheduling of non-pending jobs.

### F3: No stale-data recovery for realtime
**Severity**: Medium
**Problem**: If a browser loses its websocket connection and misses events, the timeline shows stale data until a new event arrives.
**Fix**: Add reconnection handler that triggers `router.refresh()`.

## Build Issues

### B1: Google Fonts fetch errors in sandbox
**Severity**: None (sandbox-only)
**Problem**: `next/font: error: Failed to fetch` during `npm run build` in sandboxed environments.
**Impact**: Zero. Production builds on Vercel will not have this issue. `tsc --noEmit` passes clean.
**Fix**: No fix needed. Ignore in CI/sandbox contexts.

## Tech Debt

### T1: No test coverage
**Severity**: Medium (growing)
**Problem**: Zero tests. No test framework configured.
**Impact**: Changes can't be validated programmatically.
**Future**: Add Vitest for unit tests on services/actions. Playwright for dispatch timeline E2E.

### T2: RLS policies are too permissive
**Severity**: Low (internal tool)
**Problem**: All tables allow all authenticated users to do everything. No role-based enforcement at the database level.
**Impact**: Any logged-in user (including field_tech) can delete jobs, modify inspectors, etc.
**Future**: Add role-based policies when multi-user access becomes reality.

### T3: No error boundaries
**Severity**: Low
**Problem**: No React error boundaries. An unhandled error in any component crashes the page.
**Fix**: Add `error.tsx` files in key route segments.
