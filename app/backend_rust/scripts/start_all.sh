#!/bin/bash
# start_all.sh - 一键启动所有开发依赖服务

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🚀 Starting all development services..."

# 1. PostgreSQL
if ! docker ps | grep -q supercrypto-pg; then
    echo "📦 Starting PostgreSQL..."
    bash "$SCRIPT_DIR/start_pg.sh"
else
    echo "✅ PostgreSQL already running"
fi

# 2. Redis
if ! docker ps | grep -q supercrypto-redis; then
    echo "📦 Starting Redis..."
    bash "$SCRIPT_DIR/start_redis.sh"
else
    echo "✅ Redis already running"
fi

# 3. MinIO
if ! docker ps | grep -q supercrypto-minio; then
    echo "📦 Starting MinIO..."
    bash "$SCRIPT_DIR/start_minio.sh"
else
    echo "✅ MinIO already running"
fi

# 4. Hardhat Node
if ! pgrep -f "hardhat node" > /dev/null; then
    echo "⛓️  Starting Hardhat node..."
    bash "$SCRIPT_DIR/start_hardhat.sh"
else
    echo "✅ Hardhat node already running"
fi

# 5. 等待服务就绪
echo "⏳ Waiting for services to be ready..."
sleep 5

# 6. 健康检查
echo "🔍 Health check..."
bash "$SCRIPT_DIR/health_check.sh"

echo ""
echo "✅ All services started successfully!"
echo ""
echo "📋 Service URLs:"
echo "   - PostgreSQL: localhost:5432"
echo "   - Redis:      localhost:6379"
echo "   - MinIO:      http://localhost:9000"
echo "   - Hardhat:    http://localhost:8545"
echo "   - API:        http://localhost:8000"
