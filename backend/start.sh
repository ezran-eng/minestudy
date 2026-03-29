#!/bin/bash
set -e

echo "[start] Corriendo migraciones..."
python migrate.py

# --- TON Storage (non-critical) ---
(
    TONBIN="./tonutils-storage"

    # If not downloaded at build time, download now with Python
    if [ ! -f "$TONBIN" ]; then
        echo "[start] Descargando tonutils-storage con Python..."
        python -c "
import urllib.request
urllib.request.urlretrieve(
    'https://github.com/xssnick/tonutils-storage/releases/latest/download/tonutils-storage-linux-amd64',
    'tonutils-storage'
)
print('[start] Download OK')
"
        chmod +x "$TONBIN"
    fi

    if [ -f "$TONBIN" ]; then
        mkdir -p /tmp/ton-db /tmp/ton-files
        echo "[start] Iniciando tonutils-storage..."
        "$TONBIN" --daemon \
            --api "0.0.0.0:8192" \
            --api-login "${TONUTILS_LOGIN:-admin}" \
            --api-password "${TONUTILS_PASSWORD:-secret123}" \
            --db /tmp/ton-db &
        sleep 3
        echo "[start] tonutils-storage OK"
    else
        echo "[start] tonutils-storage no disponible — uploads usarán R2"
    fi
) || echo "[start] WARN: tonutils-storage setup failed — uploads usarán R2"

# --- App ---
echo "[start] Iniciando bot y servidor..."
python bot.py &
BOT_PID=$!
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
kill $BOT_PID 2>/dev/null || true
