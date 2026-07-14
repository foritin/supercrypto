#!/bin/bash
# start_all.sh - 启动开发依赖服务（SQLite + Redis + 已外部启动的 Hardhat）

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🚀 Starting development services..."

# 1. Redis
if ! docker ps | grep -q supercrypto-redis; then
    echo "📦 Starting Redis..."
    bash "$SCRIPT_DIR/start_redis.sh"
else
    echo "✅ Redis already running"
fi

# 2. 等待 Redis 就绪
echo "⏳ Waiting for Redis..."
sleep 2

# 3. 健康检查
echo "🔍 Health check..."
bash "$SCRIPT_DIR/health_check.sh"

echo ""
echo "✅ Services started successfully!"
echo ""
echo "📋 Service URLs:"
echo "   - SQLite:  E:/cryptoplatform-data/app.sqlite"
echo "   - Redis:   localhost:6379"
echo "   - Hardhat: http://localhost:8545 (external)"
echo "   - API:     http://localhost:8000"
