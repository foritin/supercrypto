#!/bin/bash
# start_minio.sh - 启动 MinIO

MINIO_CONTAINER="supercrypto-minio"

echo "📦 Starting MinIO container..."

if command -v docker &> /dev/null; then
    docker run -d \
        --name "$MINIO_CONTAINER" \
        -p 9000:9000 \
        -p 9001:9001 \
        -e MINIO_ROOT_USER=minioadmin \
        -e MINIO_ROOT_PASSWORD=minioadmin \
        -v supercrypto_minio_data:/data \
        --restart unless-stopped \
        minio/minio server /data --console-address ":9001"
    echo "✅ MinIO started on port 9000 (console: 9001)"
else
    echo "❌ Docker not found."
    exit 1
fi
