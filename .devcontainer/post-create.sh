#!/bin/bash
set -e

# Fix permissions for dependencies and history
# When using volumes, they might be owned by root initially.
echo "Fixing permissions for node_modules, .pnpm-store, /go/pkg and /commandhistory..."
sudo chown -R vscode:vscode . node_modules .pnpm-store /go/pkg /commandhistory 2>/dev/null || true

# Install dependencies
echo "Installing JS dependencies..."
pnpm install --no-frozen-lockfile

echo "Downloading Go modules..."
go mod download -x

echo "Services are ready to start."
