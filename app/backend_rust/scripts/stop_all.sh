#!/bin/bash
# stop_all.sh - 停止 Redis（Hardhat 由外部管理，不停止）

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🛑 Stopping development services..."

bash "$SCRIPT_DIR/stop_redis.sh"

echo "✅ Redis stopped. Hardhat is managed externally and was not stopped."
