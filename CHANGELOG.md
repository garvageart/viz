# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.20.6] - 2026-07-26

* fix: replace `user.data` null with undefined (ef488563)

## [0.20.5] - 2026-07-26

* chore(config): remove unused VIZ_PORT and VIZ_HOST env bindings (a5443996)
* docs: add comprehensive environment variables reference (a85dcfd1)
* docs: align design system docs with implemented token values (bd65f743)
* fix(api): remove redundant manual API_PORT env var read (70c6a1be)
* chore(viewfinder): expand design token autocomplete snippets to cover full SCSS system (c7a17b72)
* chore: switch VS Code default formatter to Svelte extension (5e115389)
* feat(admin): improve user management UI and type safety (1e653cb6)
* feat(viewfinder): unify grid virtualisation and fix filmstrip focus loss (1bfa85e8)
* fix: remove fade for nav progress bar (9ed17450)

## [0.20.4] - 2026-07-26

* fix: use explicit paths for git add (2279a50a)
* lmao i'm an idiot (ff58ec96)

## [0.20.3] - 2026-07-26

* fix: update git index before finding diff and import packageJSON directly (3dbe063d)
* fix: minor admin dashboard adjustments (8ad067b4)
* fix: conditionally render labels (eaa105bf)
* style(ui): swap colour and track colour defaults (b27cb2b6)

## [0.20.2] - 2026-07-26

* chore: add new generated icons (84194996)

## [0.20.1] - 2026-07-26

* style: increase header height and change sidebar expanded to rem (48dda3bf)

## [0.20.0] - 2026-07-26

* fix(photos): use correct image count for empty state check (f2f8cef3)
* fix(styles): use direct light-theme status badge colors for all themes (41bad3ab)
* fix(dropdown): prevent item action firing when onSelect callback is present (488c5f86)
* fix(grid): improve virtualization scroll tracking and asset grid layout (32e2a365)
* fix(collections): prevent image_count mismatch when adding images with duplicates (a3f167fb)

## [0.19.1] - 2026-07-26

* feat(photos): add display menu dynamic items and showDates/showBasic toggles (0c0c13bd)
* feat(grid): implement virtualized "basic" grid view with tippy tooltips (6a33c214)
* feat(state): add "basic" view type and showDates/showBasic toggles to ViewSettingsState (ef55bcb2)
* refactor(admin): redesign cache page with ProgressBar and IconButton, add health status indicator (14e60945)
* refactor(ui): extract shared ButtonVariant type, add variant to Dropdown, clean up Header button styles (4a6dd250)

## [0.19.0] - 2026-07-26

* style(viewfinder): use design system spacing variables for asset grid padding and margin (ee204e59)
* fix(ui): resolve navigation sidebar expansion transition stutter (8fd6c7d6)
* feat(viewfinder): redesign admin events page into modular telemetry stream console (e4af8ae2)
* style(ui): improve icon badge contrast and update storage preview tokens (af947474)
* fix: remove padding on active link in sidebar (fb3d641c)
* style(viewfinder): adjust version and build info width in admin dashboard (698392fb)
* docs(rfc): rename protocol to PhoCon and expand TUS acronym (ae270a45)

## [0.18.6] - 2026-07-25

* fix: replace custom sidebar buttons with native material icon buttons (ac05e2ae)
* fix: make MaterialIcon props mandatory (0df54d36)
* fix: swap Button for IconButton (9848ad4f)
* fix: add icons to api key buttons (a2422285)
* refactor: rework api key modal with UI components (28749aa8)
* fix: change photo tooltip edit button to open button (d5e62600)
* feat(auth): add API scopes for session management endpoints (624c2850)

## [0.18.5] - 2026-07-25

* chore: enable prettier caching in package format scripts (a34171e8)
* style(viewfinder): style search button with primary theme color (ce6c0ccb)
* refactor(viewfinder): update CropTools action buttons to component color variants (25c04280)
* feat(viewfinder): add secondary variant styles to button components (3f3381d1)
* chore(fmt): add --log-level warn to workspace prettier format scripts (855b9eee)
* chore(viewfinder): restore local prettier config files and update format scripts (cee7f2c0)

## [0.18.4] - 2026-07-24

* fix(release): push branch and tag atomically to avoid duplicate CI builds (97dd1c53)

## [0.18.3] - 2026-07-24

* fix(utils): return raw ENV value for environment label (0f7a500e)
* fix(release): push branch and tag in single atomic git push invocation (e6ba10ae)

## [0.18.2] - 2026-07-24

* style(ui): enhance active navigation item contrast and bottom border accent (21a628c8)

## [0.18.1] - 2026-07-24

* fix: change default theme back to viz-black and add TODO notice (06b0c097)
* chore: remove personal migration script out of git (01682397)

## [0.18.0] - 2026-07-24

* style(ui): apply Design System 2.0 surface tokens across workspace components, modals & tooltips (7fc3940a)
* style(splashscreen): refine splashscreen logo branding and add stepped dot loader (7ca4c409)
* refactor(admin): standardize layout, icon badges and status controls across admin pages (85ae3483)
* feat(ui): create AvatarBadge and IconBadge reusable UI components (29382290)
* feat(ui): Design System 2.0 theme engine, OKLCH mixins, surface elevation & VS Code theme (a6f740ab)
* fix(api): strip leading slash from path in FrontendHandler and add 404 logging (85b5e2b6)

## [0.17.0] - 2026-07-24

* style(ui): format Svelte components and sort imports (4d5c7c00)
* chore(fmt): fix Svelte plugin order and Prettier monorepo config (57b27906)
* fix(ui): swap old chip for new `Badge` component (80cc1800)
* fix(viewfinder): enable emptyOutDir in vite.config.ts (c20b7e98)
* fix: make inline date tile style conform at 5rem instead of 10rem (e0c24530)
* fix(api): exclude index.html from missing asset check in FrontendHandler (e5174c98)
* fix(viewfinder): handle deployment updates and chunk preload errors (76792c3f)
* fix(api): prevent index.html fallback on missing static assets (a6bc3cb6)
* fix: show completed amount of uploads in minimized form (9fad5471)

## [0.16.1] - 2026-07-22

* fix(viewfinder): adjust upload and download panel z-index below image lightbox (9d59146f)
* fix: show collection name after drag-and-drop upload (12e4f6d3)

## [0.16.0] - 2026-07-22

* style(viewfinder): refine splashscreen loader bar and remove blinking cursor (64f85816)
* feat(viewfinder): create reusable Badge component and integrate across app (ded05296)
* fix(viewfinder): refine photo tooltip exif dials and container layout (dac3ab4e)
* feat(viewfinder): redesign account details dropdown panel (31743bee)
* style(viewfinder): reorganize button component variants (58bae2ee)
* fix: remove viz-100 background colour from modal (523ebb03)
* refactor(viewfinder): add strongly-typed HMR support for modalOptions (6752af45)
* feat(viewfinder): enhance drag and drop upload experience (862476fb)
* feat(viewfinder): persist upload concurrency in IndexedDB (d42e9b09)
* refactor(admin): redesign dashboard layout and introduce card snippet (400936f9)
* feat(admin): redesign Server Information card layout (3ab655f6)

## [0.15.0] - 2026-07-22

* chore: update golang dependencies (d46004d9)
* docs: initialize CHANGELOG.md baseline (a55ac752)
* chore(scripts): improve interactive prompts in release manager (ac0a6246)
* refactor(api): upgrade go-thumbhash to canonical module path (dcf240f4)
* feat(viewfinder): enhance photo grid tooltip with EXIF exposure dials and camera metadata (eca84634)
* feat(viewfinder): rewrite SPA history tracking using SvelteKit history IDs (e5f8b68e)

## [0.14.19] - 2026-07-22
* Initial changelog baseline.
