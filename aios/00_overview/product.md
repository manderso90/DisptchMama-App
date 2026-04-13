# Product Overview

## What Is DisptchMama?

DisptchMama is an internal scheduling and dispatch tool built for **GSRetrofit.com**. It is not a standalone product — it is a purpose-built operational system designed to streamline and scale the scheduling of retrofit inspection services.

## Core Value Proposition

Transform what is traditionally a time-intensive, manual coordination process into a streamlined, system-driven workflow. Reduce the scheduler's daily workload from 4-6 hours to under 2 hours.

## Primary User

**Christian Omari Robbins** — Scheduler / Dispatch Coordinator at GS Retrofit. She manages all incoming inspection requests, assigns inspectors, and handles constant schedule changes throughout the day.

## Product Principles

- **Speed** — Every interaction should be fast. Scheduling a job should take seconds, not minutes.
- **Simplicity** — The interface should be immediately understandable. No training manual needed.
- **Clarity** — The current state of all jobs, inspectors, and schedules should be visible at a glance.
- **Operational Efficiency** — Minimize clicks, reduce back-and-forth, automate what can be automated.

## Key Features (MVP)

### Dispatch Timeline
- Visual drag-and-drop scheduling grid (9AM-5PM)
- Regional grouping (Valley / Los Angeles)
- Real-time updates via Supabase subscriptions

### Job Management
- Create, edit, and track jobs through their lifecycle
- Two job types: Inspection and Work
- Status tracking: pending → confirmed → in_progress → completed
- Lockbox tracking for property access

### Inspector Management
- Maintain inspector roster with regional assignments
- View workload and availability
- Assign/reassign inspectors to jobs

### Unscheduled Queue
- Jobs waiting for assignment appear in a visible queue
- Drag from queue onto the timeline to schedule

## Design Language

**Neo-brutalist** theme with:
- **Fonts**: Space Grotesk (body) + Syne (headings)
- **Palette**: Yellow (#FFD600), Pink (#FF6B9D), Blue (#4ECDC4), with bold black borders
- **Style**: Thick borders, hard shadows, high contrast, playful but functional

## Naming Note

"DisptchMama" intentionally omits the letter "a" in "dispatch" and matches the registered domain.
