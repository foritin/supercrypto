#!/bin/bash

# 重置到指定区块号
# 用法: ./reset-to-block.sh 100

BLOCK_NUMBER=${1:-0}

echo "🔄 正在重置到区块 #$BLOCK_NUMBER..."

curl -X POST \
  -H "Content-Type: application/json" \
  --data "{
    \"jsonrpc\": \"2.0\",
    \"method\": \"hardhat_reset\",
    \"params\": [
      {
        \"forking\": {
          \"blockNumber\": $BLOCK_NUMBER
        }
      }
    ],
    \"id\": 1
  }" \
  http://localhost:8545

echo ""
echo "✅ 已重置到区块 #$BLOCK_NUMBER"

