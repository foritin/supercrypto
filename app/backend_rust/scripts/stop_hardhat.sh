#!/bin/bash
# stop_hardhat.sh

HARDHAT_PID_FILE="/tmp/supercrypto-hardhat.pid"

echo "🛑 Stopping Hardhat node..."

if [ -f "$HARDHAT_PID_FILE" ]; then
    PID=$(cat "$HARDHAT_PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        echo "✅ Hardhat node stopped (PID: $PID)"
    else
        echo "⚠️ Hardhat node not running"
    fi
    rm -f "$HARDHAT_PID_FILE"
else
    echo "⚠️ Hardhat PID file not found"
fi
