# Coding Rules

## General Principles

1. **TypeScript everywhere** — No `any` types. Use strict mode. All files are `.ts` or `.tsx`.
2. **Zero errors policy** — `tsc --noEmit` must pass clean before any commit.
3. **Imports use path aliases** — Always `@/` prefix (maps to `./src/*`). Never relative paths that climb more than one level.
4. **No console.log in production code** — Use proper error boundaries and logging if needed.

## Architecture Rules

### Layer Separation
- **Queries** (`src/lib/queries/`) — Read-only. No mutations. No side effects. Return typed data.
- **Actions** (`src/lib/actions/`) — Mutations only. Must be marked `'use server'`. Call queries and services.
- **Services** (`src/services/`) — Orchestration. Plain TypeScript. No `'use server'`, no `'use client'`. Can be imported from any context.
- **Components** (`src/components/`) — UI only. Call actions for mutations, queries for reads.
- **Hooks** (`src/hooks/`) — Client-side React hooks. Must be in `src/hooks/`, not `src/lib/hooks/`.

### Import Direction
```
Components → Actions → Services → Queries → Supabase
     ↓          ↓          ↓          ↓
   Hooks      Utils      Utils      Utils
```

Services never import from components or actions. Queries never import from actions or services.

### AIOS Isolation
The `aios/` directory is **AI context only**. No source file in `src/` should ever import from `aios/`. This directory exists purely to give Claude context about the project.

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Files (components) | PascalCase | `JobBlock.tsx` |
| Files (non-components) | kebab-case | `dispatch-actions.ts` |
| Types / Interfaces | PascalCase | `JobStatus`, `Inspector` |
| Functions | camelCase | `createJob`, `getDispatchTimeline` |
| Constants | UPPER_SNAKE | `NEXT_STATUS`, `TERMINAL_STATUSES` |
| Database columns | snake_case | `scheduled_time`, `dispatch_status` |
| CSS classes | Tailwind utilities | No custom CSS classes unless absolutely necessary |

## Component Rules

1. **Server components by default** — Only add `'use client'` when you need interactivity, hooks, or browser APIs.
2. **Use @base-ui/react primitives** — For dialogs, selects, dropdowns. Not raw HTML.
3. **shadcn/ui components are copied, not imported as a package** — They live in `src/components/ui/`.
4. **Neo-brutalist design language** — Bold borders (border-2 or border-3), hard shadows, high contrast colors.

## Supabase Rules

1. **Always use the correct client** — `createClient()` from `server.ts` in server components/actions. `createBrowserClient()` from `client.ts` in client components.
2. **RLS is enabled on all tables** — Policies allow authenticated users. Don't bypass.
3. **Type all queries** — Use the generated types from `src/types/database.ts`.

## Git Rules

1. **Commit messages** — Imperative mood, concise. e.g., "Add dispatch timeline drag-and-drop"
2. **No secrets in commits** — `.env.local` is gitignored. Never commit API keys.
3. **Safety branches before refactors** — Always create a backup branch before structural changes.
