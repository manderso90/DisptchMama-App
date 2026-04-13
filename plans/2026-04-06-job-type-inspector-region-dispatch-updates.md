# Plan: Job Type Radio, Inspector Region, and Dispatch Lockbox/Grouping

**Created:** 2026-04-06
**Status:** Implemented
**Request:** Change job title to radio (Inspection/Work), remove client fields from job form, remove phone/email from inspectors, add region radio to inspectors, show lockbox on dispatch jobs, group dispatch inspectors by region.

---

## Overview

### What This Plan Accomplishes

Makes four targeted changes across three pages:
1. **Jobs page** — Job title becomes a radio choice (Inspection or Work) instead of free text; client name, phone, and email fields are removed from the new job form.
2. **Inspectors page** — Phone and email fields are removed; a "Region" radio (Valley / Los Angeles) is added.
3. **Dispatch page** — Each job block and unscheduled chip shows "Lock Box" or "No Lock Box"; inspectors are grouped by region with section headers.

### Why This Matters

These changes align DisptchMama with how GS Retrofit actually operates: jobs are either inspections or work orders (not free-text titles), client contact info isn't needed at dispatch time, inspectors operate in specific regions (Valley or LA), and lockbox status is critical info the dispatcher needs to see at a glance. Grouping inspectors by region on the dispatch timeline makes it easy to assign jobs to inspectors who are already in the right area.

---

## Current State

### Relevant Existing Structure

**Source code lives at:** `~/Downloads/Seller's Compliance/disptchmama/`

| File | Current State |
| ---- | ------------- |
| `src/components/admin/jobs/NewJobForm.tsx` | Free-text title input; has client name (required), client phone, client email fields |
| `src/components/admin/inspectors/InspectorFormDialog.tsx` | Has phone and email fields |
| `src/components/admin/inspectors/InspectorTable.tsx` | Shows Phone and Email columns |
| `src/lib/actions/inspector-actions.ts` | Accepts phone and email in create/update |
| `src/lib/actions/job-actions.ts` | Accepts client_name (required), client_phone, client_email |
| `src/types/database.ts` | Inspector type has phone/email; no region field |
| `src/lib/queries/dispatch.ts` | DispatchJob doesn't include has_lockbox; DispatchInspector has no region; no grouping logic |
| `src/components/admin/dispatch/TimelineGrid.tsx` | Renders flat list of inspectors (no grouping) |
| `src/components/admin/dispatch/JobBlock.tsx` | Shows address and time only |
| `src/components/admin/dispatch/UnscheduledJobChip.tsx` | Shows address, client, date, notes — no lockbox indicator |
| `src/components/admin/dispatch/DispatchClient.tsx` | Passes flat `inspectors` array to TimelineGrid |
| `src/app/admin/dispatch/page.tsx` | Passes flat inspectors from query |
| `supabase/schema.sql` | `inspectors` table has phone, email, no region column |

### Gaps or Problems Being Addressed

1. **Job title is free text** — should be a fixed choice (Inspection or Work) to match the business's two job types
2. **Client contact fields are unnecessary** — Christian doesn't need client name/phone/email during dispatch
3. **Inspector phone/email clutters the UI** — not used in the dispatch workflow
4. **No region tracking** — inspectors work in either Valley or LA, but the system doesn't capture this
5. **Lockbox status invisible on dispatch** — it's stored on the job but not displayed on the timeline or unscheduled queue
6. **Inspectors not grouped** — the flat list makes it harder to assign jobs to the right region's inspectors

---

## Proposed Changes

### Summary of Changes

- **Database:** Add `region` column (`text`, default `'Valley'`) to `inspectors` table
- **Types:** Add `region` to Inspector type in `database.ts`
- **Inspector form:** Remove phone and email fields; add Region radio (Valley / Los Angeles)
- **Inspector table:** Remove Phone and Email columns; add Region column
- **Inspector actions:** Remove phone/email from create/update; add region
- **Job form:** Replace title text input with radio buttons (Inspection / Work); remove client name, phone, email fields
- **Job actions:** Make client_name optional (default to empty string); remove client_phone/email from required flow
- **Dispatch query:** Add `has_lockbox` to `DispatchJob` and `UnscheduledJob`; add `region` to `DispatchInspector`
- **JobBlock:** Show lockbox indicator
- **UnscheduledJobChip:** Show lockbox indicator
- **TimelineGrid:** Accept grouped inspectors; render region section headers
- **DispatchClient / dispatch page:** Group inspectors by region before passing to TimelineGrid

### New Files to Create

| File Path | Purpose |
| --------- | ------- |
| `supabase/migrations/add-inspector-region.sql` | Add `region` column to `inspectors` table |

### Files to Modify

| File Path | Changes |
| --------- | ------- |
| `supabase/schema.sql` | Add `region text not null default 'Valley'` to inspectors |
| `src/types/database.ts` | Add `region: string` to Inspector Row/Insert/Update |
| `src/components/admin/inspectors/InspectorFormDialog.tsx` | Remove phone/email fields; add Region radio |
| `src/components/admin/inspectors/InspectorTable.tsx` | Remove Phone/Email columns; add Region column |
| `src/lib/actions/inspector-actions.ts` | Remove phone/email params; add region param |
| `src/components/admin/jobs/NewJobForm.tsx` | Replace title input with radio; remove client name/phone/email fields and state |
| `src/lib/actions/job-actions.ts` | Make client_name default to empty string; remove client_phone/email from params |
| `src/lib/queries/dispatch.ts` | Add `has_lockbox` to DispatchJob and UnscheduledJob selects; add `region` to DispatchInspector |
| `src/components/admin/dispatch/JobBlock.tsx` | Add lockbox badge |
| `src/components/admin/dispatch/UnscheduledJobChip.tsx` | Add lockbox badge |
| `src/components/admin/dispatch/TimelineGrid.tsx` | Accept region-grouped data; render region headers |
| `src/components/admin/dispatch/DispatchClient.tsx` | Group inspectors by region before passing to TimelineGrid |
| `src/app/admin/dispatch/page.tsx` | No changes needed — grouping happens in DispatchClient |

### Files to Delete (if any)

None.

---

## Design Decisions

### Key Decisions Made

1. **Radio buttons for job title, not a dropdown**: Radio buttons are faster for a binary choice. Two options (Inspection / Work) are instantly visible — no click-to-open required. The stored value will be the string `"Inspection"` or `"Work"` in the existing `title` column.

2. **Keep client fields in database schema, just remove from the form**: The `client_name`, `client_phone`, `client_email` columns stay in the `jobs` table for backward compatibility with existing jobs and potential future use. The form just won't collect them anymore. `client_name` will default to an empty string.

3. **Region as a text column, not an enum**: Using `text not null default 'Valley'` is simpler and avoids migration complexity. The UI enforces the two valid values via radio buttons. If more regions are added later, no schema change is needed.

4. **Grouping in the client component, not the query**: The dispatch query returns inspectors with their `region` field. `DispatchClient.tsx` groups them before passing to `TimelineGrid`. This keeps the query simple and the grouping logic in one place.

5. **Region section headers in TimelineGrid**: Each region group gets a sticky header row (e.g., "Valley" / "Los Angeles") styled as a subtle section divider. This visually separates the two groups while keeping the timeline continuous.

6. **Lockbox shown as a small badge on job blocks**: A compact "LB" or "No LB" indicator on JobBlock and UnscheduledJobChip. Uses a Lock/Unlock icon to be instantly recognizable without taking much space.

### Alternatives Considered

- **Dropdown for job type**: Rejected — slower interaction for only 2 options.
- **Remove client columns from DB entirely**: Rejected — breaking schema change for no benefit. Existing data would be lost.
- **Region as a separate table**: Rejected — overengineered for 2 static values.
- **Grouping in the SQL query with ORDER BY region**: Considered but the client-side grouping is simpler and more flexible for the UI rendering.

### Open Questions (if any)

None — all requirements are clear from the request.

---

## Step-by-Step Tasks

### Step 1: Database Migration — Add Region to Inspectors

Add a `region` column to the `inspectors` table.

**Actions:**

- Create `supabase/migrations/add-inspector-region.sql`:
  ```sql
  ALTER TABLE public.inspectors
    ADD COLUMN region text NOT NULL DEFAULT 'Valley';
  ```
- Update `supabase/schema.sql` — add `region text not null default 'Valley'` to the inspectors table definition, after `is_active`

**Files affected:**

- `supabase/migrations/add-inspector-region.sql` (new)
- `supabase/schema.sql`

---

### Step 2: Update TypeScript Types

Add `region` to the Inspector type.

**Actions:**

- In `src/types/database.ts`, add to `inspectors.Row`:
  ```ts
  region: string
  ```
- Add to `inspectors.Insert`:
  ```ts
  region?: string
  ```
- Add to `inspectors.Update`:
  ```ts
  region?: string
  ```

**Files affected:**

- `src/types/database.ts`

---

### Step 3: Update Inspector Actions

Remove phone/email, add region to create/update.

**Actions:**

- In `src/lib/actions/inspector-actions.ts`:
  - `createInspector`: Remove `phone` and `email` from the data parameter type and the insert object. Add `region?: string` to data param. Insert `region: data.region || 'Valley'`.
  - `updateInspector`: Remove `phone` and `email` from the data parameter type and update object. Add `region?: string`. Update `region: data.region`.

**Files affected:**

- `src/lib/actions/inspector-actions.ts`

---

### Step 4: Update Inspector Form Dialog

Remove phone/email fields, add Region radio.

**Actions:**

- In `src/components/admin/inspectors/InspectorFormDialog.tsx`:
  - Remove `phone` and `email` state variables and their `useState` calls
  - Remove the Phone input field (`<Label htmlFor="insp-phone">Phone</Label>` and its `<Input>`)
  - Remove the Email input field (`<Label htmlFor="insp-email">Email</Label>` and its `<Input>`)
  - Add `region` state variable: `const [region, setRegion] = useState('Valley')`
  - In the `useEffect` that populates edit mode: set `region` from `inspector.region || 'Valley'` (remove phone/email setting)
  - In the reset (add mode) branch: set `region` to `'Valley'`
  - Add a Region radio group after the Full Name field:
    ```tsx
    <div className="space-y-1.5">
      <Label>Region *</Label>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="region"
            checked={region === 'Valley'}
            onChange={() => setRegion('Valley')}
            className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700">Valley</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="region"
            checked={region === 'Los Angeles'}
            onChange={() => setRegion('Los Angeles')}
            className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700">Los Angeles</span>
        </label>
      </div>
    </div>
    ```
  - Update `createInspector` call: remove phone/email, add `region`
  - Update `updateInspector` call: remove phone/email, add `region`

**Files affected:**

- `src/components/admin/inspectors/InspectorFormDialog.tsx`

---

### Step 5: Update Inspector Table

Remove Phone/Email columns, add Region column.

**Actions:**

- In `src/components/admin/inspectors/InspectorTable.tsx`:
  - Remove the Phone `<th>` header
  - Remove the Email `<th>` header
  - Replace with a Region `<th>` header:
    ```tsx
    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
      Region
    </th>
    ```
  - In the `<tbody>` row mapping:
    - Remove the phone `<td>` (`inspector.phone || '—'`)
    - Remove the email `<td>` (`inspector.email || '—'`)
    - Add a region `<td>`:
      ```tsx
      <td className="px-5 py-3 text-slate-600 text-sm">
        {inspector.region || 'Valley'}
      </td>
      ```
  - The Region column should NOT be hidden on mobile (`hidden md:table-cell`) — it's more important than phone/email were. Keep it always visible.

**Files affected:**

- `src/components/admin/inspectors/InspectorTable.tsx`

---

### Step 6: Update New Job Form

Replace title input with radio; remove client fields.

**Actions:**

- In `src/components/admin/jobs/NewJobForm.tsx`:
  - Change `title` state initial value from `''` to `'Inspection'` (default radio selection)
  - Remove `clientName`, `clientPhone`, `clientEmail` state variables
  - Replace the Job Title `<Input>` with a radio group:
    ```tsx
    <div className="space-y-1.5">
      <Label>Job Type *</Label>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="jobType"
            checked={title === 'Inspection'}
            onChange={() => setTitle('Inspection')}
            className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700">Inspection</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="jobType"
            checked={title === 'Work'}
            onChange={() => setTitle('Work')}
            className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700">Work</span>
        </label>
      </div>
    </div>
    ```
  - Remove the entire client name/phone grid (`grid grid-cols-1 sm:grid-cols-2` with Client Name and Client Phone)
  - Remove the Client Email field
  - Update validation: only require `title` and `address` (remove `clientName` check)
  - Update `handleSubmit` `createJob` call:
    - Remove `client_name`, `client_phone`, `client_email` params
    - Title is already set by radio

**Files affected:**

- `src/components/admin/jobs/NewJobForm.tsx`

---

### Step 7: Update createJob Server Action

Make client fields optional with defaults.

**Actions:**

- In `src/lib/actions/job-actions.ts`:
  - Remove `client_name` from the required params (make it optional: `client_name?: string`)
  - Remove `client_phone` and `client_email` from the data parameter type
  - In the insert object: set `client_name: data.client_name || ''`, remove `client_phone` and `client_email` (let them default to null at DB level)

**Files affected:**

- `src/lib/actions/job-actions.ts`

---

### Step 8: Update Dispatch Query — Add has_lockbox and Region

Include lockbox status on jobs and region on inspectors.

**Actions:**

- In `src/lib/queries/dispatch.ts`:
  - Add `has_lockbox: boolean` to `DispatchJob` interface
  - Add `has_lockbox` to the jobs select query string
  - Add `has_lockbox: job.has_lockbox ?? false` to the job mapping in `getDispatchTimeline`
  - Add `region: string` to `DispatchInspector` interface
  - Update inspector select to include `region`: `.select('id, full_name, region')`
  - Add `region: inspector.region || 'Valley'` to the inspector mapping return
  - Add `has_lockbox: boolean` to `UnscheduledJob` interface
  - Add `has_lockbox` to the unscheduled jobs select query string

**Files affected:**

- `src/lib/queries/dispatch.ts`

---

### Step 9: Update JobBlock — Show Lockbox Indicator

Add a lockbox badge to the scheduled job block on the timeline.

**Actions:**

- In `src/components/admin/dispatch/JobBlock.tsx`:
  - The `DispatchJob` type (from dispatch.ts) now includes `has_lockbox`
  - Add a small lockbox indicator in the job block, below the time:
    ```tsx
    <p className="text-[10px] opacity-60 truncate leading-tight">
      {job.has_lockbox ? 'Lock Box' : 'No Lock Box'}
    </p>
    ```
  - Update the `title` attribute to include lockbox info:
    ```
    `${address} · ${timeStr} · ${job.estimated_duration_minutes}min · ${job.has_lockbox ? 'Lock Box' : 'No Lock Box'}`
    ```

**Files affected:**

- `src/components/admin/dispatch/JobBlock.tsx`

---

### Step 10: Update UnscheduledJobChip — Show Lockbox Indicator

Add lockbox badge to the unscheduled job card.

**Actions:**

- In `src/components/admin/dispatch/UnscheduledJobChip.tsx`:
  - Import `Lock` or `LockOpen` from `lucide-react` (or just use text)
  - Add a lockbox indicator after the address line:
    ```tsx
    <div className="flex items-center gap-1.5 mb-1">
      <span className={cn(
        'text-[10px] font-medium px-1.5 py-0.5 rounded',
        job.has_lockbox
          ? 'bg-green-50 text-green-700'
          : 'bg-orange-50 text-orange-600'
      )}>
        {job.has_lockbox ? 'Lock Box' : 'No Lock Box'}
      </span>
    </div>
    ```

**Files affected:**

- `src/components/admin/dispatch/UnscheduledJobChip.tsx`

---

### Step 11: Update DispatchClient — Group Inspectors by Region

Group the inspectors array by region before passing to TimelineGrid.

**Actions:**

- In `src/components/admin/dispatch/DispatchClient.tsx`:
  - Before the return JSX, compute grouped inspectors:
    ```tsx
    const valleyInspectors = inspectors.filter(i => i.region === 'Valley')
    const laInspectors = inspectors.filter(i => i.region === 'Los Angeles')
    const regionGroups = [
      { region: 'Valley', inspectors: valleyInspectors },
      { region: 'Los Angeles', inspectors: laInspectors },
    ].filter(g => g.inspectors.length > 0)
    ```
  - Pass `regionGroups` to `<TimelineGrid>` instead of flat `inspectors`:
    ```tsx
    <TimelineGrid regionGroups={regionGroups} onEditJob={handleEditJob} />
    ```
  - The `inspectors` prop is still needed for the DnD handler lookups (finding inspector by ID for toast messages) — keep using it there
  - Update the `editInspector` lookup to still use the flat `inspectors` array

**Files affected:**

- `src/components/admin/dispatch/DispatchClient.tsx`

---

### Step 12: Update TimelineGrid — Render Region Groups

Change TimelineGrid to accept region groups and render section headers.

**Actions:**

- In `src/components/admin/dispatch/TimelineGrid.tsx`:
  - Define a new type:
    ```tsx
    interface RegionGroup {
      region: string
      inspectors: DispatchInspector[]
    }
    ```
  - Change `TimelineGrid` props from `inspectors: DispatchInspector[]` to `regionGroups: RegionGroup[]`
  - Update the rendering to iterate over region groups:
    ```tsx
    {regionGroups.length > 0 ? (
      regionGroups.map((group) => (
        <div key={group.region}>
          {/* Region header */}
          <div className="flex border-b border-slate-200 bg-slate-100/80">
            <div className="w-40 shrink-0 px-3 py-1.5 border-r border-slate-200 sticky left-0 z-10 bg-slate-100/80">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                {group.region}
              </span>
            </div>
            <div className="flex-1" style={{ minWidth: HOURS.length * HOUR_WIDTH_PX }} />
          </div>
          {/* Inspector rows for this region */}
          {group.inspectors.map((inspector) => (
            <InspectorRow key={inspector.id} inspector={inspector} onEditJob={onEditJob} />
          ))}
        </div>
      ))
    ) : (
      <div className="py-12 text-center text-sm text-slate-400">
        No active inspectors found. Add inspectors on the Inspectors page.
      </div>
    )}
    ```

**Files affected:**

- `src/components/admin/dispatch/TimelineGrid.tsx`

---

### Step 13: Verify Build

Run TypeScript and Next.js build to catch errors.

**Actions:**

- Run `npx tsc --noEmit` from the `disptchmama` directory
- Fix any type errors
- Run `npm run build` to verify production build succeeds
- Grep for any remaining references to removed fields that might cause issues

**Files affected:**

- Various — driven by build errors

---

## Connections & Dependencies

### Files That Reference This Area

- `src/components/admin/jobs/JobsTable.tsx` — Displays job list. May show client_name column. May need updating if it references client_name (it will still work since the column exists in DB, just empty for new jobs).
- `src/lib/queries/inspectors.ts` — Fetches inspectors. May need to include `region` in the select if it doesn't already select all columns.
- `src/app/admin/inspectors/page.tsx` — Server page for inspectors. No changes needed — it passes full inspector objects.
- `src/components/admin/dispatch/DispatchCalendar.tsx` — No changes needed.
- `src/components/admin/dispatch/DispatchHeader.tsx` — No changes needed.
- `src/components/admin/dispatch/UnscheduledQueue.tsx` — No changes needed.

### Updates Needed for Consistency

- The `inspectors` query (`src/lib/queries/inspectors.ts`) should select `region` — check if it does `select('*')` or specific columns
- CLAUDE.md could note the region grouping feature

### Impact on Existing Workflows

- **Existing jobs** with free-text titles will keep their titles in the database. New jobs will have either "Inspection" or "Work".
- **Existing inspectors** without a region will default to "Valley" (the DB default).
- **Dispatch board** will now show region groups — if all inspectors are in one region, there's just one group header.
- **Job creation flow** is simpler (fewer fields) — no disruption.

---

## Validation Checklist

- [ ] Migration SQL runs without errors (adds `region` to inspectors)
- [ ] `schema.sql` updated with `region` column
- [ ] TypeScript types include `region` on Inspector
- [ ] Inspector form shows Region radio (Valley / Los Angeles), no phone/email fields
- [ ] Inspector table shows Region column, no Phone/Email columns
- [ ] New Job form shows Job Type radio (Inspection / Work), no client name/phone/email
- [ ] Creating a job saves the selected job type as title
- [ ] Dispatch timeline shows "Lock Box" or "No Lock Box" on scheduled job blocks
- [ ] Unscheduled job chips show lockbox indicator
- [ ] Dispatch timeline groups inspectors by region with section headers
- [ ] Valley inspectors grouped together, LA inspectors grouped together
- [ ] Drag-and-drop still works correctly across region groups
- [ ] Edit time modal still works
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` succeeds

---

## Success Criteria

The implementation is complete when:

1. **Job creation uses radio buttons** for Inspection/Work and no longer asks for client contact info
2. **Inspector management uses region** instead of phone/email
3. **Dispatch timeline shows lockbox status** on every job (scheduled and unscheduled)
4. **Dispatch timeline groups inspectors by region** with clear visual separation
5. **All existing functionality** (drag-and-drop, scheduling, editing) continues working

---

## Notes

- The `client_name`, `client_phone`, `client_email` columns remain in the database and TypeScript types. They're just no longer collected on the form. If Christian needs to capture client info in the future, the fields can be re-added to the form without any schema changes.
- The `phone` and `email` columns remain on the `inspectors` table in the database as well — they're just removed from the UI. No migration needed to drop them.
- If a third region is added in the future, the UI radio buttons and the grouping logic in DispatchClient would need updating. The database column is already flexible (text, not enum).
- The region grouping order is hardcoded: Valley first, then Los Angeles. This matches the filter order and can be changed in DispatchClient if needed.

---

## Implementation Notes

**Implemented:** 2026-04-06

### Summary

All 13 steps executed successfully. The four changes are fully implemented:
- Job form uses radio buttons (Inspection / Work) instead of free-text title; client name/phone/email fields removed
- Inspector form/table: phone and email fields removed, Region radio (Valley / Los Angeles) added
- Dispatch timeline: lockbox status shown on both scheduled job blocks and unscheduled chips
- Dispatch timeline: inspectors grouped by region with section headers (Valley first, then LA)

### Deviations from Plan

- Removed unused `User` import from `UnscheduledJobChip.tsx` (was used for client name display, which was replaced by lockbox indicator)

### Issues Encountered

None — TypeScript check and Next.js build both pass with zero errors.
