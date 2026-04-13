# AIOS v2 — DisptchMama Project Intelligence

> **Non-runtime. Non-production. Never imported by application code.**
> This directory exists solely to give Claude structured context about the DisptchMama project.

## Quick Orientation

DisptchMama is an internal scheduling and dispatch tool for **GSRetrofit.com**. It replaces manual phone-and-text coordination with a drag-and-drop dispatch timeline. Built with Next.js 16, React 19, Supabase, and @dnd-kit. Neo-brutalist design. Single primary user: Christian (scheduler). System owner: Mo.

---

## Start Here For New Sessions

Read these 7 files in order before doing anything else:

1. `00_overview/product.md` — what this project is
2. `05_active/current-focus.md` — metrics and operational context
3. `05_active/in-progress.md` — what's being worked on, current branch, next file
4. `02_architecture/system-design.md` — tech stack, layers, database, realtime
5. `03_workflows/core-flows.md` — how jobs, dispatch, and sync work
6. `04_rules/coding-rules.md` — architecture layers, naming, imports
7. `07_commands/COMMANDS.md` — available workflow commands

After these 7, read additional files based on the task type below.

---

## Extended Read Order (by task type)

### Always Read (covered above)
| # | File | Why |
|---|------|-----|
| 1 | `00_overview/product.md` | What this project is, who it's for, design language |
| 2 | `05_active/current-focus.md` | Metrics, bottlenecks, roadmap |
| 3 | `05_active/in-progress.md` | Current branch, migration phase, what's next |

### Read for Code Changes
| # | File | Why |
|---|------|-----|
| 4 | `04_rules/coding-rules.md` | Architecture layers, naming, import rules |
| 5 | `02_architecture/folder-structure.md` | Where everything lives |
| 6 | `02_architecture/system-design.md` | Tech stack, layers, database, realtime |

### Read for Feature Work
| # | File | Why |
|---|------|-----|
| 7 | `03_workflows/core-flows.md` | How jobs, dispatch, and sync actually work |
| 8 | `03_workflows/edge-cases.md` | What can go wrong and where gaps exist |
| 9 | `02_architecture/data-model.md` | Every table, column, trigger, and relationship |

### Read for UI Work
| # | File | Why |
|---|------|-----|
| 10 | `04_rules/ui-ux-rules.md` | Design system, colors, typography, interaction patterns |
| 11 | `01_context/terminology.md` | Domain terms so labels and copy are accurate |

### Read for Data / Query Work
| # | File | Why |
|---|------|-----|
| 12 | `04_rules/data-rules.md` | Supabase client selection, auth guards, validation |
| 13 | `02_architecture/data-model.md` | Schema reference |

### Read for Context / Planning
| # | File | Why |
|---|------|-----|
| 14 | `00_overview/vision.md` | Strategy, priorities, success criteria |
| 15 | `01_context/business.md` | Organization and operational context |
| 16 | `01_context/users.md` | Who uses the system and how |
| 17 | `05_active/current-focus.md` | Metrics, bottlenecks, roadmap |

### Read for Architecture Decisions
| # | File | Why |
|---|------|-----|
| 18 | `06_history/decisions.md` | Why things were built the way they were (ADRs) |
| 19 | `06_history/migrations.md` | What's been changed, what's planned |
| 20 | `02_architecture/integrations.md` | External services and future integration plans |

### Read for Commands
| # | File | Why |
|---|------|-----|
| 21 | `07_commands/COMMANDS.md` | Standardized Claude session commands |

---

## Complete File Index

```
aios/
├── README.md                              ← You are here
│
├── 00_overview/                           PRODUCT & STRATEGY
│   ├── product.md                         What DisptchMama is, features, design language
│   └── vision.md                          Q2 2026 priorities, success criteria, open questions
│
├── 01_context/                            BUSINESS & DOMAIN
│   ├── business.md                        GS Retrofit org overview, focus areas
│   ├── users.md                           Christian (scheduler), Mo (developer)
│   └── terminology.md                     Glossary: jobs, regions, statuses, DnD, lockbox, etc.
│
├── 02_architecture/                       TECHNICAL DESIGN
│   ├── system-design.md                   Tech stack, 4-layer architecture, auth, realtime
│   ├── folder-structure.md                Complete src/ tree with architecture rules
│   ├── data-model.md                      ER diagram, all tables/columns/triggers/RLS
│   └── integrations.md                    Supabase, Google Fonts, planned integrations
│
├── 03_workflows/                          BUSINESS LOGIC
│   ├── core-flows.md                      7 workflows: job creation → dispatch → sync
│   └── edge-cases.md                      Failure modes, race conditions, data gaps
│
├── 04_rules/                              DEVELOPMENT STANDARDS
│   ├── coding-rules.md                    TypeScript, naming, layers, imports, git
│   ├── ui-ux-rules.md                     Neo-brutalist design system, interaction patterns
│   └── data-rules.md                      Supabase clients, auth guards, query patterns
│
├── 05_active/                             CURRENT STATE
│   ├── current-focus.md                   Metrics, bottlenecks, automation roadmap
│   ├── in-progress.md                     Active workstreams, migration phases
│   └── known-issues.md                    Bugs, tech debt, structural problems (prioritized)
│
├── 06_history/                            ARCHIVE & DECISIONS
│   ├── README.md                          Archived plan index
│   ├── decisions.md                       Architecture Decision Records (ADR-001 through ADR-007)
│   └── migrations.md                      Completed and planned migrations log
│
└── 07_commands/                           COMMAND SYSTEM
    └── COMMANDS.md                        /deploy, /start-feature, /checkpoint, /review, etc.
```

## File Count: 22 files across 8 directories

---

## Maintenance Rules

1. **Update `05_active/in-progress.md`** whenever work starts, finishes, or gets blocked.
2. **Update `05_active/known-issues.md`** when bugs are found or fixed.
3. **Add to `06_history/decisions.md`** for any significant technical choice.
4. **Add to `06_history/migrations.md`** for any structural change to the codebase.
5. **Update `02_architecture/folder-structure.md`** when new directories or key files are added.
6. **Never let `aios/` get stale** — outdated context is worse than no context.

## Isolation Guarantee

This directory is **AI context only**:
- No file in `src/` imports from `aios/`
- No build tool references `aios/`
- No runtime code depends on `aios/`
- Safe to delete without affecting the application
- Should be included in `.gitignore` if context is sensitive (currently it is not)
