#!/bin/bash
# Stop observability stack and optionally clean up data

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

CLEAN=${1:-false}

echo "Stopping observability stack..."
docker-compose -f "$PROJECT_ROOT/docker-compose.observability.yml" down

if [ "$CLEAN" = "clean" ]; then
    echo "Removing volumes (all test data will be lost)..."
    docker-compose -f "$PROJECT_ROOT/docker-compose.observability.yml" down -v
    echo "✓ All data removed"
else
    echo "✓ Stack stopped (data preserved in volumes)"
    echo "To remove all data, run: ./scripts/stop_observability.sh clean"
fi
