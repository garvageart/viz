# Viz Repository Guidelines

**Last Updated:** July 1, 2026

## Purpose

Entry point for agents and humans working on the Viz codebase.

## Sources of Truth

- **Makefile**: [Makefile](/Makefile)
- **OpenAPI Specification**: [openapi.yaml](/api/openapi/openapi.yaml) (The single source of truth for Go DTOs, GORM entities, and the Svelte TypeScript client)
- **Developer Guides**:
  - Setup & Building: [BUILDING.md](/docs/setup/BUILDING.md)
  - UI Design System: [UI_DESIGN_SYSTEM.md](/docs/development/UI_DESIGN_SYSTEM.md)
- **Code Maps & Guidelines**:
  - Global Agent Guidelines: [AGENTS.md](/AGENTS.md)

## Subtree Guides

- `internal/`: Core Go backend logic (auth, db connection, entities, imageops). Refer to [AGENTS.md](/AGENTS.md) for Go conventions.
- `cmd/api/`: Go backend main entry point and routes.
- `viewfinder/`: The SvelteKit frontend SPA (components, states, styles). Refer to Svelte 5 and TypeScript conventions in [AGENTS.md](/AGENTS.md).

## Project Conventions

- **Package manager**: `pnpm` (not npm or yarn).
- **Frontend directory**: `viewfinder/` — not `src/`, `frontend/`, or `web/`.
- **Lockfile**: `pnpm-lock.yaml` at repository root (not inside `viewfinder/`).
- **Go workspace**: `go.work` at root (Go 1.25.8) with two modules: root (`.`) and `./cmd/api`.
- **Runtime data**: `var/` directory for local library, logs, trash, and cache — gitignored.
- **Resource identifiers**: All API entities use `uid` (string) as the primary identifier, not numeric IDs or UUIDs.
- **Docker services**: `make docker-up` starts Postgres 18, Redis 8, and the Viz server on port 7770. See [docker-compose.yml](/docker/docker-compose.yml).
- **Common Make targets**: `make dev-api` (backend dev server), `make fmt` / `make lint`, `make test-go` / `make test`, `make check-go`, `make docker-up` / `make docker-down`.

## Testing

- **Postgres parity**: Not yet — tests use SQLite in-memory (`internal/jobs/trash_test.go`, `cmd/api/routes/admin_test.go`). The goal is `testcontainers-go`.
- **Filesystem**: Use `t.TempDir()` injected into config for disk operations (`internal/images/cache_test.go`).

## Environment & Toolchain

- **Go**: 1.25.8 (per `go.mod` and `go.work`)
- **Node**: >=24.13.0 (per `viewfinder/package.json`; `.node-version` at root)
- **libvips**: 8.18.0 (see `.libvips-version` at root; used via CGO bindings in `internal/images/ops`)
- **Package manager**: `pnpm` (not npm or yarn)
- **Docker**: Postgres 18-alpine + Redis 8-alpine + server (see `docker/docker-compose.yml`)
- **Image processing**: libvips 8.18.0 via CGO bindings — C heap memory, Go GC is blind to it

## Troubleshooting

- **libvips EXIF strings**: `vips_image_get_string` returns image-owned pointers. Never `g_free()` or `free()` them — causes heap corruption (`SIGABRT: malloc_consolidate()`). The `VipsImage` owns them and releases them on `g_object_unref`. See `internal/images/ops/cache.go:GetExifData`.
- **C heap vs Go GC**: RSS will appear much higher than `runtime.MemStats` because libvips allocates through glibc/GLib. This is expected, not a leak (unless it grows unbounded across operations).

## Architecture Decisions

- **Image processing memory model**: See [IMAGE_PROCESSING_MEMORY.md](/docs/architecture/IMAGE_PROCESSING_MEMORY.md) for the EXIF leak fix, memory model, and production tuning via `viz.json`.

## Style Notes

### General (All Languages)

- **If-Statements & Loops**: All control flow blocks must **never** be inlined. Always use brackets and break to the next line.
  - *Rationale*: Consistency across backend (Go) and frontend (TypeScript) makes code easier to scan, simplifies setting breakpoints during debugging, and reduces errors during block updates.
  - **Example**:
    ```typescript
    // Correct:
    if (isDisabled) {
        return;
    }

    // Incorrect:
    if (isDisabled) return;
    ```
- **Preserving Comments**: Do not delete comments you did not add unless explicitly told to do so.
  - If refactoring changes logic significantly, update the comments to reflect the new logic rather than removing them.

### Go (Backend)

- **Formatting**: Code must be formatted with `gofmt`.
- **Error Handling**: Handle all errors explicitly. Do not ignore them.
- **Logging**: Use standard library structured logging (`slog`) as JSON.

### TypeScript / Svelte (Frontend)

- **Props**: Define component props using a `Props` interface inside component script blocks.
- **Universal Load Functions**: Fetch page data inside client-side `+page.ts` or `+layout.ts` `load` functions. Do **NOT** use `+page.server.ts` files (Viz is a pure SPA).
- **Styling**: SCSS (Sass) preprocessor. Scoped `<style lang="scss">` per component. Reference `var(--viz-spacing-*)` and `var(--viz-font-size-*)` tokens (defined in [UI_DESIGN_SYSTEM.md](/docs/development/UI_DESIGN_SYSTEM.md)).


## LLM Usage

### Agent Session State

- Runtime session tracking (Background Job Board, reusable sessions, context fingerprints) lives in `.agents/AGENTS.md` — gitignored, ephemeral, per-workspace.

### Local Agent Progress

- Use `.agents/TODO.md` for actionable tasks and `.agents/DONE.md` for completed work.
- These files are local workflow aids and may not exist in every workspace. The `.agents/` directory is gitignored and ephemeral.

**DO NOT** commit any LLM related files to the repository that is not explicitly requested or expected by the project maintainers. This includes `.agents/` files, LLM-generated code, or any other artifacts that are not part of the official codebase. They will not be accepted into the repository.

### Model Attribution

Use the `--generated by {model_id}` trailer when an agent is authoring a commit message or GitHub/Gitlab issue, where `model_id` is the ID of the model being used (e.g `deepseek-coder-1.3b-base`). This provides clarity to humans and other agents about the source of the content. It is not required for human-authored commits or issues.

### General Usage Policy

Please follow the LLM usage policy for this project. We do not allow LLMs to author code or documentation without human review and approval. All LLM-generated content must be reviewed and approved by a human before being merged into the main branch.

We reserve the right to reject any LLM-generated content that does not meet our quality standards or violates our usage policy.

LLM opened issues or Pull Requests must be clearly marked as such in the title and description. Either may be closed or rejected without notice.

### Commit Messages

- Follow the **Conventional Commits** specification (e.g., `feat(scope): description`, `fix(scope): description`, `chore: description`, `docs: description`).
- Keep scopes lowercase and descriptive of the affected subtree or module (e.g., `viewfinder`, `api`, `ui`).
- Keep commit subjects concise and under 80 characters.

## GitHub Issues

Issue templates are available at `.github/ISSUE_TEMPLATE/` (bug report, feature request). GitLab counterparts are at `.gitlab/issue_templates/`. A PR template is at `.github/pull_request_template.md`.

### Specifications & Documentation

- Docs live in `docs/` organised by category (`architecture/`, `assets/`, `development/`, `project/`, `setup/`).
- Markdown headings use a Chicago-style title case (see rules below).
- Always spell the product/application name as `viz`. Strictly in lowercase.
- `viewfinder` is the name of the SvelteKit SPA frontend. Always spell it in lowercase.
---
- Refresh `**Last Updated:**` when you change document contents, but leave it unchanged for whitespace-only or formatting-only edits.

## Safety & Data

- If `git status` shows unexpected changes, assume someone may be editing; ask before using reset-style commands.
- Do not run `git config` at either the global or repository level.
- Do not run `git clean -fdx` or `git reset --hard` unless you are certain you are in a safe workspace and have no uncommitted changes.
- Do not run destructive commands against production data; prefer ephemeral volumes and test fixtures for acceptance tests.
- Never commit secrets, local configurations, or credentials.