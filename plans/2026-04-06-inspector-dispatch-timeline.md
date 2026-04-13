# Plan: Switch Dispatch Timeline to Inspectors with Drag-and-Drop Assignment

**Created:** 2026-04-06
**Status:** Implemented
**Request:** Replace team_members on the dispatch timeline with inspectors so unscheduled jobs can be dragged and dropped onto inspector rows.

---

## Overview

### What This Plan Accomplishes

Switches the dispatch timeline from showing **team_members** (Supabase auth-linked users) to showing **inspectors** (the standalone roster created via the Inspectors page). Each inspector gets their own row on the timeline. Unscheduled jobs can be dragged onto an inspector's row to assign and schedule them — exactly as the current drag-and-drop works, but targeting inspectors instead of team members.

### Why This Matters

The inspectors table was built specifically to represent the field workers who get dispatched to jobs. Team members are app users (admins, dispatchers) — they shouldn't be on the dispatch timeline. This change connects the two systems so Christian can manage the inspector roster on the Inspectors page, then assign jobs to those inspectors via drag-and-drop on the Dispatch page.

---

## Current State

### Relevant Existing Structure

**Dispatch timeline (currently uses team_members):**
- `src/lib/queries/dispatch.ts` — `getDispatchTimeline()` queries `team_members` table, groups jobs by `assigned_to` (which is a FK to `team_members.id`)
- `src/components/admin/dispatch/TimelineGrid.tsx` — Renders rows per `DispatchTeamMember`, each row has droppable time slots with `inspectorId` data prop (confusingly named — it's actually a team_member ID)
- `src/components/admin/dispatch/DispatchClient.tsx` — DnD handler reads `inspectorId` from drop data, calls `scheduleFromDispatch()` which sets `assigned_to`
- `src/lib/actions/schedule-mutations.ts` — `updateSchedule()` writes `assigned_to` to `jobs` table
- `src/lib/actions/dispatch-actions.ts` — Thin wrappers around `updateSchedule()`

**Inspector system (standalone, not connected to dispatch):**
- `inspectors` table — `id` (uuid, auto-generated), `full_name`, `phone`, `email`, `is_active`, `notes`
- `src/lib/queries/inspectors.ts` — `getInspectors()` fetches all inspectors
- `src/app/admin/inspectors/page.tsx` — CRUD page for managing the roster

**Database FK constraint:**
- `jobs.assigned_to` references `team_members(id)` — this FK needs to change to reference `inspectors(id)` instead

### Gaps or Problems Being Addressed

1. **Timeline shows the wrong people** — Team members are app users, not the field inspectors who get dispatched
2. **`assigned_to` FK points to wrong table** — Jobs are assigned to `team_members.id` but should be assigned to `inspectors.id`
3. **Naming confusion** — The TimelineGrid droppable slots use `inspectorId` as a data prop name, but it actually holds a team_member ID. After this change, it will correctly hold an inspector ID.

---

## Proposed Changes

### Summary of Changes

- **Database migration:** Change `jobs.assigned_to` FK from `team_members(id)` to `inspectors(id)`
- **Dispatch query:** Swap `getDispatchTimeline()` from querying `team_members` to querying `inspectors`
- **Types:** Rename `DispatchTeamMember` → `DispatchInspector` across dispatch components
- **Dispatch page:** Fetch inspectors instead of team members, pass to `DispatchClient`
- **Layout sidebar badge:** Update unassigned count query (no FK change needed — it just checks `assigned_to IS NULL`)
- **All component props/types:** Update naming from `teamMembers`/`member` to `inspectors`/`inspector`

### New Files to Create

| File Path | Purpose |
| --------- | ------- |
| `supabase/migrations/switch-assigned-to-inspectors.sql` | SQL migration: drop old FK, add new FK to inspectors |

### Files to Modify

| File Path | Changes |
| --------- | ------- |
| `supabase/schema.sql` | Change `assigned_to` FK from `team_members(id)` to `inspectors(id)` |
| `src/lib/queries/dispatch.ts` | Query `inspectors` instead of `team_members`; rename types |
| `src/app/admin/dispatch/page.tsx` | Rename `teamMembers` → `inspectors` in fetch and props |
| `src/components/admin/dispatch/DispatchClient.tsx` | Rename `teamMembers` prop → `inspectors`; update all references |
| `src/components/admin/dispatch/TimelineGrid.tsx` | Rename `teamMembers` → `inspectors`, `member` → `inspector` in props and rendering; update column header label |
| `src/app/admin/layout.tsx` | No changes needed — the unassigned badge just checks `assigned_to IS NULL`, no FK involved |

### Files to Delete (if any)

None.

---

## Design Decisions

### Key Decisions Made

1. **Change the FK, don't add a second column**: Rather than adding a separate `assigned_inspector` column (which would create two assignment fields and confusion), we change `assigned_to` to reference `inspectors(id)`. This is cleaner — there's one assignment field and it points to inspectors. Any existing assigned_to values that reference team_members will be nulled out by the migration (since they'd be invalid FKs).

2. **Keep the same DnD mechanics**: The drag-and-drop system works perfectly. We're only changing *what* the timeline rows represent (inspectors instead of team members) and *which table* the assignment points to. No changes to `@dnd-kit` usage, `schedule-mutations.ts` logic, or the unscheduled queue.

3. **Rename types throughout for clarity**: `DispatchTeamMember` → `DispatchInspector`, `teamMembers` → `inspectors` in all props and variables. This makes the code match the domain — inspectors are who get dispatched.

4. **`schedule-mutations.ts` needs no logic changes**: It writes `assigned_to` as a UUID string — it doesn't care whether that UUID comes from team_members or inspectors. The FK constraint is at the database level.

### Alternatives Considered

- **Add a separate `assigned_inspector` column**: Rejected — creates ambiguity about which assignment field is authoritative. One column is cleaner.
- **Keep `assigned_to` pointing to team_members and just display inspectors**: Rejected — the whole point is to assign jobs TO inspectors. The data model should match.

### Open Questions (if any)

1. **Existing assigned jobs**: Any jobs currently assigned to a team_member ID will lose their assignment (set to NULL) when the FK changes. This is expected since the system is in early development. If there are live scheduled jobs you want to keep, we'd need to map team_member IDs to inspector IDs first — but this is unlikely to be needed.

---

## Step-by-Step Tasks

### Step 1: Create Database Migration

Change the `assigned_to` FK from `team_members` to `inspectors`.

**Actions:**

- Create `supabase/migrations/switch-assigned-to-inspectors.sql`:
  - NULL out any existing `assigned_to` values (they reference team_members, which won't be valid)
  - Drop the existing FK constraint on `jobs.assigned_to`
  - Add new FK constraint: `assigned_to uuid references public.inspectors(id) on delete set null`

**SQL:**
```sql
-- Null out existing assignments (they reference team_members, not inspectors)
UPDATE public.jobs SET assigned_to = NULL WHERE assigned_to IS NOT NULL;

-- Drop old FK constraint
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_assigned_to_fkey;

-- Add new FK to inspectors
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.inspectors(id) ON DELETE SET NULL;
```

**Files affected:**

- `supabase/migrations/switch-assigned-to-inspectors.sql` (new)

---

### Step 2: Update Schema File

Update `supabase/schema.sql` so fresh installs have the correct FK.

**Actions:**

- In `supabase/schema.sql`, change the `assigned_to` line in the `jobs` table from:
  ```sql
  assigned_to uuid references public.team_members(id) on delete set null,
  ```
  to:
  ```sql
  assigned_to uuid references public.inspectors(id) on delete set null,
  ```

**Files affected:**

- `supabase/schema.sql`

---

### Step 3: Update Dispatch Query Types and Functions

Switch `getDispatchTimeline()` from team_members to inspectors.

**Actions:**

- In `src/lib/queries/dispatch.ts`:
  - Rename `DispatchTeamMember` → `DispatchInspector`
  - Update `getDispatchTimeline()`:
    - Query `inspectors` table instead of `team_members` table
    - Select `id, full_name` from `inspectors` where `is_active = true`, ordered by `full_name`
    - The jobs query stays the same (still queries `jobs` by `scheduled_date`, groups by `assigned_to`)
    - Update the type of the members loop variable to match `inspectors` row shape
  - Update the return type from `DispatchTeamMember[]` to `DispatchInspector[]`

**Files affected:**

- `src/lib/queries/dispatch.ts`

---

### Step 4: Update Dispatch Page (Server Component)

Pass inspectors instead of team members to the client component.

**Actions:**

- In `src/app/admin/dispatch/page.tsx`:
  - Rename `teamMembers` variable → `inspectors`
  - Update the `DispatchClient` prop from `teamMembers={teamMembers}` to `inspectors={inspectors}`
  - Update the subtitle text: "Drag unscheduled jobs onto inspector rows to assign and schedule."

**Files affected:**

- `src/app/admin/dispatch/page.tsx`

---

### Step 5: Update DispatchClient Component

Update props, DnD handlers, and rendering to use `inspectors`.

**Actions:**

- In `src/components/admin/dispatch/DispatchClient.tsx`:
  - Update `DispatchClientProps`: rename `teamMembers` → `inspectors`, type from `DispatchTeamMember[]` → `DispatchInspector[]`
  - Update all references inside the component:
    - `teamMembers` → `inspectors` (the prop and all usages like `.find()`)
    - Import `DispatchInspector` instead of `DispatchTeamMember`
  - Update toast messages: "team member" → "inspector"
  - Update the edit modal: `editMember` → `editInspector`, display text "Team Member" → "Inspector"
  - Pass `inspectors` to `<TimelineGrid>` instead of `teamMembers`

**Files affected:**

- `src/components/admin/dispatch/DispatchClient.tsx`

---

### Step 6: Update TimelineGrid Component

Rename props and rendering to use inspector terminology.

**Actions:**

- In `src/components/admin/dispatch/TimelineGrid.tsx`:
  - Import `DispatchInspector` instead of `DispatchTeamMember`
  - Rename `TeamMemberRow` → `InspectorRow`
  - Rename `member` prop → `inspector`
  - Update column header text from "Team Member" to "Inspector"
  - Rename `teamMembers` prop → `inspectors`
  - Update empty state: "No active team members found" → "No active inspectors found. Add inspectors on the Inspectors page."
  - The `inspectorId` data prop on `TimeSlot` is already correctly named — it will now actually hold an inspector ID

**Files affected:**

- `src/components/admin/dispatch/TimelineGrid.tsx`

---

### Step 7: Verify Build

Run TypeScript and Next.js build to catch any broken references.

**Actions:**

- Run `npx tsc --noEmit` from the `disptchmama` directory
- Fix any type errors from missed renames
- Run `npm run build` to verify production build succeeds
- Grep for any remaining `teamMember` or `DispatchTeamMember` references in source to catch stragglers

**Files affected:**

- Various — driven by build errors

---

## Connections & Dependencies

### Files That Reference This Area

- `src/components/admin/dispatch/JobBlock.tsx` — Uses `teamMemberId` prop for DnD data. This prop name is set by TimelineGrid when rendering `<JobBlock teamMemberId={inspector.id}>`. Since the prop is just a string UUID, it will still work correctly — the value now comes from an inspector ID instead of a team member ID. **Rename the prop** from `teamMemberId` to `inspectorId` for consistency.
- `src/components/admin/dispatch/UnscheduledQueue.tsx` — No changes needed. It's self-contained.
- `src/components/admin/dispatch/UnscheduledJobChip.tsx` — No changes needed. It just renders job data.
- `src/components/admin/dispatch/DispatchHeader.tsx` — No changes needed.
- `src/components/admin/dispatch/DispatchCalendar.tsx` — No changes needed.
- `src/components/admin/shared/ScheduleToast.tsx` — No changes needed.
- `src/lib/actions/schedule-mutations.ts` — No logic changes. It writes `assigned_to` as a UUID. The database FK constraint handles validation.
- `src/lib/actions/dispatch-actions.ts` — No changes needed. The `teamMemberId` parameter name in `scheduleFromDispatch()` should be renamed to `inspectorId` for clarity.
- `src/lib/hooks/use-schedule-sync.ts` — No changes needed. It watches `assigned_to` field changes on the `jobs` table.
- `src/app/admin/layout.tsx` — The unassigned badge queries `jobs` where `assigned_to IS NULL`. No FK involved, no changes needed.

### Updates Needed for Consistency

- Rename `teamMemberId` → `inspectorId` in `JobBlock.tsx` props and `DispatchClient.tsx` DnD data
- Rename `teamMemberId` parameter → `inspectorId` in `dispatch-actions.ts` `scheduleFromDispatch()`
- CLAUDE.md could note that the dispatch timeline now shows inspectors

### Impact on Existing Workflows

- **Inspectors page**: No changes — continues to manage the inspector roster via CRUD
- **Jobs page**: No changes — job creation doesn't set `assigned_to`
- **Settings page**: No changes — team member management is unaffected
- **Existing scheduled jobs**: Any jobs currently assigned to team_member IDs will be unassigned (set to NULL) by the migration. They'll appear in the unscheduled queue and can be re-assigned to inspectors.

---

## Validation Checklist

- [ ] Migration SQL runs without errors
- [ ] `schema.sql` updated with correct FK
- [ ] TypeScript types compile — no errors from `npx tsc --noEmit`
- [ ] `npm run build` succeeds with zero errors
- [ ] Dispatch page shows inspector names as timeline rows (not team members)
- [ ] Dragging an unscheduled job onto an inspector row assigns and schedules it
- [ ] Dragging a scheduled job to a different inspector row reassigns it
- [ ] Dragging a scheduled job to the unscheduled queue unassigns it
- [ ] Edit time modal works correctly and shows inspector name
- [ ] Toast messages say "inspector" not "team member"
- [ ] Empty state says "No active inspectors found" with guidance
- [ ] No remaining references to `DispatchTeamMember` or `teamMembers` in dispatch code
- [ ] Inspectors CRUD page still works correctly
- [ ] Sidebar unassigned badge still works

---

## Success Criteria

The implementation is complete when:

1. **The dispatch timeline rows are inspectors** from the `inspectors` table, not team members
2. **Drag-and-drop assignment works end-to-end** — unscheduled jobs can be dropped onto inspector rows to schedule them
3. **`jobs.assigned_to` references `inspectors(id)`** — the data model correctly reflects that jobs are assigned to inspectors
4. **All naming is consistent** — code says "inspector" everywhere, not "team member", in the dispatch context

---

## Notes

- The `team_members` table and Settings page remain untouched — team members are still used for app authentication and user management. They're just no longer the people shown on the dispatch timeline.
- The `inspectorId` variable name in `TimelineGrid.tsx`'s `TimeSlot` component was actually named correctly all along — it was just holding a team_member ID. After this change, the name and value will match.
- If inspectors ever need to log into the app (e.g., a future mobile inspector view), they could be linked to `team_members` via a shared email or a new `team_member_id` column on `inspectors`. But that's a separate concern.
- The `dispatch-actions.ts` parameter rename (`teamMemberId` → `inspectorId`) is cosmetic but important for code clarity.

---

## Implementation Notes

**Implemented:** 2026-04-06

### Summary

Switched the dispatch timeline from team_members to inspectors across the full stack: database FK, queries, types, server component, client component, timeline grid, job blocks, and dispatch actions. All naming updated from `teamMembers`/`DispatchTeamMember` to `inspectors`/`DispatchInspector` throughout.

### Deviations from Plan

None — all steps executed as specified.

### Issues Encountered

None — TypeScript compiled cleanly and `npm run build` succeeded with zero errors.
