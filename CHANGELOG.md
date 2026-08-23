# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.32.3] - 2026-08-23

* ci: use docker manifest inspect for base and deps cache checks (adbd06a0)

## [0.32.2] - 2026-08-23

* ci: dynamic workflow run-name defaulting to commit message (d75d2bb9)
* ci: add workflow concurrency group and native forgejo release action (066753be)
* ci: replace buildx --push with explicit docker push commands (ed76d235)

## [0.32.1] - 2026-08-23

* refactor(viewfinder): streamline DragAndDropUpload actions and include duplicate uploads in collections (a6327bec)
* refactor(api): align collection private properties to non-nullable boolean (d6ab7670)
* feat(viewfinder/panels): align upload and download panels and enlarge minimized state (444ce466)
* refactor(viewfinder/download): separate download domain state and standardize predicates (ccf55c77)
* feat(viewfinder/ui): add accessible InputNumber component (3d3391da)
* ci: add Forgejo Actions workflow for building, testing, and container packaging (f2c36347)

## [0.32.0] - 2026-08-23

* docs: document standardized z-index elevation scale in design system (ccac5a9f)
* feat(ui): standardize elevation and z-index design tokens across frontend (9b93854b)
* fix(viewfinder): fix z-index stacking for upload and download panels over splitters (8fae7a7f)
* fix(viewfinder): correct conditional check for superadmin onboarding flow (118ff012)
* test(e2e): add login fallback check after onboarding in auth setup (d8bdda66)
* refactor: remove 200 delay from invalidateViz (361d0fab)
* chore: add updated generated files (4f0370e6)
* fix(api): use selective revalidation in system cache middleware and update user state on setup (b0d59836)
* docs: remove `IconButton` reference and document formatting (01268864)
* style(viewfinder): polish workspace drop zone debug overlays (7b95a83a)
* style(viewfinder): refine onboarding route styling and button hierarchy (e95c7d90)
* feat(config): inject public config into window and broadcast live updates (83855b0c)
* fix(scripts): add scripts package.json to release cleanup routine (34d8d88a)
* refactor(db): decouple goose runner with fs.FS and add run-once tracked backfills (5ccaaa29)
* refactor(db): execute backfills inside transactional step runner with dynamic reflection (ef4e6364)
* feat(migrations): add pure-Go migration generator and original_file_name migration (93b14583)
* refactor(db): centralize data backfills and manual migrations (638444cd)
* refactor(entities): centralize entity models registry (e97cfa54)

## [0.31.18] - 2026-08-20

* fix(viewfinder): improve lightbox background customizability and dynamic crop padding (272dae4c)
* docs(ui): add guideline against fallback values in design system CSS variables (57fa84eb)
* refactor(api): move TypeScript API client and scopes generation to packages/api (a4dfe63b)
* feat(genentities): support read-only property tags and add dedicated original_file_name column (d2312129)

## [0.31.17] - 2026-08-20

* fix: have a fixed width for ImageLightbox side panel (b1b91280)

## [0.31.16] - 2026-08-19

* fix(viewfinder): prevent lightbox side-panel squishing on smaller viewports (db2a97f8)
* feat(viewfinder): enhance batch rename builder UI, export validation, and test coverage (da8ede5c)
* feat(viewfinder): create reusable EditableText component and integrate into MetadataPanel (12a2a73d)
* feat(viewfinder): improve grid keyboard navigation, multi-select UI, and tooltip handling (4496a0b2)

## [0.31.15] - 2026-08-19

* chore(viewfinder): regenerate icon components and MaterialSymbol type definitions (d19f6ee9)
* refactor(viewfinder): update icon names to standard Material Symbols (dd70b3bb)
* feat(viewfinder): implement shared AST icon scanner and update MaterialIcon unit tests (f78fb3cb)
* style(viewfinder): reduce toast notification dimensions and font sizing (5f2a74e4)

## [0.31.14] - 2026-08-18

* fix(ui): preserve cropped container bounds and keep Info toggle visible in lightbox (eaf6667e)

## [0.31.13] - 2026-08-18

* test(viewfinder): add thumbnail and original variants to makeImage test fixture (687a9ee5)

## [0.31.12] - 2026-08-18

* fix(ui): add 15 percent min-height to ImagePreview container (3814de7f)
* chore(ui): remove redundant lightbox preloader from PhotoAssetGrid (4365ecac)
* fix(histogram): transfer ImageBitmap to worker without worker fetch (bedf80cc)
* fix(ui): return undefined for empty lightbox URLs to prevent ETag pollution (2a5078bb)
* fix(ui): position src before rest props in AssetImage to prevent re-triggers (af62f492)
* fix(viewfinder): use URLSearchParams without base URL in withVersion helper (8117ed3b)
* feat(api): use URLSearchParams without base URL in getAssetImagePath (1e3591f3)
* fix(api): align HTTP caching headers and sanitize URI checks (7d444935)

## [0.31.11] - 2026-08-18

* feat(api): add getAssetImagePath helper and unify versioned image caching (90a17418)
* feat(viewfinder): attach native WASM progress feedback and implement step-map pipeline (72686df8)

## [0.31.10] - 2026-08-18

* feat(viewfinder): implement dynamic step-map WASM image processing, progress tracking, and e2e tests (2e8b5c0a)
* fix(api): default API base URL to relative /api and include @viz/api in release script (8bcff98b)

## [0.31.9] - 2026-08-18

* fix(viewfinder): refine lightbox header layout, title ellipsis, and crop canvas alignment (0f7beb93)

## [0.31.8] - 2026-08-18

* fix(viewfinder): eliminate layout shift and stretch in lightbox using native CSS and AssetImage (20562dc4)

## [0.31.7] - 2026-08-18

* refactor(images): modernize loop constructs in dhash_test.go (7a23e284)
* fix(e2e): adjust photo grid scroll and layout split assertions for 1080p viewport (0c4a0aa8)
* feat(images): add storage mount validation via sentinel file (12158b88)

## [0.31.6] - 2026-08-18

* fix(viewfinder): enforce 1920x1080 viewport and fix lightbox backdrop E2E test (db8bcf5d)

## [0.31.5] - 2026-08-18

* feat(workers): enhance XMP sidecar generation and EXIF reading for Lightroom and Capture One (830cea57)
* feat(xmp): add Lightroom namespace model and enhance Camera Raw settings (e7c8681f)
* refactor(viewfinder): decouple grid shouldKeepSelection logic and isolate tooltips during hotkey scope shifts (283584fd)
* feat(viewfinder): add Ctrl+Enter shortcut for saving description in metadata panel (98d5028c)
* refactor(viewfinder): refine lightbox aspect scaling, crop overlay alignment and hotkey scope isolation (4f7af35a)

## [0.31.4] - 2026-08-17

* style(viewfinder): polish collection action buttons and title display (abaf2dce)
* style(viewfinder): refine photo tooltip description clamping and metadata rendering (77408c6f)
* fix(api): trim file extensions from image asset names (ca1cb957)

## [0.31.3] - 2026-08-17

* fix(docker): copy packages/api manifest and source files in Dockerfile (0b99bbd0)
* style(ui): improve tooltip viewport positioning and native styling (c696d94a)

## [0.31.2] - 2026-08-17

* refactor(viewfinder): clean up drag and drop and tab ops imports (46de6f11)
* fix(api): introduce initApi helper and dynamic baseUrl resolution (088a058d)

## [0.31.1] - 2026-08-17

* refactor(scripts): update ingest script to consume @viz/api (382c8577)
* refactor(viewfinder): update api imports to @viz/api workspace package (27967f03)
* feat(api): extract @viz/api into standalone workspace package (8c42545d)
* refactor(scripts): resolve typescript types and enforce control flow formatting in stock photo script (b0a234ca)
* feat(viewfinder): redesign PhotoTooltip metadata layout and integrate AssetImage in AssetGrid (ae2b9ac8)
* feat(viewfinder): refactor inline editing and description save in MetadataPanel (e595d820)
* feat(scripts): enhance stock photo ingestion script with platform CLI flags and EXIF writing (51463edb)
* refactor(viewfinder): simplify original image extension parsing in vips transform (cea4230f)
* fix(api): fallback GetTakenAt to time.Now() when CreatedAt is zero (16b1ddf1)

## [0.31.0] - 2026-08-16

* fix(ui): add selector classes to header nav buttons (c795455b)
* fix(e2e): update selectors for unified Button migration (160f4306)
* fix(e2e): configure API client base URL in security tests and teardown (1c68ced7)
* chore: rename stock photo ingest script (591436a8)
* refactor(ui): migrate all consumers from IconButton to Button (2e842a61)
* refactor(ui): unify Button component with link and icon support (f7df0c6f)
* test(e2e): add security E2E and unit tests (150bf871)
* test: add guard tests for security fixes (325ad2e4)
* fix(docker): require explicit database credentials (26910e6d)
* fix(setup): remove sessionToken from superadmin setup response (356b274e)
* fix(cors): add X-Download-Password to allowed headers (10db2771)
* fix(security): default SameSite cookies to Strict (cac650a2)
* fix(websocket): restrict origins to localhost in dev mode (8ec5fee2)
* fix(accounts): require auth on user profile endpoint (136552d2)
* fix(auth): uniform login errors and OAuth state validation (69f4742e)
* fix(images): address multiple security findings in image handling (4dfd7270)

## [0.30.9] - 2026-08-13

* fix(viewfinder): fix hotkey key-direction evaluation and DOM element focus in grid keyboard navigation (b05f754e)

## [0.30.8] - 2026-08-12

* feat(storage): update default storage path template to flat asset UID layout (7939adc4)
* fix(viewfinder): align focusing, scrolling, and keyboard navigation in AssetGrid (001b0068)

## [0.30.7] - 2026-08-12

* fix(viewfinder): refactor photo grid selection, viewport scrolling, and keyboard navigation (3e3d5917)
* feat(viewfinder): add getRowForAsset helper to PhotoGridVirtualizer (8bdb4894)
* feat(viewfinder): add selectRange helper to SelectionScope (61ddb8ea)
* fix(viewfinder): pass Alt and Shift modifiers to crop calculation and add unit tests (f5b22f72)

## [0.30.6] - 2026-08-12

* build(docker): bake server runtime libs into base image (66bdd2bf)

## [0.30.5] - 2026-08-12

* docs: update DOM querying guidelines in AGENTS.md (9a29b861)
* style(viewfinder): update asset grid container queries, image preview styles, and context menu separator (21c1bd8d)
* test(viewfinder): add unit and e2e test coverage for tab operations and overlay cleanup (9908cb15)
* feat(viewfinder): refactor tab drag-and-drop spatial drop zones and debug overlays (a1a2734d)

## [0.30.4] - 2026-08-11

* fix(viewfinder): update selection scope sync in grid and card hover styling (3480f95a)
* refactor(viewfinder): clean up filmstrip item selection, keydown, and lightbox navigation (1b9d2c14)
* perf(viewfinder): optimize histogram calculation and worker caching (4bfb251a)

## [0.30.3] - 2026-08-11

* fix(viewfinder): refresh AssetGrid layout when data changes (daf8b8ad)

## [0.30.2] - 2026-08-11

* chore(viewfinder): bump frontend dependencies (c7716899)
* test(viewfinder): expect single-arg dismiss in ConfirmationModal test (922df275)
* refactor(viewfinder): move DataTransfer file extraction to utils and add tests (d1378bb3)
* refactor(viewfinder): reduce grid and lightbox complexity (b4d75614)

## [0.30.1] - 2026-08-11

* chore(viewfinder): document timezone and date-picker TODOs (890f3103)
* chore(viewfinder): enable noUnusedLocals and remove unused code (38be1162)
* refactor(viewfinder): clean up ImageLightbox and remove dead code (4bbbb196)
* fix(viewfinder): stop double-advance in lightbox arrow navigation (c2577066)
* fix(viewfinder): close websocket gracefully on page unload (e5b229cb)
* fix: remove all `typeof window !== "undefined"` type guards. this is a SPA (1f6e8109)
* fix: it was way too big (bd002026)

## [0.30.0] - 2026-08-11

* style(ui): small visual tweaks to background, image card, and context menu (8d4ba5db)
* chore(ui): restore lowercase sidebar components (6dbd7025)
* refactor(ui): lowercase the Sidebar directory (06cd2e25)
* feat(ui): add workspace metadata panel wrapper (484c8508)
* test: add image utils coverage and harden icon generation spec (c20a3a84)
* feat(ui): shared NoImageSelected empty state and image asset guard (1870074c)
* feat(histogram): rework histogram with worker-accelerated computation and a declarative SVG panel (ff1f0da8)

## [0.29.4] - 2026-08-10

* chore(icons): regenerate icons (4207f905)
* refactor(ui): consolidate sidebar toggle into a single icon button (e332430d)
* ui: remove "Created" from collection date badge (fc43de09)
* fix(ui): stop workspace views dropdown from adopting the selected view as its title (e55e2b52)
* chore(release): bump version to 0.29.3 (f0ffef09)
* test(e2e): retry flaky tests once (d05e35e4)
* style(ui): remove redundant metadata editor background (68bf40f4)
* fix(ui): align icon-only badge height with text badges (f9f55d3b)
* refactor(workspace): derive layout-persistence tracking from toJSON and tidy init (6f7d4656)
* fix(workspace): prevent edge-drop zone from hijacking tab drags near the workspace edge (a59ca39b)
* feat(workspace): add dedicated Clock panel with live time, date, and timezone (479b5e73)

## [0.29.3] - 2026-08-10

* test(e2e): retry flaky tests once (d05e35e4)
* style(ui): remove redundant metadata editor background (68bf40f4)
* fix(ui): align icon-only badge height with text badges (f9f55d3b)
* refactor(workspace): derive layout-persistence tracking from toJSON and tidy init (6f7d4656)
* fix(workspace): prevent edge-drop zone from hijacking tab drags near the workspace edge (a59ca39b)
* feat(workspace): add dedicated Clock panel with live time, date, and timezone (479b5e73)

## [0.29.2] - 2026-08-10

* style(ui): polish crop tools, lightbox side panel, badges, and grid padding (6841f3b9)
* test(e2e): use $lib alias import in helpers (c114ee30)
* feat(metadata): support selection-driven mode alongside prop-based mode (cab7f4d6)
* fix(menu): make mobile workspace views submenu disabled states reactive (1603df94)
* fix(preview): use sharp thumbnail placeholder and eager loading to remove image flash (20081a8a)
* fix(selection): resolve active-scope reactivity and add bulk uid removal (85676c18)
* refactor(workspace): modularize collection tab handling and open-collection menu item (126a1190)
* feat(workspace): add root-level columns and rows via edge drag and header menu (6292c1e4)

## [0.29.1] - 2026-08-09

* test(e2e): configure fixed 1920x1080 viewport size in playwright config (c0d53744)
* test(e2e): seed sample collection and fix strict mode locator in upload test (33466024)
* style(viewfinder): enlarge toast notification container and typography (db1f0e03)
* feat(viewfinder): refine E2E auth setup, teardown state, and conditional registration UI (10d74f8c)
* feat(api): cascade-delete user collections and nullify image ownership in HardDeleteUser (58054ae3)
* build(docker): remove Playwright browser download from frontend-builder stage (0bdcdee7)
* fix(docker): define alias stage for FRONTEND_BUILDER_IMAGE to resolve buildx variable expansion issue (2de82e82)
* fix(docker, test): reuse pre-built frontend image and replace networkidle in auth setup (bbfce6c9)
* fix(docker, test): configure global PLAYWRIGHT_BROWSERS_PATH and stabilize auth setup wait condition (25ef46bb)
* test(viewfinder): verify skip-to-main focus navigation across auth and app routes (5bd7a0de)
* feat(viewfinder): elevate skip-to-main link to root layout and enforce single main landmark rule (926d105c)
* fix(docker, test): track sample image DSCF0355.jpg and update test paths (8ea7d38f)

## [0.29.0] - 2026-08-08

* chore(viewfinder): add test:e2e:prod-build script to package.json (734ca107)
* test(viewfinder): verify thumbhash decoding via thumbhash library and resolve lightbox E2E interactions (867597ee)
* test(viewfinder): E2E test suite reliability, Playwright setup, and selectors (42a9c85d)
* fix(viewfinder): UI components, context menu focus states, and build tool scripts (ef4680ef)
* refactor(viewfinder): core SPA application architecture and reactive state management (4993543d)
* fix(viewfinder): Web Worker bundling, WASM-VIPS transferability, and export pipeline (b81ee974)
* fix(viewfinder): optimize Playwright E2E test setup, admin permissions, and CI retries (83ad89c4)
* chore: remove generate icons from build command (1e20f6a9)
* fix(viewfinder): fill email and password inputs during onboarding E2E test setup (78cc0ecd)
* fix(docker): handle empty REGISTRY_URL cleanly in Dockerfile ARGs (0b67983e)
* fix(docker): remove in-docker playwright installation to prevent build OOM kills (7b6a18aa)

## [0.28.7] - 2026-08-06

* fix(docker): use workspace pnpm exec playwright in frontend-deps stage (24e0f261)

## [0.28.6] - 2026-08-06

* ci(docker): pre-install playwright chromium and dependencies in frontend-deps stage (7ce20e5c)

## [0.28.5] - 2026-08-06

* fix(viewfinder): update MaterialIcon component and resetUserSetting string argument in settings components (f3a0918d)

## [0.28.4] - 2026-08-06

* fix(build): update check-go in makefile to type-check all go workspace modules (e524ea6a)
* feat(viewfinder): add reset button and URL slugification to settings system (90c90a2e)
* feat(api): implement boolean normalization and delete setting override route (42be7d18)
* refactor(tests): centralize in-memory test database setup into internal/tests (b77b5558)
* feat(api): add setting override reset endpoint and is_overridden field to openapi spec (7ae4e7cf)
* chore: replace `interface{}` with `any` (64565902)
* chore: replace utils.StringPtr with new (0537c729)
* chore: leave note for download token TTL configuration (66f03363)
* feat(api): add websocket broadcasting to image routes and remove nil guards (97bb8dcd)
* refactor(viewfinder): remove stale settings types, enums, and unused components (8cced0d1)
* fix(api): ensure display_name is populated for all settings (b8683191)
* fix: remove more explict typing on grid props (b9d18d15)
* fix: remove old unncessary code for max retries grid rendering (4ed40884)
* fix: wrap justified layout in div to apply padding (a237e358)
* fix: remove explicit typing on PhotoAssetGrid prop values (2a0206c9)

## [0.28.3] - 2026-08-04

* refactor(ui): move export panel heading into modal options (804df4d5)
* fix(grid): anchor timeline scrubber to grid-container (f2180268)
* fix(ui): keep Add to Collection drag-into highlight on child transitions (44db9a67)
* chore(release): bump version to 0.28.2 (0466f619)
* test(e2e): cover sort persistence across photos pagination (f4130b2a)
* fix(states): hydrate persisted settings before page loads use them (2bf7746e)
* feat(ui): replace handwritten tables with reusable Table component (74e60bd2)

## [0.28.2] - 2026-08-04

* test(e2e): cover sort persistence across photos pagination (f4130b2a)
* fix(states): hydrate persisted settings before page loads use them (2bf7746e)
* feat(ui): replace handwritten tables with reusable Table component (74e60bd2)

## [0.28.1] - 2026-08-03

* refactor(ui): drop SvelteSnippet alias in favour of svelte's Snippet type (2c63e429)
* refactor(ui): trim ImageLightbox unused imports and debug panel style (81914853)
* style(ui): refine accent borders on panel and header link (2b4cd1b9)
* feat(ui): add small checkbox variant for context menu items (39cdb90e)
* feat(ui): independent per-section sort state backed by IndexedDB (27778f15)

## [0.28.0] - 2026-08-03

* docs: add user settings planning document (d3056810)
* style(ui): colour token and accessibility cleanup (1b265d41)
* refactor(ui): TableColumnSelectorModal row snippet and Checkbox (912b91e0)
* feat(ui): show favourite indicator on collection cards (d7bc6b05)
* fix(ui): preserve caller style prop on Button and IconButton (e7c69a31)
* feat(ui): confirmation modal colour variants, form submit, and focus trap (4f710a41)
* fix(ui): compute filter facets from the full loaded set regardless of view (a1b507e2)
* feat(ui): accent & secondary colour usage rules and decorative flourishes (6369ab87)
* chore: add github.com/tphakala/simd library to explore SIMD explorations in the Golang codebase (e3bf4eaa)
* refactor: show full date on relative date string title (4bd423cb)

## [0.27.0] - 2026-08-02

* refactor(ui): export and reuse input select option types (248b3b7b)
* fix(api): persist last_used_at on api key authentication (2f2e6bf8)
* chore: don't save processed thumbanail to disk (db67a93d)
* fix: delegate image background colour to image card (b8f6a7ff)
* fix: properly type seperator by narrowing prop type (878350c2)
* fix: properly type seperator (sort of) (a31d1e21)
* fix: add seperator by delete icon for collection images (87e8f6da)
* fix(ui): use surface-panel background for TextArea (8a6ddd82)
* fix(ui): apply exif-description styles to MetadataPanel textarea (2a56bfbf)
* docs(project): update NOTES.md (bd582370)
* fix(ui): align SliderToggle border to primary color (376f4b2e)
* feat(ui): enhance TextArea stability and add tests (a0afbc63)
* feat(ui): rework image lightbox with DatePicker, MetadataPanel, and crop typing (1fd525b0)
* feat(ui): add generic Table component (8e099b3b)
* feat(context-menu): support snippet context menu items (90f1066b)
* fix(ui): inline SCSS variables in SliderToggle to satisfy prettier (9250ef32)
* fix: align all required asterisks to be red (25e0c238)
* fix(ui): increase collections badge icon size (70ed0159)
* fix(routes): simplify navigation logic in root layout (9f3977b1)
* chore(ui): update SliderToggle component (d2161255)
* feat(settings): unify settings API and migrate frontend to Setting type (c97cade0)

## [0.26.12] - 2026-08-01

* refactor(settings): use native SliderToggle disabled prop (73cd73c7)
* feat(ui): add disabled state and token-based styling to SliderToggle (190fa627)
* fix: change slider toggle to button to avoid being capture by forms when submit button exists (d56771df)
* chore: move themes into specific directory (51468ab2)
* fix: remove hard-defined font-sizes (a3214a8d)

## [0.26.11] - 2026-08-01

* chore(viewfinder): drop redundant add-photos modal options override (57d440e6)
* style(viewfinder): give image cards a subtle border (25bd5617)
* refactor(viewfinder): centralize sort dropdown key matching in sort.ts (d09a379c)
* fix(viewfinder): float dropdown menus above modal overlays (35cca735)
* fix(viewfinder): keep admin dashboard uptime ticking smoothly (b9c05076)

## [0.26.10] - 2026-07-31

* test(viewfinder): drop unused imports in DevWelcomeText test (668e94fd)
* fix(viewfinder): load jest-dom matcher types in tsconfig (cc40acdd)
* feat: add archived flag to collections (6d4ab061)
* chore: mark ServerError for removal (4c89aed4)

## [0.26.9] - 2026-07-31

* fix(viewfinder): guard screen.orientation access in IS_MOBILE (8f5eeb43)
* test(viewfinder): add component tests with @testing-library/svelte (012fe3f2)
* test(viewfinder): migrate unit tests to happy-dom and testing-library (1c80da9b)

## [0.26.8] - 2026-07-31

* refactor: clean up nested if statements and use node:fs glob (7c2a4b27)

## [0.26.7] - 2026-07-31

* chore: update pnpm packages (cc4d5892)
* chore: clean event log messages (07a23a73)
* chore: rename `toastsState` to `toasts` (66c222a7)

## [0.26.6] - 2026-07-31

* style(viewfinder): restyle collections count badge (a3a504e0)
* fix(viewfinder): make inline name edits size to content and match display (1d49e026)

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
