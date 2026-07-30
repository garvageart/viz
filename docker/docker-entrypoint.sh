#!/bin/sh
set -e

# Ensure required directories exist and fix volume permissions when running as root
if [ "$(id -u)" = '0' ]; then
    mkdir -p /app/var/logs /app/var/logs/http /app/var/trash /app/var/cache
    if chown -R viz:viz /app/var 2>/dev/null; then
        exec gosu viz "$@"
    else
        echo "[entrypoint] Warning: /app/var volume does not support POSIX ownership (e.g. exFAT/NTFS mount). Running as root."
        exec "$@"
    fi
fi

exec "$@"
