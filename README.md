# DaathApp — AI Study Agent + Decentralized Storage on TON

> A Telegram Mini App for students, built with purpose.
> Open source. Built in Argentina. Competing worldwide.

---

## The Story

I'm Ezequiel, a student from Argentina.

I was tired of watching my classmates struggle — not because they weren't smart, but because the tools available to study were either too generic, too expensive, or simply not built for us. PDFs disappeared from links. Study groups scattered. Nobody knew what to study next.

So I built DaathApp.

Not as a side project. Not as a portfolio piece. As a real tool, for real students, solving a real problem. Today it runs in production with real users from my university. And it keeps growing.

This repository is everything I built — the architecture, the AI agent, the decentralized storage, the spaced repetition system, the Pomodoro integration, and more. I'm sharing it openly so that any developer can take this as a base and build their own Telegram Mini App with an AI agent.

If this helps you build something meaningful — that's enough for me.

---

## What is DaathApp?

DaathApp is a **Telegram Mini App** that helps students study smarter. It combines:

- **Redo** — an AI study agent (mascot) that knows your progress, guides your sessions, and lives inside the app
- **Spaced Repetition Flashcards** — SM2 algorithm, the same used by Anki
- **Multiple Choice Quizzes** — with AI-generated justifications
- **Pomodoro Timer** — guided by Redo with contextual suggestions
- **Zona Libre (Free Zone)** — decentralized file sharing via TON Storage. Nobody can censor or delete these files.
- **Progress Tracking** — per subject, per unit, with streaks and activity feed
- **Privacy Controls** — users choose what to share with the community
- **Full i18n** — English and Spanish

---

## Meet Redo

Redo is not just a mascot. He's a **contextual AI agent** that:

- Knows what screen you're on (Home, Study, Flashcards, Quiz, Profile)
- Knows your overdue flashcards, progress, streak, and active units
- Reacts when you drag him — *"Ouch!", "Where are we going?", "I like it here"*
- Drags over subjects to reveal stats and summaries
- Guides your Pomodoro sessions with real suggestions
- Speaks with personality — casual, direct, human
- Has aurora effects, blur overlay, and typewriter animation
- Is powered by Deepseek AI with full user context injection
- Falls back to hardcoded responses if AI is unavailable

Redo is built to degrade gracefully. If the AI fails, the experience doesn't break.

---

## Zona Libre — Free Zone

Zona Libre is a community-driven decentralized file sharing space built on **TON Storage**.

Students upload PDFs, textbooks, and study materials. Once uploaded, the files live on the TON network — distributed across thousands of nodes worldwide. Nobody can delete them. Not DaathApp, not any government.

- Upload any PDF or document (max 50MB per file, 300MB total in beta)
- Files are permanent on the TON network
- Community moderation via reports (files can be hidden in the app but never deleted from TON)
- Privacy-aware: upload anonymously or with your username
- Powered by [Tonutils Storage](https://github.com/xssnick/tonutils-storage) — HTTP API for TON Storage

> "The resistance starts with shared knowledge."

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite → Vercel |
| Backend | FastAPI + Python 3.11 → Railway |
| Database | PostgreSQL → Railway |
| Storage | Cloudflare R2 |
| Decentralized Storage | TON Storage via [Tonutils Storage](https://github.com/xssnick/tonutils-storage) |
| Bot | python-telegram-bot 21.9 |
| AI | Deepseek (via llm.py, swappable to OpenAI) |
| Animation | lottie-react |
| i18n | react-i18next |
| Monitoring | Sentry |
| Migrations | Alembic |

---

## Architecture Highlights

This codebase was built with production in mind from day one:

- **Zero N+1 queries** — eager loading with joinedload throughout
- **Lazy loading** — every screen is its own chunk, loaded on demand
- **Code splitting** — vendor-react, vendor-query, vendor-pdf as separate cached chunks
- **Connection pooling** — PostgreSQL with pool_size=10, max_overflow=20
- **Smart AI caching** — responses cached by user+action+context hash, not just TTL
- **Graceful degradation** — every AI feature has hardcoded fallbacks
- **Error Boundaries** — every screen wrapped, Sentry integrated
- **Strict CORS** — production domains only
- **Validated env vars** — app fails loudly if misconfigured
- **Full test suite** — unit + integration tests (50/50)
- **Bot modularized** — 18 handler files, one per conversation flow

---

## Project Structure

```
mineStudy/
├── frontend/                  # React + Vite
│   └── src/
│       ├── components/
│       │   └── mascota/       # Redo AI agent (8 modules)
│       │       ├── Mascota.jsx
│       │       ├── SpeechBubble.jsx
│       │       ├── MascotaMenu.jsx
│       │       ├── BlurOverlay.jsx
│       │       ├── MascotaIcon.jsx
│       │       ├── effects.jsx
│       │       ├── constants.js
│       │       └── useTypewriter.js
│       ├── screens/
│       │   ├── Home.jsx
│       │   ├── Study.jsx
│       │   ├── Profile.jsx
│       │   ├── ZonaLibre.jsx
│       │   └── ZonaLibreOnboarding.jsx
│       ├── hooks/
│       │   ├── useMascotaContext.js
│       │   ├── usePomodoroMascota.js
│       │   └── useTelegram.js
│       └── i18n/
│           ├── en.json
│           └── es.json
├── backend/                   # FastAPI
│   ├── routers/
│   │   ├── users.py
│   │   ├── subjects.py
│   │   ├── flashcards.py
│   │   ├── quiz.py
│   │   ├── zona_libre.py
│   │   └── ...
│   ├── mascota_ai.py          # Redo AI context builder
│   ├── llm.py                 # Deepseek/OpenAI client with caching
│   ├── ton_storage.py         # Tonutils Storage HTTP client
│   └── main.py
├── bot/                       # python-telegram-bot
│   └── handlers/              # 18 modular handlers
└── tonutils-storage/          # TON Storage service (Dockerfile)
```

---

## How to Use This as a Base

This repo is designed to be cloned and adapted. Here's the recommended path:

### 1. Clone and configure
```bash
git clone https://github.com/[your-repo]
cd mineStudy
```

### 2. Set up environment variables
```bash
# backend/.env
DATABASE_URL=postgresql+asyncpg://...
BOT_TOKEN=...
DEEPSEEK_API_KEY=...
ALLOWED_ORIGINS=https://your-app.vercel.app
SENTRY_DSN=...
TONUTILS_URL=http://your-tonutils.railway.internal:8192
TONUTILS_LOGIN=...
TONUTILS_PASSWORD=...

# frontend/.env
VITE_API_URL=https://your-backend.railway.app
```

### 3. Deploy TON Storage
```bash
# In tonutils-storage/ folder
# Deploy as a separate service on Railway
# Dockerfile is already configured
```

### 4. Run locally
```bash
# Backend
cd backend && pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend && npm install && npm run dev

# Bot
cd bot && python bot.py
```

### 5. Adapt Redo to your use case
All of Redo's phrases live in `src/i18n/en.json` under the `redo` key. Replace them with your own. The AI prompt lives in `backend/mascota_ai.py` — update it to match your app's context.

---

## Checklist Before Going to Production

- [ ] CORS points to production domain only
- [ ] All env vars set in Railway and Vercel
- [ ] Alembic migration applied (`alembic upgrade head`)
- [ ] Tests passing (`pytest tests/`)
- [ ] Sentry active on frontend and backend
- [ ] Error Boundaries covering every screen
- [ ] Endpoints paginated
- [ ] Lazy loading active on all screens
- [ ] Bot handlers split by flow

---

## Credits & Acknowledgments

This project stands on the shoulders of great open source work:

- [Tonutils Storage](https://github.com/xssnick/tonutils-storage) by xssnick — HTTP API for TON Storage, made Zona Libre possible
- [TON Foundation](https://ton.org) — TON Storage protocol and documentation
- [lottie-react](https://github.com/LottieFiles/lottie-react) — Redo's animations
- [react-i18next](https://react.i18next.com) — internationalization
- [python-telegram-bot](https://github.com/python-telegram-bot/python-telegram-bot) — bot framework
- [FastAPI](https://fastapi.tiangolo.com) — backend framework
- [Deepseek](https://deepseek.com) — AI provider

---

## Support & Contact

No royalties required. No payments needed. Just build something good.

If this project helped you, consider:

- ⭐ Starring this repository
- 💬 Reaching out on Telegram — I'd love to see what you build
- 💙 Optional donation in TON to support continued development

**Telegram:** https://t.me/UrbexEchoes
**Bot:** https://t.me/DaathApp_bot
**TON Wallet:** UQBhNpsenzXBSEh31z3IXeKK-9YUsraT63zAGb_8rXwZurgi

---

## License

MIT with Ethical Use Clause — see [LICENSE](./LICENSE)

Free to use, build upon, and share. Attribution required.
Only for tools that add real value to people's lives.

---

> *"Knowing God makes us better people. We leave evil behind and build something truly productive."*
> — Ezequiel, Creator of DaathApp
> Argentina, 2026
