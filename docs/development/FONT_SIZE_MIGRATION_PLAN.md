# Font Size Migration Plan

**Last Updated:** July 6, 2026

## Purpose
This document outlines the refactoring strategy to shift the `viz` workspace base font size from the browser default of `16px` to a high-density, desktop-app standard of `12px` (matching Adobe Bridge, Capture One, and Darktable). 

This migration establishes a dynamic layout scale. By setting the root `html` font size to `12px` and using relative `rem` units across all spacing and typography, we enable future features such as user-customizable workspace zoom levels (e.g., 60%–140% scaling) and custom base sizes.

---

## Migration Strategy

The migration is split into three phases:

### Phase 1: Shifting the Root Base
The root font size is set in [main.scss](file:///home/ndlov/Programming/Projects/viz/viewfinder/src/lib/styles/scss/main.scss) to `12px` (which makes `1rem = 12px` globally):

```scss
html {
    font-size: 12px;
}
```

### Phase 2: Updating Token Ratios
To prevent existing font styles from collapsing to illegible sizes, we adjust the relative `rem` equations in [_variables.scss](file:///home/ndlov/Programming/Projects/viz/viewfinder/src/lib/styles/scss/_variables.scss) relative to the new `12px` base:

| Token Name | Physical Pixel Target | Value (Relative to 12px Base) |
| :--- | :--- | :--- |
| `$viz-font-size-xs` | `10px` | `0.8333rem` |
| `$viz-font-size-sm` | `11px` | `0.9167rem` |
| `$viz-font-size-std` | `12px` | `1rem` |
| `$viz-font-size-lg` | `14px` | `1.1667rem` |
| `$viz-font-size-xl` | `16px` | `1.3333rem` |
| `$viz-font-size-2xl` | `20px` | `1.6667rem` |
| `$viz-font-size-3xl` | `24px` | `2rem` |
| `$viz-font-size-4xl` | `30px` | `2.5rem` |
| `$viz-font-size-5xl` | `36px` | `3rem` |

### Phase 3: Token Codebase Walk
We run a search-and-replace script across all `.svelte`, `.scss`, `.ts`, and `.js` source files to adjust the tokens to their new pixel equivalents. This keeps all existing UI components identical in size, while resetting the default, unstyled baseline to `12px` (`std`).

**Token Mapping Translation:**
* `var(--viz-font-size-xs)` $\rightarrow$ `var(--viz-font-size-std)` (keeps text at `12px`)
* `var(--viz-font-size-sm)` $\rightarrow$ `var(--viz-font-size-lg)` (keeps text at `14px`)
* `var(--viz-font-size-std)` $\rightarrow$ `var(--viz-font-size-xl)` (keeps text at `16px`)
* `var(--viz-font-size-lg)` $\rightarrow$ `var(--viz-font-size-2xl)` (keeps text at `18px` $\rightarrow$ `20px`)
* `var(--viz-font-size-xl)` $\rightarrow$ `var(--viz-font-size-3xl)` (keeps text at `20px` $\rightarrow$ `24px`)

---

## Using the Migration Tool

The migration script is located in the [tools](file:///home/ndlov/Programming/Projects/viz/viewfinder/tools) directory of the viewfinder project. It executes a single-pass regex replacement to safely avoid cascading matches.

### Running a Dry Run (Safe check)
Run the script with the `--dry-run` or `-d` flag to see exactly which files and lines will be modified, without writing any changes to disk:

```bash
# Change directory to viewfinder
cd viewfinder

# Run the dry run
node tools/migrate-font-sizes.js --dry-run
```

### Performing the Live Migration
When you are ready to apply the changes, run the script without any parameters:

```bash
# Run the migration live
node tools/migrate-font-sizes.js
```

---

## Verifying the Refactor
1. Confirm the compiler / Svelte check runs clean:
   ```bash
   pnpm run check
   ```
2. Verify visual layouts look unchanged under standard conditions, but scale proportionally when setting `<html style="font-size: 11px;">` in the inspector.
