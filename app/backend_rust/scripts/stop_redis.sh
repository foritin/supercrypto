#!/bin/bash
# stop_redis.sh

echo "🛑 Stopping Redis..."
docker stop supercrypto-redis 2>/dev/null || true
docker rm supercrypto-redis 2>/dev/null || true
echo "✅ Redis stopped."
