#!/bin/bash
python bot.py &
BOT_PID=$!
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
kill $BOT_PID
