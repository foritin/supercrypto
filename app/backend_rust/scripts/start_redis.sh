#!/bin/bash
# start_redis.sh - 启动 Redis

REDIS_CONTAINER="supercrypto-redis"
REDIS_PASSWORD="${REDIS_PASSWORD:-***REMOVED***}"

echo "🔴 Starting Redis container..."

if command -v docker &> /dev/null; then
    docker run -d \
        --name "$REDIS_CONTAINER" \
        -p 6379:6379 \
        -e REDIS_PASSWORD="$REDIS_PASSWORD" \
        --restart unless-stopped \
        redis:7-alpine \
        redis-server --requirepass "$REDIS_PASSWORD"
    echo "✅ Redis started on port 6379"
else
    echo "❌ Docker not found."
    exit 1
fi
