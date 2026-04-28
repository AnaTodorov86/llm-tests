# LLM Performance Testing Framework

k6 framework for testing LLM APIs with **real streaming metrics**.

## What Is Tested (LLM-Specific)

- **TTFT** (Time to First Token) - UX critical metric (p50/p95/p99)
- **TPS** (Tokens Per Second) - Throughput measurement
- **Stream Reliability** - Completion rate, partial response detection
- **Load Behavior** - Performance degradation under concurrent load

## Why This Framework?

Most LLM perf tests fail because they:
- Use `stream: false` (misses real streaming behavior)
- Don't track TTFT (the metric users actually feel)
- Rely on `check()` instead of `thresholds` (tests pass when they should fail)
- Can't scale beyond 50-100 VUs on single machine

This framework fixes all of that.

## Prerequisites

```bash
# Install k6
brew install k6
# OR
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6  # Linux

# Install Docker (for observability stack)
https://docs.docker.com/get-docker/

# Set API key
export GROQ_API_KEY="your-groq-api-key-here"
```

## Quick Start

```bash
# Clone and enter directory
cd llm-perf-framework

# Run baseline test (includes InfluxDB + Grafana)
./scripts/run_test.sh baseline groq

# View results
open http://localhost:3000  # Grafana (admin/admin)
```

The script:
1. Starts observability stack (InfluxDB + Grafana)
2. Runs k6 test with streaming enabled
3. Streams metrics to InfluxDB in real-time
4. Shows live dashboard

## View Results Online

**Grafana Cloud Dashboard**: [Grafana Cloud k6](https://ana.grafana.net/a/k6-app/projects/7399805)

All GitHub Actions test runs are automatically sent to Grafana Cloud k6 for persistent results and visualization.

### Local Testing
```bash
# Run test locally with Grafana dashboard
./scripts/run_test.sh baseline groq
open http://localhost:3000  # Local Grafana (admin/admin)
```

### CI/CD Testing
```bash
# GitHub Actions automatically sends results to k6 Cloud
# **View results**: [Grafana Cloud k6](https://ana.grafana.net/a/k6-app/projects/7399805)
```

## Load Profiles

Pre-configured realistic workload patterns:

| Profile | VUs | Duration | Use Case | TTFT SLO | TPS SLO |
|---------|-----|----------|----------|----------|---------|
| `baseline` | 10 | 3min | Regression testing | <250ms | >65 |
| `chat` | 20 | 5min | Chat-like traffic (50%+ prod) | <300ms | >60 |
| `code` | 10 | 5min | Code completion (30% prod) | <400ms | >50 |
| `document` | 5 | 5min | Long-form generation | <600ms | >40 |
| `burst` | 10→100→10 | 3.5min | Traffic spike simulation | <800ms | >30 |
| `stress` | 50→200 | 10min | Find breaking point | <1500ms | >25 |

```bash
# Run different profiles
./scripts/run_test.sh chat groq
./scripts/run_test.sh stress openai
```

## Thresholds (SLOs)

All thresholds are **enforced** - k6 exits with code 1 on failure:

```javascript
// Baseline profile thresholds
'time_to_first_token': ['p(95)<250ms', 'p(99)<375ms']
'tokens_per_second': ['avg>65', 'p(50)>52']
'llm_success': ['rate>0.95']  // 95% completion rate
'stream_errors': ['rate<0.01']  // <1% stream failures
```

Each profile has tuned thresholds. Stress tests allow degraded performance.

## Observability

### Grafana Dashboards

1. Open http://localhost:3000 (admin/admin)
2. Navigate to Dashboards → LLM Performance (auto-provisioned)
3. Panels show:
   - TTFT distribution over time
   - TPS by percentile
   - Success rate
   - Rate limit hits
   - Active VUs

### InfluxDB

Raw metrics: http://localhost:8086

Query examples:
```flux
// TTFT p95 over last hour
from(bucket: "k6")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "time_to_first_token")
  |> quantile(q: 0.95)
```

### Prometheus (Optional)

Metrics: http://localhost:9090

Enable with:
```bash
k6 run --out experimental-prometheus-rw tests/performance_test.js
```

## Project Structure

```
llm-perf-framework/
├── lib/
│   ├── streamingHelpers.js    # Core SSE streaming logic
│   ├── streamingMetrics.js    # TTFT, TPS, custom metrics
│   ├── loadProfiles.js        # Workload definitions
│   ├── prompts.js             # Prompt library by type
│   └── providers.js           # LLM API configs
├── tests/
│   └── performance_test.js    # Main test script
├── scripts/
│   ├── run_test.sh            # Test runner with observability
│   └── stop_observability.sh  # Cleanup script
├── grafana/
│   ├── dashboards/            # Auto-provisioned dashboards
│   └── datasources/           # InfluxDB connection
├── prometheus/
│   └── prometheus.yml         # Scrape config
└── docker-compose.observability.yml
```

## Advanced Usage

### Custom Prompts

Edit `lib/prompts.js`:
```javascript
export const PROMPTS_BY_TYPE = {
    short: [
        "Your custom short prompt",
        // ... more prompts
    ],
};
```

### Custom Load Profile

Edit `lib/loadProfiles.js`:
```javascript
export const LOAD_PROFILES = {
    my_custom_profile: {
        vus: 50,
        duration: '10m',
        promptType: 'medium',
        maxTokens: 300,
        temperature: 0.5,
        expectedTTFT: 500,
        expectedTPS: 45,
    },
};
```

Run with:
```bash
./scripts/run_test.sh my_custom_profile groq
```

### Multiple Providers

```bash
export OPENAI_API_KEY="sk-..."
./scripts/run_test.sh baseline openai

# Compare providers
./scripts/run_test.sh baseline groq
./scripts/run_test.sh baseline openai
# Check Grafana to compare TTFT/TPS
```

## Distributed Testing (>200 VUs)

For high-scale testing, use k6 Cloud or Kubernetes Operator:

### k6 Cloud (Easy)
```bash
k6 cloud login
k6 cloud run \
    --env GROQ_API_KEY="$GROQ_API_KEY" \
    --env LOAD_PROFILE=stress \
    tests/performance_test.js
```

### Kubernetes Operator (Self-Hosted)
See `k8s/` directory for manifests (TODO: add k8s files if needed).

## Troubleshooting

### "GROQ_API_KEY not set"
```bash
export GROQ_API_KEY="your-key-here"
```

### "InfluxDB connection failed"
```bash
# Check if containers are running
docker ps | grep llm-perf

# Restart observability stack
./scripts/stop_observability.sh clean
./scripts/run_test.sh baseline
```

### "All requests failing with 429"
You're hitting rate limits. Options:
- Reduce VUs in load profile
- Increase pacing: edit `sleep(1)` in `tests/performance_test.js`
- Use higher-tier API plan

### "Thresholds failing"
This is expected behavior if:
- Load profile is too aggressive for your provider
- API is experiencing issues
- Network latency is high

Check Grafana to see which metric is failing, then:
- Adjust thresholds in `lib/loadProfiles.js`
- OR fix the underlying issue (API, network, etc.)

## Metrics Glossary

| Metric | Meaning | Why It Matters |
|--------|---------|----------------|
| TTFT | Time to first token | UX - users feel slow starts |
| TPS | Tokens per second | Throughput - how fast text streams |
| Stream completion rate | % of streams that finished | Reliability |
| p95 latency | 95th percentile response time | SLO - 5% can be slower |
| VUs | Virtual Users | Concurrent load |

## Cleanup

```bash
# Stop containers, keep data
./scripts/stop_observability.sh

# Stop and delete all data
./scripts/stop_observability.sh clean
```

## Contributing

Found a bug? Have a feature request? Open an issue.

## License

MIT
