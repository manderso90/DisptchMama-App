# Core Workflows

## 1. Job Creation Flow

```
Customer Request (phone/web)
  ↓
Christian opens New Job form (/admin/jobs/new)
  ↓
Fills: client info, address, job type, time preference
  ↓
createJob() server action
  ↓
Job created with status: pending, dispatch_status: unscheduled
  ↓
Appears in Unscheduled Queue on Dispatch page
```

## 2. Dispatch Scheduling Flow

```
Job sits in Unscheduled Queue
  ↓
Christian drags job onto Timeline Grid
  ↓
scheduleFromDispatch() called with:
  - job_id
  - inspector_id (from timeline row)
  - scheduled_date
  - scheduled_time (from drop position on 9AM-5PM grid)
  ↓
Job updated:
  - assigned_to → inspector
  - scheduled_date, scheduled_time set
  - dispatch_status → 'scheduled'
  - status → 'confirmed' (if auto-confirm conditions met)
  ↓
scheduled_end auto-computed by database trigger
  ↓
Realtime subscription pushes update → Timeline re-renders
```

## 3. Job Lifecycle (Status Transitions)

```
pending ──→ confirmed ──→ in_progress ──→ completed
  │
  ├──→ cancelled
  │
  └──→ on_hold ──→ pending (re-activate)
```

### Status Definitions

| Status | Meaning |
|--------|---------|
| `pending` | Job created, not yet confirmed or scheduled |
| `confirmed` | Job scheduled and confirmed with client/inspector |
| `in_progress` | Inspector is actively on-site |
| `completed` | Inspection/work finished |
| `cancelled` | Job cancelled (by client or internally) |
| `on_hold` | Temporarily paused (awaiting info, access issue, etc.) |

## 4. Dispatch Status Lifecycle

```
unscheduled ──→ scheduled ──→ dispatched ──→ en_route
```

| Dispatch Status | Meaning |
|-----------------|---------|
| `unscheduled` | No date/time/inspector assigned. Sits in queue. |
| `scheduled` | Assigned to inspector with date + time. On timeline. |
| `dispatched` | Confirmed and ready for the day. Inspector notified. |
| `en_route` | Inspector is traveling to the job site. |

## 5. Schedule Adjustment Flow

```
Christian drags job to new time slot on Timeline
  ↓
updateJobTime() called with new scheduled_time
  ↓
scheduled_end re-computed by trigger
  ↓
Realtime pushes update → Timeline re-renders
```

```
Christian drags job to different inspector's row
  ↓
scheduleFromDispatch() called with new inspector_id
  ↓
assigned_to updated, last_reassigned_by/at recorded
  ↓
Realtime pushes update → Timeline re-renders
```

## 6. Auto-Confirm Logic

When a job is scheduled via dispatch (drag-and-drop), the system checks:
- Does the job have an `assigned_to` inspector?
- Does the job have a `scheduled_date` and `scheduled_time`?
- Is the current status an "early" status (pending)?

If all conditions are met, the status is automatically advanced to `confirmed`.

## 7. Real-Time Sync Flow

```
Any job mutation (create, update, delete)
  ↓
Supabase postgres_changes fires
  ↓
use-schedule-sync hook receives event
  ↓
Client state updated (React setState)
  ↓
Timeline/Queue components re-render
```

This means all users viewing the dispatch page see changes in real-time without refreshing.
