# Plan: Smooth Scroll & Scrollable Inspector List

**Created:** 2026-04-06
**Status:** Implemented
**Request:** Fix jerky keyboard scrolling on dispatch page and make inspector list scrollable so unscheduled jobs stay visible

---

## Overview

### What This Plan Accomplishes

Two UX improvements to the Dispatch Timeline page:

1. **Smooth scrolling** — When using keyboard (arrow keys, Page Up/Down) to scroll the page, the scroll will be smooth instead of jumping/requiring double-presses.
2. **Scrollable inspector list** — The inspector names panel will have a fixed max-height with its own scrollbar, so the Unscheduled Jobs queue always remains visible at the bottom of the viewport — no matter how many inspectors are on the list.

### Why This Matters

Christian handles 60-90 calls/day and needs the dispatch page to feel fast and responsive. Jerky scrolling slows her down. And as the inspector roster grows, the unscheduled jobs queue getting pushed off-screen means she has to scroll past all inspectors just to see pending work — that's wasted time and cognitive load.

---

## Current State

### Relevant Existing Structure

| File | Role |
|------|------|
| `src/app/globals.css` | Global styles — no scroll-behavior set |
| `src/app/admin/layout.tsx` | Admin layout — `<main className="flex-1 p-6 overflow-auto">` is the outer scroll container |
| `src/components/admin/dispatch/DispatchClient.tsx` | Dispatch page client component — renders `TimelineGrid` then `UnscheduledQueue` in a `space-y-4` div |
| `src/components/admin/dispatch/TimelineGrid.tsx` | Timeline grid — has `max-h-[calc(100vh-280px)] overflow-y-auto` on the inspector rows div |
| `src/components/admin/dispatch/UnscheduledQueue.tsx` | Unscheduled jobs panel — sits below the timeline grid |

> **Note:** All source files are located at `/Users/morrisanderson/Downloads/Seller's Compliance/disptchmama/src/`

### Gaps or Problems Being Addressed

1. **No `scroll-behavior: smooth`** — The page uses default scroll behavior, which is instant/jerky. The `<main>` element in the admin layout has `overflow-auto` and is the scrollable container, but no smooth scrolling is applied anywhere.

2. **Inspector list pushes unscheduled jobs off-screen** — The `TimelineGrid` component has `max-h-[calc(100vh-280px)]` on the inspector rows, but the entire `TimelineGrid` (including the sticky header) is rendered inline before `UnscheduledQueue`. When there are many inspectors, the overall height of the timeline grid grows, pushing the unscheduled queue below the viewport fold. The current `max-h` prevents the inspector rows from being infinite, but the 280px offset doesn't account for enough space to guarantee the unscheduled queue stays visible.

---

## Proposed Changes

### Summary of Changes

- Add `scroll-behavior: smooth` to the main scrollable containers
- Restructure the dispatch page layout so the timeline grid and unscheduled queue share the available viewport height using flexbox, ensuring the unscheduled queue is always pinned at the bottom

### New Files to Create

None.

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `src/app/globals.css` | Add `scroll-behavior: smooth` to the base layer |
| `src/components/admin/dispatch/DispatchClient.tsx` | Change the wrapper div from `space-y-4` to a flex column layout that fills available height, with the timeline grid taking remaining space and the unscheduled queue pinned at the bottom |
| `src/components/admin/dispatch/TimelineGrid.tsx` | Remove the hardcoded `max-h-[calc(100vh-280px)]` from the inspector rows div — the parent flex container will now control the height. Make the entire component fill its parent. |

### Files to Delete

None.

---

## Design Decisions

### Key Decisions Made

1. **Apply `scroll-behavior: smooth` globally in CSS** — This is the simplest, most reliable approach. It affects all scrollable containers (the main area, the inspector rows div, etc.) and ensures consistent smooth scrolling throughout the app. No JavaScript needed.

2. **Use flex layout to pin unscheduled queue** — Instead of a hardcoded `max-h` calc on the inspector rows, the dispatch page wrapper will become a flex column that fills the available viewport. The timeline grid uses `flex-1 min-h-0 overflow-hidden` (shrinks to fit), the inspector rows scroll within it, and the unscheduled queue sits at the bottom with a fixed height. This is more robust than magic-number calc values and adapts to any screen size.

3. **Keep inspector row scrolling inside the timeline grid** — The inspector rows will still have `overflow-y-auto` so they scroll independently. The difference is the max height is now controlled by flexbox (fill remaining space) rather than a hardcoded calc.

### Alternatives Considered

- **JavaScript `scrollTo({ behavior: 'smooth' })`** — Overkill. CSS `scroll-behavior: smooth` handles keyboard and programmatic scrolling natively.
- **Keeping the calc-based max-height and just adjusting the value** — Fragile. Breaks when header height changes, on different screen sizes, or when more inspectors are added. Flexbox is the right solution.
- **Making the entire page a fixed layout with no scrolling** — Too restrictive for the horizontal scroll needs of the timeline.

### Open Questions

None — both changes are straightforward CSS/layout fixes.

---

## Step-by-Step Tasks

### Step 1: Add smooth scroll behavior globally

Add `scroll-behavior: smooth` to all scrollable elements via `globals.css`.

**Actions:**

- In the `@layer base` block, add `scroll-behavior: smooth` to the `*` selector (which already has `@apply border-border outline-ring/50`)

**Specific change in `globals.css`:**

```css
/* Before */
@layer base {
  * {
    @apply border-border outline-ring/50;
  }

/* After */
@layer base {
  * {
    @apply border-border outline-ring/50;
    scroll-behavior: smooth;
  }
```

**Files affected:**

- `src/app/globals.css`

---

### Step 2: Restructure DispatchClient layout to pin unscheduled queue

Change the wrapper div in `DispatchClient.tsx` from a simple `space-y-4` vertical stack to a flex column that fills the available height, so the timeline grid gets remaining space and the unscheduled queue stays pinned at the bottom.

**Actions:**

- Change the outer wrapper div from `className="space-y-4"` to `className="flex flex-col h-[calc(100vh-140px)] gap-4"` — the 140px accounts for the admin header (~60px), page padding (48px = p-6 top+bottom), and page title area (~32px)
- Wrap the `TimelineGrid` in a div with `className="flex-1 min-h-0"` so it shrinks to fill available space and allows internal overflow scrolling
- The `UnscheduledQueue` stays as-is — it naturally takes its content height at the bottom

**Specific change in `DispatchClient.tsx` (line 181):**

```tsx
/* Before */
<div className="space-y-4">

/* After */
<div className="flex flex-col h-[calc(100vh-140px)] gap-4">
```

**And wrap TimelineGrid (around line 187):**

```tsx
/* Before */
<TimelineGrid regionGroups={regionGroups} onEditJob={handleEditJob} />
<UnscheduledQueue jobs={unscheduledJobs} />

/* After */
<div className="flex-1 min-h-0">
  <TimelineGrid regionGroups={regionGroups} onEditJob={handleEditJob} />
</div>
<UnscheduledQueue jobs={unscheduledJobs} />
```

**Files affected:**

- `src/components/admin/dispatch/DispatchClient.tsx`

---

### Step 3: Update TimelineGrid to fill parent and remove hardcoded max-height

Make the TimelineGrid fill its parent container and remove the hardcoded `max-h` calc on the inspector rows.

**Actions:**

- Add `h-full flex flex-col` to the outermost div of TimelineGrid (the one with `bg-white border...`)
- Add `flex-1 min-h-0` to the `overflow-x-auto` div so it fills remaining height
- Remove `max-h-[calc(100vh-280px)]` from the inspector rows scrollable div — replace with `flex-1 min-h-0 overflow-y-auto` so it fills remaining space inside the grid

**Specific changes in `TimelineGrid.tsx`:**

Line 139 — outer wrapper:
```tsx
/* Before */
<div className="bg-white border border-slate-200 rounded-lg overflow-hidden">

/* After */
<div className="bg-white border border-slate-200 rounded-lg overflow-hidden h-full flex flex-col">
```

Line 140 — overflow-x-auto div:
```tsx
/* Before */
<div className="overflow-x-auto">

/* After */
<div className="overflow-x-auto flex-1 min-h-0 flex flex-col">
```

Line 162 — inspector rows container:
```tsx
/* Before */
<div className="max-h-[calc(100vh-280px)] overflow-y-auto">

/* After */
<div className="flex-1 min-h-0 overflow-y-auto">
```

**Files affected:**

- `src/components/admin/dispatch/TimelineGrid.tsx`

---

### Step 4: Validate

**Actions:**

- Verify the dispatch page renders correctly with multiple inspectors
- Verify keyboard scrolling (arrow keys, Page Up/Down) is smooth on the inspector rows
- Verify the Unscheduled Jobs queue remains visible at the bottom of the viewport regardless of inspector count
- Verify horizontal scrolling of the timeline still works correctly
- Verify drag-and-drop still functions (DnD can be sensitive to layout changes)
- Verify the sticky header (time axis) and sticky inspector name column still work
- Test on different viewport heights to ensure flex layout adapts

**Files affected:**

- None (testing only)

---

## Connections & Dependencies

### Files That Reference This Area

- `src/app/admin/dispatch/page.tsx` — renders `DispatchClient`, wraps it in `space-y-4` (the outer page wrapper). This div does NOT need changes — the flex layout is inside `DispatchClient`.
- `src/app/admin/layout.tsx` — provides the `<main>` scroll container. No changes needed.

### Updates Needed for Consistency

- None. These are CSS/layout-only changes with no impact on documentation or commands.

### Impact on Existing Workflows

- Drag-and-drop should continue working since the DOM structure is preserved — we're only changing CSS layout properties. The `DndContext` wraps the same children in the same order.
- The sticky header and sticky left column in `TimelineGrid` should continue working since they use `position: sticky` which works within overflow containers.

---

## Validation Checklist

- [ ] Keyboard scrolling (arrows, Page Up/Down) is smooth — no double-press needed
- [ ] Inspector rows scroll independently within the timeline grid
- [ ] Unscheduled Jobs queue is always visible at the bottom, regardless of inspector count
- [ ] Timeline horizontal scroll still works
- [ ] Drag-and-drop scheduling still works (unscheduled → timeline, timeline → timeline, timeline → unscheduled)
- [ ] Sticky time header stays pinned at top of inspector rows
- [ ] Sticky inspector name column stays pinned on horizontal scroll
- [ ] Layout looks correct on different screen sizes

---

## Success Criteria

The implementation is complete when:

1. Scrolling the dispatch page with keyboard keys is smooth and responsive — one press, one smooth scroll
2. The Unscheduled Jobs queue is always visible at the bottom of the screen, even with 20+ inspectors
3. All existing drag-and-drop and layout functionality continues to work correctly

---

## Notes

- The 140px offset in the calc height (`100vh-140px`) is approximate. If the admin header or page title height changes, this value may need adjustment. A future improvement could use a ResizeObserver or CSS container queries to make this fully dynamic.
- `scroll-behavior: smooth` is applied globally, which will make all scrollable areas in the app smooth. If this causes issues in other parts of the app (e.g., programmatic scrolls that should be instant), individual elements can override with `scroll-behavior: auto`.

---

## Implementation Notes

**Implemented:** 2026-04-06

### Summary

Applied all three changes as specified: added global smooth scroll behavior, restructured DispatchClient to use flex layout with pinned unscheduled queue, and updated TimelineGrid to fill its parent via flexbox instead of a hardcoded max-height calc.

### Deviations from Plan

None

### Issues Encountered

None
