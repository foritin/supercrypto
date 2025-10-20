#!/bin/bash

# 重置 Hardhat 节点状态（不重启进程）
# 使用 hardhat_reset RPC 方法

echo "🔄 正在重置 Hardhat 节点状态..."

curl -X POST \
  -H "Content-Type: application/json" \
  --data '{
    "jsonrpc": "2.0",
    "method": "hardhat_reset",
    "params": [],
    "id": 1
  }' \
  http://localhost:8545

echo ""
echo "✅ 节点状态已重置"
echo "📋 所有账户余额已恢复到 10000 ETH"
echo "🗑️  所有已部署的合约已清除"

