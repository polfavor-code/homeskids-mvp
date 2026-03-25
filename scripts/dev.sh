#!/bin/bash
# Dev server with auto-cleanup: kills stale port, cleans corrupted cache, starts fresh

PORT=3003

# Kill anything on the port
lsof -ti:$PORT 2>/dev/null | xargs kill -9 2>/dev/null

# Remove corrupted vendor-chunks (root cause of crashes on Node 24 + Next 14)
# Only removes the server cache, not the full .next (faster restarts)
if [ -d ".next/server" ]; then
  rm -rf .next/server/vendor-chunks
  rm -rf .next/server/webpack-runtime.js
fi

# If the cache is deeply broken, nuke it entirely
if [ ! -f ".next/BUILD_ID" ] 2>/dev/null; then
  rm -rf .next
fi

exec next dev -p $PORT
