# Environment Variables

This document lists every environment variable recognised by the Viz API server, frontend dev server, and testing infrastructure. Variables are grouped by subsystem. Defaults shown in parentheses.

---

## Quick Reference

| Variable | Required | Default | Used By |
| :--- | :---: | :--- | :--- |
| `ENV` | No | `development` | API server |
| `API_PORT` | No | `7770` | API server, Vite proxy |
| `API_HOST` | No | `localhost` | API server |
| `DB_HOST` | No | `localhost` | API server |
| `DB_PORT` | No | `5432` | API server |
| `DB_USER` | No | `postgres` | API server |
| `DB_PASSWORD` | **Yes** | — | API server |
| `DB_NAME` | No | `viz` | API server |
| `BASE_DIRECTORY` | No | `./data` | API server |
| `UPLOAD_LOCATION` | No | `library` | API server |

---

## 1. Server Configuration

| Variable | Default | Description |
| :--- | :--- | :--- |
| `ENV` | `development` | Runtime environment. Set to `production` in Docker. Controls log verbosity, host binding defaults, and feature flags. Also accepts `environment` or `env` (case-insensitive). |
| `API_PORT` | `7770` | Port the Go API server listens on. |
| `API_HOST` | `localhost` (`0.0.0.0` when `ENV=production`) | Bind address for the API server. |
| `ALLOWED_ORIGINS` | — | Comma-separated list of allowed CORS origins. When unset, defaults to the server's own origin. |
| `VIZ_FRONTEND_BUILD_PATH` | — | Custom filesystem path to a pre-built frontend. When unset, serves the embedded SPA from the binary. |

---

## 2. Database (PostgreSQL)

These variables are read by Viper and mapped to the `database.*` config keys. They can also be set in `viz.json` under `database`.

| Variable | Config Key | Default | Description |
| :--- | :--- | :--- | :--- |
| `DB_HOST` | `database.host` | `localhost` | PostgreSQL host. Set to `db` in Docker Compose. |
| `DB_PORT` | `database.port` | `5432` | PostgreSQL port. |
| `DB_USER` | `database.user` | `postgres` | PostgreSQL username. |
| `DB_PASSWORD` | `database.password` | — | PostgreSQL password. **Required for production.** |
| `DB_NAME` | `database.name` | `viz` | PostgreSQL database name. |
| `DB_CONNECT_TIMEOUT` | — | — | Database connection timeout duration (e.g. `5s`, `10s`). |

> **Note:** `POSTGRES_PASSWORD` and `POSTGRES_USER` are also accepted as direct overrides in `cmd/api/api.go` (used by Docker). If set, they take precedence over the Viper-bound values.

---

## 3. Redis

Configured via `viz.json` under `redis`. No environment variables are bound directly, but `REDIS_PASSWORD` is bound via Viper.

| Variable | Config Key | Default | Description |
| :--- | :--- | :--- | :--- |
| `REDIS_PASSWORD` | `redis.password` | — | Redis authentication password. Only required when `redis.enabled` is `true`. |

Additional Redis settings are available in `viz.json`: `redis.host` (default `localhost`), `redis.port` (default `6379`), `redis.db`, `redis.enabled`, `redis.use_tls`, `redis.pool_size`, `redis.dial_timeout_seconds`, `redis.read_timeout_seconds`, `redis.write_timeout_seconds`.

---

## 4. Storage

| Variable | Config Key | Default | Description |
| :--- | :--- | :--- | :--- |
| `BASE_DIRECTORY` | `base_directory` | `./data` | Root directory for the library, database, cache, and trash. |
| `UPLOAD_LOCATION` | `upload.location` | `library` | Sub-directory or storage mode for uploaded images. |

---

## 5. Cookie Configuration

These control the authentication cookie behaviour, primarily useful when running behind a reverse proxy or on a custom domain.

| Variable | Default | Description |
| :--- | :--- | :--- |
| `VIZ_COOKIE_DOMAIN` | — | Set the `Domain` attribute on auth cookies. Use for cross-subdomain SSO (e.g. `.example.com`). |
| `VIZ_COOKIE_SECURE` | `false` | Set to `true` to mark cookies as `Secure` (HTTPS-only). **Required when `VIZ_COOKIE_SAMESITE=None`.** |
| `VIZ_COOKIE_SAMESITE` | `Lax` | SameSite cookie policy. Accepts `Lax`, `Strict`, or `None`. |

---

## 6. Logging

| Variable | Default | Description |
| :--- | :--- | :--- |
| `LOG_SHOW_RECORD` | `false` | Set to `true` to print individual structured log records to stdout. |

Additional logging settings are in `viz.json`: `logging.level` (default `debug`). Timezone is a top-level config key (`timezone`, default `utc`).

---

## 7. Feature Flags

| Variable | Default | Description |
| :--- | :--- | :--- |
| `ENABLE_URL_UPLOAD` | `false` | Set to `true` to allow uploading images from a URL (not just file uploads). |

---

## 8. Frontend / Vite (Development)

These are read by `viewfinder/vite.config.ts` at build/dev time.

| Variable | Default | Description |
| :--- | :--- | :--- |
| `VIZ_CONFIG_PATH` | `../viz.json` | Path to the `viz.json` config file. Override when running from a different working directory (e.g. Docker: `/app/viz.json`). |
| `VITE_VIZ_PORT` | `7777` | Port for the Vite dev/preview server. |
| `VIZ_API_SERVER_HOST` | from `viz.json` | API host for the Vite dev proxy target. |
| `VIZ_API_SERVER_PORT` | from `viz.json` | API port for the Vite dev proxy target. |
| `API_PORT` | `7770` | Also read by Vite as a fallback for the API proxy port. |

---

## 9. E2E Testing (Playwright)

Used by `viewfinder/e2e/` and `viewfinder/playwright.config.ts`.

| Variable | Default | Description |
| :--- | :--- | :--- |
| `E2E_TEST_EMAIL` | — | Email for the test user account. |
| `E2E_TEST_PASSWORD` | — | Password for the test user account. |
| `E2E_TEST_USERNAME` | — | Display name for the test user account. |
| `PLAYWRIGHT_TEST_BASE_URL` | `http://localhost:7777` | Base URL for Playwright tests. |
| `PLAYWRIGHT_WORKERS` | `2` (or `1` in CI) | Number of parallel test workers. |
| `PLAYWRIGHT_PREVIEW` | `false` | Run tests against `vite preview` instead of `vite dev`. |
| `CI` | `false` | CI environment flag. Sets `forbidOnly`, single worker, and preview mode. |

---

## 10. Docker Compose

The `docker/docker-compose.yml` passes these to the `server` and `db` services:

| Variable | Service | Default | Description |
| :--- | :--- | :--- | :--- |
| `ENV` | server | `production` | Set automatically by the compose file. |
| `DB_HOST` | server | `db` | Overridden to point to the Docker Postgres service. |
| `REDIS_HOST` | server | `redis` | Set automatically by the compose file. |
| `POSTGRES_USER` | db | `postgres` | PostgreSQL username for the container. |
| `POSTGRES_PASSWORD` | db | `postgres` | PostgreSQL password for the container. |
| `POSTGRES_DB` | db | `viz` | PostgreSQL database name for the container. |

---

## 11. `viz.json` Configuration Reference

All settings below can be set via environment variables (see sections above) or in a `viz.json` file at the project root. Environment variables take precedence over `viz.json` values.

```json
{
    "server": { "port": 7770, "host": "localhost" },
    "database": {
        "host": "localhost",
        "port": 5432,
        "user": "postgres",
        "password": "",
        "name": "viz",
        "max_open_conns": 25,
        "max_idle_conns": 25,
        "conn_max_lifetime_minutes": 5
    },
    "redis": {
        "enabled": false,
        "host": "localhost",
        "port": 6379,
        "db": 0,
        "use_tls": false,
        "pool_size": 10,
        "dial_timeout_seconds": 5,
        "read_timeout_seconds": 3,
        "write_timeout_seconds": 3
    },
    "timezone": "utc",
    "logging": {
        "level": "debug"
    },
    "base_directory": "./data",
    "upload": { "location": "library" },
    "libvips": {
        "match_system_logging": false,
        "cache_max_memory_mb": 0,
        "cache_max_files": 0,
        "cache_max_operations": 0,
        "concurrency": 1
    },
    "storage": {
        "storage_path_template": "{{y}}/{{y}}-{{MM}}-{{dd}}/{{filename}}"
    },
    "storage_metrics": {
        "enabled": true,
        "interval_seconds": 300
    },
    "users": {
        "allow_manual_registration": true
    },
    "cache": {
        "gc_enabled": true,
        "images": {
            "http_max_age_seconds": 604800,
            "http_permanent_max_age_seconds": 31536000
        },
        "cleanup_interval_minutes": 1440,
        "max_size_bytes": 10737418240,
        "max_age_days": 30,
        "clear_permanent_transforms": false,
        "trash_max_age_days": 30
    },
    "security": {
        "argon2_memory_mb": 64,
        "argon2_time": 3,
        "argon2_threads": 4
    }
}
```
