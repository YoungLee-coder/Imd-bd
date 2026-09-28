#!/bin/sh
set -e

echo "Applying D1 migrations..."
node ./node_modules/wrangler/bin/wrangler.js d1 migrations apply ims --local

echo "Starting IMS API on 0.0.0.0:8787"
exec node ./node_modules/wrangler/bin/wrangler.js dev --ip 0.0.0.0 --port 8787 --local
