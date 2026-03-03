# DaathApp - Telegram Mini App

## Descripción
Mini App de estudio para estudiantes de ingeniería minera. Accesible via @DaathApp_bot en Telegram.

## Stack
- Frontend: React + Vite → Vercel (https://minestudy.vercel.app)
- Backend: FastAPI + Python 3.11 → Railway (https://minestudy-production.up.railway.app)
- Base de datos: PostgreSQL en Railway (NUNCA usar SQLite)
- Bot: python-telegram-bot 21.9

## Estructura
- /frontend → React app
- /backend → FastAPI + bot.py

## Admin
- ID Telegram del admin: 1063772095
- Panel de admin via /admin en el bot

## Reglas importantes
- NUNCA usar SQLite, siempre PostgreSQL via DATABASE_URL
- NUNCA commitear app.db
- El bot usa polling con drop_pending_updates=True
- Los botones del bot usan raw httpx para soportar Bot API 9.4 (colores)
- Python 3.11 forzado via nixpacks.toml
