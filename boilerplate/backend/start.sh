#!/bin/bash
set -e

echo "[start] Corriendo migraciones..."
python migrate.py

echo "[start] Iniciando bot y servidor..."
sleep 1
python bot.py &
BOT_PID=$!
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
kill $BOT_PID
