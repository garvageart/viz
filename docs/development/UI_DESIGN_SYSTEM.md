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
| `--viz-font-size-xs` | `0.75rem` | `12px` | Small metadata, helper text, descriptions, tags |
| `--viz-font-size-sm` | `0.875rem` | `14px` | Standard labels, text fields, menu buttons |
| `--viz-font-size-std` | `1rem` | `16px` | Standard body text, document reading |
| `--viz-font-size-lg` | `1.125rem` | `18px` | Small headings, modal titles |
| `--viz-font-size-xl` | `1.25rem` | `20px` | Mid-level section headings |
| `--viz-font-size-2xl` | `1.5rem` | `24px` | Large titles |
| `--viz-font-size-3xl` | `1.875rem` | `30px` | Page banner headers |

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

---

## 3. Borders & Corner Radius

### Borders
We employ high-contrast hairbars to frame sections without clutter:
* **Thin Border** (`--viz-border-thin`): `1px solid var(--viz-60)` – Default hairline division for headers, tables, sidebars, and inputs.
* **Thick Border** (`--viz-border-thick`): `2px solid var(--viz-primary)` – Used for highlight focus borders or active states.

### Corner Radius
Corner styling follows a strict functional convention:
* **Small Radius** (`--viz-border-radius-sm`): `2px` – Used for compact controls (checkboxes, tags).
* **Medium Radius** (`--viz-border-radius-md`): `4px` – Default rounded corners for input elements, card structures, and dropdown panels.
* **Large Radius** (`--viz-border-radius-lg`): `8px` – Used for floating toast alerts, collections, and modal boxes.
* **Pill Shape** (`--viz-border-radius-pill`): `9999px` – **Strictly reserved** for interactive action buttons (`Button`, `IconButton`) to create high-contrast focus targets.

---

## 4. Color, Surface Elevation & Status Tint System

The application registers theme colors dynamically via the OKLCH theme engine in `viz-mixins.scss` for both light and dark modes (`:root[data-theme="light"]` and `:root[data-theme="dark"]`).

### Surface Elevation Tokens
Layout components must strictly adhere to the semantic surface elevation hierarchy:
* **`--viz-surface-base`**: Main page canvas.
* **`--viz-surface-panel`**: Navigation headers, sidebars, toolbars, and workspace tab headers.
* **`--viz-surface-card`**: Content cards, collection grid items, and table container surfaces.
* **`--viz-surface-hover`**: Interactive hover state highlights across list items, context options, and table rows.
* **`--viz-surface-popover`**: Floating dropdowns, context menus, tooltips, and overlay containers. In dark mode, popovers elevate smoothly using `$base` slate-navy hue steps.

### Status Accents & Tint Strategy
* **Error**: `var(--viz-error-color)` (`#ef4444`)
* **Warning**: `var(--viz-warning-color)` (`#f59e0b`)
* **Success**: `var(--viz-success-color)` (`#10b981`)
* **Info**: `var(--viz-info-color)` (`#3b82f6`)

Status elements use `@mixin status-tint($role, $interactive: false)`:
* **Light Mode Strategy**: Solid status background colors with `#ffffff` text for high AA/AAA contrast.
* **Dark Mode Strategy**: Subtle status background tints mixed into `var(--viz-surface-card)` with bright status text.
* **Hover Borders**: Status hover borders step down (darken) cleanly on mouseover (`--viz-status-hover-border-*`).

---

## 5. Standard Component Guidelines

### Input Fields (`InputText`, `InputSelect`, `InputPassword`)
1. **Dimensions**: All inputs feature a `min-height: 2.5rem` density height to enforce form alignment.
2. **Labeling**: Labels sit above inputs using `--viz-font-size-sm` (`0.875rem`) in semi-bold `var(--viz-text-secondary)`. If required, place a red `*` (`--viz-error-color`) to the right of the text.
3. **Borders**: Render flat bottom borders using `border: 1px solid var(--viz-border-subtle)`. On focus, transition to `border-color: var(--viz-primary)`.
4. **Icons**: All dropdown icons and visibility toggles sit on the right and color neutrally (`var(--viz-text-primary)`).

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
* Standalone component for user profile initial placeholders used in the main header and account panel.
* Renders with `var(--viz-surface-card)` neutral background, `1px solid var(--viz-border-subtle)` frame, and `var(--viz-text-primary)` initial.

### Icon Badges (`IconBadge`)
* Standalone component wrapping `MaterialIcon` with solid background fills and no borders (`border: none`).
* Supports preset status variants (`primary`, `info`, `warning`, `error`, `success`, `neutral`), custom background colors (`bgColor`), custom icon colors (`color`), and shapes (`rounded`, `circle`, `pill`).

### Badges (`Badge`)
* Used for counts, statuses, tags, and role indicators.
* Supports variants (`default`, `neutral`, `warning`, `error`, `info`, `success`, `outline`) and size scaling (`small`, `std`, `lg`). Non-interactive badges omit hover background shifts by default.

### Header Navigation Density
To maximize professional DAM screen workspace, the main header navigation is designed strictly at **`3rem`** height. Account buttons utilize `<AvatarBadge size="2rem" />`.

### Toast Notifications
* Toast card containers float bottom-right and use rounded borders (`var(--viz-border-radius-md)`).
* Cards use high-contrast neutral text overlays and card backgrounds.
* Visual categorizations are color-coded in status indicator strips (`4px` left borders) and category icons.

---

## 6. Development Conventions

1. **No Hardcoded Hex Colors in Component Styles**: Always reference semantic design tokens (`var(--viz-surface-card)`, `var(--viz-border-subtle)`, `var(--viz-text-primary)`) or component props (`bgColor`, `color`).
2. **Use Relative tokens**: Always reference `var(--viz-spacing-*)` and `var(--viz-font-size-*)` tokens for all layout geometry. Do not commit hardcoded pixel sizes.
3. **Clean Initial Connection States**: Reactively track WebSockets using an `eventsState.initialized` flag alongside `eventsState.connected` to eliminate layout flashes (FOUC).
