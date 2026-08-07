# SWE-Bench Dashboard — Figma RFC 882

## Design System & Specifications

---

## 1. Design Tokens

### Color Palette

#### Light Mode
```
--color-bg-primary:     #FFFFFF     (fundo principal)
--color-bg-secondary:   #F9FAFB     (fundo alternado)
--color-bg-tertiary:    #F3F4F6     (hover rows, cards interior)
--color-bg-accent:      #EEF2FF     (active, selected)
--color-border:         #E5E7EB     (bordas)
--color-border-focus:   #6366F1     (foco)
--color-text-primary:   #111827     (texto principal ~12px)
--color-text-secondary: #6B7280     (texto auxiliar)
--color-text-muted:     #9CA3AF     (placeholder)
--color-accent:         #6366F1     (indigo-500 — primary accent)
--color-accent-hover:   #4F46E5     (indigo-600 — hover accent)
--color-success:        #059669     (valioso resolved rate)
--color-warning:        #D97706     (médio)
--color-error:          #DC2626     (baixo ~0%)
```

### Dark Mode
| Token | Value |
|-------|-------|
| bg-primary | #0F172A (slate-900) |
| bg-secondary | #1E293B (slate-800) |
| bg-tertiary | #334155 (slate-700) |
| bg-content | #1E1B4B (indigo-950) |
| border | #334155 |
| border-focus | #818CF8 |
| text-primary | #F1F5F9 |
| text-secondary | #94A3B8 |
| text-muted | #64748B |

### Typography Scale

```
--font-family: Inter, system-ui, -apple-system, sans-serif;
--fontsize-xs: 0.75rem (12px)
--fontsize-sm: 0.875rem (14px)
--fontsize-base: 1rem (16px)
--fontsize-lg: 1.125rem (18px)
--fontsize-xl: 1.25rem (20px)
--fontsize-2xl: 1.5rem (24px)
--fontsize-3xl: 1.875rem (30px) — KPI values

Weight: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
```

### Spacing Scale

Tailwind spacing: 4px grid system
- xs: 4px (p-1) | sm: 8px (p-2) | md: 12px (p-3) | base: 16px (p-4) | lg: 24px (p-6) | xl: 32px (p-8) | 2xl: 48px (p-12)

### Border Radius

- button/card: 8px (rounded-lg)
- input/select: 8px (rounded-lg)
- badge: 9999px (rounded-full)
- modal: 12px (rounded-xl)
- table: 0px (rounded-none) — para look de dados profissional

### Shadows

- card: 0 1px 3px rgba(0,0,0,0.08) 0 1px 2px rgba(0,0,0,0.06)
- modal: 0 10px 15px -3px rgba(0,0,0,0.1)
- tooltip: 0 2px 8px rgba(0,0,0,0.15)

### Z-Index Scale

- dropdown: 50
- modal: 100
- tooltip: 200

---

## 2. Component Specifications

### KPI Card

```
+----------------------------------+
|   [icon]  MODELS EVALUATED       |
|   156                            |
|   +24 this month                |
+----------------------------------+

Width: minmax(160px, 1fr) in grid
Min-height: 104px
Padding: 20px 24px
Border: 1px solid border-color
Background: bg-primary
Border-radius: 8px

Icon: 20x20, accent color, left-aligned
Label: text-sm, text-secondary, uppercase tracking-wider
Value: text-3xl, font-bold, text-primary
Subtext: text-xs, text-secondary, below value
```

### Leaderboard Table

| Col | Width | Align | Sortable |
|-----|-------|-------|----------|
| Rank | 60px | center | yes |
| Model | auto | left | yes |
| Resolved Rate | 120px | right | yes |
| Avg Time | 110px | right | yes |
| Tasks | 80px | right | yes |
| Benchmark | 160px | left | yes |

- Alternate row background: bg-primary / bg-secondary
- Hover row: bg-content (4px light indigo)
- Sticky header
- Column sort arrows: ↕ icon, active sort: ↑↓
- Header font: semibold, 12px, text-muted
- Row font: base 14px, text-primary
- Cell overflow: ellipsis

### Filter Bar

```
+----------------------------------------------------------+
| [Benchmark Select ▼] [Model Search 🔍] [Metric Dropdown ▼]  | [Clear filters] |
+----------------------------------------------------------+
```

- Horizontal bar, bg-secondary, padding: p-4
- Gap: gap-3 between filters
- Width: full width, flex-wrap no mobile
- Active filter chips below card when mobile

### Model Search Input

```
+┌──────────────────────────────────────────────┐+
| 🔍 | Search models...                         | |
+──└──────────────────────────────────────────────┘+
```

- Width: 240px (desktop), full width (mobile)
- Height: 40px
- Icon: magnifying glass left
- Placeholder: "Search models..."
- Debounce: 300ms

### Benchmark Dropdown

```
+┌──────────────────────────────────────────────┐+
| 📊 All Benchmarks                         ▼  | |
+──└──────────────────────────────────────────────┘+
+──┌──────────────────────────────────────────────┘+
|   ○ All Benchmarks                              |
|   ○ SWE-Bench Verified                          |
|   ○ SWE-Bench Lite                              |
|   ○ SWE-Bench Full                              |
+──┌──────────────────────────────────────────────┐─+
```

- Width: 200px min
- Option: radio-like radios
- Selection highlights with indigo bg

### Pagination Bar

```
+────────────────────────────────────────────────────────────────────+
| [Rows per page: 20 ▼]        1 2 3 ... 8      [<] [>]            |
+────────────────────────────────────────────────────────────────────+
```

- Left: selector (20/50/100)
- Center: page numbers (navegável)
- Right: prev/next
- Height: 40px row

---

## 3. Layout Wireframes

### Desktop (≥ 1280px)

```
+==================================================================+
| HEADER: SWE-Bench Dashboard    [Theme] [Settings]        |
+------------------------------------------------------------------+
|                                                                   |
| +-----------+ +-----------+ +-----------+ +-----------+           |
| | KPI Card  | | KPI Card  | | KPI Card  | | KPI Card  |           |
| +-----------+ +-----------+ +-----------+ +-----------+           |
|                                                                   |
| +-------------------------------------------------------------+  |
| | Filters: [Benchmark] [Search Models] [Metric] [Clear]      |  |
| +-------------------------------------------------------------+  |
|                                                                   |
| +-------------------------------------------------------------+  |
| | TABLE: Rank | Model | Resolved% | Avg Time | Tasks | B-mark|  |
| |-------------------------------------------------------------|  |
| | 1  | gpt-4o       | 89%  | 23s  | 300 | Verified           |  |
| | 2  | claude-3.5   | 87%  | 19s  | 300 | Verified ℹ️        |  |
| | 3  | gemini-2     | 85%  | 27s  | 300 | Verified            |  |
| | ... |             |      |      |     |                     |  |
| +-------------------------------------------------------------+  |
|                                                                   |
| +----------------------------------------------------------+     |
| | Pagination: 1-20 of 156  [20 ▼]  [<] [>]                  |     |
| +----------------------------------------------------------+     |
+==================================================================+
```

### Mobile (320-767px)

```
+==================================================================+
| ☰ SWE-Bench Dashboard                                    ☀️    |
+------------------------------------------------------------------+
|                                                                   |
| KPI Cards (2 column grid)                                         |
| +-----------+ +-----------+                                       |
| | 156       | | 89.2%      |                                       |
| | Models    | | Best Rate   |                                       |
| +-----------+ +-----------+                                       |
| +-----------+ +-----------+                                       |
| | 55.1%     | | 45 / 60   |                                       |
| | Avg Rate  | | Benchmarks |                                       |
| +-----------+ +-----------+                                       |
|                                                                   |
| [Filters ↓ 2 active]                                          |
|                                                                   |
| Card 1: [1] | R-4o | Verified | 89% resolved |
| Card 2: [2] | Claude | Verified | 94% resolved |
| Card 3: [3] | Gemini | Verified | 85% resolved |
|                                                                   |
| +----------------------------------------------------------+     |
| | [Load more]   Page 1/8                            | |           |
| +----------------------------------------------------------+     |
+==================================================================+
```

---

## 4. Interaction Patterns

### Filter Interaction
1. User selects "SWE-Bench Verified" from benchmark dropdown
2. Table re-renders with skeleton
3. Number shown in KPI badge updates
4. Active filter chip appears below filters
5. URL updates with query params: `?benchmark=verified`

### Sorting Interaction
1. User clicks on column header "Resolved Rate"
2. Arrow rotates from ↑ to ↓ (desc)
3. Table re-sorts server-side
4. URL updates: `?sort=resolved_rate&order=desc`

### Search Interaction
1. User types "clau..."
2. After 300ms pause, search fires
3. Table skeleton appears
4. Results filter to "Claude 3.5 Sonnet", "Claude 3 Opus"
5. URL updates: `?q=clau`

### Filter Chip Interaction
1. User sees active filter chip "Verified X"
2. Clicks X close button
3. Filter removes instantly
4. Table reloads without that filter
5. Chip disappears

### Pagination Interaction
1. User clicks "Next"
2. Table skeleton appears (1 row props in viewport)
3. New page loads
4. Scroll to top of table
5. URL sync: `?page=2`
6. Focus stays on pagination

---

## 5. Responsive Behavior

| Breakpoint | Layout | Table | Filters | Stack |
|-----------|--------|-------|---------|-------|
| 320-639px | Single col | Cards | Bootom sheet | Compact |
| 640-1023px | Table w/ 3 cols | Simple table | Inline (not //) | Optimized for vertical |
| 1024-1279px | Table full | Full table | horizontal | Full-width row |
| 1280-1440px | Max 1280px container | Full table | top | Center |
| 1440+ | 1440px con| Full table | top | macOS-style padding |

---

## 6. Dark Mode Specification
- Theme provider via next-themes
- Class strategy: .dark on <html>
- Toggle: Button with sun/moon icon in top-right
- Respect prefers-color-scheme (auto-detection)
- All colors inverted per Section 1.2 tokens
- No flash of ☼ on load sound theory

---

## 7. Accessibility Requirements (RFC 882 Section 7)

- **Landmarks**: <header>, <nav>, <main>, <footer>
- **Table caption**: invisible
- **aria-sort** on table headers
- **aria-label** on ALL icon-only buttons
- **role="table"** with explicit **role="row"**, **role="columnheader"**, **role="cell"**
- **Focus order**: logical DOM order (header → filters → table → pagination)
- **Keyboard**: Tab navigation, Arrow up/down for rows if editing your filter
- **Screen reader announcements**: Use live region for search results count and filter changes
- **Skip link**: Skip filters, go to table
- **Color contrast**: Every text ≥ 4.5:1 on its background