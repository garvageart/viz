#!/bin/sh
set -e

# Ensure required directories exist and fix volume permissions when running as root
if [ "$(id -u)" = '0' ]; then
    mkdir -p /app/data/logs /app/data/logs/http /app/data/trash /app/data/cache /app/data/library

    # Fast O(1) probe: test if the volume supports POSIX ownership (chown)
    # I hate AI
    touch /app/data/.perm_probe 2>/dev/null || true
    if chown viz:viz /app/data/.perm_probe >/dev/null 2>&1; then
        rm -f /app/data/.perm_probe
        chown -R viz:viz /app/data >/dev/null 2>&1 || true
        exec gosu viz "$@"
    else
        rm -f /app/data/.perm_probe 2>/dev/null || true
        echo "[entrypoint] Warning: /app/data volume does not support POSIX ownership (e.g. exFAT/NTFS mount). Running as root."
        exec "$@"
    fi
fi

exec "$@"
