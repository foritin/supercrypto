#!/bin/bash
# stop_minio.sh

echo "🛑 Stopping MinIO..."
docker stop supercrypto-minio 2>/dev/null || true
docker rm supercrypto-minio 2>/dev/null || true
echo "✅ MinIO stopped."
