# Folder Structure

## Current Project Layout

```
DisptchMama/
├── aios/                          # AI context layer (this directory)
│   ├── 00_overview/               # Product vision and strategy
│   ├── 01_context/                # Business, users, terminology
│   ├── 02_architecture/           # System design, folder structure
│   ├── 03_workflows/              # Core flows and lifecycle maps
│   ├── 04_rules/                  # Coding rules and conventions
│   ├── 05_active/                 # Current focus, sprint state
│   ├── 06_history/                # Archived plans and decisions
│   └── 07_commands/               # Standardized Claude commands
│
├── src/
│   ├── app/                       # Next.js App Router pages
│   │   ├── layout.tsx             # Root layout (fonts, theme)
│   │   ├── page.tsx               # Landing / redirect
│   │   ├── login/
│   │   │   └── page.tsx           # Login page
│   │   ├── admin/
│   │   │   ├── layout.tsx         # Admin shell (sidebar + header)
│   │   │   ├── page.tsx           # Dashboard
│   │   │   ├── dispatch/
│   │   │   │   └── page.tsx       # Dispatch timeline view
│   │   │   ├── jobs/
│   │   │   │   ├── page.tsx       # Jobs list
│   │   │   │   └── new/
│   │   │   │       └── page.tsx   # New job form
│   │   │   ├── inspectors/
│   │   │   │   └── page.tsx       # Inspector management
│   │   │   └── settings/
│   │   │       └── page.tsx       # Team settings
│   │   └── api/
│   │       └── auth/
│   │           ├── callback/
│   │           │   └── route.ts   # OAuth callback
│   │           └── logout/
│   │               └── route.ts   # Logout handler
│   │
│   ├── components/
│   │   ├── admin/
│   │   │   ├── dispatch/          # Dispatch timeline components
│   │   │   │   ├── DispatchClient.tsx     # Main DnD orchestrator
│   │   │   │   ├── DispatchCalendar.tsx   # Date picker
│   │   │   │   ├── DispatchHeader.tsx     # Top bar
│   │   │   │   ├── TimelineGrid.tsx       # 9AM-5PM grid
│   │   │   │   ├── JobBlock.tsx           # Draggable job card
│   │   │   │   ├── UnscheduledQueue.tsx   # Job queue panel
│   │   │   │   └── UnscheduledJobChip.tsx # Queue item
│   │   │   ├── inspectors/        # Inspector CRUD components
│   │   │   │   ├── InspectorTable.tsx
│   │   │   │   ├── InspectorFormDialog.tsx
│   │   │   │   └── DeleteInspectorDialog.tsx
│   │   │   ├── jobs/              # Job management components
│   │   │   │   ├── JobsTable.tsx
│   │   │   │   └── NewJobForm.tsx
│   │   │   ├── layout/            # Admin shell
│   │   │   │   ├── AdminHeader.tsx
│   │   │   │   └── AdminSidebar.tsx
│   │   │   ├── settings/          # Team settings components
│   │   │   │   ├── EmployeeTable.tsx
│   │   │   │   ├── EmployeeFormDialog.tsx
│   │   │   │   └── DeleteEmployeeDialog.tsx
│   │   │   └── shared/            # Shared admin components
│   │   │       ├── QuickScheduleActions.tsx
│   │   │       ├── ScheduleToast.tsx
│   │   │       └── UnassignedBadge.tsx
│   │   └── ui/                    # shadcn/ui primitives
│   │       ├── avatar.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── select.tsx
│   │       └── separator.tsx
│   │
│   ├── lib/
│   │   ├── actions/               # Server actions (mutations)
│   │   │   ├── job-actions.ts
│   │   │   ├── dispatch-actions.ts
│   │   │   ├── inspector-actions.ts
│   │   │   ├── employee-actions.ts
│   │   │   └── schedule-mutations.ts
│   │   ├── queries/               # Read-only data fetching
│   │   │   ├── dispatch.ts
│   │   │   ├── jobs.ts
│   │   │   └── inspectors.ts
│   │   ├── supabase/              # Supabase client factories
│   │   │   ├── client.ts
│   │   │   └── server.ts
│   │   ├── hooks/                 # React hooks (to be moved to src/hooks/)
│   │   │   └── use-schedule-sync.ts
│   │   └── utils.ts               # Utility functions (cn, etc.)
│   │
│   ├── services/                  # Orchestration layer (planned)
│   │
│   ├── types/
│   │   └── database.ts            # Supabase type definitions
│   │
│   └── proxy.ts                   # Auth middleware
│
├── supabase/
│   └── schema.sql                 # Database schema definition
│
├── public/                        # Static assets
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── tailwind.config.ts
└── .env.local                     # Environment variables (gitignored)
```

## Architecture Rules

- **No imports from `/aios` into `/src`** — The aios directory is AI context only, never referenced by application code.
- **Queries are read-only** — No mutations in `src/lib/queries/`.
- **Actions use `'use server'`** — All mutations go through server actions.
- **Services are plain TypeScript** — No `'use server'`, no `'use client'`. Importable from either context.
- **UI components use `@base-ui/react` primitives** — Not raw HTML where primitives exist.
- **Hooks belong in `src/hooks/`** — Not `src/lib/hooks/` (migration pending).
