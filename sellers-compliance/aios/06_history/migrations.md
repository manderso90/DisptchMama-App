# Migrations Log

Record of structural migrations, database changes, and refactoring efforts.

## Completed Migrations

### M-001: Initial Schema Creation
**Date**: 2026-04-06
**Type**: Database

Created the initial Supabase schema with 4 tables:
- `team_members` — with RLS, role CHECK constraint
- `inspectors` — with region default 'Valley'
- `jobs` — with status/dispatch_status CHECK constraints, computed `scheduled_end` trigger
- `job_status_history` — append-only audit log

Triggers created:
- `compute_scheduled_end` on jobs
- `update_updated_at` on jobs, team_members, inspectors

Realtime enabled on `jobs` table.

### M-002: AIOS v1 → v2 Context Structure
**Date**: 2026-04-08
**Type**: Project structure (non-code)

Migrated flat `context/` directory to structured `aios/` v2:
- `context/business-info.md` → `aios/01_context/business.md`
- `context/personal-info.md` → `aios/01_context/users.md`
- `context/strategy.md` → `aios/00_overview/vision.md`
- `context/current-data.md` → `aios/05_active/current-focus.md`

Created 9 new documentation files grounded in codebase audit.

**Original files**: Preserved in `context/` (not yet deleted).

## Planned Migrations

### M-003: Hooks Relocation
**Status**: Planned (Phase 2)
**Type**: Project structure

Move `src/lib/hooks/use-schedule-sync.ts` → `src/hooks/use-schedule-sync.ts`.
Update import in `src/components/admin/dispatch/DispatchClient.tsx`.

### M-004: Package.json Cleanup
**Status**: Planned (Phase 2)
**Type**: Dependencies

- Remove `shadcn` from runtime dependencies
- Evaluate and potentially remove `tw-animate-css`

### M-005: Services Layer Introduction
**Status**: Planned (Phase 3)
**Type**: Architecture

Create `src/services/` with:
- `jobs/lifecycle.ts` — status machine, valid transitions
- `jobs/order.ts` — job creation orchestration
- `dispatch/scheduler.ts` — conflict detection, dispatch readiness
- `dispatch/auto-confirm.ts` — auto-confirmation logic extraction
- `inspectors/assignment.ts` — assignment validation

### M-006: Service Adoption Pass
**Status**: Planned (Phase 4)
**Type**: Refactoring

Refactor existing actions to use service modules:
- `job-actions.ts` → use lifecycle and order services
- `dispatch-actions.ts` → use scheduler service
- `schedule-mutations.ts` → use auto-confirm and lifecycle services

### M-007: Middleware Rename
**Status**: Under consideration
**Type**: Convention

Rename `src/proxy.ts` → `src/middleware.ts`. Export function as `middleware` instead of `proxy`. Verify no named imports break.

## Migration Rules

1. **Always create a safety branch** before starting a migration.
2. **Run `tsc --noEmit` after every file change** — never accumulate errors.
3. **One migration at a time** — don't combine database changes with code refactors.
4. **Update AIOS docs** when a migration changes the architecture or folder structure.
5. **Log every migration here** with date, type, and what changed.
