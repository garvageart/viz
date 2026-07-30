#!/bin/sh
set -e

# Ensure required directories exist and fix volume permissions when running as root
if [ "$(id -u)" = '0' ]; then
    mkdir -p /app/var/logs /app/var/logs/http /app/var/trash /app/var/cache

    # Fast O(1) probe: test if the volume supports POSIX ownership (chown)
    touch /app/var/.perm_probe 2>/dev/null || true
    if chown viz:viz /app/var/.perm_probe >/dev/null 2>&1; then
        rm -f /app/var/.perm_probe
        chown -R viz:viz /app/var >/dev/null 2>&1 || true
        exec gosu viz "$@"
    else
        rm -f /app/var/.perm_probe 2>/dev/null || true
        echo "[entrypoint] Warning: /app/var volume does not support POSIX ownership (e.g. exFAT/NTFS mount). Running as root."
        exec "$@"
    fi
fi

exec "$@"
