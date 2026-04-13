# History

Archive of implementation plans, architecture decisions, and migration records.

For structured records, see:
- `decisions.md` — Architecture Decision Records (ADR-001 through ADR-007)
- `migrations.md` — Completed and planned migrations with status tracking

## Archived Implementation Plans

The following plans were created during the initial build phase (2026-04-06). All are marked **Implemented**. Original files remain in `plans/` at the project root.

| Plan | Description | Outcome |
|------|-------------|---------|
| `2026-04-06-creative-coder-theme.md` | Neo-brutalist design theme | Space Grotesk + Syne, yellow/pink/teal palette, bold borders |
| `2026-04-06-inspector-dispatch-timeline.md` | Dispatch timeline with DnD | 9AM-5PM grid, regional grouping, @dnd-kit integration |
| `2026-04-06-inspectors-list-and-address-input.md` | Inspector CRUD + address forms | Full inspector management with region assignment |
| `2026-04-06-job-type-inspector-region-dispatch-updates.md` | Job type and dispatch status | Inspection/Work types, dispatch status lifecycle |
| `2026-04-06-smooth-scroll-and-scrollable-inspector-list.md` | Scroll behavior | Smooth scrolling, scrollable inspector list |
| `2026-04-06-sticky-header-scrollable-timeline.md` | Sticky timeline header | Fixed header during vertical scroll |

## AIOS Framework Artifacts

The following directories are remnants of the original AIOS v1 starter kit. They are not part of the application and are candidates for removal during the clean migration:

| Directory | Content | Status |
|-----------|---------|--------|
| `context/` | Original flat context files (4 files) | Migrated to `aios/` — safe to remove |
| `plans/` | 6 implementation plans (all implemented) | Referenced above — safe to archive or remove |
| `module-installs/` | AIOS frontend design module (examples + skill) | Not used by DisptchMama app code |
| `CLAUDE.md` | AIOS v1 session instructions | Superseded by `aios/README.md` |
