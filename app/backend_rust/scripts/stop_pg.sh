#!/bin/bash
# stop_pg.sh - 停止 PostgreSQL

PG_CONTAINER="supercrypto-pg"

echo "🛑 Stopping PostgreSQL..."
docker stop "$PG_CONTAINER" 2>/dev/null || true
docker rm "$PG_CONTAINER" 2>/dev/null || true
echo "✅ PostgreSQL stopped."
