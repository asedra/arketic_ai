#!/bin/sh
set -e

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ] || [ ! -d "node_modules/@dnd-kit" ]; then
    echo "Installing dependencies with pnpm..."
    pnpm install
fi

# Execute the command passed to docker run
exec "$@"