#!/bin/sh
set -e

# Ensure required directories exist and fix volume permissions when running as root
if [ "$(id -u)" = '0' ]; then
    mkdir -p /app/var/logs /app/var/logs/http /app/var/trash /app/var/cache
    chown -R viz:viz /app/var
    exec gosu viz "$@"
fi

exec "$@"
