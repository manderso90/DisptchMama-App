# Data Rules

Standards for how data flows through DisptchMama — from Supabase to the UI and back.

## Supabase Client Selection

| Context | Client | Import |
|---------|--------|--------|
| Server component | `createClient()` | `@/lib/supabase/server` |
| Server action (`'use server'`) | `createClient()` | `@/lib/supabase/server` |
| API route handler | `createClient()` | `@/lib/supabase/server` |
| Client component | `createClient()` | `@/lib/supabase/client` |

**Never** use the server client in a `'use client'` file. **Never** use the browser client in a server context. TypeScript won't catch this — it's a runtime auth failure.

## Auth Guard Pattern

Every server action that mutates data must start with:
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) throw new Error('Unauthorized')
```

This is non-negotiable. No mutation without an authenticated user.

## Query Patterns

### Read-only queries (`src/lib/queries/`)
- Always server-side (called from server components or actions)
- Return typed data matching `src/types/database.ts`
- Never mutate. Never call `.insert()`, `.update()`, or `.delete()`.
- Select only needed columns when performance matters

### Naming convention
- Getter functions: `getJobsList()`, `getInspectors()`, `getDispatchTimeline()`
- Always return the data directly — don't wrap in `{ data, error }` patterns. Throw on error.

## Mutation Patterns

### Server actions (`src/lib/actions/`)
- Always marked `'use server'`
- Always authenticate first (see auth guard above)
- Always `revalidatePath()` affected routes after mutation
- Standard affected paths: `'/admin/jobs'`, `'/admin/dispatch'`

### Revalidation targets
| Action | Revalidate |
|--------|-----------|
| Create/update/delete job | `/admin/jobs`, `/admin/dispatch` |
| Schedule/reschedule job | `/admin/dispatch`, `/admin/jobs` |
| Create/update/delete inspector | `/admin/inspectors`, `/admin/dispatch` |
| Update team member | `/admin/settings` |

## Type Safety

### Source of truth: `src/types/database.ts`
All database types are defined here, mirroring `supabase/schema.sql`. This file defines:
- `Database` — full Supabase schema type
- `Row`, `Insert`, `Update` variants for each table
- Convenience aliases: `Job`, `Inspector`, `TeamMember`, `JobStatusHistory`

### Rules
1. **Never use `any`** for database data. Always type against the schema.
2. **Use `Insert` types** for `.insert()` calls, **`Update` types** for `.update()` calls.
3. **Cast sparingly** — if you need `as`, you probably have a schema mismatch.
4. **`job_status_history.Update` is `never`** — history rows are immutable.

## Realtime Data

### What's subscribed
Only the `jobs` table is in the realtime publication.

### How sync works
`use-schedule-sync` hook listens for `postgres_changes` on `jobs`. When scheduling-relevant fields change, it calls `router.refresh()` to refetch server data.

### Watched fields
```typescript
const SCHEDULING_FIELDS = [
  'assigned_to', 'scheduled_date', 'scheduled_time',
  'scheduled_end', 'estimated_duration_minutes',
  'dispatch_status', 'status',
]
```

### What's NOT real-time
- Inspector changes (adding/removing inspectors)
- Team member changes
- Job status history

These require a manual page refresh or navigation.

## Data Validation

### Where validation happens
| Layer | Responsibility |
|-------|---------------|
| Database | CHECK constraints (status values, role values). NOT NULL. Foreign keys. |
| Server actions | Business logic validation (auth, field presence, transition rules) |
| Client | Form validation (required fields, format). Advisory only — server is authoritative. |

### Current gaps
- No minimum duration validation (0-minute jobs are possible)
- No address format validation
- No phone/email format validation
- Status transitions are not enforced (can skip states)
