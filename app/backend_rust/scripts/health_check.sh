#!/bin/bash
# health_check.sh

echo "🔍 Running health checks..."

ERRORS=0

# PostgreSQL
if docker exec supercrypto-pg pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ PostgreSQL: OK"
else
    echo "❌ PostgreSQL: Not ready"
    ERRORS=$((ERRORS + 1))
fi

# Redis
if docker exec supercrypto-redis redis-cli ping | grep -q PONG 2>/dev/null; then
    echo "✅ Redis: OK"
else
    echo "❌ Redis: Not ready"
    ERRORS=$((ERRORS + 1))
fi

# MinIO
if curl -s http://localhost:9000/minio/health/live > /dev/null 2>&1; then
    echo "✅ MinIO: OK"
else
    echo "❌ MinIO: Not ready"
    ERRORS=$((ERRORS + 1))
fi

# Hardhat
if curl -s -X POST -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    http://localhost:8545 > /dev/null 2>&1; then
    echo "✅ Hardhat: OK"
else
    echo "❌ Hardhat: Not ready"
    ERRORS=$((ERRORS + 1))
fi

# Rust Backend
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Rust Backend: OK"
else
    echo "❌ Rust Backend: Not ready (run 'cargo run' in app/backend_rust)"
fi

if [ $ERRORS -eq 0 ]; then
    echo ""
    echo "🎉 All dependency services are healthy!"
    exit 0
else
    echo ""
    echo "⚠️ $ERRORS service(s) not ready."
    exit 1
fi
