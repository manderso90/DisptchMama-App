# Current Focus

> Migrated from `context/current-data.md` — all original content preserved.

## Key Metrics

| Metric | Current Value | Target | Notes |
|--------|--------------|--------|-------|
| Daily Incoming Calls | 60-90/day | Maintain or reduce via automation | High volume creates scheduling pressure |
| Call Hang-Up Rate | ~10-15% | <5% | Indicates friction or missed opportunities |
| Inspections Scheduled per Day | ~25-40/day (est.) | Increase capacity without added labor | Depends on staffing and availability |
| Avg Time to Schedule Appointment | 3-7 minutes | <2 minutes | Includes back-and-forth with client |
| Same-Day / Next-Day Scheduling Rate | High (core offering) | Maintain | Competitive advantage |
| Schedule Change Frequency | High | Reduce via better initial scheduling | Frequent reschedules disrupt workflow |
| Manual Scheduling Hours (Daily) | 4-6 hours (est.) | <2 hours | Core efficiency goal of DisptchMama |
| Inspector Utilization Rate | Variable | Optimize to 85-95% | Reduce gaps and idle time |
| Unassigned Jobs Queue | Fluctuates daily | Near zero | Goal is real-time assignment |
| Revenue per Inspection (Avg) | ~$99 base | Increase via add-ons | Tied to upsells (installations) |

## Current State

- Scheduling is highly manual, relying on phone calls, text coordination, and human decision-making.
- Frequent rescheduling is a major operational challenge (customers change times often).
- Dispatch requires constant adjustments throughout the day — the system must support real-time flexibility.
- No centralized intelligent system currently exists — decisions are made based on experience rather than structured optimization.
- Inspector workload visibility exists conceptually but is not yet fully system-driven or automated.
- The current process works, but it is labor-intensive and not scalable without adding more people.

## Recent Progress

- AIOS v2 structure created for AI context management
- Dispatch timeline with drag-and-drop scheduling is functional
- Inspector management CRUD is complete
- Job creation and status tracking is operational
- Real-time sync via Supabase subscriptions is working
- Neo-brutalist design theme applied consistently

## Key Problems / Bottlenecks

- Time wasted on reconfirming availability, reassigning inspectors, and adjusting schedules manually
- No predictive scheduling (everything is reactive)
- No automation layer to assist or recommend optimal scheduling decisions
- High cognitive load on scheduler (Christian)

## Data Sources

- Phone Calls / Call Logs (primary intake source)
- GSRetrofit Website Requests (inspection form submissions)
- Internal Scheduling System (current manual process)
- Seller's Compliance Platform (in development)
- Inspector Feedback / Field Updates
- Invoices & Completed Jobs Data

## Automation Roadmap

DisptchMama should evolve this file from static to dynamic. Future enhancements:

- **Auto-pull**: Daily call volume, jobs scheduled vs completed, inspector utilization
- **Integrate with**: Dispatch system database, CRM / intake forms, phone system (call analytics)
- **Generate**: Daily performance summary, weekly optimization insights

---

*Update regularly — stale data limits Claude's usefulness as an analytical partner.*
