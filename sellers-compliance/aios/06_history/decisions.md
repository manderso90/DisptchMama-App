# Architecture Decisions

Short, structured record of significant technical choices. Each entry ages well by capturing the *why* and the *tradeoff*, not lengthy context.

---

### ADR-001: Neo-Brutalist Design Language
**Decision**: Space Grotesk + Syne fonts, bold borders, hard shadows, yellow/pink/teal palette.
**Why**: Dispatcher UI needs to be scannable under pressure — bold and fun beats sterile.
**Tradeoff**: May need refinement for data-dense views (tables, reports).
**Date**: 2026-04-06

### ADR-002: @dnd-kit for Drag-and-Drop
**Decision**: Use `@dnd-kit/core` + `@dnd-kit/utilities` for the dispatch timeline.
**Why**: Lightweight, accessible, React-native. react-beautiful-dnd is deprecated. HTML5 DnD lacks DragOverlay.
**Tradeoff**: Only core package — no sortable helpers. Absolute positioning means custom layout math.
**Date**: 2026-04-06

### ADR-003: Supabase Realtime for Live Sync
**Decision**: Subscribe to `postgres_changes` on the `jobs` table; trigger `router.refresh()` on change.
**Why**: Zero infrastructure. Built into Supabase. Works for 1-3 concurrent users.
**Tradeoff**: Full page refresh on every event. Won't scale past ~5 concurrent dispatchers without targeted state updates.
**Date**: 2026-04-06

### ADR-004: Regional Inspector Grouping
**Decision**: Store `region` as a string on `inspectors` (not a separate table). Group by region on the timeline.
**Why**: Only two regions (Valley, Los Angeles). A join table adds complexity for no value at this scale.
**Tradeoff**: No referential integrity on region values. Must add new regions as strings.
**Date**: 2026-04-06

### ADR-005: Four-Layer Architecture
**Decision**: Queries (read-only) → Actions (server mutations) → Services (orchestration, plain TS) → Components (UI).
**Why**: Prevents logic duplication. Services are testable without server context. Proven in Seller's Compliance.
**Tradeoff**: More files. Requires discipline — business logic must go in services, not actions.
**Date**: 2026-04-08

### ADR-006: Clean-in-Place Migration
**Decision**: Refactor DisptchMama in-place with a safety branch, not create a new project.
**Why**: Codebase is small (57 files), compiles cleanly, mostly correct structure. New project adds unnecessary complexity.
**Tradeoff**: No opportunity to rethink project scaffolding from scratch. Must validate incrementally with `tsc --noEmit`.
**Date**: 2026-04-08

### ADR-007: AIOS v2 Structured Context
**Decision**: Replace flat `context/` with numbered `aios/` directory (8 subdirectories, 22 files).
**Why**: Claude sessions need richer, organized context — architecture, workflows, rules, active state, history.
**Tradeoff**: More files to maintain. Risk of staleness if not updated alongside code changes.
**Date**: 2026-04-08
