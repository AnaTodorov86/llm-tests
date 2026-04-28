#!/bin/bash
# Run k6 performance tests with full observability stack
#
# Usage:
#   ./scripts/run_test.sh [PROFILE] [PROVIDER]
#
# Examples:
#   ./scripts/run_test.sh baseline groq
#   ./scripts/run_test.sh stress openai
#   ./scripts/run_test.sh chat

set -e

# Configuration
PROFILE=${1:-baseline}
PROVIDER=${2:-groq}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
INFLUXDB_ORG=${INFLUXDB_ORG:-llm-testing}
INFLUXDB_BUCKET=${INFLUXDB_BUCKET:-k6}
INFLUXDB_ADMIN_TOKEN=${INFLUXDB_ADMIN_TOKEN:-my-super-secret-auth-token}
INFLUXDB_USER=${INFLUXDB_USER:-k6}
INFLUXDB_PASSWORD=${INFLUXDB_PASSWORD:-k6pass123}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== LLM Performance Test ===${NC}"
echo "Profile: $PROFILE"
echo "Provider: $PROVIDER"
echo ""

# Check if API key is set
if [ "$PROVIDER" = "groq" ] && [ -z "$GROQ_API_KEY" ]; then
    echo -e "${RED}ERROR: GROQ_API_KEY not set${NC}"
    echo "Export your API key: export GROQ_API_KEY='your-key-here'"
    exit 1
fi

if [ "$PROVIDER" = "openai" ] && [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${RED}ERROR: OPENAI_API_KEY not set${NC}"
    exit 1
fi

# Start observability stack if not running
if ! docker ps | grep -q llm-perf-influxdb; then
    echo -e "${YELLOW}Starting observability stack...${NC}"
    docker-compose -f "$PROJECT_ROOT/docker-compose.observability.yml" up -d
    
    echo "Waiting for InfluxDB to be healthy..."
    timeout 30 bash -c 'until docker exec llm-perf-influxdb influx ping &>/dev/null; do sleep 1; done'
    
    echo "Waiting for Grafana to be healthy..."
    timeout 30 bash -c 'until curl -sf http://localhost:3000/api/health &>/dev/null; do sleep 1; done'
    
    echo -e "${GREEN}✓ Observability stack ready${NC}"
fi

# Ensure InfluxDB v1 compatibility auth exists for k6 output
if ! docker exec -e INFLUX_TOKEN="$INFLUXDB_ADMIN_TOKEN" llm-perf-influxdb influx v1 auth list \
    --org "$INFLUXDB_ORG" \
    --json | rg -q "\"(token|username|userName)\":\\s*\"$INFLUXDB_USER\""; then
    echo -e "${YELLOW}Configuring InfluxDB v1 auth for k6 output...${NC}"
    BUCKET_ID=$(docker exec -e INFLUX_TOKEN="$INFLUXDB_ADMIN_TOKEN" llm-perf-influxdb influx bucket list \
        --name "$INFLUXDB_BUCKET" \
        --org "$INFLUXDB_ORG" \
        --hide-headers | awk '{print $1}')

    if [ -z "$BUCKET_ID" ]; then
        echo -e "${RED}ERROR: InfluxDB bucket '$INFLUXDB_BUCKET' not found${NC}"
        exit 1
    fi

    docker exec -e INFLUX_TOKEN="$INFLUXDB_ADMIN_TOKEN" llm-perf-influxdb influx v1 auth create \
        --org "$INFLUXDB_ORG" \
        --username "$INFLUXDB_USER" \
        --password "$INFLUXDB_PASSWORD" \
        --write-bucket "$BUCKET_ID" >/dev/null

    echo -e "${GREEN}✓ InfluxDB v1 auth configured${NC}"
fi

# Run k6 test with InfluxDB output
echo -e "${GREEN}Running k6 test...${NC}"
k6 run \
    --out influxdb="http://${INFLUXDB_USER}:${INFLUXDB_PASSWORD}@localhost:8086/k6" \
    --env LOAD_PROFILE="$PROFILE" \
    --env PROVIDER="$PROVIDER" \
    --env GROQ_API_KEY="$GROQ_API_KEY" \
    --env OPENAI_API_KEY="$OPENAI_API_KEY" \
    "$PROJECT_ROOT/tests/performance_test.js"

EXIT_CODE=$?

echo ""
echo -e "${GREEN}=== Results ===${NC}"
echo "Grafana: http://localhost:3000 (admin/admin)"
echo "InfluxDB: http://localhost:8086"
echo "Prometheus: http://localhost:9090"

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All thresholds passed${NC}"
else
    echo -e "${RED}✗ Some thresholds failed - check output above${NC}"
fi

exit $EXIT_CODE
