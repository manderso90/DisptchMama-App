# Plan: Add Inspectors List (CRUD) and Address Input with Lockbox Option

**Created:** 2026-04-06
**Status:** Implemented
**Request:** Add an inspectors management page with full CRUD, a way to input addresses (street name only), and a lockbox/no lockbox radio option per address.

---

## Overview

### What This Plan Accomplishes

Adds two new features to DisptchMama:

1. **Inspectors Page** — A dedicated page under `/admin/inspectors` that lists all inspectors at the company. Full CRUD: add, view, edit, and delete inspectors. This is separate from the existing "Team Members" settings page — inspectors are the field workers who get assigned to jobs.
2. **Address Input with Lockbox** — A way to input property addresses (street name only — no city, no state) with a radio option for "Lockbox" or "No Lockbox" per address. This will be added to the New Job form so each job captures the street and lockbox status.

### Why This Matters

- Christian needs to see and manage the inspector roster — who's available, who can be dispatched. This is core to the dispatch workflow.
- The lockbox field is critical for inspectors arriving at a property — they need to know in advance whether they can access the property via lockbox or need to coordinate entry with the client.
- Simplifying the address to street-only reduces data entry friction (city/state are unnecessary for local dispatch operations).

---

## Current State

### Relevant Existing Structure

**Database & types:**
- `supabase/schema.sql` — `team_members` table (generic: admin, dispatcher, field_tech roles), `jobs` table with `address`, `city`, `state`, `zip_code` fields
- `src/types/database.ts` — TypeScript types matching the schema

**Existing team member management (Settings page):**
- `src/app/admin/settings/page.tsx` — Settings page with EmployeeTable
- `src/components/admin/settings/EmployeeTable.tsx` — CRUD table for team members
- `src/components/admin/settings/EmployeeFormDialog.tsx` — Add/edit dialog
- `src/components/admin/settings/DeleteEmployeeDialog.tsx` — Delete confirmation
- `src/lib/actions/employee-actions.ts` — Server actions (update, deactivate, delete)

**Existing job creation:**
- `src/components/admin/jobs/NewJobForm.tsx` — Job form with full address (street, city, state, zip)
- `src/lib/actions/job-actions.ts` — createJob server action

**Navigation:**
- `src/components/admin/layout/AdminSidebar.tsx` — 3 sections: Dispatch, Jobs, Settings

### Gaps or Problems Being Addressed

1. **No dedicated inspector view** — The Settings page manages "team members" generically. There's no focused view for inspectors specifically — the people who go out in the field and do the inspections.
2. **Address is over-specified** — The current job form asks for street, city, state, and zip. Christian only needs the street name for dispatch purposes.
3. **No lockbox tracking** — There's no way to indicate whether a property has a lockbox, which is essential information for the inspector arriving on-site.

---

## Proposed Changes

### Summary of Changes

- Add a new `inspectors` database table (separate from `team_members`) to store inspector-specific data
- Create an Inspectors page at `/admin/inspectors` with full CRUD (list, add, edit, delete)
- Add a sidebar navigation item for "Inspectors" under the Records section
- Add a `has_lockbox` boolean field to the `jobs` table
- Simplify the NewJobForm: replace full address fields (street, city, state, zip) with a single "Street Name" field
- Add a radio button group for "Lockbox" / "No Lockbox" next to the address input

### New Files to Create

| File Path | Purpose |
| --------- | ------- |
| `supabase/migrations/add-inspectors-and-lockbox.sql` | SQL migration: create `inspectors` table, add `has_lockbox` to `jobs` |
| `src/app/admin/inspectors/page.tsx` | Inspectors list page (server component) |
| `src/components/admin/inspectors/InspectorTable.tsx` | CRUD table for inspectors (client component) |
| `src/components/admin/inspectors/InspectorFormDialog.tsx` | Add/edit inspector dialog |
| `src/components/admin/inspectors/DeleteInspectorDialog.tsx` | Delete confirmation dialog |
| `src/lib/actions/inspector-actions.ts` | Server actions: createInspector, updateInspector, deleteInspector |
| `src/lib/queries/inspectors.ts` | Query: getInspectors() |

### Files to Modify

| File Path | Changes |
| --------- | ------- |
| `supabase/schema.sql` | Add `inspectors` table definition, add `has_lockbox` column to `jobs` |
| `src/types/database.ts` | Add `Inspector` type, add `has_lockbox` to `Job` type |
| `src/components/admin/jobs/NewJobForm.tsx` | Replace city/state/zip with single street field, add lockbox radio buttons |
| `src/lib/actions/job-actions.ts` | Update `createJob` to accept `has_lockbox`, remove city/state/zip from required fields |
| `src/components/admin/layout/AdminSidebar.tsx` | Add "Inspectors" nav item in Records section |

### Files to Delete (if any)

None.

---

## Design Decisions

### Key Decisions Made

1. **Separate `inspectors` table rather than reusing `team_members`**: The existing `team_members` table is tied to Supabase auth (its `id` references `auth.users`). Inspectors may not need app login credentials — they're just people who get dispatched. A separate table allows adding inspectors without creating auth accounts, and keeps the data model clean. The inspectors table will have: name, phone, email, is_active, and notes.

2. **Street name only for address**: Per Christian's request, the address input will be simplified to just the street name. The existing `address` field on the `jobs` table will continue to be used, but the `city`, `state`, and `zip_code` fields will no longer be required or shown on the form. They'll remain in the schema for backwards compatibility but default to empty strings.

3. **`has_lockbox` as a boolean on jobs**: Rather than a separate addresses table, the lockbox status is stored per-job since each job is at a specific property. This is the simplest approach — the radio on the form sets `true` (lockbox) or `false` (no lockbox), defaulting to `false`.

4. **Inspectors page mirrors the existing EmployeeTable pattern**: The CRUD UI follows the exact same pattern as the Settings > Team Members page (table + dialog for add/edit + delete confirmation) so the codebase stays consistent and the code is straightforward.

5. **Inspector icon**: Use `UserCheck` from Lucide (represents a verified/assigned person) for the sidebar nav item.

### Alternatives Considered

- **Reuse team_members for inspectors**: Rejected because team_members requires Supabase auth IDs. Inspectors are simpler — just a roster of field workers.
- **Separate addresses table**: Rejected — overengineered for the current need. The street + lockbox status lives on the job itself.
- **Lockbox as a dropdown instead of radio**: Rejected — radio buttons are more visible and faster to select for a binary choice.

### Open Questions (if any)

1. **Should existing jobs on the dispatch timeline show the inspector name instead of the team member name?** — For now, the dispatch board will continue using `team_members` for assignment. The inspectors list is a standalone roster. Linking inspectors to dispatch assignment can be a future enhancement.

---

## Step-by-Step Tasks

### Step 1: Create Database Migration

Add the `inspectors` table and `has_lockbox` column to `jobs`.

**Actions:**

- Create `supabase/migrations/add-inspectors-and-lockbox.sql` with:
  - `inspectors` table: `id` (uuid, auto-generated), `full_name` (text, required), `phone` (text), `email` (text), `is_active` (boolean, default true), `notes` (text), `created_at`, `updated_at`
  - RLS policies for authenticated access (select, insert, update, delete)
  - Auto-update trigger for `updated_at`
  - Add `has_lockbox` boolean column to `jobs` table, default `false`
- Update `supabase/schema.sql` to include the new table and column (for fresh installs)

**Files affected:**

- `supabase/migrations/add-inspectors-and-lockbox.sql` (new)
- `supabase/schema.sql`

---

### Step 2: Update TypeScript Types

Add Inspector type and has_lockbox to Job type.

**Actions:**

- Add `Inspector` table definition to `Database['public']['Tables']` in `src/types/database.ts`:
  - Row: `id: string`, `full_name: string`, `phone: string | null`, `email: string | null`, `is_active: boolean`, `notes: string | null`, `created_at: string`, `updated_at: string`
  - Insert: all optional except `full_name`
  - Update: all optional
- Add `has_lockbox: boolean` to `jobs.Row`
- Add `has_lockbox?: boolean` to `jobs.Insert` and `jobs.Update`
- Add convenience alias: `export type Inspector = Database['public']['Tables']['inspectors']['Row']`

**Files affected:**

- `src/types/database.ts`

---

### Step 3: Create Inspector Server Actions

Create CRUD server actions for inspectors.

**Actions:**

- Create `src/lib/actions/inspector-actions.ts` with:
  - `createInspector(data: { full_name: string, phone?: string, email?: string, notes?: string })` — inserts into `inspectors` table, revalidates `/admin/inspectors`
  - `updateInspector(id: string, data: { full_name?: string, phone?: string, email?: string, is_active?: boolean, notes?: string })` — updates inspector, revalidates `/admin/inspectors`
  - `deleteInspector(id: string)` — deletes inspector, revalidates `/admin/inspectors`
- Each action authenticates the user via `supabase.auth.getUser()`

**Files affected:**

- `src/lib/actions/inspector-actions.ts` (new)

---

### Step 4: Create Inspector Query

Create the data fetching query for the inspectors list.

**Actions:**

- Create `src/lib/queries/inspectors.ts` with:
  - `getInspectors(supabase)` — selects all from `inspectors` table, ordered by `full_name`
  - Returns `Inspector[]`

**Files affected:**

- `src/lib/queries/inspectors.ts` (new)

---

### Step 5: Create Inspector UI Components

Build the CRUD components following the existing EmployeeTable pattern.

**Actions:**

- Create `src/components/admin/inspectors/InspectorTable.tsx`:
  - Client component listing all inspectors in a table
  - Columns: Name, Phone, Email, Status (Active/Inactive), Actions (Edit/Delete)
  - "Add Inspector" button in the header
  - Empty state message when no inspectors exist
  - Follow exact same pattern as `EmployeeTable.tsx`

- Create `src/components/admin/inspectors/InspectorFormDialog.tsx`:
  - Dialog with fields: Full Name (required), Phone, Email, Notes
  - In edit mode: also show Active checkbox
  - Uses `createInspector` / `updateInspector` server actions
  - Follow same pattern as `EmployeeFormDialog.tsx` but simpler (no role select, no invite flow — just direct insert)

- Create `src/components/admin/inspectors/DeleteInspectorDialog.tsx`:
  - Confirmation dialog: "Are you sure you want to remove {name}?"
  - Uses `deleteInspector` server action
  - Follow same pattern as `DeleteEmployeeDialog.tsx`

**Files affected:**

- `src/components/admin/inspectors/InspectorTable.tsx` (new)
- `src/components/admin/inspectors/InspectorFormDialog.tsx` (new)
- `src/components/admin/inspectors/DeleteInspectorDialog.tsx` (new)

---

### Step 6: Create Inspectors Page

Create the server component page that renders the inspector list.

**Actions:**

- Create `src/app/admin/inspectors/page.tsx`:
  - Server component
  - Fetches inspectors using `getInspectors(supabase)`
  - Renders page heading "Inspectors" with subtitle "Manage your inspection team."
  - Renders `<InspectorTable inspectors={inspectors} />`
  - Follow same pattern as `settings/page.tsx`

**Files affected:**

- `src/app/admin/inspectors/page.tsx` (new)

---

### Step 7: Add Inspectors to Sidebar Navigation

Add the Inspectors link to the sidebar.

**Actions:**

- In `src/components/admin/layout/AdminSidebar.tsx`:
  - Import `UserCheck` from `lucide-react`
  - Add to `recordsNav` array: `{ label: 'Inspectors', href: '/admin/inspectors', icon: UserCheck }`
  - Place it after "Jobs" in the Records section

**Files affected:**

- `src/components/admin/layout/AdminSidebar.tsx`

---

### Step 8: Update NewJobForm — Simplify Address and Add Lockbox

Replace the full address fields with street-only input and add lockbox radio buttons.

**Actions:**

- In `src/components/admin/jobs/NewJobForm.tsx`:
  - Remove `city`, `state`, `zipCode` state variables
  - Remove the city/state/zip input row (the `grid grid-cols-3` section)
  - Keep the `address` field, rename label from "Street Address *" to "Street Name *"
  - Update placeholder to e.g. "123 Main St"
  - Add `hasLockbox` state variable (boolean, default `false`)
  - Add a radio button group below the address field:
    - Label: "Property Access"
    - Two options: "Lockbox" (value: true) and "No Lockbox" (value: false)
    - Styled as inline radio buttons
  - Update `handleSubmit` to pass `has_lockbox: hasLockbox` and remove city/state/zip (pass empty strings for schema compatibility)
  - Update the validation: only require `title`, `clientName`, and `address`

**Files affected:**

- `src/components/admin/jobs/NewJobForm.tsx`

---

### Step 9: Update createJob Server Action

Update the server action to handle the new field and simplified address.

**Actions:**

- In `src/lib/actions/job-actions.ts`:
  - Add `has_lockbox?: boolean` to the `createJob` data parameter
  - Include `has_lockbox: data.has_lockbox ?? false` in the insert
  - Keep `city`, `state`, `zip_code` in the insert but they'll receive empty defaults

**Files affected:**

- `src/lib/actions/job-actions.ts`

---

### Step 10: Verify Build

Run the TypeScript compiler and Next.js build to catch errors.

**Actions:**

- Run `npx tsc --noEmit` from the `disptchmama` directory
- Fix any type errors
- Run `npm run build` to verify production build succeeds
- Verify the inspectors page loads in dev (`npm run dev`)

**Files affected:**

- Various — driven by build errors

---

## Connections & Dependencies

### Files That Reference This Area

- `src/lib/queries/dispatch.ts` — References `address`, `city`, `zip_code` on jobs. No changes needed — the fields still exist in the DB, they'll just be empty for city/zip going forward.
- `src/components/admin/dispatch/UnscheduledJobChip.tsx` — Displays `job.address` and `job.city`. Will still work fine — city may just be empty.
- `src/components/admin/dispatch/JobBlock.tsx` — May display address. No changes needed.
- `src/components/admin/jobs/JobsTable.tsx` — Shows address column. Will still work.

### Updates Needed for Consistency

- `CLAUDE.md` should be updated to mention the Inspectors page as a new feature
- The `context/strategy.md` could note progress on the dispatch system

### Impact on Existing Workflows

- The dispatch board continues to use `team_members` for timeline assignment — no disruption
- Existing jobs with city/state/zip data will still display fine
- New jobs will only have street name populated (city/state/zip default to empty)

---

## Validation Checklist

- [ ] `inspectors` table created in Supabase with correct columns and RLS
- [ ] `has_lockbox` column added to `jobs` table
- [ ] TypeScript types updated — no type errors
- [ ] Inspectors page loads at `/admin/inspectors`
- [ ] Can add a new inspector (name, phone, email, notes)
- [ ] Can edit an existing inspector
- [ ] Can delete an inspector with confirmation
- [ ] Inspector list shows Active/Inactive status
- [ ] Sidebar shows "Inspectors" link in Records section
- [ ] New Job form shows only Street Name (no city/state/zip)
- [ ] New Job form has Lockbox / No Lockbox radio buttons
- [ ] Creating a job saves the street and lockbox status correctly
- [ ] `npm run build` succeeds with zero errors
- [ ] Existing dispatch board still works correctly

---

## Success Criteria

The implementation is complete when:

1. **Inspectors CRUD works end-to-end** — Can list, add, edit, and delete inspectors from the Inspectors page
2. **Address input is simplified** — New Job form only asks for street name, not city/state/zip
3. **Lockbox radio works** — Each new job captures lockbox vs no lockbox, and the value is stored in the database
4. **No regressions** — Dispatch board, jobs list, and settings page all continue working correctly

---

## Notes

- The `inspectors` table is currently independent from the dispatch assignment system (which uses `team_members`). A future enhancement could link inspectors to the dispatch timeline, replacing or augmenting the `team_members`-based assignment.
- The lockbox information could eventually be displayed on the dispatch timeline's JobBlock component so inspectors see it at a glance.
- If Christian wants to track more property details in the future (gate codes, access instructions, etc.), the `has_lockbox` pattern can be extended with additional fields on the `jobs` table.

---

## Implementation Notes

**Implemented:** 2026-04-06

### Summary

All 10 steps executed successfully. The inspectors CRUD system and simplified job form are fully built and the production build passes with zero errors.

Key deliverables:
- SQL migration (`add-inspectors-and-lockbox.sql`) creating `inspectors` table and adding `has_lockbox` to `jobs`
- Updated `schema.sql` with inspectors table, has_lockbox column, and updated_at trigger
- `Inspector` TypeScript type added to `database.ts`, `has_lockbox` added to Job types
- Full CRUD server actions for inspectors (`inspector-actions.ts`)
- Inspector query (`inspectors.ts`)
- Three inspector UI components: `InspectorTable`, `InspectorFormDialog`, `DeleteInspectorDialog`
- Inspectors page at `/admin/inspectors`
- Sidebar updated with "Inspectors" nav item (UserCheck icon) in Records section
- NewJobForm simplified: city/state/zip removed, "Street Name" label, lockbox radio buttons added
- `createJob` server action updated to accept `has_lockbox`

### Deviations from Plan

None.

### Issues Encountered

None.
