#!/bin/bash
set -e

echo "[start] Corriendo migraciones..."
python migrate.py

# Download and start tonutils-storage if binary not present
if [ ! -f "/tmp/tonutils-storage" ]; then
    echo "[start] Descargando tonutils-storage..."
    curl -fsSL -o /tmp/tonutils-storage \
        https://github.com/xssnick/tonutils-storage/releases/latest/download/tonutils-storage-linux-amd64
    chmod +x /tmp/tonutils-storage
fi

mkdir -p /tmp/ton-db /tmp/ton-files
echo "[start] Iniciando tonutils-storage..."
/tmp/tonutils-storage --daemon \
    --api "0.0.0.0:8192" \
    --api-login "${TONUTILS_LOGIN:-admin}" \
    --api-password "${TONUTILS_PASSWORD:-secret123}" \
    --db /tmp/ton-db &

sleep 3

echo "[start] Iniciando bot y servidor..."
python bot.py &
BOT_PID=$!
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
kill $BOT_PID 2>/dev/null || true
