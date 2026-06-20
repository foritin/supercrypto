#!/bin/bash
# stop_all.sh - 一键停止所有开发依赖服务

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🛑 Stopping all development services..."

bash "$SCRIPT_DIR/stop_hardhat.sh"
bash "$SCRIPT_DIR/stop_minio.sh"
bash "$SCRIPT_DIR/stop_redis.sh"
bash "$SCRIPT_DIR/stop_pg.sh"

echo "✅ All services stopped."
