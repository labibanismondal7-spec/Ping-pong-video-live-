#!/bin/sh
set -eu

# Railway mounts the persistent volume after image build.
# Ensure the mounted volume is writable by the application user.
if [ -d /app/persistent ]; then
    chown -R node:node /app/persistent 2>/dev/null || true
    chmod -R u+rwX /app/persistent 2>/dev/null || true
fi

mkdir -p /app/persistent/data /app/persistent/uploads
chown -R node:node /app/persistent 2>/dev/null || true

exec su -s /bin/sh node -c 'exec "$@"' sh "$@"
