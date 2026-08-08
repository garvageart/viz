ARG REGISTRY_URL=""
ARG REPOSITORY=""
ARG BASE_IMAGE=${REGISTRY_URL:+${REGISTRY_URL}/${REPOSITORY}/}viz-base:latest
ARG FRONTEND_DEPS_IMAGE=${REGISTRY_URL:+${REGISTRY_URL}/${REPOSITORY}/}viz-frontend-deps:latest
ARG FRONTEND_BUILDER_IMAGE=frontend-builder

# Stage 1: Database Image (baked-in init scripts)
FROM postgres:18-alpine AS db

COPY docker/initdb/01-create-superuser.sh /docker-entrypoint-initdb.d/

# Stage 2: Frontend Dependencies (published to the registry to avoid npm downloads in CI)
FROM node:26-slim AS frontend-deps

WORKDIR /app

# Install pnpm (can be overridden at build time via --build-arg PNPM_VERSION=...)
ARG PNPM_VERSION=latest
RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
    npm install -g corepack@latest && \
    corepack enable && \
    corepack prepare pnpm@${PNPM_VERSION} --activate

# Copy workspace configuration FIRST to maximize standard layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc .prettierrc .prettierignore .gitignore Makefile ./
COPY viewfinder/package.json ./viewfinder/
COPY scripts/js/package.json ./scripts/js/

# Set pnpm store directory
ENV NPM_CONFIG_STORE_DIR=/root/.local/share/pnpm/store

# Install dependencies with BuildKit store cache
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Stage 3: Frontend Build
FROM ${FRONTEND_DEPS_IMAGE} AS frontend-builder

WORKDIR /app

# Copy the rest of the source files AFTER installing dependencies
COPY viewfinder ./viewfinder
COPY scripts/js ./scripts/js
COPY resources/test ./resources/test

# Pre-install Playwright Chromium browser binaries into image layer to eliminate runtime downloads in CI
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN pnpm --filter @viz/viewfinder exec playwright install --with-deps chromium

# Build frontend
WORKDIR /app
RUN pnpm --filter @viz/viewfinder run build


# Stage 4: Backend Build
FROM ${BASE_IMAGE} AS backend-builder

WORKDIR /app

# Copy Go workspace files
# not sure why copying it earlier didn't work but whatever
COPY .gitignore Makefile ./
COPY go.mod go.sum go.work go.work.sum ./
COPY cmd/api/go.mod cmd/api/go.sum ./cmd/api/
COPY version.txt ./

# Accept build arguments for version injection
ARG VERSION
ARG BUILD_ID
ARG BUILD_DATE
ARG SOURCE_COMMIT
ARG SOURCE_REF
ARG SOURCE_URL
ARG REPOSITORY
ARG REPOSITORY_URL

# Download Go dependencies (warm module cache is baked into viz-base)
RUN --mount=type=cache,id=go-build,target=/root/.cache/go-build,sharing=locked \
    go mod download -x

# Build backend with zero-layer bind mounting and BuildKit cache
RUN --mount=type=bind,target=. \
    --mount=type=cache,id=go-build,target=/root/.cache/go-build,sharing=locked \
    VERSION=${VERSION:-$(cat version.txt)} && \
    BUILD_DATE=${BUILD_DATE:-$(date -u +"%Y-%m-%dT%H:%M:%SZ")} && \
    go build -trimpath -ldflags="-s -w \
    -X 'viz/internal/config.Version=${VERSION}' \
    -X 'viz/internal/config.BuildID=${BUILD_ID}' \
    -X 'viz/internal/config.RawBuildDate=${BUILD_DATE}' \
    -X 'viz/internal/config.SourceCommit=${SOURCE_COMMIT}' \
    -X 'viz/internal/config.SourceRef=${SOURCE_REF}' \
    -X 'viz/internal/config.SourceUrl=${SOURCE_URL}' \
    -X 'viz/internal/config.Repository=${REPOSITORY}' \
    -X 'viz/internal/config.RepositoryUrl=${REPOSITORY_URL}'" \
    -o /tmp/viz-server ./cmd/api

RUN cp /tmp/viz-server /app/viz-server && chmod +x /app/viz-server

# only necessary stuff now :)
COPY cmd/api/ ./cmd/api/
COPY internal/ ./internal/
COPY resources/ ./resources/
COPY tools/migrations/ ./tools/migrations/

# Stage 5: Alias stage for frontend build output
FROM ${FRONTEND_BUILDER_IMAGE} AS frontend-build-stage

# Stage 6: Final Production Image
FROM debian:bookworm-slim AS server

# Install runtime dependencies for libvips with BuildKit apt caching
RUN --mount=type=cache,id=apt-cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=apt-lib,target=/var/lib/apt,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean && \
    echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    libglib2.0-0 libexpat1 libjpeg62-turbo libpng16-16 libtiff6 \
    libwebp7 libheif1 libopenexr-3-1-30 liborc-0.4-0 libgirepository-1.0-1 \
    libxml2 libexif12 libpoppler-glib8 libgsf-1-114 libopenjp2-7 \
    libjxl0.7 libimagequant0 libarchive13 librsvg2-2 libopenslide0 libmatio11 \
    libcfitsio10 libcgif0 libmagickwand-6.q16-6 libraw20 libnifti2-2 \
    ca-certificates gosu

# Copy libvips from base image
COPY --from=backend-builder /vips-libs/ /usr/lib/
RUN ldconfig

# non-root user for security
RUN groupadd -r viz && useradd -r -g viz viz

WORKDIR /app

# Copy binary and version file from backend-builder
COPY --from=backend-builder --chown=viz:viz /app/viz-server /app/viz-server
COPY --from=backend-builder --chown=viz:viz /app/version.txt /app/version.txt

# Copy built frontend from alias stage
COPY --from=frontend-build-stage --chown=viz:viz /app/build/viewfinder /app/frontend

# Copy entrypoint script
COPY docker/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Set ownership
RUN chown -R viz:viz /app

# Set environment variables
ENV VIZ_FRONTEND_BUILD_PATH=/app/frontend
ENV PORT=7770

# Expose the server port
EXPOSE 7770

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["/app/viz-server"]
