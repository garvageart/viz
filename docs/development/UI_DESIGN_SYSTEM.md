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

## 4. Color & Theme Mix System

The application registers color modes dynamically via the `@mixin register-theme-core` located in `viz-mixins.scss`. It automatically generates custom variables for both `:root[data-theme="light"]` and `:root[data-theme="dark"]`.

### Status Accents
* **Info**: `var(--viz-info-color)` (`#3b82f6`)
* **Success**: `var(--viz-success-color)` (`#22c55e`)
* **Warning**: `var(--viz-warning-color)` (`#facc15`)
* **Error**: `var(--viz-error-color)` (`#ef4444`)

### Theme-Aware Inset Palettes
Rather than hardcoding static grays or whites, the system mixes base colors dynamically using steps (`--viz-100` down to `--viz-5`):
* **`var(--viz-100)`**: The primary background color.
* **`var(--viz-95)`**: Soft overlay color (card backgrounds, toast alerts).
* **`var(--viz-90)`**: Subsection backgrounds (header bars, toolbar fills).
* **`var(--viz-80)`**: Hover backgrounds.
* **`var(--viz-60)`**: Hairline border frames.
* **`var(--viz-40)` / `var(--viz-30)`**: Secondary/muted text.

### Relative Color-Mix Blending
To prevent accessibility contrast failure across themes, overlay components utilize native CSS `color-mix()` blending against active theme bases:
```scss
// Blends status color with the background for cohesive, accessible container tinting
background-color: color-mix(in srgb, var(--toast-accent-color) 25%, var(--viz-95));
border: 1px solid color-mix(in srgb, var(--toast-accent-color) 45%, var(--viz-60));
```

---

## 5. Standard Component Guidelines

### Input Fields (`InputText`, `InputSelect`, `InputPassword`)
1. **Dimensions**: All inputs must feature a `min-height: 2.5rem` density height to enforce form alignment.
2. **Labeling**: Labels sit above inputs using `--viz-font-size-sm` (`0.875rem`) in semi-bold `var(--viz-40)`. If required, place a red `*` (`--viz-error-color`) to the right of the text.
3. **Borders**: Render flat bottom borders using `box-shadow: 0 -1px 0 var(--viz-60) inset` to achieve crisp editorial hairlines. On focus, transition to `box-shadow: 0 -2px 0 var(--viz-primary) inset`.
4. **Icons**: All dropdown icons and visibility toggles must be positioned absolutely on the right and colored neutrally (`var(--viz-text-color)`) with a minor opacity offset (`0.75`) to avoid text overlap.

### Buttons (`Button`, `IconButton`)
1. **Interactive Styling**: Always use `border-radius: var(--viz-border-radius-pill)` for buttons.
2. **Access Indicator**: Include `:focus-visible` outlines mapping to a double outline ring:
   ```scss
   &:focus-visible {
       box-shadow: 0 0 0 2px var(--viz-bg-color), 0 0 0 4px var(--viz-primary);
   }
   ```

### Header Navigation Density
To maximize professional DAM screen workspace, the main header navigation is designed strictly at **`2rem`** (`32px`) height. Icons inside the header reside at a compact **`0.8rem`** sizing to ensure high-density toolbars.

### Toast Notifications
* Toast card containers float bottom-right and use rounded borders (`var(--viz-border-radius-md)`).
* Cards must use high-contrast neutral text overlays and neutral card backgrounds (`var(--viz-95)` / `var(--viz-90)`).
* Visual categorizations are color-coded **only** in the status indicator strips (`4px` left borders) and matching minor category icons to ensure perfect AA contrast ratios.

---

## 6. Development Conventions

1. **No Inline Styling**: Inline `style="..."` statements are strictly forbidden as they override theme variables. Write clean, scoped SCSS blocks inside Svelte components.
2. **Use Relative tokens**: Always reference `var(--viz-spacing-*)` and `var(--viz-font-size-*)` tokens for all layout geometry. Do not commit hardcoded pixel sizes.
3. **Clean Initial Connection States**: Reactively track WebSockets using an `eventsState.initialized` flag alongside `eventsState.connected` to eliminate brief layout flashes (FOUC) on client-side loading.
