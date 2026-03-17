#!/bin/sh
# Simple health check script for ECS
# Tests if Next.js server is responding on port 3000

# Try wget first (most reliable in Alpine)
if command -v wget >/dev/null 2>&1; then
  wget --no-verbose --tries=1 --spider --timeout=5 http://localhost:3000/api/health 2>&1
  exit $?
fi

# Fallback to curl if wget not available
if command -v curl >/dev/null 2>&1; then
  curl -f -s -m 5 http://localhost:3000/api/health >/dev/null 2>&1
  exit $?
fi

# Last resort: use nc to check if port is open
if command -v nc >/dev/null 2>&1; then
  nc -z localhost 3000
  exit $?
fi

# No tools available - assume healthy if we got here
echo "No health check tools available"
exit 1
