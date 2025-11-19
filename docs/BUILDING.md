# Building and running Imagine (developer guide)

This document explains how to build and run the Imagine project locally (development or production-like) using Docker Compose, how to enable BuildKit for faster Go builds, how the Postgres initialization scripts behave, and common caveats and troubleshooting steps.

**Location:** `docs/BUILDING.md`

--

## Overview

- The project uses Docker Compose to run three main services: `api` (Go backend), `viz` (Svelte frontend), and `postgres` (database).
- Docker builds are optimized with multi-stage Dockerfiles. The Go builder caches modules and build artifacts using BuildKit cache mounts.
- The Postgres container uses `docker-entrypoint-initdb.d` scripts (see `./docker/initdb`) to create the DB and user on first initialization.

## Prerequisites

- Docker (Engine) and Docker Compose installed on your host.
- On Ubuntu: systemd-managed Docker (recommended).
- For fast builds: Docker BuildKit enabled (see below).
- Git, curl, and a shell (bash / PowerShell).

## Key files and locations

- `docker-compose.yml` — orchestrates services and mounts `./docker/initdb` into Postgres for initialization.
- `Dockerfile.api` — multi-stage Dockerfile for the Go API (builder + packages + runtime).
- `Dockerfile` (in `viz/`) — frontend Dockerfile.
- `docker/initdb/01-create-superuser.sh` — init script used by Postgres on first-run.
- `.env` — environment variables used by `docker-compose` (make sure this is present in the project root).

## .env (important variables)

Ensure `.env` in the project root contains the correct values (example in `.env.example`):

- `DB_HOST` — (optional) typically left as `postgres` for compose networking
- `DB_USER` — the database role name (used to populate `POSTGRES_USER` for the container)
- `DB_PASSWORD` — the DB password used by the container
- `DB_NAME` — database name created/used by the app
- `API_PORT` — host port mapped to the API container (default `7770`)

If you change `DB_USER` or `DB_PASSWORD` and you already have an initialized Postgres volume, you must either update the DB role inside Postgres OR reinitialize the volume (see "Postgres volume and reinitialization" below).

## Enable BuildKit (recommended)

BuildKit provides `--mount=type=cache` which dramatically speeds Go builds by caching `GOMODCACHE` and `GOCACHE` across builds.

### Enable BuildKit permanently on Ubuntu (daemon)

Run these on your Ubuntu host (this merges into `/etc/docker/daemon.json` safely):

```bash
sudo mkdir -p /etc/docker
if [ -f /etc/docker/daemon.json ]; then
  sudo cp /etc/docker/daemon.json /etc/docker/daemon.json.bak
fi
sudo python3 - <<'PY'
import json,sys,os
p='/etc/docker/daemon.json'
data={}
if os.path.exists(p):
    try:
        with open(p,'r') as f:
            data = json.load(f)
    except Exception as e:
        print('Warning: existing daemon.json could not be parsed, overwriting. Error:', e, file=sys.stderr)
features = data.get('features', {})
features['buildkit'] = True
data['features'] = features
tmp='/tmp/daemon.json.tmp'
with open(tmp,'w') as f:
    json.dump(data, f, indent=2)
os.replace(tmp, p)
print('Wrote /etc/docker/daemon.json with BuildKit enabled')
PY

sudo systemctl daemon-reload
sudo systemctl restart docker
```

If you prefer not to edit the daemon, enable BuildKit per-build with:

```bash
DOCKER_BUILDKIT=1 docker compose build
```

### Verify BuildKit

```bash
docker build --progress=plain -t buildkit-test -<<'EOF'
FROM alpine:3.18
RUN echo "buildkit test"
EOF
```

Look for BuildKit progress output.

## Build steps (recommended)

1. Ensure your `.env` is present and correct at the project root.

2. (Optional) Remove existing Postgres volume if you want a fresh DB (this deletes data):

```bash
docker-compose down
# list volumes to find project-specific name, typically <folder>_postgres-data
docker volume ls
docker volume rm <volume-name>
```

3. Build the images and start services (BuildKit enabled):

```bash
# with BuildKit enabled (recommended)
DOCKER_BUILDKIT=1 docker compose up --build -d

# or, if you enabled BuildKit permanently, just
docker compose up --build -d
```

4. Watch logs to verify Postgres initializes and the API connects successfully:

```bash
docker compose logs -f postgres api viz
```

### Notes on `Dockerfile.api` caching

- `Dockerfile.api` uses BuildKit `--mount=type=cache` for the Go module cache (`/go/pkg/mod`) and the Go build cache (`/root/.cache/go-build`). That avoids re-downloading modules each build and speeds up `go build`.
- If your host doesn't have BuildKit enabled (or if you build without it), the caches won't persist between builds and you'll see repeated module downloads.
- To force cache invalidation (rare), change the `id` name used by `--mount=type=cache,id=...` or `docker builder prune`.

## Postgres: init scripts and behavior

- Files in `./docker/initdb` are mounted into `/docker-entrypoint-initdb.d` inside the official Postgres image. Scripts in this directory are executed by the Postgres image during the first `initdb` run (only when the data directory is empty).
- The provided script `01-create-superuser.sh`:
  - Runs as the `postgres` superuser (the official entrypoint executes this script after the DB cluster is initialized but before it is handed off to the server process).
  - Creates or alters the role named by `POSTGRES_USER` and ensures it has the configured password and `SUPERUSER` capability.
  - Creates the database named by `POSTGRES_DB` if it doesn't already exist.
- If the data volume already existed before the mount, scripts will NOT re-run — this is why reinitializing requires removing the volume.

## Postgres volume and reinitialization

If you change the `DB_USER` or `DB_PASSWORD` in `.env` after the DB was initialized, the container will continue using the previously created data and roles. Options:

- Preferred: connect to the running Postgres and create/alter the role so it matches the new env values (no data loss).
  - Example:
    ```bash
    docker compose exec postgres psql -U postgres -c "ALTER ROLE \"${DB_USER}\" WITH PASSWORD '${DB_PASSWORD}';"
    ```
- If you don't need the data, reinitialize the database by deleting the volume. This forces init scripts to run again and create the DB/user from `.env`.
  - Example:
    ```bash
    docker compose down
    docker volume rm <project>_postgres-data
    DOCKER_BUILDKIT=1 docker compose up --build -d
    ```

## API service readiness and healthchecks

- The compose file adds a `healthcheck` for Postgres (using `pg_isready`) and sets `restart: unless-stopped` on the `api` service. This helps the API eventually connect once Postgres has finished startup.
- For additional robustness you can add a small start wrapper to `api` to wait for `pg_isready` before running the binary.

## Troubleshooting

- "connect: connection refused" on API start:
  - Likely cause: API tried to connect before Postgres finished initializing. Check `docker compose logs postgres` and ensure Postgres is ready.
  - Fix: wait or restart API (`docker compose restart api`) or enable restart policy (already configured).

- "database already exists" error in init logs:
  - Normal when the DB was created by an earlier step. The init script is guarded to create DB only if missing (script in `docker/initdb` uses conditional create).

- Repeated Go module downloads on each build:
  - Ensure BuildKit is enabled and use the recommended `DOCKER_BUILDKIT=1 docker compose build` or enable BuildKit in the daemon.
  - Confirm the builder stage uses the cache mounts (see `Dockerfile.api`).

- Permission/locale warnings from Postgres init on Alpine:
  - Some packages in minimal images may lack `locale`. These are usually warnings and not fatal; they appear during `initdb` on Alpine-based images. The main requirement is that Postgres starts and becomes ready.

## Developer tips

- To speed iterative backend builds while developing locally you can use `docker compose build --progress=plain` to see BuildKit output and verify caches are used.
- If you change `go.mod` / `go.sum`, Docker will re-run `go mod download` step in the builder stage; this is normal.
- Consider running the API natively (outside Docker) during fast local development for quicker edit-run loops — use the Dockerized environment for integration testing.

## CI recommendations

- CI runners should enable BuildKit or set the `--mount=type=cache` paths to a shared cache directory supported by the CI.
- Cache `~/.cache/go-build` and `$GOMODCACHE` between CI runs to reduce downloads.

## Example commands summary

```bash
# Clean start (wipes Postgres data)
docker compose down
docker volume rm imagine_postgres-data   # confirm name with `docker volume ls`
DOCKER_BUILDKIT=1 docker compose up --build -d

docker compose logs -f postgres api viz

# Rebuild just the api with BuildKit
DOCKER_BUILDKIT=1 docker compose build api

# Run compose and view all logs
docker compose up --build
``` 

## Security notes & caveats

- The init script that creates a SUPERUSER is convenient for local development, but granting `SUPERUSER` should be avoided in production. If you want least-privilege setup, modify the init script to create a non-superuser role and grant only the required privileges.
- `POSTGRES_HOST_AUTH_METHOD=trust` may be used temporarily for password recovery, but it disables authentication — never enable in an untrusted environment.

---
Last updated: 2025-11-19

-- README partially written by Co-Pilot