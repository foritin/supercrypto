#!/bin/bash
# start_pg.sh - 启动 PostgreSQL

PG_CONTAINER="supercrypto-pg"
PG_PORT="${PG_PORT:-5432}"
PG_PASSWORD="${PG_PASSWORD:-***REMOVED***}"

echo "🐘 Starting PostgreSQL container..."

if command -v docker &> /dev/null; then
    docker run -d \
        --name "$PG_CONTAINER" \
        -p "$PG_PORT:5432" \
        -e POSTGRES_PASSWORD="$PG_PASSWORD" \
        -e POSTGRES_DB=rwa \
        -v supercrypto_pg_data:/var/lib/postgresql/data \
        --restart unless-stopped \
        postgres:16
    echo "✅ PostgreSQL started on port $PG_PORT"
else
    echo "❌ Docker not found. Please install Docker or start PostgreSQL manually."
    exit 1
fi
