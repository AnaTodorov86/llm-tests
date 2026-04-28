#!/bin/bash
# Verify installation and dependencies

echo "=== LLM Performance Framework - Installation Check ==="
echo ""

# Check k6
if command -v k6 &> /dev/null; then
    K6_VERSION=$(k6 version 2>&1 | head -n1)
    echo "✓ k6 installed: $K6_VERSION"
else
    echo "✗ k6 NOT installed"
    echo "  Install: brew install k6  (macOS)"
    echo "       OR: See https://k6.io/docs/get-started/installation/"
fi

# Check Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo "✓ Docker installed: $DOCKER_VERSION"
    
    # Check if Docker daemon is running
    if docker ps &> /dev/null; then
        echo "✓ Docker daemon running"
    else
        echo "✗ Docker daemon not running"
        echo "  Start Docker Desktop or run: sudo systemctl start docker"
    fi
else
    echo "✗ Docker NOT installed"
    echo "  Install: https://docs.docker.com/get-docker/"
fi

# Check API keys
echo ""
echo "API Keys:"
if [ -n "$GROQ_API_KEY" ]; then
    echo "✓ GROQ_API_KEY set (${#GROQ_API_KEY} chars)"
else
    echo "✗ GROQ_API_KEY not set"
    echo "  Set with: export GROQ_API_KEY='your-key'"
fi

if [ -n "$OPENAI_API_KEY" ]; then
    echo "✓ OPENAI_API_KEY set (${#OPENAI_API_KEY} chars)"
else
    echo "○ OPENAI_API_KEY not set (optional)"
fi

echo ""
echo "=== Next Steps ==="
if command -v k6 &> /dev/null && docker ps &> /dev/null && [ -n "$GROQ_API_KEY" ]; then
    echo "✓ Ready to run tests!"
    echo ""
    echo "Try: ./scripts/run_test.sh baseline groq"
else
    echo "Fix the issues above, then run ./scripts/verify_setup.sh again"
fi
