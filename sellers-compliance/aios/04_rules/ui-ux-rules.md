# UI/UX Rules

Design system, interaction patterns, and visual standards for DisptchMama.

## Design Language: Neo-Brutalist

DisptchMama uses a neo-brutalist design inspired by the Creative Coder theme. The aesthetic is bold, playful, and high-contrast — designed for fast scanning during high-pressure scheduling.

### Color Palette

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Primary | Yellow | `#FFD600` | Buttons, highlights, active states |
| Accent 1 | Pink | `#FF6B9D` | Badges, alerts, important indicators |
| Accent 2 | Teal/Blue | `#4ECDC4` | Links, secondary actions |
| Background | Off-white | `#FFFDF7` | Page background |
| Surface | White | `#FFFFFF` | Cards, panels |
| Text | Black | `#1A1A1A` | Primary text |
| Muted | Gray | `#6B7280` | Secondary text, disabled states |
| Success | Green | `#22C55E` | Completed, confirmed |
| Danger | Red | `#EF4444` | Delete, cancelled, errors |

### Typography

| Element | Font | Weight | Usage |
|---------|------|--------|-------|
| Headings | Syne | 600-800 | Page titles, section headers |
| Body | Space Grotesk | 400-500 | All body text, labels, values |
| Mono/Data | Space Grotesk | 300 | Time values, IDs (if shown) |

Loaded via Google Fonts in `src/app/layout.tsx`. Not using `next/font` (external Google Fonts link tags).

### Visual Characteristics

- **Borders**: `border-2` or `border-3` with `border-black` or `border-gray-900`. Never subtle 1px borders.
- **Shadows**: Hard drop shadows (`shadow-[4px_4px_0px_#000]`). No soft/blurred shadows.
- **Border radius**: `rounded-lg` or `rounded-xl`. Never perfectly square, never fully round (except avatars).
- **Hover states**: Translate or shadow shift. e.g., `hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#000]`.
- **Contrast**: All text must meet WCAG AA contrast ratios against its background.

## Interaction Patterns

### Drag & Drop (Dispatch Timeline)
- **Grab cursor** on draggable items (`cursor-grab`, `cursor-grabbing` while dragging)
- **Drop zone highlight**: Yellow overlay (`bg-[#FDE047]/40`) when dragging over a valid time slot
- **Drag overlay**: Ghost of the dragged job follows the cursor via `@dnd-kit` DragOverlay
- **Drop feedback**: Toast notification confirming the schedule action

### Timeline Grid
- **Grid**: 9AM-5PM horizontal, inspectors vertical, grouped by region
- **Time slots**: 30-minute increments. `HOUR_WIDTH_PX = 120` pixels per hour.
- **Job blocks**: Positioned absolutely. Width = duration proportional to hour width.
- **Scrollable**: Horizontal scroll for times, vertical scroll for inspectors. Header is sticky.

### Forms
- All inputs use consistent Tailwind styling with bold borders
- Required fields marked visually (not just HTML required)
- Error states use red border + text
- Submit buttons are prominent yellow with black text

### Toasts & Feedback
- Schedule actions show brief success/error toasts via `ScheduleToast` component
- No modal confirmations for drag-and-drop (speed is critical)
- Delete actions use confirmation dialogs

## Responsive Strategy

DisptchMama is primarily a **desktop tool** — the dispatch timeline requires a wide viewport for the time grid. Mobile is not a primary concern for MVP.

- **Minimum effective width**: ~1024px
- **Sidebar**: Fixed width, always visible on desktop
- **Timeline**: Horizontally scrollable within the main content area

## Component Library

UI primitives come from two sources:

1. **@base-ui/react** — Accessible primitives for dialogs, dropdowns, selects
2. **shadcn/ui (copied)** — Pre-styled components in `src/components/ui/`. Customized with neo-brutalist theme.

Never add new UI library dependencies without documenting here.

## Icon Usage

All icons from `lucide-react`. Use consistently sized icons:
- Navigation/sidebar: 20px
- Inline with text: 16px
- Feature icons/empty states: 24-32px
