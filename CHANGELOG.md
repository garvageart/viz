# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.26.5] - 2026-07-31

* fix(viewfinder): match collection name input to display and prevent edit shift (757f360c)
* fix(docker): add apt retries to base image install (3abf887c)

## [0.26.4] - 2026-07-31

* fix: add overflow auto to clip image (3a849eea)
* fix(viewfinder): wrap keyboard navigation to next grid row (ced531ad)
* feat(docker): bake go module cache into viz-base (e5147877)
* feat(docker): bake frontend dependencies into a registry image (2e353471)
* fix(docker): make server the default build target (4de19386)

## [0.26.3] - 2026-07-31

* style(viewfinder): polish onboarding flow (8ba24afb)
* fix(viewfinder): use danger variant for permanent delete button (bf6f8878)
* feat(viewfinder): resolve modal options per instance at render time (2c545035)
* docs: document deployment variables and refresh .env.example (40949fef)
* feat(docker): bake db init scripts into image and rename Dockerfile.server (b6f9530f)

## [0.26.2] - 2026-07-31

* fix: clean up asset grid styles (1be6cc5a)

## [0.26.1] - 2026-07-31

* fix: copy only necessary files (2a897417)

## [0.26.0] - 2026-07-31

* fix: copy everything (64d0d72e)
* fix: ugh (40261541)
* fix: copy Makefile in backend-builder (0e7bece7)
* fix: copy Makefile into docker (33b67654)
* fix: add `fmt-check-go` to .PHONY (b64854f3)
* fix: avoid building into read only mount (2bd08993)
* fix(docker): copy /usr/include from builder into viz-base final stage (a936fdd1)
* fix(docker): copy /usr/share/pkgconfig from builder into viz-base final stage (c699a0e5)

## [0.25.4] - 2026-07-30

* feat(scripts): prompt to stash uncommitted changes during release and display pop reminder (4d8a32ca)
* chore(docker): parameterize registry URLs and add base image build targets (d079775e)
* fix: going back to what i know works (589d07a0)
* fix: forgot corepack install (2127207d)

## [0.25.3] - 2026-07-30

* fix: more docker stuff (544a14da)

## [0.25.2] - 2026-07-30

* fix: small adjustments (fe040e3d)

## [0.25.1] - 2026-07-30

* fix(viewfinder): update Filmstrip component to use resolution prop (9e5686b1)

## [0.25.0] - 2026-07-30

* feat(viewfinder): add getImageGridDisplay context menu builder for grid view options (a8c8d0fb)
* docs(project): add note for Admin UI Missing Files Inspector feature (bd4cf0f5)
* fix(viewfinder): improve photo camera EXIF model label and SearchInput focus outline (0c4e640b)
* refactor(viewfinder): update grid and workspace panels to use resolution prop (615026c0)
* refactor(viewfinder): rename AssetImage prop to resolution and update ImageCard variants (f23a2005)
* refactor(viewfinder): simplify view settings state and route options (1182608c)
* fix(docker): move apt docker-clean removal into separate layer for persistent deb caching (52e10fc8)
* fix(docker): silence chown stderr when probing volume POSIX support in entrypoint (bc5d1ca9)
* perf(docker): add BuildKit npm cache mount for corepack installation (391a48d8)
* fix(docker): add fallback for non-POSIX exFAT/NTFS volume mounts in entrypoint (8083ac21)

## [0.24.1] - 2026-07-30

* fix(docker): optimize BuildKit cache mounts and entrypoint volume permissions (98fcb513)

## [0.24.0] - 2026-07-30

* refactor(viewfinder): update +layout.ts load function to pass fetch explicitly (71face4d)
* refactor(viewfinder): clean up job concurrency stubs and forward RequestOpts in auth methods (550bece6)
* fix(viewfinder): resolve real-time WebSocket UI invalidation using DataKeys dependency enum (380c8b26)
* perf(docker): unify BuildKit cache mounts under id=viz-cache and remove hardcoded BASE_DIRECTORY (e8608bf6)
* fix(tools): fix trailing whitespace in generated MaterialSymbol type definition (ca970781)
* fix: make favourite badge size optional (7ac8ff0e)
* chore(dev): fix render time measurement calculation (704086eb)
* fix(docker): install corepack globally in Dockerfile.server (186a5863)
* fix(viewfinder): update collection selection modal options and lightbox resolution (515222ae)
* feat(ui): update favourite star icon and favourite badge component (89eab2df)
* fix(viewfinder): update layout initialization and runtime config bindings (151996df)
* perf(docker): unify BuildKit cache mounts under id=viz-cache (073abc92)
* refactor(viewfinder): improve component lifecycle and event handling (e5c87d31)
* refactor(viewfinder): isolate PhotoAssetGrid and compose customSnippet in AssetGrid (b3b85c53)
* refactor(viewfinder): eliminate as any type casts across frontend state and components (36d7f8f6)

## [0.23.11] - 2026-07-29

* perf(docker): unify BuildKit cache mounts under id=viz-cache (d0765efd)

## [0.23.10] - 2026-07-29

* chore(build): update Vite watch config and Go workspace sum (d508dde1)
* ui(viewfinder): update StorageTemplateSettings layout and admin cache metrics (1912e841)
* refactor(viewfinder): auto-bind fetch in API client and use sendVizAPIRequest in load functions (a69662b2)

## [0.23.9] - 2026-07-29

* perf(docker): optimize Dockerfile layer order and build context for fast CI caching (de36c48d)

## [0.23.8] - 2026-07-29

* fix(viewfinder): fix grid column fluid scaling and single item layout (02a5e3cc)
* fix(viewfinder): use synchronous derived icon lookup in MaterialIcon to eliminate text flash (0ee77ee6)

## [0.23.7] - 2026-07-29

* fix(docker): copy viewfinder source code before pnpm install in Dockerfile.server (161447ce)

## [0.23.6] - 2026-07-29

* refactor(viewfinder): update WebSocket event resource targets and load fetch contexts (e1324b81)
* ci(docker): disable docker-clean and enable apt archive caching in Dockerfile.server (152d13cb)
* fix(docker): add --prod=false to pnpm install in Dockerfile.server (10c916c9)

## [0.23.5] - 2026-07-28

* chore: update golang packages (65153e62)
* ci(docker): add -x flag to go mod download in Dockerfile.server (073928f4)
* ci(docker): add Go module and build cache mounts to Dockerfile.server (f62ca697)
* ci(docker): set NPM_CONFIG_STORE_DIR to match BuildKit cache mount path (f627cb0c)
* ci(docker): add npm fetch retry flags to pnpm installation in Dockerfile.server (9576a092)
* ci(docker): optimize layer caching order and add BuildKit apt and libvips compilation mounts (8477d072)

## [0.23.4] - 2026-07-28

* style(viewfinder): remove fixed font size from TextArea label (f6a4ee69)
* style(viewfinder): update CollectionCard placeholder icon and drop target border (7640569b)
* style(viewfinder): reduce default modal dialog width to 40% (1115ce8b)
* style(viewfinder): update CollectionModal submit button variant to info (1be99522)
* feat(viewfinder): add buttonVariant prop to ConfirmationModal (75e5b011)
* refactor(viewfinder): pass resourcePath argument to debouncedInvalidate in eventsState (fce4adab)
* refactor(viewfinder): optimize websocket event invalidation to prevent photo grid resets (b224b28b)

## [0.23.3] - 2026-07-28

* ci(docker): increase pnpm fetch timeout and enable store cache mount (c22158d8)

## [0.23.2] - 2026-07-28

* style(viewfinder): bold deleted collection names in success toast notifications (5d1d3858)
* refactor(viewfinder): rename icon to iconName in context menus and admin routes (93e241c3)
* style(viewfinder): refine PhotoAssetGrid, CollectionCard, and DownloadPanel UI (b15add1b)
* fix(viewfinder): simplify IconButton reactivity and update generated icon exports (68adf3b5)
* refactor(viewfinder): rename icon to iconName across component props (43bc6357)

## [0.23.1] - 2026-07-28

* fix: use base directory variable (68a3b4b3)
* refactor(images): use modern atomic types for cache metrics tracking (0f9f06cd)
* feat(api): log established storage, library, trash, and log paths on server startup (62936408)
* fix(viewfinder): use minmax for grid columns to prevent dashboard layout overflow (b9af8469)
* perf(api): perform duplicate checksum check before libvips processing (88761da0)
* fix: set host and port and remove double port config (973f223f)

## [0.23.0] - 2026-07-28

* chore: update env, gitignore, docker-compose, and docs (0066a37c)
* chore(api): update OpenAPI spec and regenerate types (20d4ab88)
* feat(settings): add colour_scheme default setting (efdd3128)
* feat(frontend): add frontend constants package (e1918d0a)
* refactor(api): use consolidated config and new package structure (ef6fc007)
* refactor(images): simplify init, rename Directory to Library (65c06b82)
* refactor(db): move query helpers to internal/db/queries (85b87fd1)
* refactor(http): extract CORS, URL validation, and DB helpers into subpackages (742b4135)
* refactor(config): consolidate config init and flatten server structure (a79cc8e0)
* refactor(os): fix ProjectRoot detection and extract directory helpers (888f4d02)

## [0.22.10] - 2026-07-28

* fix: remove the actual colour lmao (194283aa)

## [0.22.9] - 2026-07-28

* fix: remove secondary border line (d287b6e0)

## [0.22.8] - 2026-07-28

* style(header): update border color and button spacing (ba061b00)
* feat(photos): compact selection toolbar on mobile (16d61de5)
* feat(grid): improve mobile photo grid layout (c9976db5)
* fix(dropdown): correct hideTitleState and IconButton children detection (00020269)
* feat(grid): add long-press to select on mobile (3fd87fc8)

## [0.22.7] - 2026-07-27

* fix: AssetGrid items not taking up full width of row (9bea9596)

## [0.22.6] - 2026-07-27

* fix: restore ThemeContextMenu for account panel and header (9030f1ad)
* fix: ugh placeholder fixed (b560c5f4)
* fix: minor workspace tab adjustments (12836825)
* chore: remove menu specifc components (132a8cea)
* fix: centralise workspace items in context-menu directory (5cef7cba)
* fix: harden path match (cabaa926)
* fix: avoid showing relative dates under two minutes (a8edae66)

## [0.22.5] - 2026-07-27

* fix: increase the photoTooltip delay (46e7ef57)
* fix(grid): add missing max-width-column CSS class (5d2c87a6)
* fix(grid): cap column width at itemWidth in virtualizer (bc5f7944)
* fix(ui): collection card min-width overriding grid layout (4e922c84)
* fix(api): handle NULL private field in collections (4c324100)

## [0.22.4] - 2026-07-27

* fix(api): populate user context on API key auth (91f21637)

## [0.22.3] - 2026-07-27

* fix(security): fix CORS allowed hosts wildcard matching and add comprehensive tests (71592547)

## [0.22.2] - 2026-07-27

* chore(images): add wasm-vips test suite TODO and JPEG interlace notes (3c18810c)
* feat(ui): add standard size to LoadingSpinner (51f55bda)
* feat(ui): add weight prop to Badge and restyle CollectionCard badge (3214fadf)
* feat(core): add reactive isMobile state and migrate from static IS_MOBILE constants (5440680e)
* feat(ui): extract ViewsContextMenu and add views submenu to mobile AppMenu (5fbfbb08)

## [0.22.1] - 2026-07-27

* fix(db): lazily initialise IndexedDB connection in DbSettings (01177f83)
* chore(release): bump version to 0.22.0 (0316f4a1)
* feat(config): configurable allowed hosts for API CORS and Vite dev server (79060e1d)
* fix(ui): batch rename HTML entity decoding and CSS cleanup (b43b4e8f)
* feat(ui): mobile lightbox swipe navigation and tooltip suppression (77e0903e)
* feat(ui): mobile responsive layouts for panels, calendar, and collections (b0284cd3)
* feat(ui): fill slider track up to current value (1127e121)
* fix(export): optimise JPEG encoding and add server-side fallback (12a22c82)

## [0.22.0] - 2026-07-27

* feat(config): configurable allowed hosts for API CORS and Vite dev server (79060e1d)
* fix(ui): batch rename HTML entity decoding and CSS cleanup (b43b4e8f)
* feat(ui): mobile lightbox swipe navigation and tooltip suppression (77e0903e)
* feat(ui): mobile responsive layouts for panels, calendar, and collections (b0284cd3)
* feat(ui): fill slider track up to current value (1127e121)
* fix(export): optimise JPEG encoding and add server-side fallback (12a22c82)

## [0.21.0] - 2026-07-27

* feat(ui): animate splash screen dots between accent and text-secondary colors (5833ea27)

## [0.20.7] - 2026-07-27

* fix: auto-confirm release by default (96033d39)
* feat(ui): add pull-to-refresh for mobile (e105120b)
* fix(ui): move image label into tooltip metadata row (1dd51284)
* feat(ui): mobile responsive sidebar, workspace defaults, tabs, and modals (0c3672fe)
* feat(ui): mobile responsive toolbars across asset pages (62eba427)
* feat(ui): mobile responsive header with theme toggle in account panel (323342f8)
* feat(ui): extract ThemeContextMenu component and add Dropdown hideTitle prop (4ea265dd)
* feat(ui): add IS_MOBILE_VIEWPORT constant and LoadingSpinner size variants (3c6aa398)
* test(viewfinder): add unit tests for PhotoGridVirtualizer (6b61729b)

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
