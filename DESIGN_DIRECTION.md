# Audible List Sync — Design Direction

This document defines the visual design system, layout patterns, and component conventions for the Audible List Sync web application. It is modeled after the Plotwist.app aesthetic — a dark-first, content-forward media catalog UI built with Next.js, Tailwind CSS, and shadcn/ui.

Use this document as the authoritative reference when building any page or component. Every UI decision should align with the patterns described here.

---

## 1. Overall Aesthetic

The design is **dark mode by default**, minimal, and content-forward. The UI relies on subtle borders for visual separation rather than shadows or heavy backgrounds. The feel is modern, clean, and cinematic — think Letterboxd meets a well-designed SaaS dashboard.

Key principles:

- **Dark-first**: Near-black backgrounds with muted foreground text. High contrast only for primary actions and headings.
- **Border-driven hierarchy**: Sections, cards, and containers are delineated by thin borders (`border` class), not box shadows or color fills.
- **Content is the decoration**: Cover art and imagery provide the visual richness. The UI chrome stays out of the way.
- **Generous but consistent spacing**: The layout breathes, but spacing values are predictable and repetitive (`gap-2`, `gap-4`, `space-y-4`, `space-y-6`).
- **Understated interactions**: Hover states are subtle (slight background fill via `hover:bg-accent`). No flashy animations except where intentionally decorative (e.g., hero section).

---

## 2. Color System

Use shadcn/ui's CSS variable-based theming. All colors reference semantic tokens, never raw hex values in components.

| Token | Role | Dark Mode Appearance |
|-------|------|----------------------|
| `background` | Page background, card fills | Near-black (`~#09090b` / zinc-950) |
| `foreground` | Primary text, headings | White / near-white |
| `muted` | Subtle fills (tab bars, skeleton loaders, avatar bg) | Dark gray (`~#27272a` / zinc-800) |
| `muted-foreground` | Secondary text, descriptions, timestamps | Medium gray (`~#a1a1aa` / zinc-400) |
| `border` / `input` | All borders (cards, inputs, nav, dividers) | Very subtle gray (`~#27272a` / zinc-800) |
| `accent` | Hover fills on interactive elements | Slightly lighter than muted |
| `accent-foreground` | Text on accent backgrounds | Near-white |
| `primary` | Solid CTA buttons, highlighted badges | White on dark / black on light |
| `primary-foreground` | Text on primary backgrounds | Inverted from primary |
| `ring` | Focus ring color | Matches primary or subtle blue |

**Important**: The theme supports light mode via shadcn's `dark:` class toggling, but dark mode is the default and primary design target.

---

## 3. Typography

Use the default system font stack (or Inter if a custom font is desired). No decorative fonts.

| Element | Classes | Notes |
|---------|---------|-------|
| Page heading (h1) | `text-2xl font-bold` or `text-lg font-bold md:text-4xl` | Used for detail page titles, page titles |
| Hero heading | `text-3xl md:text-6xl leading-tight md:leading-[1.2]` | Landing page only |
| Section heading | `text-2xl lg:text-5xl font-normal` with `<b>` for emphasis | Pricing, feature sections |
| Subtitle / description | `text-base text-muted-foreground` or `text-sm text-muted-foreground` | Always `muted-foreground`, never primary |
| Small metadata | `text-xs text-muted-foreground` | Dates, timestamps, counts |
| Nav links | `text-sm font-medium` | Consistent across all nav items |
| Badges | `text-xs font-semibold` | Genre tags, status indicators |
| Buttons | `text-sm font-medium` (default) or `text-xs` (compact) | Match shadcn defaults |
| Body copy | `text-xs md:text-sm text-muted-foreground leading-5 md:leading-6` | Descriptions, summaries |

---

## 4. Layout & Spacing

### Container Widths

- **Outer content max-width**: `max-w-6xl` (1152px) — used for nav, grids, footer
- **Reading content max-width**: `max-w-4xl` (896px) — used for detail page content, centered text sections
- **Centered hero text**: `max-w-xl` to `max-w-2xl` for subtitle text
- **Page padding**: `px-4 lg:px-0` — padding on mobile, flush on desktop within the max-width container
- **All outer containers**: `mx-auto` for centering

### Spacing Scale

Use these values consistently — don't invent new spacing:

- `gap-1` / `space-x-1`: Tight grouping (icon + text within a button)
- `gap-2` / `space-x-2` / `space-y-2`: Related items (badge groups, button rows, metadata pairs)
- `gap-4` / `space-y-4`: Standard section spacing, grid gaps, card padding
- `space-y-6`: Between major content sections within a page
- `space-y-8`: Between top-level page sections
- `py-4`: Standard vertical padding for containers
- `py-8` / `py-32`: Hero/feature section vertical padding

### Responsive Breakpoints

Follow Tailwind defaults. Key patterns:

- Mobile-first: `grid-cols-3` → desktop: `md:grid-cols-6` for poster grids
- Mobile: stacked layouts → desktop: side-by-side (`flex-col md:flex-row`)
- Mobile: smaller text → desktop: larger (`text-lg md:text-4xl`)
- Mobile: full-width → desktop: rounded containers (`md:rounded-lg`)
- Hide/show elements: `hidden md:block` / `md:hidden` for mobile-specific vs desktop-specific layouts

---

## 5. Navigation

### Desktop

- **Shape**: Floating pill — `rounded-full border bg-background` on desktop (`lg:rounded-full lg:border`)
- **Width**: `max-w-6xl` centered
- **Height**: Compact — `py-2 px-4`
- **Position**: Top of page with `lg:my-4` for slight offset from viewport top
- **Left side**: Logo (24x24) + nav links with Lucide icons (12x12 icon size) + chevron for dropdowns
- **Right side**: Search button (with `⌘K` keyboard shortcut badge) + user avatar (32px circle)
- **Active state**: Active nav item gets `bg-muted` background fill
- **Hover state**: `hover:bg-accent hover:text-accent-foreground`
- **Nav links**: `h-9 px-4 py-2 text-sm font-medium rounded-md` with `gap-2` between icon and label
- **Dropdown menus**: Radix-based with chevron that rotates 180° on open (`group-data-[state=open]:rotate-180`)

### Mobile

- **Simplified**: Logo left + hamburger menu button right
- **Hamburger**: Bordered icon button (`h-9 w-9 border`)
- **Menu**: Sheet/dialog-based slide-out (not visible by default)

### Search Button

- **Style**: Ghost/outline button with search icon + "Search anything" label + keyboard shortcut badge
- **Shortcut badge**: `bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground rounded-md` containing `⌘K`
- **Opens**: Command palette / search dialog (not a page navigation)

### User Avatar

- **Size**: `size-8` (32px)
- **Shape**: `rounded-full` with `border`
- **Empty state**: Muted background with user icon (`lucide-user size-4 text-muted-foreground`)
- **Interaction**: Opens dropdown menu on click

### Footer

- **Top border**: `border-t mt-4`
- **Layout**: `max-w-6xl mx-auto py-4` — logo + copyright left, links right
- **Responsive**: stacked on mobile (`flex-col`), side-by-side on desktop (`md:flex-row`)
- **Typography**: `text-xs text-muted-foreground` for copyright, `text-sm text-muted-foreground` for links
- **Link hover**: `hover:text-foreground`
- **Separator**: `h-3 border-r` between copyright elements

---

## 6. Page Patterns

### Landing / Home Page

- **Background decoration**: Subtle SVG checkered pattern at 5% opacity (`opacity-[5%]`) with a gradient overlay (`bg-gradient-to-b from-transparent to-background`) fading the pattern into the background
- **Hero section**: Centered column, large heading, muted subtitle, single small CTA button (`h-8 rounded-md px-3 text-xs bg-primary`)
- **Social proof badge**: Small pill above heading (`rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-background`)
- **Screenshot showcase**: Bordered rounded container (`border rounded-lg`) with crossfading images at `aspect-[1629/831]`
- **Pricing cards**: 2-column grid (`lg:grid-cols-2 gap-8 lg:gap-4`), each card has `border rounded-md bg-gradient-to-b from-transparent to-muted/30 px-4 py-6`, feature lists with checkmark icons in small muted boxes

### Library / Listing Page (Discover)

- **Page header**: `text-2xl font-bold` title + `text-muted-foreground` subtitle, with filter icon button top-right
- **Filter button**: Square icon button (`h-9 w-9 border rounded-md`) with sliders-horizontal Lucide icon
- **Grid layout**: `grid grid-cols-3 gap-4 md:grid-cols-6` — 3 columns mobile, 6 columns desktop
- **Cards are image-only**: No text, no overlay. Just the poster image in a bordered container.
  - Container: `aspect-poster rounded-lg border bg-muted shadow overflow-hidden relative`
  - Image: `absolute inset-0 w-full h-full` (fills container via `data-nimg="fill"`)
  - Wrapped in `<a>` for navigation — the whole card is clickable
- **Skeleton loading**: `animate-pulse rounded-md bg-primary/10 aspect-poster` — same dimensions as real cards
- **Aspect ratio**: `aspect-poster` (custom aspect ratio ~2:3 for book/movie posters)
- **No pagination visible**: Uses infinite scroll with skeleton placeholders at the bottom

### Detail Page

- **Banner/backdrop**: Full-width image at top of content area
  - Container: `aspect-banner max-h-[55dvh] overflow-hidden md:rounded-lg border-b lg:border`
  - Image: `background-size: cover` via inline style on a div (not an `<img>`)
- **Poster + metadata layout**: Two-column flex below the banner
  - **Poster** (left): `w-2/5 md:w-1/3` — pulls up into the banner with `-mt-20 lg:-mt-32`
    - `aspect-poster rounded-lg border bg-muted shadow overflow-hidden relative`
  - **Metadata** (right): `w-3/5 md:w-2/3` — stacks vertically with `flex-col gap-2`
- **Metadata hierarchy** (top to bottom):
  1. Date — `text-xs text-muted-foreground`
  2. Title — `text-lg font-bold md:text-4xl`
  3. Genre badges — row of bordered pills (`rounded-md border px-2.5 py-0.5 text-xs font-semibold`)
  4. Rating badge — filled primary style (`bg-primary text-primary-foreground rounded-md px-2.5 py-0.5 text-xs font-semibold`)
  5. Description — `text-xs md:text-sm text-muted-foreground leading-5 md:leading-6`
  6. Action buttons — row of ghost/outline buttons (`h-8 rounded-md px-3 text-xs border`)
- **Series/collection banner**: Full-width section with darkened background image (`brightness-[25%]`), white text overlaid, CTA button at bottom — `relative h-[40vh] overflow-hidden border-y md:rounded-md md:border-x p-6 md:p-8`
- **Tab section**: shadcn Tabs component
  - Tab list: `inline-flex h-9 rounded-lg bg-muted p-1 text-muted-foreground`
  - Active tab: `bg-background text-foreground shadow`
  - Tab content: `mt-4` below the tab bar
  - Horizontally scrollable on mobile: `overflow-x-scroll scrollbar-hide`
- **Empty state**: `border border-dashed rounded-lg py-8 text-center` with primary + muted-foreground text

### Dashboard (apply these patterns)

- Follow the listing page header pattern for page title
- Use bordered cards (`border rounded-lg p-4 md:p-6`) for stat widgets and sync history
- Use the same ghost button style for actions
- Stats can use large `text-3xl font-bold` numbers with `text-xs text-muted-foreground` labels beneath

---

## 7. Component Library

### Buttons

| Variant | Classes | Usage |
|---------|---------|-------|
| Primary (solid) | `bg-primary text-primary-foreground shadow hover:bg-primary/90 rounded-md` | Main CTAs (Start Now, See Collection) |
| Ghost/Outline (default) | `border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground rounded-md` | Most actions (Add to list, Update Status, filter) |
| Size default | `h-9 px-4 py-2 text-sm font-medium` | Standard buttons |
| Size small | `h-8 px-3 text-xs` | Compact actions (detail page buttons) |
| Icon button | `h-9 w-9` (square) | Filter toggle, hamburger menu |

All buttons include: `inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50`

### Badges / Pills

| Variant | Classes | Usage |
|---------|---------|-------|
| Default (outlined) | `rounded-md border px-2.5 py-0.5 text-xs font-semibold text-foreground` | Genre tags, categories, metadata labels |
| Primary (filled) | `rounded-md border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80 px-2.5 py-0.5 text-xs font-semibold` | Rating scores, highlighted status |
| Subtle (muted bg) | `rounded-md bg-background border px-2.5 py-0.5 text-xs font-semibold text-foreground` | Social proof, informational pills |

### Cards

- **Poster card (grid item)**: Image-only, no text. `aspect-poster rounded-lg border bg-muted shadow overflow-hidden relative` wrapping a fill image. Entire card is an `<a>` link.
- **Content card (dashboard/pricing)**: `border rounded-md px-4 py-6` with optional `bg-gradient-to-b from-transparent to-muted/30` for subtle depth.
- **Banner card (collection/series)**: `relative h-[40vh] overflow-hidden border-y md:rounded-md md:border-x p-6 md:p-8` with darkened background image and white overlay text.

### Form Inputs

- **Search input (button-style)**: `border border-input bg-transparent shadow-sm rounded-md h-9 px-3 text-sm text-muted-foreground` with search icon and keyboard shortcut badge. Opens a command dialog on click.
- **Standard inputs**: Follow shadcn/ui defaults — bordered, rounded-md, muted placeholder text.

### Tabs

- **Tab list container**: `inline-flex h-9 rounded-lg bg-muted p-1 text-muted-foreground`
- **Tab trigger**: `rounded-md px-3 py-1 text-sm font-medium`
- **Active tab**: `bg-background text-foreground shadow`
- **Tab content**: `mt-4` gap below the tab bar
- **Mobile**: Wrap tab list in `overflow-x-scroll scrollbar-hide` container

### Empty States

- `border border-dashed rounded-lg py-8 text-center`
- Primary text: `text-sm`
- Secondary text: `text-xs text-muted-foreground` or `text-sm text-muted-foreground`

### Skeleton Loaders

- `animate-pulse rounded-md bg-primary/10`
- Match the exact dimensions of the content they replace (e.g., `aspect-poster` for poster grids)

---

## 8. Iconography

- **Library**: Lucide React (`lucide-react`)
- **Nav icons**: 12x12 (`width="12" height="12"`)
- **Button icons**: 14x14 with `mr-2` spacing before label text
- **UI icons**: 16x16 for standalone icon buttons
- **Avatar fallback icon**: `size-4 text-muted-foreground`
- **Style**: Stroke-based, 2px stroke width, round line caps and joins

---

## 9. Aspect Ratios

Define these custom aspect ratios in Tailwind config:

- **`aspect-poster`**: ~2:3 ratio (standard book/movie poster proportions, roughly `0.667` or `2/3`)
- **`aspect-banner`**: ~2:1 ratio (wide cinematic banner, roughly `1629/831` or `~1.96`)

---

## 10. Responsive Strategy

| Breakpoint | Behavior |
|------------|----------|
| Mobile (default) | Single column or 3-column poster grid, stacked layouts, full-width containers, hamburger nav |
| `md` (768px) | 6-column poster grid, side-by-side layouts, rounded containers, larger typography |
| `lg` (1024px) | Floating pill nav, `px-0` (container handles width), max-width containers kick in |

Key responsive patterns:
- Nav: hamburger on mobile, floating pill on `lg`
- Poster grid: `grid-cols-3` → `md:grid-cols-6`
- Detail layout: poster `w-2/5` + metadata `w-3/5` on mobile, `md:w-1/3` + `md:w-2/3` on desktop
- Containers: full-width with `border-b` on mobile → `rounded-lg border` on desktop
- Text: scale up at `md` breakpoint (`text-lg md:text-4xl`)

---

## 11. Applying This to Audible List Sync

### Adaptations from the Reference Design

The reference app is a movie/TV catalog. Our application is an audiobook library manager. Key translations:

| Plotwist Concept | Audible List Sync Equivalent |
|-----------------|-------------------------------|
| Movie poster grid | Audiobook cover art grid |
| Movie detail page | Audiobook detail page (title, author, narrator, series, duration, rating) |
| Genre badges | Genre/category badges + series badge |
| TMDB rating badge | Audible rating badge (aggregate star rating) |
| "Add to list" button | "Add to list" button (same pattern) |
| "Update Status" button | Listening status (Not Started / In Progress / Finished) |
| Collection banner | Series banner (if audiobook is part of a series) |
| Discover page grid | Library browse page grid |
| Tab section (Reviews, Credits, etc.) | Tab section (Details, Series, Similar, Reviews) |
| User profile | User dashboard |

### Pages to Build

1. **Landing page**: Hero + value proposition + CTA to sign up. Follow the homepage pattern (centered hero, subtle background pattern, screenshot showcase of the dashboard).
2. **Dashboard**: Sync status card, library stats, recent sync history, "Connect Extension" CTA. Use content cards with border styling.
3. **Library browse**: Poster grid of audiobook covers (3 cols mobile, 6 cols desktop), search bar at top, filter button. Follow the discover page pattern exactly.
4. **Audiobook detail**: Banner (use cover art as blurred/darkened background), poster pull-up, metadata stack (title, author, narrator, series, duration, genres, rating, description), action buttons, tabbed content below. Follow the detail page pattern.

---

## Summary for AI Prompt Usage

When prompting an AI to build pages for this application, include these key directives:

> Build a dark-mode-first UI using Next.js App Router, Tailwind CSS, and shadcn/ui components. The design follows a Plotwist.app-inspired aesthetic: near-black backgrounds (zinc-950), subtle border-driven visual hierarchy (no box shadows for layout separation), muted gray secondary text, and white/near-white primary text. Use Lucide React for all icons.
>
> Navigation is a floating pill-shaped bar on desktop (rounded-full, bordered, max-w-6xl centered) with nav links containing 12px Lucide icons, a ⌘K search button, and a circular user avatar. Mobile nav collapses to logo + hamburger.
>
> Content grids use poster-aspect-ratio cards (2:3) in a 3-column mobile / 6-column desktop grid with gap-4. Cards are image-only with rounded-lg borders and bg-muted fallback — no text overlay.
>
> Detail pages feature a wide banner image at top (max-h-[55dvh], rounded on desktop), with a poster image pulling up into the banner via negative margin. Metadata stacks vertically beside the poster: date, title (text-4xl bold), badge row for genres/categories, description in muted-foreground, and ghost-style action buttons.
>
> Below the fold, use shadcn Tabs (rounded-lg bg-muted tab bar, active tab gets bg-background shadow) for sectioned content. Empty states use dashed borders with centered text.
>
> All containers max out at max-w-6xl (1152px) for grids and max-w-4xl (896px) for reading content. Spacing uses gap-2 for tight groups, gap-4 for standard, space-y-6 for sections. Buttons default to ghost/outline style (border, bg-transparent, hover:bg-accent) with primary (bg-primary solid) reserved for main CTAs.
>
> The footer is a simple border-t with max-w-6xl centered content: logo + copyright left, text links right, all in muted-foreground.
