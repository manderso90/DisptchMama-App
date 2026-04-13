# Terminology

A glossary of domain-specific terms used throughout DisptchMama and GS Retrofit operations.

## Business Terms

| Term | Definition |
|------|-----------|
| **Retrofit Inspection** | A required inspection of a property's soft-story structure to assess earthquake safety compliance. This is the core service GS Retrofit provides. |
| **Inspector** | A field technician who performs on-site retrofit inspections. Inspectors are assigned to regions and have daily schedules. |
| **Dispatcher / Scheduler** | The person (Christian) who coordinates all job assignments, inspector schedules, and customer communications. |
| **Region** | A geographic zone used to group inspectors. Current regions: **Valley** and **Los Angeles**. |
| **Lockbox** | A secure key container at a property that allows inspector access without the property owner being present. Jobs with `has_lockbox: true` do not require client scheduling coordination for access. |

## Job & Scheduling Terms

| Term | Definition |
|------|-----------|
| **Job** | A single unit of work to be scheduled and dispatched. Has a type (Inspection or Work), a status, and a dispatch status. |
| **Job Type** | Either `Inspection` (standard retrofit inspection) or `Work` (retrofit installation or repair work). |
| **Job Status** | The lifecycle state of a job: `pending` → `confirmed` → `in_progress` → `completed`. Also: `cancelled`, `on_hold`. |
| **Dispatch Status** | The scheduling state of a job: `unscheduled` → `scheduled` → `dispatched` → `en_route`. |
| **Unscheduled Queue** | The list of jobs that have been created but not yet placed on the dispatch timeline. |
| **Timeline** | The visual dispatch grid showing a day's schedule from 9AM-5PM, organized by inspector and region. |
| **Time Preference** | A client's requested time window: `morning`, `afternoon`, `anytime`, or `flexible`. |

## Technical Terms

| Term | Definition |
|------|-----------|
| **Server Action** | A Next.js server-side function (marked with `'use server'`) that handles mutations (create, update, delete). Lives in `src/lib/actions/`. |
| **Query** | A read-only function that fetches data from Supabase. Lives in `src/lib/queries/`. |
| **Service** | An orchestration module that coordinates multi-step business logic. Plain TypeScript, no framework directives. Lives in `src/services/` (planned). |
| **Realtime Subscription** | A Supabase postgres_changes listener that pushes live database changes to the client. Used for the dispatch timeline. |
| **DnD** | Drag-and-drop, powered by `@dnd-kit`. Used for moving jobs onto and within the dispatch timeline. |
| **Neo-Brutalist** | The design language used in DisptchMama — bold borders, hard shadows, high contrast, playful color palette. |
