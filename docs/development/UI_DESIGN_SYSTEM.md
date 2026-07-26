# Viz UI Design System

This document serves as the single source of truth for the **Viz** high-density, accessible digital asset management (DAM) design system. It is designed to combine compact, highly functional, and structurally dense layouts with clean, modular grids, vertical hairline divisions, and clear typographic hierarchies.

---

## Design Principles

1. **Accessibility First (Perfect Zooming)**: All layouts, paddings, and font sizes must use relative units (`rem`/`em`) instead of hardcoded pixels to support seamless browser zooming.
2. **High Information Density**: Sizing is compact and clean to maximize workspace for photography assets and editor sidebars.
3. **Structured Editorial Grid**: Layout coordinates are separated by crisp `1px` hairlines and vertical columns.
4. **Interactive Contrast**: Flat sharp corners are used for panels, containers, and input fields to maintain grid alignment, while pill shapes are reserved strictly for interactive action buttons.

---

## 1. Typography System

Viz utilizes two primary variable typography scales served through Google Fonts:
* **Display/Sans-Serif Font** (`--viz-display-font`): `"Geist Variable", sans-serif` – Used for headings, labels, button text, and body copy.
* **Monospace Font** (`--viz-mono-font`): `"Roboto Mono Variable", monospace` – Used for tags, metadata, status labels, developer settings, and tabular details.

### Font Sizing Tokens
All font sizes are declared as CSS custom properties under `:root`:

| Token | Sizing (rem) | Equivalent (px) | Application |
| :--- | :--- | :--- | :--- |
| `--viz-font-size-xs` | `0.8333rem` | `10px` | Small metadata, helper text, descriptions, tags |
| `--viz-font-size-sm` | `0.9167rem` | `11px` | Standard labels, text fields, menu buttons |
| `--viz-font-size-std` | `1rem` | `12px` | Standard body text, document reading |
| `--viz-font-size-lg` | `1.1667rem` | `14px` | Small headings, modal titles |
| `--viz-font-size-xl` | `1.3333rem` | `16px` | Mid-level section headings |
| `--viz-font-size-2xl` | `1.5rem` | `18px` | Large titles |
| `--viz-font-size-3xl` | `1.6667rem` | `20px` | Page banner headers |
| `--viz-font-size-4xl` | `2rem` | `24px` | Hero headings, section dividers |
| `--viz-font-size-5xl` | `2.5rem` | `30px` | Display headlines, splash text |

---

## 2. Spacing Scale

To guarantee clean visual rhythm, all margins, paddings, and flex/grid gaps must strictly use the standard spacing scale:

| Token | Sizing (rem) | Equivalent (px) | Typical Use |
| :--- | :--- | :--- | :--- |
| `--viz-spacing-xxs` | `0.125rem` | `2px` | Tight list gaps, asterisk offsets |
| `--viz-spacing-xs` | `0.25rem` | `4px` | Button inner gaps, checkbox groups, label spacing |
| `--viz-spacing-sm` | `0.5rem` | `8px` | General input gaps, list item padding, compact cards |
| `--viz-spacing-md` | `0.75rem` | `12px` | Form row gaps, sidebar headers, toolbars |
| `--viz-spacing-std` | `1rem` | `16px` | Main content margins, modal inner padding |
| `--viz-spacing-lg` | `1.25rem` | `20px` | Page outer container margins, toast positioning |
| `--viz-spacing-xl` | `1.5rem` | `24px` | Generous layout divisions |
| `--viz-spacing-xxl` | `2rem` | `32px` | Heavy editorial panel divisions |

### Padding Scale
A separate padding scale exists for component-level internal spacing:

| Token | Sizing (rem) | Equivalent (px) | Typical Use |
| :--- | :--- | :--- | :--- |
| `--viz-padding-xs` | `0.25rem` | `4px` | Tight inner padding |
| `--viz-padding-sm` | `0.5rem` | `8px` | Compact component padding |
| `--viz-padding-md` | `0.75rem` | `12px` | Standard inner padding |
| `--viz-padding-std` | `1rem` | `16px` | Default component padding |
| `--viz-padding-lg` | `1.25rem` | `20px` | Generous inner padding |
| `--viz-padding-xl` | `1.5rem` | `24px` | Wide component padding |
| `--viz-padding-2xl` | `2rem` | `32px` | Panel-level padding |

---

## 3. Borders & Corner Radius

### Borders
We employ high-contrast hairlines to frame sections without clutter:
* **Thin Border** (`--viz-border-thin`): `1px solid var(--viz-border-subtle)` – Default hairline division for headers, tables, sidebars, and inputs.
* **Thick Border** (`--viz-border-thick`): `2px solid var(--viz-primary)` – Used for highlight focus borders or active states.
* **Subtle Border** (`--viz-border-subtle`): OKLCH-derived colour from the base palette – Used as the raw colour value for thin borders.
* **Strong Border** (`--viz-border-strong`): OKLCH-derived lighter colour from the base palette – Used for active focus and selected state outlines.

### Corner Radius
Corner styling follows a strict functional convention:
* **Small Radius** (`--viz-border-radius-sm`): `2px` – Used for compact controls (checkboxes, tags).
* **Medium Radius** (`--viz-border-radius-md`): `4px` – Default rounded corners for input elements, card structures, and dropdown panels.
* **Large Radius** (`--viz-border-radius-lg`): `8px` – Used for floating toast alerts, collections, and modal boxes.
* **Pill Shape** (`--viz-border-radius-pill`): `9999px` – **Strictly reserved** for interactive action buttons (`Button`, `IconButton`) to create high-contrast focus targets.

---

## 4. Colour, Surface Elevation & Status Tint System

The application registers theme colours dynamically via the OKLCH theme engine (`viz-engine.scss` + `viz-mixins.scss`) for both light and dark modes (`:root[data-theme="light"]` and `:root[data-theme="dark"]`).

### OKLCH Engine (`viz-engine.scss`)
The colour engine provides four helper functions used throughout the theme system:
* `oklch-lighten($color, $delta)` – Increases OKLCH lightness by `$delta` percentage points (capped at 95%).
* `oklch-darken($color, $delta)` – Decreases OKLCH lightness by `$delta` percentage points (floored at 5%).
* `oklch-mix($color1, $color2, $weight)` – Mixes two colours in OKLCH space for perceptually uniform blends.
* `oklch-step($color, $steps, $is-light)` – Generates palette steps (100–30) from a base colour.

### Theme Palette (100–30)
The `generate-viz-colors` mixin produces a 20-step palette (`--viz-100` through `--viz-30`) from a base colour. Each step shifts OKLCH lightness by 4.5 units. The palette is generated separately for light and dark modes.

### Surface Elevation Tokens
Layout components must strictly adhere to the semantic surface elevation hierarchy:
* **`--viz-surface-base`**: Main page canvas.
* **`--viz-surface-panel`**: Navigation headers, sidebars, toolbars, and workspace tab headers.
* **`--viz-surface-card`**: Content cards, collection grid items, and table container surfaces.
* **`--viz-surface-hover`**: Interactive hover state highlights across list items, context options, and table rows.
* **`--viz-surface-popover`**: Floating dropdowns, context menus, tooltips, and overlay containers.
* **`--viz-surface-input`**: Text inputs, select elements, and search bars.

### Text Colour Tokens
* **`--viz-text-primary`**: Primary headings and body copy (100% contrast).
* **`--viz-text-secondary`**: Subtitles, field labels, and metadata (mapped to `--viz-40`).
* **`--viz-text-muted`**: Placeholder text, timestamps, and subtle hints (mapped to `--viz-30`).

### Brand Accent Tokens
* **`--viz-primary`**: Primary action colour (buttons, links, focus rings).
* **`--viz-secondary`**: Supporting brand colour (defaults to `primary` hue + 30°).
* **`--viz-accent`**: Feature pop colour (defaults to `primary` hue − 30°).

### Status Accents & Tint Strategy
* **Error**: `var(--viz-error-color)` (`#ef4444`)
* **Warning**: `var(--viz-warning-color)` (`#facc15`)
* **Success**: `var(--viz-success-color)` (`#22c55e`)
* **Info**: `var(--viz-info-color)` (`#3b82f6`)

Status elements use `@mixin status-tint($role, $interactive: false)`:
* **Strategy**: Solid status background colours with `#ffffff` text for high AA/AAA contrast.
* **Hover Borders**: Status hover borders step down (darken) cleanly on mouseover (`--viz-status-hover-border-*`).

The full status token set per role (`error`, `warning`, `success`, `info`, `primary`):
* `--viz-status-bg-{role}` / `--viz-status-border-{role}` / `--viz-status-text-{role}`
* `--viz-status-hover-{role}` / `--viz-status-hover-border-{role}`

### Tag Colours
Label tag colours for image classification:
* `--viz-color-tag-red` (`#eb1717`) / `--viz-color-tag-orange` (`#f17a18`) / `--viz-color-tag-yellow` (`#f5e615`)
* `--viz-color-tag-purple` (`#9355f7`) / `--viz-color-tag-pink` (`#f755a1`)
* `--viz-color-tag-green` (`#19dd61`) / `--viz-color-tag-blue` (`#106ea5`)

### Theme Transitions
Smooth colour transitions are enabled via CSS `@property` declarations for key surface tokens (`--viz-surface-base`, `--viz-surface-panel`, `--viz-surface-card`, `--viz-surface-hover`, `--viz-surface-popover`, `--viz-surface-input`, `--viz-border-subtle`, `--viz-border-strong`, `--viz-text-primary`, `--viz-text-secondary`, `--viz-text-muted`, `--viz-primary`, and all status colours). All colour properties transition over `0.2s ease`.

---

## 5. Layout Tokens

| Token | Value | Application |
| :--- | :--- | :--- |
| `--viz-header-height` | `3rem` | Main header navigation bar |
| `--viz-sidebar-width-expanded` | `20rem` | Sidebar in expanded state |
| `--viz-sidebar-width-collapsed` | `3.5rem` | Sidebar in collapsed/icon-only state |

---

## 6. Build-Time Accessibility Audit

`viewfinder/tools/build-themes.js` compiles all `viz-*.scss` theme files and runs a **WCAG 2.1 contrast audit** on the compiled CSS output. The audit checks:

1. **Body Text on Card**: `--viz-text-primary` vs `--viz-surface-card` — minimum 4.5:1 ratio.
2. **Status Text on Status Background**: All status text/bg pairs — minimum 3.0:1 ratio.

Failing pairs emit build-time warnings. The tool supports hex, RGB, and OKLCH colour parsing.

---

## 7. Standard Component Guidelines

### Input Fields (`InputText`, `InputSelect`, `InputPassword`)
1. **Dimensions**: All inputs feature a `min-height: 2.5rem` density height to enforce form alignment.
2. **Labeling**: Labels sit above inputs using `--viz-font-size-sm` in semi-bold `var(--viz-text-secondary)`. If required, place a red `*` (`--viz-error-color`) to the right of the text.
3. **Borders**: Render flat bottom borders using `border: 1px solid var(--viz-border-subtle)`. On focus, transition to `border-color: var(--viz-primary)`.
4. **Icons**: All dropdown icons and visibility toggles sit on the right and colour neutrally (`var(--viz-text-primary)`).

### Buttons (`Button`, `IconButton`)
1. **Interactive Styling**: Always use `border-radius: var(--viz-border-radius-pill)` for action buttons.
2. **Variants**: Supports `primary`, `danger`, `warning`, `success`, `info`, and `ghost` variants using `@include m.status-tint(...)`.
3. **Access Indicator**: Include `:focus-visible` outlines mapping to a double outline ring:
   ```scss
   &:focus-visible {
       box-shadow: 0 0 0 2px var(--viz-surface-base), 0 0 0 4px var(--viz-primary);
   }
   ```

### Profile Avatar Badges (`AvatarBadge`)
* Standalone component for user profile initial placeholders.
* Accepts an optional `user` prop (defaults to the global current user state).
* Renders with `var(--viz-surface-card)` neutral background, `1px solid var(--viz-border-subtle)` frame, and `var(--viz-text-primary)` initial.
* Supports `showCurrentUser` prop to highlight the current user with a primary-colour outline.

### Icon Badges (`IconBadge`)
* Standalone component wrapping `MaterialIcon` with solid background fills and no borders.
* Supports preset status variants (`primary`, `info`, `warning`, `error`, `success`, `neutral`), custom background colours (`bgColor`), custom icon colours (`color`), and shapes (`rounded`, `circle`, `pill`).

### Badges (`Badge`)
* Used for counts, statuses, tags, and role indicators.
* Supports variants (`default`, `neutral`, `warning`, `error`, `info`, `success`, `outline`) and size scaling (`small`, `std`, `lg`). Non-interactive badges omit hover background shifts by default.

### Header Navigation Density
To maximize professional DAM screen workspace, the main header navigation is designed strictly at **`3rem`** height. Account buttons utilize `<AvatarBadge size="2rem" />`.

### Toast Notifications
* Toast card containers float bottom-right and use rounded borders (`var(--viz-border-radius-md)`).
* Cards use high-contrast neutral text overlays and card backgrounds.
* Visual categorizations are colour-coded in status indicator strips (`4px` left borders) and category icons.

---

## 8. Development Conventions

1. **No Hardcoded Hex Colours in Component Styles**: Always reference semantic design tokens (`var(--viz-surface-card)`, `var(--viz-border-subtle)`, `var(--viz-text-primary)`) or component props (`bgColor`, `color`).
2. **Use Relative Tokens**: Always reference `var(--viz-spacing-*)`, `var(--viz-padding-*)`, and `var(--viz-font-size-*)` tokens for all layout geometry. Do not commit hardcoded pixel sizes.
3. **Clean Initial Connection States**: Reactively track WebSockets using an `eventsState.initialized` flag alongside `eventsState.connected` to eliminate layout flashes (FOUC).
