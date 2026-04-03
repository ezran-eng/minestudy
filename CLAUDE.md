# DaathApp - Telegram Mini App for Mining Engineering Students

## Description
Study mini app for mining engineering students. Accessible via @DaathApp_bot on Telegram.
Production: https://minestudy.vercel.app | API: https://minestudy-production.up.railway.app

## Stack
- **Frontend**: React 19 + Vite → Vercel (auto-deploy from main)
- **Backend**: FastAPI + Python 3.11 → Railway (auto-deploy from main)
- **Database**: PostgreSQL on Railway (NEVER use SQLite)
- **Bot**: python-telegram-bot 21.9 (polling, drop_pending_updates=True)
- **Storage**: Cloudflare R2 (bucket: daathapp-infografias)
- **AI**: Deepseek (primary) + OpenAI fallback, cached per user+action
- **Blockchain**: TON Connect (wallet auth), TonAPI (NFT detection), tonutils-storage (Zona Libre)
- **Monitoring**: Sentry (frontend + backend), AI call logging with cost tracking

## Project Structure
```
/frontend
  /src/screens/     → 12 screens (Home, Study, Profile, MateriaDetail, UnidadDetail, UserProfile, ZonaLibre, etc.)
  /src/components/  → 29 components (GiftGrid, MateriaList, NftBadge, TonConnectButton, Mascota/*, etc.)
  /src/hooks/       → 5 hooks (useTelegram, useQueryHooks, useActividad, useMascotaContext, usePomodoroMascota)
  /src/services/    → api.js (80+ API functions, fetch-based)
  /src/context/     → MascotaContext, PomodoroContext
  /src/i18n/        → en.json, es.json
/backend
  main.py           → 73 API endpoints + auth + scheduled jobs
  models.py         → 22 SQLAlchemy models
  schemas.py        → 35+ Pydantic schemas
  bot.py            → Telegram bot entry
  handlers/         → 10 modular bot conversation handlers
  ton_wallet.py     → TON Connect proof verification + NFT detection
  ton_storage.py    → TON Storage HTTP client (Zona Libre)
  mascota_ai.py     → Redo AI context builder
  llm.py            → Deepseek/OpenAI client with caching
  ai_generate.py    → AI flashcard & quiz generation
  tutor_chat.py     → AI tutor responses
  quota_check.py    → Per-user AI budget management
  alembic/          → 8 DB migration files
```

## Admin
- Telegram admin ID: **1063772095** (used in bot.py, main.py, UnidadDetail.jsx)
- Bot admin panel: /admin command
- Web admin: /admin/ai route (AI analytics dashboard)

## Key Architecture Patterns
- **Auth**: Telegram WebApp HMAC validation (`X-Telegram-Init-Data` header)
- **Bot menus**: raw httpx for Bot API 9.4 colored buttons (`send_raw_menu`)
- **Bot state**: ConversationHandler with numeric states (range(N))
- **Frontend state**: React Query (@tanstack/react-query) for server state
- **Frontend auth**: useTelegram.js hook → user.id from Telegram WebApp
- **API client**: fetch-based (no axios), api.js with getInitDataHeader()
- **AI caching**: hash(user_id + action + context) → skip duplicate calls
- **NFT detection**: metadata.image contains "nft.fragment.com" (zero extra API calls)
- **Spaced repetition**: SM2 algorithm in CardReview model
- **DB migrations**: Alembic + auto-migrate in lifespan() for simple column adds

## Critical Rules
- **NEVER** use SQLite — always PostgreSQL via DATABASE_URL
- **NEVER** commit app.db or .env files
- **NEVER** delete data without user confirmation
- Python 3.11 forced via nixpacks.toml
- Auto commit + push after each change set (user preference)
- Railway blocks UDP → TON Storage bags not visible externally

## Environment Variables
### Backend (Required)
- `DATABASE_URL` — PostgreSQL connection string
- `TELEGRAM_BOT_TOKEN` — Bot API token
- `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` — Cloudflare R2

### Backend (Optional)
- `SENTRY_DSN` — Error tracking
- `ADMIN_SECRET` — Admin endpoint auth
- `DEEPSEEK_API_KEY` — AI model
- `TONUTILS_URL`, `TONUTILS_LOGIN`, `TONUTILS_PASSWORD` — TON Storage
- `TONAPI_KEY` — TonAPI for NFT queries
- `ALLOWED_ORIGINS` — CORS

### Frontend
- `VITE_API_URL` — Backend base URL
- `VITE_ADMIN_SECRET` — Admin token

## Features Overview
1. **Study System**: Materias → Unidades → Temas → Flashcards/Quiz
2. **Spaced Repetition**: SM2 algorithm with due dates
3. **Redo AI Agent**: Draggable mascot, tutor chat, auto-generate content
4. **Pomodoro Timer**: Floating timer with Redo integration
5. **TON Wallet**: Connect via ton_proof, verify ed25519 signatures
6. **Telegram Gifts**: Display NFTs, set active gift, apply gift style to materia cards
7. **Zona Libre**: Decentralized file sharing via TON Storage
8. **Periodic Table**: Chemistry element lookup
9. **Privacy Controls**: Per-field visibility (photo, name, username, subjects, progress, NFT)
10. **Notifications**: Daily reminders, streak alerts, flashcard due alerts
11. **Ranking**: Community leaderboard by study activity
12. **i18n**: English + Spanish
