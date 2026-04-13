# Plan: Sticky Time Header, Scrollable Inspector Area, and 9–5 Time Range

**Created:** 2026-04-06
**Status:** Implemented
**Request:** Freeze the time header row when scrolling, constrain the inspector area height so unscheduled jobs stay visible, and change the time range from 7AM–6PM to 9AM–5PM.

---

## Overview

### What This Plan Accomplishes

Makes the dispatch timeline more usable by: (1) keeping the time header row frozen/sticky so you always know what time column you're looking at while scrolling through inspectors, (2) giving the inspector rows area a fixed max height with its own vertical scrollbar so the unscheduled jobs queue always stays visible at the bottom of the screen, and (3) adjusting the time grid from 7AM–6PM to 9AM–5PM to match the actual business hours.

### Why This Matters

When Christian has many inspectors, the timeline gets tall and pushes the unscheduled jobs queue off-screen. She has to scroll past all the inspectors just to see what's waiting to be scheduled. The time header also scrolls away, making it hard to tell which time slot you're dropping a job onto. These changes keep the dispatch page functional no matter how many inspectors are on the roster.

---

## Current State

### Relevant Existing Structure

- `src/components/admin/dispatch/TimelineGrid.tsx` — The timeline component. Has a single `overflow-x-auto` wrapper. The time header row and inspector rows all scroll together vertically with the page. Time grid starts at hour 7 (7AM) and runs 11 hours to 6PM.
- `src/components/admin/dispatch/DispatchClient.tsx` — Parent layout. Renders `<TimelineGrid>` then `<UnscheduledQueue>` inside `space-y-4`. No height constraints — everything stacks vertically and grows with content.

### Gaps or Problems Being Addressed

1. **Time header scrolls away** — When scrolling down through many inspector rows, the time labels disappear off the top of the visible area, so you can't tell which time slot you're looking at.
2. **Unscheduled queue gets pushed off-screen** — With many inspectors, the queue is below all the rows and requires scrolling past everything to reach.
3. **Time range too wide** — The 7AM–6PM range shows hours that are rarely used. GS Retrofit inspections run 9AM–5PM.

---

## Proposed Changes

### Summary of Changes

- **Change time constants** in `TimelineGrid.tsx`: `GRID_START_HOUR` from 7 → 9, hours array from 11 entries (7–17) → 8 entries (9–16), time slots loop from `h < 18` → `h < 17`
- **Make time header sticky** using `sticky top-0 z-20` so it stays visible during vertical scroll
- **Add a max-height and `overflow-y-auto`** to the inspector rows area inside TimelineGrid so it scrolls independently
- **No changes to DispatchClient.tsx** — the height constraint goes inside TimelineGrid itself, keeping the component self-contained

### New Files to Create

None.

### Files to Modify

| File Path | Changes |
| --------- | ------- |
| `src/components/admin/dispatch/TimelineGrid.tsx` | Change time constants (9AM–5PM), make time header sticky, add max-height + vertical scroll to inspector rows area |

### Files to Delete (if any)

None.

---

## Design Decisions

### Key Decisions Made

1. **Put the scroll container inside TimelineGrid, not in DispatchClient**: Keeps the change self-contained. TimelineGrid already owns the layout of header + rows, so it should own the scroll behavior too. DispatchClient just stacks TimelineGrid and UnscheduledQueue — that stays clean.

2. **Use `max-h-[calc(100vh-280px)]` for the inspector rows area**: This leaves room for the page header (~60px), dispatch header/date picker (~56px), time axis header (~40px), unscheduled queue (~100px), and spacing. The `calc` approach ensures it adapts to different screen sizes while always leaving the unscheduled queue visible. The outer container keeps `overflow-x-auto` for horizontal time scrolling, while the inner rows div gets `overflow-y-auto` for vertical inspector scrolling.

3. **9AM–5PM range (8 hours)**: Matches GS Retrofit's operating hours. The grid shows 9, 10, 11, 12, 1, 2, 3, 4 with time slots from 09:00 through 16:30 (the last 30-minute slot before 5PM). Jobs that start at 4:30 with a 60-min duration would visually extend to the edge. This is fine — 5PM is the last visible gridline.

4. **Sticky header needs z-index coordination**: The time header row gets `sticky top-0 z-20`. The inspector name column is already `sticky left-0 z-10`. The top-left corner cell ("Inspector" label) needs both `sticky top-0 left-0` and a higher `z-30` so it stays pinned in both directions.

### Alternatives Considered

- **Flex layout with `flex-1` and `overflow-hidden` on a full-page container**: Would require restructuring DispatchClient and potentially the admin layout. More invasive than needed.
- **Using `position: sticky` on the entire header within the page scroll**: Would only work if the page itself had a constrained height. Since the admin layout scrolls naturally, we need our own scroll container.

### Open Questions (if any)

None — all decisions are straightforward layout changes.

---

## Step-by-Step Tasks

### Step 1: Update Time Constants

Change the time grid from 7AM–6PM to 9AM–5PM.

**Actions:**

- Change `GRID_START_HOUR` from `7` to `9`
- Change `HOURS` array from `Array.from({ length: 11 }, (_, i) => i + 7)` to `Array.from({ length: 8 }, (_, i) => i + 9)` — this produces [9, 10, 11, 12, 13, 14, 15, 16]
- Change the time slots loop upper bound from `h < 18` to `h < 17` — slots from 09:00 to 16:30

**Files affected:**

- `src/components/admin/dispatch/TimelineGrid.tsx`

---

### Step 2: Restructure TimelineGrid Layout for Sticky Header + Scrollable Rows

Separate the time header from the inspector rows so the header can be sticky and the rows can scroll vertically.

**Current structure:**
```
<div overflow-x-auto>          ← single scroll container
  <div> time header </div>     ← scrolls away
  <div> inspector rows </div>  ← grows unbounded
</div>
```

**New structure:**
```
<div overflow-x-auto>                          ← horizontal scroll for the whole grid
  <div sticky top-0 z-20> time header </div>   ← stays pinned at top during vertical scroll
  <div max-h-[calc(100vh-280px)] overflow-y-auto>  ← vertical scroll for inspector rows only
    inspector rows...
  </div>
</div>
```

**Actions:**

- Keep the outer `<div className="overflow-x-auto">` — it handles horizontal scrolling for the wide time grid
- On the time header row (`<div className="flex border-b border-slate-200 bg-slate-50">`), add `sticky top-0 z-20` so it stays pinned when the inspector rows scroll vertically
- Update the top-left corner cell ("Inspector" label) to add `z-30` (instead of `z-10`) since it needs to stay above both sticky axes
- Wrap the inspector rows section in a new `<div>` with `max-h-[calc(100vh-280px)] overflow-y-auto` to create the vertical scroll container
- The `overflow-x-auto` on the outer container combined with `overflow-y-auto` on the inner rows container creates a grid that scrolls horizontally as a unit but scrolls vertically only in the rows area

**Detailed changes to the `TimelineGrid` component return JSX:**

```tsx
<div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
  <div className="overflow-x-auto">
    {/* Time axis header — sticky at top */}
    <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-20">
      <div className="w-40 shrink-0 px-3 py-2 border-r border-slate-200 sticky left-0 z-30 bg-slate-50">
        <span className="text-xs font-medium text-slate-500">Inspector</span>
      </div>
      <div className="flex-1 relative" style={{ minWidth: HOURS.length * HOUR_WIDTH_PX }}>
        {/* ...hour labels unchanged... */}
      </div>
    </div>

    {/* Inspector rows — scrollable with max height */}
    <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
      {inspectors.length > 0 ? (
        inspectors.map((inspector) => (
          <InspectorRow key={inspector.id} inspector={inspector} onEditJob={onEditJob} />
        ))
      ) : (
        <div className="py-12 text-center text-sm text-slate-400">
          No active inspectors found. Add inspectors on the Inspectors page.
        </div>
      )}
    </div>
  </div>
</div>
```

**Files affected:**

- `src/components/admin/dispatch/TimelineGrid.tsx`

---

### Step 3: Verify Build

Run TypeScript and Next.js build to catch any issues.

**Actions:**

- Run `npx tsc --noEmit`
- Run `npm run build`
- Visually confirm: time header shows 9AM–4PM labels, inspector rows scroll vertically, unscheduled queue stays visible below

**Files affected:**

- None — verification only

---

## Connections & Dependencies

### Files That Reference This Area

- `DispatchClient.tsx` — Renders `<TimelineGrid>`. No changes needed — the layout change is internal to TimelineGrid.
- `JobBlock.tsx` — Uses `gridStartHour` and `hourWidthPx` props passed from `InspectorRow`. The `GRID_START_HOUR` change will automatically flow through since `InspectorRow` passes the module-level constant. Jobs scheduled before 9AM would render off-screen to the left (negative offset, clipped by overflow-hidden) — this is fine since inspections don't start before 9AM.
- `UnscheduledQueue.tsx` — No changes needed. It will naturally stay visible below the now-constrained TimelineGrid.

### Updates Needed for Consistency

- None — this is a purely visual/layout change with no data model or naming impacts.

### Impact on Existing Workflows

- Drag-and-drop continues to work identically — the DnD context wraps both TimelineGrid and UnscheduledQueue in DispatchClient, so the scroll container change doesn't affect drop targets.
- The `@dnd-kit` library handles scrolling during drag automatically.

---

## Validation Checklist

- [ ] Time header shows 9 AM through 4 PM (8 hour labels)
- [ ] Time slots run from 09:00 to 16:30
- [ ] Time header stays visible (sticky) when scrolling down through inspector rows
- [ ] Inspector rows area scrolls vertically when there are many inspectors
- [ ] Unscheduled jobs queue is always visible at the bottom without scrolling the page
- [ ] Horizontal scrolling still works for the full time range
- [ ] Inspector name column stays sticky on horizontal scroll
- [ ] Drag-and-drop from unscheduled queue to timeline still works
- [ ] Drag-and-drop between inspector rows still works
- [ ] Drag-and-drop back to unscheduled queue still works
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` succeeds

---

## Success Criteria

The implementation is complete when:

1. **The time header row stays frozen** at the top of the timeline while scrolling through inspectors
2. **The inspector rows have a bounded height** with their own vertical scrollbar, keeping the unscheduled queue always visible
3. **The time range is 9AM–5PM** matching GS Retrofit business hours
4. **All drag-and-drop functionality continues to work** across the new scroll boundaries

---

## Notes

- The `max-h-[calc(100vh-280px)]` value (280px) accounts for: page header + nav (~60px), dispatch header/date picker (~56px), page title/subtitle (~48px), time axis header row (~36px), unscheduled queue (~80px). If the admin layout chrome changes, this value may need tuning. It's a reasonable default that works well on standard laptop screens (768px+ height).
- If inspectors are few enough to not fill the max height, no scrollbar appears — the area simply sizes to content. The constraint only kicks in when there are enough rows to overflow.
- The corner cell ("Inspector" label) needs `z-30` because it sits at the intersection of two sticky axes (top and left). Without a higher z-index, it would be overlapped by other sticky elements.

---

## Implementation Notes

**Implemented:** 2026-04-06

### Summary

All three changes applied to `TimelineGrid.tsx` in a single file edit:
- Changed time constants from 7AM–6PM to 9AM–5PM (GRID_START_HOUR: 7→9, HOURS: 11→8 entries, loop bound: 18→17)
- Made time header row sticky (`sticky top-0 z-20`) with corner cell at `z-30`
- Wrapped inspector rows in a `max-h-[calc(100vh-280px)] overflow-y-auto` container for independent vertical scrolling

### Deviations from Plan

None — all steps executed as specified.

### Issues Encountered

None — TypeScript compiled cleanly and `npm run build` succeeded with zero errors.
