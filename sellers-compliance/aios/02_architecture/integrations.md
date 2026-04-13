# Integrations

External services, APIs, and systems that DisptchMama connects to or may integrate with in the future.

## Current Integrations

### Supabase
**Status**: Active — core dependency

| Capability | Usage |
|-----------|-------|
| **Database** | PostgreSQL via Supabase client. 4 tables. |
| **Auth** | Email/password + OAuth. SSR cookie management. |
| **Realtime** | postgres_changes subscription on `jobs` table. |
| **RLS** | Row Level Security on all tables. |

**Environment Variables**:
- `NEXT_PUBLIC_SUPABASE_URL` — Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Anonymous/public key

**Client factories**: `src/lib/supabase/server.ts` (server) and `src/lib/supabase/client.ts` (browser).

### Google Fonts
**Status**: Active — design dependency

Fonts loaded via `<link>` tags in `src/app/layout.tsx`:
- **Space Grotesk** (weights: 300, 400, 500, 600) — body text
- **Syne** (weights: 400-800) — headings

**Known issue**: `next/font` build errors in sandboxed environments due to network restrictions. Does not affect production.

### Vercel (planned)
**Status**: Not yet deployed

Intended deployment target. Next.js App Router is fully compatible. No Vercel-specific config exists yet.

## Planned Integrations

### Seller's Compliance Platform
**Priority**: Medium
**Purpose**: Share inspection data between dispatch and compliance tracking.
**Open question**: Should this be a shared Supabase project, API integration, or separate databases with sync?

### Phone System / Call Analytics
**Priority**: Medium-High
**Purpose**: Auto-create jobs from incoming call data. Track call-to-scheduled conversion.
**Data needed**: Caller info, call duration, call outcome.

### CRM / Customer Intake
**Priority**: Medium
**Purpose**: Pull customer requests from web forms directly into the unscheduled queue.
**Current state**: Jobs are created manually through the admin UI.

### SMS / Notification Service
**Priority**: High (post-MVP)
**Purpose**: Send appointment confirmations, reminders, and schedule changes to clients and inspectors.
**Candidates**: Twilio, Resend (already used in Seller's Compliance).

### Geocoding / Route Optimization
**Priority**: Low (post-MVP)
**Purpose**: Optimize inspector routes based on job addresses. Reduce travel time between appointments.
**Note**: Seller's Compliance already has `geocodeProperty` in `@/lib/utils/geocoding` — potential to share.

## Integration Rules

1. **All external API keys go in `.env.local`** — never committed to git.
2. **Server-side only** — API calls to external services happen in server actions or API routes, never in client components.
3. **Graceful degradation** — If an integration is down, the core dispatch workflow must still function.
4. **No tight coupling** — Integrations should be behind service modules so they can be swapped without changing business logic.
