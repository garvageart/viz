# Project Context for Agents

This document provides core guidelines for AI agents and developers working on the **Viz** project. Adhering to these guidelines is crucial for maintaining code quality and consistency.

## 1. Project Overview & Directory Structure
**Viz** is a high-performance, self-hosted image management and processing platform.

For detailed architecture, workflows, and setup instructions, refer to:
* **[Developer Setup & Building](/docs/setup/BUILDING.md)**
* **[Testing Strategy](/docs/development/internal/testing_strategy.md)**
* **[UI Design System & Styling](/docs/development/UI_DESIGN_SYSTEM.md)**

### Key Directory Structure
* `cmd/api/`: Go backend main entry point and routes.
* `internal/`: Core Go backend logic (auth, db connection, entities, imageops).
* `viewfinder/`: The SvelteKit frontend SPA (components, states, styles).
* `docs/`: Additional documentation.

---

## 2. Code Generation: The Single Source of Truth
The OpenAPI specification (`api/openapi/openapi.yaml`) is the single source of truth.
* Whenever schema structures, database entities, or API endpoints change, you **MUST** run:
  ```bash
  make generate-types
  ```
  This automatically updates Go DTOs (`internal/dto/`), GORM entities (`internal/entities/`), and the TypeScript API client (`viewfinder/src/lib/api/`). Do not modify these files manually.

---

## 3. General Coding Guidelines

### Braces for Control Flows
* **Rule**: All `if` statements and loops must **never** be inlined. Always use brackets and break to the next line.
* **Example**:
  ```typescript
  // Correct:
  if (isDisabled) {
      return;
  }

  // Incorrect:
  if (isDisabled) return;
  ```

### Preserving Comments
* **Rule**: Do not delete existing comments/docstrings that you did not add unless explicitly asked to do so. If refactoring changes logic significantly, update the comments to be accurate instead of removing them.

---

## 4. Language-Specific Conventions

### Go (Backend)
* **Formatting**: Code must be formatted with `gofmt`.
* **Error Handling**: Handle all errors explicitly. Do not ignore them.
* **Logging**: Use standard library structured logging (`slog`) as JSON.

### TypeScript / Svelte (Frontend)
* **Props**: Define component props using a `Props` interface inside component script blocks.
* **Universal Load Functions**: Fetch page data inside client-side `+page.ts` or `+layout.ts` `load` functions. Do **NOT** use `+page.server.ts` files (Viz is a pure SPA).
* **Styling**: SCSS (Sass) preprocessor. Scoped `<style lang="scss">` per component. Reference `var(--viz-spacing-*)` and `var(--viz-font-size-*)` tokens (defined in `docs/development/UI_DESIGN_SYSTEM.md`).