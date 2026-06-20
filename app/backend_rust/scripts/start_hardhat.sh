#!/bin/bash
# start_hardhat.sh - 启动 Hardhat 节点

HARDHAT_PID_FILE="/tmp/supercrypto-hardhat.pid"

if [ -f "$HARDHAT_PID_FILE" ] && kill -0 "$(cat "$HARDHAT_PID_FILE")" 2>/dev/null; then
    echo "⚠️ Hardhat node already running (PID: $(cat $HARDHAT_PID_FILE))"
    exit 0
fi

echo "⛓️  Starting Hardhat node..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$SCRIPT_DIR/../../contracts"

if [ -d "$CONTRACTS_DIR" ]; then
    cd "$CONTRACTS_DIR"
    npx hardhat node &
    echo $! > "$HARDHAT_PID_FILE"
    echo "✅ Hardhat node started (PID: $!) on port 8545"
else
    echo "⚠️ Contracts directory not found."
    echo "   cd app/backend/contracts && npx hardhat node"
    exit 1
fi
