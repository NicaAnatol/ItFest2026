#!/bin/sh
set -e

# Health check for Next.js server
# Simply test if the API endpoint responds

wget --no-verbose --tries=1 --spider --timeout=5 http://localhost:3000/api/health 2>&1 | grep -E '200|OK' || exit 1
exit 0
