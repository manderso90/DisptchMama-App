# Data Model

Complete reference for every table, column, constraint, trigger, and relationship in DisptchMama.

## Entity Relationship Diagram

```
┌─────────────────┐       ┌──────────────────┐
│  team_members    │       │    inspectors     │
│─────────────────│       │──────────────────│
│ id (PK, FK→auth)│       │ id (PK, uuid)    │
│ email            │       │ full_name         │
│ full_name        │       │ phone             │
│ role             │       │ email             │
│ phone            │       │ is_active         │
│ is_active        │       │ region            │
│ avatar_url       │       │ notes             │
│ created_at       │       │ created_at        │
│ updated_at       │       │ updated_at        │
└────────┬────────┘       └────────┬──────────┘
         │ changed_by              │ assigned_to
         ▼                         ▼
┌──────────────────────────────────────────────┐
│                    jobs                       │
│──────────────────────────────────────────────│
│ id (PK, uuid)                                │
│ title, description                           │
│ client_name, client_phone, client_email      │
│ address, city, state, zip_code               │
│ status, dispatch_status                      │
│ assigned_to (FK → inspectors.id)             │
│ requested_date, requested_time_preference    │
│ scheduled_date, scheduled_time, scheduled_end│
│ estimated_duration_minutes                   │
│ has_lockbox                                  │
│ notes, schedule_notes                        │
│ last_reassigned_by, last_reassigned_at       │
│ created_at, updated_at                       │
└──────────────────┬───────────────────────────┘
                   │ job_id
                   ▼
┌──────────────────────────────────────────────┐
│            job_status_history                 │
│──────────────────────────────────────────────│
│ id (PK, uuid)                                │
│ job_id (FK → jobs.id, CASCADE)               │
│ changed_by (FK → team_members.id, SET NULL)  │
│ from_status, to_status                       │
│ note                                         │
│ created_at                                   │
└──────────────────────────────────────────────┘
```

## Table Details

### team_members

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | uuid | PK, FK → auth.users(id) ON DELETE CASCADE | Linked to Supabase Auth |
| email | text | NOT NULL | |
| full_name | text | nullable | |
| role | text | NOT NULL, CHECK in ('admin','dispatcher','field_tech') | Default: 'field_tech' |
| phone | text | nullable | |
| is_active | boolean | NOT NULL | Default: true |
| avatar_url | text | nullable | |
| created_at | timestamptz | NOT NULL | Default: now() |
| updated_at | timestamptz | NOT NULL | Auto-updated by trigger |

### inspectors

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | uuid | PK | Default: gen_random_uuid() |
| full_name | text | NOT NULL | |
| phone | text | nullable | |
| email | text | nullable | |
| is_active | boolean | NOT NULL | Default: true |
| region | text | NOT NULL | Default: 'Valley'. Values: 'Valley', 'Los Angeles' |
| notes | text | nullable | |
| created_at | timestamptz | NOT NULL | Default: now() |
| updated_at | timestamptz | NOT NULL | Auto-updated by trigger |

**Key distinction**: Inspectors are NOT auth users. They are external field workers managed by dispatchers. They have no login.

### jobs

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | uuid | PK | Default: gen_random_uuid() |
| title | text | NOT NULL | Default: ''. Values: 'Inspection' or 'Work' |
| description | text | nullable | |
| client_name | text | NOT NULL | Default: '' |
| client_phone | text | nullable | |
| client_email | text | nullable | |
| address | text | NOT NULL | Default: '' |
| city | text | NOT NULL | Default: '' |
| state | text | NOT NULL | Default: 'CA' |
| zip_code | text | NOT NULL | Default: '' |
| status | text | NOT NULL, CHECK | Default: 'pending'. See lifecycle below |
| assigned_to | uuid | FK → inspectors(id) ON DELETE SET NULL | nullable |
| requested_date | date | nullable | Client's preferred date |
| requested_time_preference | text | CHECK | 'morning','afternoon','anytime','flexible' |
| scheduled_date | date | nullable | Actual scheduled date |
| scheduled_time | time | nullable | Actual scheduled start |
| scheduled_end | time | nullable | **Auto-computed by trigger** |
| estimated_duration_minutes | integer | NOT NULL | Default: 60 |
| dispatch_status | text | NOT NULL, CHECK | Default: 'unscheduled'. See lifecycle below |
| has_lockbox | boolean | NOT NULL | Default: false |
| notes | text | nullable | General notes |
| schedule_notes | text | nullable | Scheduling-specific notes |
| last_reassigned_by | uuid | nullable | Who last moved this job |
| last_reassigned_at | timestamptz | nullable | When last reassigned |
| created_at | timestamptz | NOT NULL | Default: now() |
| updated_at | timestamptz | NOT NULL | Auto-updated by trigger |

### job_status_history

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | uuid | PK | Default: gen_random_uuid() |
| job_id | uuid | NOT NULL, FK → jobs(id) ON DELETE CASCADE | |
| changed_by | uuid | FK → team_members(id) ON DELETE SET NULL | nullable |
| from_status | text | nullable | null for first entry |
| to_status | text | NOT NULL | |
| note | text | nullable | e.g., "Scheduled: 2026-04-08 at 10:00" |
| created_at | timestamptz | NOT NULL | Default: now() |

**Immutable**: Update policy is `never` — history rows are append-only.

## Database Triggers

### compute_scheduled_end
**Event**: BEFORE INSERT OR UPDATE of `scheduled_time`, `estimated_duration_minutes` on `jobs`

Automatically sets `scheduled_end = scheduled_time + estimated_duration_minutes`. Sets null if either input is null.

### update_updated_at
**Event**: BEFORE UPDATE on `jobs`, `team_members`, `inspectors`

Sets `updated_at = now()` on every update.

## Row Level Security

All tables have RLS enabled. Current policies are permissive for authenticated users:
- SELECT: all authenticated users
- INSERT: all authenticated users
- UPDATE: all authenticated users (jobs, inspectors, team_members)
- DELETE: all authenticated users (jobs, inspectors, team_members)

**Future consideration**: Role-based policies (admin vs. dispatcher vs. field_tech) are not yet enforced at the database level.

## Realtime

Only the `jobs` table is in the `supabase_realtime` publication. Changes to inspectors or team_members do NOT trigger realtime events.

## Enum Values (Application-Level)

```typescript
type TeamMemberRole = 'admin' | 'dispatcher' | 'field_tech'
type JobStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
type DispatchStatus = 'unscheduled' | 'scheduled' | 'dispatched' | 'en_route'
type TimePreference = 'morning' | 'afternoon' | 'anytime' | 'flexible'
```

These are CHECK constraints in SQL and TypeScript union types in `src/types/database.ts`.
