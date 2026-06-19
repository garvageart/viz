# Project Context for Agents

This document provides a comprehensive guide for AI agents and developers working on the **Viz** project. Adhering to these guidelines is crucial for maintaining code quality and consistency.

## 1. Project Overview
**Viz** is a high-performance, self-hosted image management and processing platform. It is designed as a modern, open-source alternative to commercial products like PhotoShelter, tailored for professional photographers, media teams, and content creators who need full control over their digital assets.

**Core Features**:
- **High-Performance Asset Ingestion**: Fast uploads with checksum verification to prevent duplicates.
- **Asynchronous Processing**: Background jobs handle thumbnail generation, metadata extraction, and other long-running tasks without blocking the UI.
- **Non-Destructive Transforms**: Original images are never altered. All transformations (resizing, cropping, format changes) are generated on-the-fly and cached.
- **Powerful Search**: Flexible search capabilities based on metadata, tags, and other attributes.
- **Rich Metadata Management**: Reads, writes, and preserves EXIF, IPTC, and XMP metadata.
- **Flexible Organization**: Group images into logical **Collections**.

## 2. Technical Stack

### Backend (`/` root)
- **Language**: Go 1.25+
- **Web Framework**: `go-chi` (v5) is used for routing. It's lightweight, idiomatic, and avoids reflection.
- **Database**: PostgreSQL (via Docker in development).
- **ORM**: GORM is used for database interactions. Database logic is primarily located in `internal/db/`.
- **Image Processing**: `libvips` (v8.18+) provides fast and memory-efficient image processing. It's accessed via Go bindings. Core logic is in `internal/imageops/`.
- **Queue/Async**: Watermill provides a robust pub/sub system for background jobs (e.g., thumbnailing, metadata extraction). It's configured to use Redis in production and in-memory for simple setups.
- **Logging**: `slog` (standard library structured logging) is used throughout. Logs are written as JSON for machine-parsability.
- **Configuration**: Viper manages configuration from `Viz.json` and environment variables. `internal/config/` holds the structures.
- **Authentication**: Supports both stateful sessions (cookies) for the frontend and stateless API Keys for third-party integrations. Logic is in `internal/auth/`.
- **API Documentation**: An OpenAPI 3.0 specification is maintained at `api/openapi/openapi.yaml`. This spec is the source of truth for generating both Go DTOs and the TypeScript API client.

### Frontend (`/viz` directory)
- **Framework**: SvelteKit, configured as a pure **Single-Page Application (SPA)** using `@sveltejs/adapter-static`.
- **Language**: TypeScript is used for all Svelte components and modules, ensuring type safety.
- **Reactivity Model**: Embrace Svelte 5 Runes for all state management (`$state`, `$derived`, `$effect`). Avoid legacy stores (`writable`, `readable`). `$props` are used for component inputs.
- **Styling**: SCSS (Sass) is the preprocessor of choice. Write component-scoped styles in `<style lang="scss">` blocks. Global styles, variables, and mixins are located in `viz/src/lib/styles/`.
- **API Client**: The primary client is generated from the OpenAPI spec using `oazapfts`. A custom wrapper in `viz/src/lib/api/index.ts` enhances this client, primarily for handling binary file uploads with the correct `Content-Type`.
- **State Management**: Global and session-level state is managed through custom modules in `viz/src/lib/states/`. These modules are simple `.ts` files that export state runes.
- **Testing**:
  - **Strategy: E2E-First**: We avoid brittle UI component unit tests (JSDOM) because they require extensive manual mocking of SvelteKit's `$app/*` modules and browser APIs (like IndexedDB or ResizeObserver). The primary focus is on robust E2E testing using Playwright to test features in a real browser environment.
  - **Playwright**: Used for all UI and user flow testing.
  - **Vitest**: Strictly reserved for pure logic, state management, and utility functions. No UI components or DOM manipulation should be tested in Vitest.

## 3. Key Workflows & Logic

### Code Generation: The Single Source of Truth
The project relies heavily on code generation from the OpenAPI specification (`api/openapi/openapi.yaml`). This file is the **single source of truth** for API data structures.

The `make generate-types` command orchestrates this entire process:
1.  **Go DTOs**: It uses `oapi-codegen` to generate Go data transfer objects (structs used in API requests/responses) into `internal/dto/types.gen.go`.
2.  **GORM Entities**: It runs a **custom tool** (`tools/genentities`) that reads the same OpenAPI spec. Schemas marked with the `x-entity: true` extension are converted into GORM database models in `internal/entities/generated.go`. This tool also generates helper methods (`DTO()` and `FromDTO()`) to convert between the entity and the DTO.
3.  **TypeScript Client**: It uses `oazapfts` to generate the frontend's TypeScript API client in `viz/src/lib/api/client.gen.ts`.

### API Endpoint Creation Workflow
1.  **Define Schema in OpenAPI**: All new data structures (for both API transfer and database storage) **must** be defined under `components/schemas` in `api/openapi/openapi.yaml`.
2.  **Add `x-` extensions**:
    - If the schema represents a database table, add the extension `x-entity: true`.
    - To define database indexes, add `x-go-gorm-index` with the required fields.
3.  **Define Endpoint**: Add the new API endpoint's path, method, parameters, and request/response schemas to the `paths` section of the OpenAPI spec.
4.  **Generate All Code**: Run `make generate-types`. This is a critical step that updates DTOs, GORM entities, and the TS client.
5.  **Create/Update Database Migration**: If adding a new table or column, create a new migration file to apply the schema change to the database.
6.  **Implement Handler**: Write the `http.HandlerFunc` logic for the new route in the appropriate file under `cmd/api/routes/`. Use the newly generated GORM entities for database logic and the DTOs for handling API requests and responses.

### Image Upload & Processing
1.  **Upload**: A client POSTs an image to `/api/images`. The API server saves the original file to a new directory named by a generated UID (e.g., `/data/images/<UID>/<original_filename>`).
2.  **Enqueue Job**: An `ImageProcessJob` is enqueued into the Watermill queue.
3.  **Worker Processing**: A background worker picks up the job.
4.  **Transforms & Metadata**: The worker generates permanent transforms (thumbnail, preview), extracts EXIF/XMP metadata, and creates a Thumbhash.
5.  **Database Update**: The worker updates the corresponding `images` entity in the database, marking it as `processed` and saving the new metadata.
6.  **WebSocket Notification**: The worker broadcasts a `job-completed` event via WebSocket to inform the frontend.

## 4. Directory Structure
- `cmd/api/`: Main application entry point (`api.go`) and route definitions (`routes/`).
- `internal/`: Core application logic, not to be imported by other applications.
  - `auth/`: Authentication/authorization logic (API keys, sessions, scopes).
  - `config/`: Configuration structs and loading logic (Viper).
  - `db/`: Database connection and generic operations.
  - `dto/`: **Generated** Data Transfer Objects. Do not edit `types.gen.go` manually.
  - `entities/`: **Generated** GORM models. Do not edit `generated.go` manually.
  - `http/`: Core HTTP server logic, middleware, and WebSocket broker.
  - `imageops/`: `libvips` wrappers for specific image operations.
  - `images/`: High-level image management (caching, storage, etc.).
  - `jobs/`: Core job queue and worker infrastructure.
    - `workers/`: Implementations of specific background jobs.
  - `transform/`: Data structures and pure functions for image transforms.
- `tools/genentities`: Custom tool to generate GORM entities from the OpenAPI spec.
- `viz/`: The SvelteKit frontend application (SPA).
  - `src/lib/api/`: **Generated** API client. Do not edit `client.gen.ts` manually.
  - `src/lib/components/`: Reusable Svelte components.
  - `src/routes/`: Client-side pages and routes. Does **not** contain backend logic.
- `docs/`: Developer, user, and architecture documentation.
- `scripts/js/`: Node.js-based scripts for maintenance and code generation orchestration.

## 5. Project Management & Build
- **Makefile**: The single source of truth for running project tasks.
  - `make build`: Compiles the Go backend and builds the SvelteKit frontend for production.
  - `make dev`: Provides instructions for running the separate backend and frontend development servers.
  - `make docker-up`: The recommended way to start the full stack (API, Viz, Postgres, Redis) for development.
  - `make generate-types`: **Crucial command**. Regenerates Go DTOs, GORM Entities, and the TypeScript API client from the OpenAPI spec.
- **Docker**:
  - `docker-compose.yml`: Orchestrates all services for a complete production-like environment.
  - `Dockerfile.api`: Builds the Go backend binary, which also serves the static frontend assets.

## 6. Coding Guidelines

### General
- **Comments**: Do not delete comments you did not add unless explicitly told to do so. 
  - *Rationale*: Original comments capture design intents, safety mechanisms, workarounds, or business logic context. Deleting them degrades codebase maintainability. Comments may also be developer notes or personal messages. If the code logic is changing significantly, update the comments to reflect the new logic rather than removing them.
  - *Rule*: During refactoring, search-and-replace, or lint fixes, ensure existing comments are preserved. If code logic changes significantly, update the comments to be accurate instead of deleting them.
- **If-Statements**: All `if` statements must not be inlined. Always use brackets and next line.
  - *Rationale*: Consistency across backend (Go) and frontend (TypeScript) codebases makes the code easier to scan, simplifies setting breakpoints during debugging, and reduces the chance of errors during block updates.
  - *Rule*: Never write one-liners like `if (cond) return;`. Always break to the next line and wrap inside brackets.
  - *Example*:
    ```typescript
    // Correct:
    if (isDisabled) {
        return;
    }

    // Incorrect:
    if (isDisabled) return;
    ```

### Go (Backend)
- **Formatting**: Code MUST be formatted with `gofmt`.
- **If-Statements**: ALWAYS use multi-line blocks.
- **Error Handling**: Handle all errors explicitly.
- **Logging**: Use the structured logger (`slog`).

### TypeScript / Svelte (Frontend)
- **Props**: Define component props using a `Props` interface in the `<script>` block.
- **API Data Loading**: Data for pages should be fetched within SvelteKit's universal `load` function in `+page.ts` or `+layout.ts` files. Since the project is a pure SPA, this function will always run on the client-side. This is the preferred way to fetch data before a page renders, as it automatically handles both initial loads and client-side navigations. Do **not** use `+page.server.ts` files.
- **Styling**: Prefer component-scoped SCSS.

## 7. Setup & Environment
- **Primary Method**: Use Docker via `make docker-up`.
- **Manual Setup**:
  - Run `bun scripts/js/setup-libvips.ts` to install `libvips` (v8.18+) and configure environment variables.
- **Ports**: API: `7770`, Frontend Dev: `7777`, PostgreSQL: `5432`, Redis: `6379`.
- **Configuration**: The default configuration is in `viz.json`. Overrides can be placed in `viz.json` or set via environment variables.

## 8. UI Design System

This section serves as the design system guide for frontend components.

### Design Principles
1. **Accessibility First (Perfect Zooming)**: All layouts, paddings, and font sizes must use relative units (`rem`/`em`) instead of hardcoded pixels to support seamless browser zooming.
2. **High Information Density**: Sizing is compact and clean to maximize workspace for photography assets and editor sidebars.
3. **Structured Editorial Grid**: Layout coordinates are separated by crisp `1px` hairlines and vertical columns.
4. **Interactive Contrast**: Flat sharp corners are used for panels, containers, and input fields to maintain grid alignment, while pill shapes are reserved strictly for interactive action buttons.
5. **No Primary/Secondary Text**: Text (including icon fonts) should NEVER be styled with the primary or secondary color to ensure high accessibility and contrast standards. Instead, reserve these colors for structural accents and interactive framing:
   - **Primary Action Targets**: Backgrounds for buttons, toggle switches, and primary control states.
   - **Focus & Selection Frames**: Focus outlines, selected bounding rings, active cards, and drag-and-drop dropzone highlights.
   - **Visual Accents & Dividers**: Active tab underlines, header accents, progress/loading indicator bars, and charts.
   For all body copy, labels, links, and general text elements, use base text colors or status/info accents instead.

### Typography System
Viz utilizes two primary variable typography scales served through Google Fonts:
* **Display/Sans-Serif Font** (`--viz-display-font`): `"Geist Variable", sans-serif` – Used for headings, labels, button text, and body copy.
* **Monospace Font** (`--viz-mono-font`): `"Roboto Mono Variable", monospace` – Used for tags, metadata, status labels, developer settings, and tabular details.

#### Font Sizing Tokens
All font sizes are declared as CSS custom properties under `:root`:
- `--viz-font-size-xs`: `0.75rem` (12px) - Small metadata, helper text, descriptions, tags
- `--viz-font-size-sm`: `0.875rem` (14px) - Standard labels, text fields, menu buttons
- `--viz-font-size-std`: `1rem` (16px) - Standard body text, document reading
- `--viz-font-size-lg`: `1.125rem` (18px) - Small headings, modal titles
- `--viz-font-size-xl`: `1.25rem` (20px) - Mid-level section headings
- `--viz-font-size-2xl`: `1.5rem` (24px) - Large titles
- `--viz-font-size-3xl`: `1.875rem` (30px) - Page banner headers

### Spacing Scale
To guarantee clean visual rhythm, all margins, paddings, and flex/grid gaps must strictly use the standard spacing scale:
- `--viz-spacing-xxs`: `0.125rem` (2px) - Tight list gaps, asterisk offsets
- `--viz-spacing-xs`: `0.25rem` (4px) - Button inner gaps, checkbox groups, label spacing
- `--viz-spacing-sm`: `0.5rem` (8px) - General input gaps, list item padding, compact cards
- `--viz-spacing-md`: `0.75rem` (12px) - Form row gaps, sidebar headers, toolbars
- `--viz-spacing-std`: `1rem` (16px) - Main content margins, modal inner padding
- `--viz-spacing-lg`: `1.25rem` (20px) - Page outer container margins, toast positioning
- `--viz-spacing-xl`: `1.5rem` (24px) - Generous layout divisions
- `--viz-spacing-xxl`: `2rem` (32px) - Heavy editorial panel divisions

### Borders & Corner Radius
#### Borders
We employ high-contrast hairbars to frame sections without clutter:
* **Thin Border** (`--viz-border-thin`): `1px solid var(--viz-60)` – Default hairline division for headers, tables, sidebars, and inputs.
* **Thick Border** (`--viz-border-thick`): `2px solid var(--viz-primary)` – Used for highlight focus borders or active states.

#### Corner Radius
Corner styling follows a strict functional convention:
* **Small Radius** (`--viz-border-radius-sm`): `2px` – Used for compact controls (checkboxes, tags).
* **Medium Radius** (`--viz-border-radius-md`): `4px` – Default rounded corners for input elements, card structures, and dropdown panels.
* **Large Radius** (`--viz-border-radius-lg`): `8px` – Used for floating toast alerts, collections, and modal boxes.
* **Pill Shape** (`--viz-border-radius-pill`): `9999px` – **Strictly reserved** for interactive action buttons (`Button`, `IconButton`) to create high-contrast focus targets.

### Color & Theme Mix System
The application registers color modes dynamically via the `@mixin register-theme-core` located in `viz-mixins.scss`. It automatically generates custom variables for both `:root[data-theme="light"]` and `:root[data-theme="dark"]`.

#### Status Accents
* **Info**: `var(--viz-info-color)` (`#3b82f6`)
* **Success**: `var(--viz-success-color)` (`#22c55e`)
* **Warning**: `var(--viz-warning-color)` (`#facc15`)
* **Error**: `var(--viz-error-color)` (`#ef4444`)

#### Theme-Aware Inset Palettes
Rather than hardcoding static grays or whites, the system mixes base colors dynamically using steps (`--viz-100` down to `--viz-5`):
* **`var(--viz-100)`**: The primary background color.
* **`var(--viz-95)`**: Soft overlay color (card backgrounds, toast alerts).
* **`var(--viz-90)`**: Subsection backgrounds (header bars, toolbar fills).
* **`var(--viz-80)`**: Hover backgrounds.
* **`var(--viz-60)`**: Hairline border frames.
* **`var(--viz-40)` / `var(--viz-30)`**: Secondary/muted text.

#### Relative Color-Mix Blending
To prevent accessibility contrast failure across themes, overlay components utilize native CSS `color-mix()` blending against active theme bases:
```scss
// Blends status color with the background for cohesive, accessible container tinting
background-color: color-mix(in srgb, var(--toast-accent-color) 25%, var(--viz-95));
border: 1px solid color-mix(in srgb, var(--toast-accent-color) 45%, var(--viz-60));
```

### Standard Component Guidelines
#### Input Fields (`InputText`, `InputSelect`, `InputPassword`)
1. **Dimensions**: All inputs must feature a `min-height: 2.5rem` density height to enforce form alignment.
2. **Labeling**: Labels sit above inputs using `--viz-font-size-sm` (`0.875rem`) in semi-bold `var(--viz-40)`. If required, place a red `*` (`--viz-error-color`) to the right of the text.
3. **Borders**: Render flat bottom borders using `box-shadow: 0 -1px 0 var(--viz-60) inset` to achieve crisp editorial hairlines. On focus, transition to `box-shadow: 0 -2px 0 var(--viz-primary) inset`.
4. **Icons**: All dropdown icons and visibility toggles must be positioned absolutely on the right and colored neutrally (`var(--viz-text-color)`) with a minor opacity offset (`0.75`) to avoid text overlap.

#### Buttons (`Button`, `IconButton`)
1. **Interactive Styling**: Always use `border-radius: var(--viz-border-radius-pill)` for buttons.
2. **Access Indicator**: Include `:focus-visible` outlines mapping to a double outline ring:
   ```scss
   &:focus-visible {
       box-shadow: 0 0 0 2px var(--viz-bg-color), 0 0 0 4px var(--viz-primary);
   }
   ```
3. **Component Selection**: Avoid using plain HTML `<button>` elements containing `<MaterialIcon>`. Instead, use the custom `<IconButton>` component (`$lib/components/ui/IconButton.svelte`) to ensure consistent padding, hover transitions, disabled states, and keyboard focus outlines.

#### Header Navigation Density
To maximize professional DAM screen workspace, the main header navigation is designed strictly at **`2rem`** (`32px`) height. Icons inside the header reside at a compact **`0.8rem`** sizing to ensure high-density toolbars.

#### Toast Notifications
* Toast card containers float bottom-right and use rounded borders (`var(--viz-border-radius-md)`).
* Cards must use high-contrast neutral text overlays and neutral card backgrounds (`var(--viz-95)` / `var(--viz-90)`).
* Visual categorizations are color-coded **only** in the status indicator strips (`4px` left borders) and matching minor category icons to ensure perfect AA contrast ratios.

### Development Conventions
1. **No Inline Styling**: Inline `style="..."` statements are strictly forbidden as they override theme variables. Write clean, scoped SCSS blocks inside Svelte components.
2. **Use Relative tokens**: Always reference `var(--viz-spacing-*)` and `var(--viz-font-size-*)` tokens for all layout geometry. Do not commit hardcoded pixel sizes.
3. **Clean Initial Connection States**: Reactively track WebSockets using an `eventsState.initialized` flag alongside `eventsState.connected` to eliminate brief layout flashes (FOUC) on client-side loading.