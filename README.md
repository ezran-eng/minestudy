<p align="center">
  <img src="https://img.shields.io/badge/Telegram-Mini%20App-2AABEE?style=for-the-badge&logo=telegram&logoColor=white" />
  <img src="https://img.shields.io/badge/React_18-Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/FastAPI-Python_3.11-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-Railway-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/AI_Powered-DeepSeek-FF6F00?style=for-the-badge&logo=openai&logoColor=white" />
  <img src="https://img.shields.io/badge/TON-Blockchain-0098EA?style=for-the-badge&logo=ton&logoColor=white" />
</p>

# DaathApp

### AI-Powered Study Companion for Telegram

> A full-featured Telegram Mini App that combines **spaced repetition**, **AI tutoring**, **real-time progress tracking**, and **decentralized file sharing** — all inside Telegram. Built for mining engineering students, scalable to any discipline.

<p align="center">
  <strong>Live:</strong> <a href="https://t.me/DaathApp_bot">@DaathApp_bot</a> on Telegram
</p>

---

## Table of Contents

- [Why DaathApp](#why-daathapp)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Feature Deep Dives](#feature-deep-dives)
  - [Spaced Repetition (SM-2)](#1-spaced-repetition-flashcards-sm-2-algorithm)
  - [Interactive Quizzes](#2-interactive-quizzes)
  - [Redo — AI Mascot](#3-redo--the-ai-study-mascot)
  - [Pomodoro Timer](#4-pomodoro-timer)
  - [Social & Gamification](#5-social--gamification)
  - [Free Zone (TON Blockchain)](#6-free-zone--decentralized-community-files)
  - [Notifications](#7-smart-notifications)
  - [Internationalization](#8-internationalization-i18n)
  - [Community Counter](#9-community-growth-counter)
- [Data Model](#data-model)
- [API Reference](#api-reference)
- [Authentication & Security](#authentication--security)
- [AI System Architecture](#ai-system-architecture)
- [Cinematic Onboarding](#cinematic-onboarding)
- [Content Management (Admin Bot)](#content-management-admin-bot)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Deployment](#deployment)
- [Security Audit](#security-audit)
- [License](#license)

---

## Why DaathApp

Traditional study apps live in their own silo. DaathApp lives where students already spend their time — **Telegram**. No downloads, no sign-ups, no friction. Open the bot, tap the Mini App, and you're studying.

What makes it different:

- **Zero-install** — runs natively inside Telegram as a Mini App
- **AI that actually helps** — not a generic chatbot, but a context-aware tutor that knows your subjects, your progress, and your weak spots
- **Spaced repetition built-in** — SM-2 algorithm ensures you review at the optimal moment
- **Decentralized file sharing** — community files on TON blockchain, uncensorable and permanent
- **Privacy-first** — 5 independent privacy toggles, user controls exactly what's visible
- **Bilingual** — full English/Spanish support with language picker on first launch
- **Tracks new Telegram users** — measures how many users joined Telegram specifically because of DaathApp

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Flashcards** | SM-2 spaced repetition with due dates, ease factors, and dominated tracking |
| **Quizzes** | Multiple-choice with instant feedback, explanations, and AI-powered "explain this" |
| **PDF Viewer** | Embedded reader with page controls and view tracking |
| **Infographics** | Swipeable image carousel with metadata |
| **AI Tutor (Redo)** | Lottie-animated mascot with 3 intelligence tiers (local phrases → ambient AI → multi-turn chat) |
| **Guided Actions** | One-shot AI responses: key concept, weak point, practice tip, topic explanation (~85% fewer tokens than free chat) |
| **AI Content Generation** | Generate new flashcards and quiz questions from unit context |
| **Pomodoro Timer** | 25/5 timer with floating widget and mascot interventions |
| **Progress Tracking** | Weighted formula (50% flashcards + 35% quiz + 15% PDFs), auto-redistributed |
| **Study Streak** | Daily activity tracking with risk alerts and automatic reset |
| **Social** | Follow subjects, see followers (respects privacy), leaderboard ranking |
| **Free Zone** | Upload files to TON blockchain — decentralized, permanent, uncensorable |
| **Notifications** | 4 scheduled notification types via Telegram bot (configurable per user) |
| **i18n** | Full English + Argentine Spanish, language picker in onboarding |
| **Community Counter** | Estimates new Telegram accounts (by ID analysis) attracted by the app |
| **Cinematic Onboarding** | 8-slide animated intro with Redo, privacy config, and notification setup |

---

## Tech Stack

| Layer | Technology | Hosting |
|-------|-----------|---------|
| **Frontend** | React 18 + Vite + TanStack Query | [Vercel](https://minestudy.vercel.app) |
| **Backend** | FastAPI + Python 3.11 (60+ endpoints) | [Railway](https://minestudy-production.up.railway.app) |
| **Database** | PostgreSQL (15+ tables, Alembic migrations) | Railway |
| **Bot** | python-telegram-bot 21.9 (polling) | Railway |
| **Media Storage** | Cloudflare R2 (S3-compatible) | Cloudflare |
| **Decentralized Storage** | TON Storage via tonutils-storage | Railway (Dockerfile) |
| **AI/LLM** | DeepSeek / OpenAI (configurable, TTL-cached) | External API |
| **Animation** | Lottie (lottie-react) | Bundled |
| **i18n** | i18next + react-i18next | Bundled |
| **Error Tracking** | Sentry (frontend + backend) | Sentry Cloud |
| **Scheduling** | APScheduler (async cron jobs) | Railway |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                       TELEGRAM MINI APP                              │
│                     React 18 + Vite → Vercel                         │
│                                                                      │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌────────────┐             │
│  │   Home   │ │  Study   │ │  Profile  │ │ Free Zone  │             │
│  │ • Stats  │ │ • Browse │ │ • Privacy │ │ • TON upload│             │
│  │ • Focus  │ │ • Follow │ │ • Notifs  │ │ • Reports  │             │
│  │ • Streak │ │ • Search │ │ • i18n    │ │ • 300MB cap│             │
│  │ • Counter│ │ • Drag&  │ │ • Delete  │ │ • Onboard  │             │
│  └──────────┘ │   Drop   │ └───────────┘ └────────────┘             │
│               └──────────┘                                           │
│  ┌──────────────────────────────────┐  ┌──────────────────────────┐  │
│  │        Unit Detail               │  │    Redo (AI Mascot)      │  │
│  │  🃏 Flashcards (SM-2 algorithm) │  │  • Lottie animation      │  │
│  │  🎯 Quiz (multiple choice + AI) │  │  • Drag & drop anywhere  │  │
│  │  🖼️ Infographics (carousel)     │  │  • Context-aware phrases │  │
│  │  📄 PDFs (embedded viewer)      │  │  • AI chat & tutoring    │  │
│  │  🍅 Pomodoro (floating timer)   │  │  • Guided study actions  │  │
│  └──────────────────────────────────┘  └──────────────────────────┘  │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │  Cinematic Onboarding (8 slides)                              │   │
│  │  Language → Welcome → AI demo → Features → Drag demo →       │   │
│  │  Privacy toggles → Notification config → Final                │   │
│  └───────────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                    X-Telegram-Init-Data
                     (HMAC-SHA256 auth)
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    FASTAPI BACKEND (Railway)                          │
│                    Python 3.11 · 60+ endpoints                       │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Core API                                                      │  │
│  │  /users  /materias  /unidades  /flashcards  /quiz  /progreso  │  │
│  │  /actividad  /ranking  /community-counter                      │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │  AI Endpoints                                                  │  │
│  │  /mascota/chat        → 2-sentence ambient messages (cached)  │  │
│  │  /tutor/chat          → multi-turn conversations (6 turns)    │  │
│  │  /tutor/accion        → guided actions (~85% less tokens)     │  │
│  │  /ai/generate/*       → flashcard & quiz generation           │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │  Zona Libre                                                    │  │
│  │  /zona-libre/upload   → file → TON Storage → DB record        │  │
│  │  /zona-libre/archivos → list with capacity tracking            │  │
│  │  /zona-libre/reportar → 3 reports = auto-hide                 │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐ │
│  │ PostgreSQL   │  │ Cloudflare   │  │  LLM Provider              │ │
│  │ 15+ tables   │  │ R2 (media)   │  │  DeepSeek or OpenAI        │ │
│  │ Alembic migr.│  │ S3-compat.   │  │  TTL cache (2-10 min)      │ │
│  └──────────────┘  └──────────────┘  └────────────────────────────┘ │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐ │
│  │ Telegram Bot │  │ APScheduler  │  │  TON Storage               │ │
│  │ Admin panel  │  │ 4 cron jobs  │  │  Decentralized files       │ │
│  │ 19 conv.     │  │ Streak reset │  │  Basic auth                │ │
│  │ states       │  │ Notifications│  │  Docker daemon             │ │
│  └──────────────┘  └──────────────┘  └────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
mineStudy/
│
├── frontend/                              # React + Vite → Vercel
│   ├── src/
│   │   ├── App.jsx                        # Router, lazy loading, onboarding flow
│   │   ├── main.jsx                       # Entry point, Sentry init, i18n
│   │   ├── index.css                      # Global styles (dark theme, animations)
│   │   │
│   │   ├── screens/
│   │   │   ├── Home.jsx                   # Dashboard: stats, focus, streak, community counter
│   │   │   ├── Study.jsx                  # Subject catalog: search, follow, progress bars
│   │   │   ├── MateriaDetail.jsx          # Subject detail: units, followers, syllabus
│   │   │   ├── UnidadDetail.jsx           # Unit detail: flashcards, quiz, PDFs, infographics
│   │   │   ├── Profile.jsx               # User profile: settings, privacy, notifications, language, delete
│   │   │   ├── UserProfile.jsx            # Public profile view (respects privacy toggles)
│   │   │   ├── Onboarding.jsx             # Simple onboarding (privacy config, fallback)
│   │   │   ├── ZonaLibre.jsx              # Free Zone: file list, upload, reports, capacity bar
│   │   │   └── ZonaLibreOnboarding.jsx    # Free Zone intro: 6 slides about TON & decentralization
│   │   │
│   │   ├── components/
│   │   │   ├── Onboarding.jsx             # Cinematic onboarding (8 slides, Lottie, typewriter)
│   │   │   ├── Flashcard.jsx              # Flashcard session: flip animation, know/don't know
│   │   │   ├── Quiz.jsx                   # Quiz session: questions, feedback, AI explanations
│   │   │   ├── PDFViewer.jsx              # Embedded PDF reader (react-pdf)
│   │   │   ├── InfografiaCarousel.jsx     # Swipeable image carousel
│   │   │   ├── BottomNav.jsx              # Fixed bottom navigation (Home, Study, Profile, Free Zone)
│   │   │   ├── mascota/                   # Redo mascot: Lottie animation, drag & drop, speech bubble
│   │   │   ├── RedoMini.jsx              # Mini Redo for cards (ping-pong idle breathing)
│   │   │   ├── Timer.jsx                  # Pomodoro countdown display
│   │   │   ├── PomodoroFloating.jsx       # Expandable pomodoro control panel
│   │   │   ├── PomodoroSugerencia.jsx     # Mascot interventions during study sessions
│   │   │   ├── Toast.jsx                  # Snackbar notification system
│   │   │   ├── ConfirmModal.jsx           # Reusable confirmation dialogs
│   │   │   ├── ProgressRing.jsx           # Circular progress indicator
│   │   │   ├── VistaBadge.jsx             # View count badge
│   │   │   ├── ErrorBoundary.jsx          # React error boundary with fallback UI
│   │   │   ├── ZonaLibreUpload.jsx        # Upload modal: file selector, 50MB validation, TON upload
│   │   │   └── ZonaLibreFileCard.jsx      # File card: name, size, date, username, TON badge, report
│   │   │
│   │   ├── services/
│   │   │   └── api.js                     # 55+ fetch functions with Telegram auth headers
│   │   │
│   │   ├── hooks/
│   │   │   ├── useTelegram.js             # Telegram WebApp user extraction & theme setup
│   │   │   ├── useQueryHooks.js           # TanStack Query wrappers with smart caching
│   │   │   └── useMascotaContext.js       # Redo phrase resolution via i18n (replaces hardcoded FRASES)
│   │   │
│   │   ├── context/
│   │   │   ├── MascotaContext.jsx         # Mascot state: current screen, contextual data
│   │   │   └── PomodoroContext.jsx        # Pomodoro state: timer, sessions, persistence
│   │   │
│   │   ├── i18n/
│   │   │   ├── index.js                   # i18next setup (en/es, localStorage persistence)
│   │   │   ├── en.json                    # English translations (300+ keys)
│   │   │   └── es.json                    # Argentine Spanish translations (300+ keys)
│   │   │
│   │   └── assets/
│   │       └── lotties/mascota.json       # Redo Lottie animation data
│   │
│   ├── package.json                       # Dependencies: react, react-router, tanstack-query, lottie, i18next, etc.
│   ├── vite.config.js                     # Code splitting: PDF, Telegram UI, React, Lottie vendors
│   └── vercel.json                        # SPA rewrite rule
│
├── backend/                               # FastAPI + Python 3.11 → Railway
│   ├── main.py                            # FastAPI app: 60+ endpoints, 2000+ lines
│   ├── models.py                          # SQLAlchemy ORM: 15+ tables
│   ├── schemas.py                         # Pydantic request/response DTOs
│   ├── database.py                        # PostgreSQL pool (5 conn + 10 overflow, pre-ping)
│   ├── llm.py                             # Generic LLM client: DeepSeek/OpenAI + TTL cache
│   ├── mascota_ai.py                      # Redo ambient AI: context-aware 2-sentence messages
│   ├── tutor_chat.py                      # Multi-turn tutor: 6 exchanges per conversation
│   ├── tutor_actions.py                   # Guided study actions: concepto_clave, punto_debil, practica
│   ├── ai_generate.py                     # AI content generation: flashcards & quiz from context
│   ├── ton_storage.py                     # TON Storage HTTP client with basic auth
│   ├── bot.py                             # Telegram bot: ConversationHandler, 19 states
│   ├── bot_config.py                      # Bot constants: token, admin ID, state numbers
│   ├── bot_helpers.py                     # @admin_only decorator
│   ├── conftest.py                        # Test fixtures with fake credentials
│   ├── start.sh                           # Production launcher: FastAPI + bot polling
│   ├── requirements.txt                   # Python dependencies
│   ├── nixpacks.toml                      # Python 3.11 enforcement for Railway
│   │
│   ├── handlers/                          # Bot conversation handlers
│   │   ├── welcome.py                     # /start command
│   │   ├── admin_nav.py                   # Admin menu navigation
│   │   ├── conv_router.py                 # Conversation state router
│   │   ├── materias.py                    # Subject CRUD via bot
│   │   ├── unidades.py                    # Unit CRUD via bot
│   │   ├── temas.py                       # Topic CRUD via bot
│   │   ├── flashcards.py                  # CSV flashcard upload & parsing
│   │   ├── quiz.py                        # JSON quiz upload & parsing
│   │   ├── infografias.py                 # Photo upload → Cloudflare R2
│   │   ├── pdfs.py                        # PDF upload → Cloudflare R2
│   │   ├── stats.py                       # /stats: users, growth, streaks
│   │   └── confirm.py                     # Confirmation dialog handlers
│   │
│   └── alembic/                           # Database migrations
│       ├── alembic.ini
│       ├── env.py                         # Reads DATABASE_URL from env
│       └── versions/
│           ├── 001_initial.py             # Base schema: users, materias, unidades, flashcards, quiz, etc.
│           ├── 002_redo_memoria.py         # Redo persistent memory (FIFO, 5 per user)
│           └── 003_zona_libre.py           # Free Zone: archivos + reportes tables
│
├── tonutils-storage/
│   └── Dockerfile                         # TON Storage daemon (--daemon mode, basic auth)
│
├── CLAUDE.md                              # Claude Code project instructions
└── README.md                              # This file
```

---

## Feature Deep Dives

### 1. Spaced Repetition Flashcards (SM-2 Algorithm)

The flashcard system implements the **SuperMemo SM-2 algorithm** for optimal review scheduling:

```
On each review:
  if knew_it:
    repeticiones += 1
    interval = previous_interval * ease_factor
    ease_factor = max(1.3, ease_factor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  else:
    repeticiones = 0
    interval = 1
    ease_factor = max(1.3, ease_factor - 0.2)

  due_date = now + interval days
```

**Key behaviors:**
- Cards start with `interval=1, ease_factor=2.5, repeticiones=0`
- "Dominated" cards = `repeticiones > 0` (successfully reviewed at least once)
- Due cards are ordered: never-reviewed first, then by oldest `due_date`
- The frontend shows a flip animation with "Knew it" / "Didn't know" buttons
- Progress tracks `dominated / total` ratio

### 2. Interactive Quizzes

- Multiple-choice questions with 4 options (A/B/C/D)
- Instant visual feedback: green highlight for correct, red for wrong
- Each question includes an AI-generated justification/explanation
- "Ask Redo to explain" button triggers AI explanation of the current question
- Results saved per unit: `correctas / total`
- Score contributes 35% to unit progress

### 3. Redo — The AI Study Mascot

Redo is an animated Lottie character that lives across the entire app. It operates at three intelligence levels:

| Tier | Source | Tokens/call | When |
|------|--------|-------------|------|
| **Local phrases** | i18n JSON files | 0 | Always (instant) |
| **Ambient AI** | `/mascota/chat` | ~200 | Meaningful actions (entering screens, completing sessions) |
| **Tutor chat** | `/tutor/chat` | ~1,400 | User initiates conversation about a unit |
| **Guided actions** | `/tutor/accion` | ~350 | One-shot study actions (85% cheaper than chat) |

**Local phrases** are defined in `en.json`/`es.json` under `mascota.*` with 10+ screen contexts and 40+ action types. The `useMascotaContext` hook resolves `(screen, action, data)` → random phrase with variable interpolation.

**Ambient AI** calls DeepSeek/OpenAI with context layers:
1. User data (name, streak, progress stats)
2. Urgent study targets (overdue flashcards, weak units)
3. Current screen metadata

Responses are TTL-cached: 10min for `app_open`, 5min for `idle`, 2min for `drop_materia`.

**Tutor chat** provides scoped multi-turn conversations per unit. The system prompt includes the unit's topics, flashcards, and quiz questions. History is limited to 6 exchanges (~600 tokens) for cost control.

**Guided actions** are single-prompt operations optimized for specific study needs:
- `concepto_clave` — "What's the most important concept in this unit?"
- `punto_debil` — "Where am I struggling?" (references quiz results + due flashcards)
- `practica` — "Give me a practice tip for this unit"
- `explicar_tema` — "Explain this specific topic"

**AI Content Generation:**
- `/ai/generate/flashcards` — generates N new Q&A pairs from unit context (avoids duplicates)
- `/ai/generate/quiz` — generates N multiple-choice questions with correct answers

**Animation:** Redo uses a Lottie JSON with two key segments:
- `SEG_FULL [60, 240]` — full celebration/entrance animation
- `SEG_IDLE [67, 89]` — subtle breathing loop (ping-pong at speed 0.22)

The mascot is draggable across the screen and can be dropped on subjects in the Study screen to get AI-powered info about them.

### 4. Pomodoro Timer

- **25-minute study** / **5-minute break** sessions
- Floating widget with expand/collapse controls
- Redo intervenes every 10 minutes (study) or 2.5 minutes (break) with contextual messages
- Custom events: `mascota:pomodoro-intervencion`, `mascota:pomodoro-completo`
- Session counter and persistence via React context

### 5. Social & Gamification

**Follow system:**
- Users follow subjects to unlock content and track progress
- Unfollow deletes all progress (with confirmation modal)

**Followers:**
- Each subject shows its follower list
- Respects privacy: users can hide photo, name, username, subjects, and progress independently
- 5 privacy toggles configured during onboarding, editable in profile

**Study streak:**
- A day counts if user opens a unit, reviews flashcards, completes a quiz, or views media
- Streak resets to 0 at 03:05 UTC if no activity the previous day
- Streak-at-risk notification at 00:00 UTC

**Ranking:**
- Leaderboard of top users by average progress across subjects
- Respects privacy settings for display

### 6. Free Zone — Decentralized Community Files

A community file-sharing section powered by the **TON blockchain**:

- Files uploaded to TON Storage via tonutils HTTP API — **permanent and uncensorable**
- **300 MB global cap** + **50 MB per file** limit
- Visual capacity bar with color gradient (green → red at 90%)
- File types: PDF, DOC, images
- Report system: inappropriate, copyright, spam, other — **3 reports auto-hides a file**
- Dedicated 6-slide onboarding explaining decentralization

**Backend flow:**
```
User upload → FastAPI validates size → tonutils-storage API → bag_id returned → saved to PostgreSQL
User download → GET /zona-libre/archivo/{bag_id} → redirect to TON download URL
```

### 7. Smart Notifications

Four async scheduled jobs via APScheduler:

| Job | Schedule | Description |
|-----|----------|-------------|
| **Daily reminder** | User-configured time (ART) | "You haven't studied today" — only if no activity |
| **Streak at risk** | 00:00 UTC daily | Warns users whose streak will reset tomorrow |
| **Streak reset** | 03:05 UTC daily | Sets `racha = 0` for users with no yesterday activity |
| **Due flashcards** | 12:00 UTC daily | "You have N cards to review in [Subject]" per subject |

All notifications are sent as Telegram messages via the bot. Users can enable/disable each type independently and set their preferred reminder time.

### 8. Internationalization (i18n)

- **Languages:** English (default) + Argentine Spanish (voseo)
- **Setup:** i18next + react-i18next with JSON translation files
- **Coverage:** 300+ translation keys covering all screens, components, mascot phrases, and onboarding
- **Language picker:** First slide of cinematic onboarding + Profile settings
- **Persistence:** `localStorage('daathapp_lang')`
- **Mascot phrases:** Redo's entire phrase library (`mascota.*` keys) is fully translated, including variable interpolation (`{racha}`, `{flashcards_vencidas}`, etc.)

### 9. Community Growth Counter

A public metric showing how many users DaathApp attracted to Telegram:

**How it works:** Telegram user IDs are sequential. Using community-researched breakpoints (same method as Fragment), the backend estimates each user's account creation year from their ID:

```python
# Approximate Telegram ID → year mapping
ID < 1B  → 2019 or earlier
ID < 5B  → 2022
ID < 7B  → 2024
ID < 8B  → 2025
ID >= 8B → 2026 (new accounts)
```

Users with `id_telegram >= 8,000,000,000` are flagged as "joined Telegram recently" — likely because of DaathApp. The Home screen shows this count with an animated number (ease-out cubic), plus "+N this week" and "+N today" pills.

---

## Data Model

15+ PostgreSQL tables managed via SQLAlchemy ORM and Alembic migrations:

```
┌──────────────────┐         ┌──────────────────┐        ┌──────────────────┐
│      User        │         │     Materia      │        │     Unidad       │
│──────────────────│         │──────────────────│        │──────────────────│
│ id_telegram (PK) │◄───┐    │ id (PK)          │◄───┐   │ id (PK)          │
│ first_name       │    │    │ nombre           │    │   │ id_materia (FK)  │──► Materia
│ last_name        │    │    │ emoji            │    │   │ nombre           │
│ username         │    │    │ color            │    │   │ orden            │
│ foto_url         │    │    │ orden            │    │   │ estado_default   │
│ descripcion      │    │    └──────────────────┘    │   └──────────────────┘
│ racha            │    │                             │          │
│ ultima_actividad │    │    ┌──────────────────┐    │     ┌────┴────────────┐
│ fecha_registro   │    │    │ MateriaSeguida   │    │     │                 │
│ onboarding_done  │    │    │──────────────────│    │     ▼                 ▼
│ mostrar_foto     │    ├────│ id_usuario (FK)  │    │  ┌───────────┐  ┌───────────┐
│ mostrar_nombre   │    │    │ id_materia (FK)  │────┘  │ Flashcard │  │QuizPregunta│
│ mostrar_username │    │    │ fecha            │       │───────────│  │───────────│
│ mostrar_progreso │    │    └──────────────────┘       │ pregunta  │  │ pregunta  │
│ mostrar_cursos   │    │                               │ respuesta │  │ opcion_a-d│
└──────────────────┘    │    ┌──────────────────┐       └───────────┘  │ correcta  │
                        │    │   CardReview     │            │         │ justific. │
                        │    │──────────────────│            │         └───────────┘
                        ├────│ id_usuario (FK)  │            │
                        │    │ id_flashcard(FK) │────────────┘
                        │    │ interval         │       ┌──────────────────┐
                        │    │ ease_factor      │       │    Progreso      │
                        │    │ due_date         │       │──────────────────│
                        │    │ last_reviewed    │       │ id_usuario (FK)  │──► User
                        │    │ repeticiones     │       │ id_materia (FK)  │──► Materia
                        │    └──────────────────┘       │ id_unidad (FK)   │──► Unidad
                        │                               │ porcentaje       │
                        │    ┌──────────────────┐       └──────────────────┘
                        │    │  QuizResultado   │
                        │    │──────────────────│       ┌──────────────────┐
                        ├────│ id_usuario (FK)  │       │ NotifConfig      │
                        │    │ id_unidad (FK)   │       │──────────────────│
                        │    │ correctas        │       │ id_usuario (FK)  │──► User
                        │    │ total            │       │ racha_activa     │
                        │    │ fecha            │       │ recordatorio_act │
                        │    └──────────────────┘       │ flashcards_activa│
                        │                               │ hora_recordatorio│
                        │    ┌──────────────────┐       └──────────────────┘
                        │    │   RedoMemoria    │
                        │    │──────────────────│       ┌──────────────────┐
                        ├────│ id_usuario (FK)  │       │ZonaLibreArchivo  │
                        │    │ contenido (100ch)│       │──────────────────│
                        │    │ created_at       │       │ bag_id (TON)     │
                        │    └──────────────────┘       │ nombre           │
                        │                               │ tamanio          │
                        │    ┌──────────────────┐       │ user_id (FK)     │──► User
                        │    │  Vista / PdfVisto│       │ activo           │
                        │    │  InfografiaVista │       └──────────────────┘
                        └────│ id_usuario (FK)  │
                             │ id_* (FK)        │
                             │ visto_at         │
                             └──────────────────┘

Additional tables: Tema, Infografia, Pdf, ZonaLibreReporte
```

**Progress calculation formula:**
```
unit_progress = (
    0.50 * (dominated_flashcards / total_flashcards) +
    0.35 * (correct_quiz_answers / total_quiz_questions) +
    0.15 * (viewed_pdfs / total_pdfs)
)
# Weights redistribute dynamically if a component has 0 total
# Subject progress = average of all unit progresses
```

---

## API Reference

The backend exposes **60+ RESTful endpoints**. Here are the main groups:

### Users & Profiles
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users` | Create or update user (syncs Telegram bio) |
| GET | `/users/{id}` | Get user profile |
| DELETE | `/users/{id}` | Delete account (cascades all data) |
| GET | `/usuarios/{id}/perfil` | Full profile with studying/completed subjects |
| GET | `/usuarios/{id}/stats` | Flashcards dominated, quizzes, progress, focus unit |
| GET | `/usuarios/{id}/actividad-reciente` | Last 10 activities |
| GET/PUT | `/usuarios/{id}/privacidad` | Privacy settings (5 toggles) |
| GET/PATCH | `/usuarios/{id}/notificaciones` | Notification config |

### Study Content
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/materias` | All subjects with units and topics |
| GET | `/unidades/{id}/progreso` | Detailed unit progress breakdown |
| PUT | `/progreso` | Update unit progress percentage |
| GET | `/flashcards/due` | Cards due for review (ordered by urgency) |
| POST | `/flashcards/{id}/review` | Submit SM-2 review (knew=true/false) |
| POST | `/quiz/resultado` | Save quiz attempt |
| POST | `/actividad` | Record study activity (manages streak) |

### AI & Mascot
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/mascota/chat` | 2-sentence ambient message (TTL-cached) |
| POST | `/tutor/chat` | Multi-turn tutor conversation (6 turns max) |
| POST | `/tutor/accion` | Guided action: concepto_clave, punto_debil, practica, explicar_tema |
| POST | `/ai/generate/flashcards` | Generate N flashcards from unit context |
| POST | `/ai/generate/quiz` | Generate N quiz questions from unit context |

### Social
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/materias/{id}/seguir` | Follow/unfollow subject |
| GET | `/materias/{id}/seguidores` | Follower list (respects privacy) |
| GET | `/ranking` | Top users by average progress |

### Free Zone
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/zona-libre/archivos` | List files + capacity info |
| POST | `/zona-libre/upload` | Upload to TON (50MB/file, 300MB total) |
| GET | `/zona-libre/archivo/{bag_id}` | Redirect to TON download |
| POST | `/zona-libre/reportar` | Report file (3 reports = auto-hide) |

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/community-counter` | Total users, new this week/today, Telegram account age distribution |

---

## Authentication & Security

### Telegram Mini App Authentication
```
User opens Mini App → Telegram injects initData → Frontend sends as X-Telegram-Init-Data header
→ Backend validates HMAC-SHA256 against TELEGRAM_BOT_TOKEN → Request authorized
```

The backend reconstructs the data string, computes HMAC-SHA256 with the bot token, and compares against the provided hash. Only requests originating from the real Telegram Mini App pass validation.

### Admin Authentication
- **Bot commands:** `@admin_only` decorator verifies `ADMIN_ID`
- **API endpoints:** `X-Admin-Token` header validated with `hmac.compare_digest()` (timing-safe comparison)

### Rate Limiting (slowapi)
- User endpoints: 30 requests/minute
- File uploads: 5 requests/minute
- AI generation: rate limited per endpoint

### Security Practices
- All secrets read from environment variables (zero hardcoded credentials)
- Bot token: only first 6 characters logged for diagnostics
- CORS configured for specific origins only
- `.env` files in `.gitignore`
- Test fixtures use fake credentials
- httpx logging suppressed to prevent token leakage

---

## AI System Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                        LLM Client (llm.py)                    │
│  • Provider: DeepSeek (default) or OpenAI (configurable)     │
│  • TTL cache: prevents duplicate API calls                    │
│    - app_open: 10 min                                         │
│    - idle: 5 min                                              │
│    - drop_materia: 2 min                                      │
│  • Async httpx with timeout handling                          │
└──────────────────────────────┬────────────────────────────────┘
                               │
            ┌──────────────────┼──────────────────────┐
            ▼                  ▼                      ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  mascota_ai.py   │ │  tutor_chat.py   │ │  ai_generate.py  │
│  Ambient messages │ │  Multi-turn chat │ │  Content creation │
│                  │ │                  │ │                  │
│  Context layers: │ │  Per-unit scope: │ │  Generates:      │
│  1. User data    │ │  • Topics        │ │  • Flashcards    │
│  2. Study targets│ │  • Flashcards    │ │  • Quiz questions │
│  3. Screen meta  │ │  • Quiz Qs       │ │                  │
│                  │ │  • 6-turn limit  │ │  Avoids dupes    │
│  ~200 tokens/call│ │  ~1400 tok/call  │ │  JSON output     │
│  TTL-cached      │ │  Not cached      │ │  Not cached      │
└──────────────────┘ └──────────────────┘ └──────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │tutor_actions.py  │
                    │ Guided actions   │
                    │                  │
                    │ • concepto_clave │
                    │ • punto_debil    │
                    │ • practica       │
                    │ • explicar_tema  │
                    │                  │
                    │ ~350 tokens/call │
                    │ 85% cheaper than │
                    │ free chat        │
                    └──────────────────┘
```

---

## Cinematic Onboarding

An 8-slide animated introduction shown on each session (skippable):

| Slide | Type | Content |
|-------|------|---------|
| 0 | **Language** | Choose English or Spanish (applied instantly) |
| 1 | **Welcome** | "Hello {name}, I'm Redo" — full Lottie animation |
| 2 | **AI Demo** | Redo's AI capabilities (3 animated pills) |
| 3 | **Features** | 4 feature cards: Flashcards, Progress, Pomodoro, Quizzes |
| 4 | **Drag Demo** | Animated Redo with drag instruction + fake subject card |
| 5 | **Privacy** | 5 privacy toggles (saved to backend on completion) |
| 6 | **Notifications** | 3 notification toggles (saved to backend on completion) |
| 7 | **Final** | Beta badge + "Don't show again" checkbox + start button |

Features:
- Typewriter text effect (20ms per character, tap to skip)
- Tap left/right navigation (or wait for typewriter to complete)
- Animated particle background with per-slide color themes
- Redo animation switches between `full` and `idle-loop` segments per slide
- Privacy and notification settings are persisted to the backend

---

## Content Management (Admin Bot)

The Telegram bot `@DaathApp_bot` provides a full admin panel via `/admin`:

| Action | Flow |
|--------|------|
| **Create subject** | Emoji → Name → Color picker |
| **Create unit** | Select subject → Enter name |
| **Create topic** | Select unit → Enter name |
| **Upload flashcards** | Select unit → Send CSV file (`question,answer`) |
| **Upload quiz** | Select unit → Send JSON file |
| **Upload infographics** | Select unit → Send photos → Uploaded to Cloudflare R2 |
| **Upload PDFs** | Select unit → Send documents → Uploaded to Cloudflare R2 |
| **View stats** | Users count, active today, growth (today/week/month), top streaks |

The bot uses a `ConversationHandler` with **19 states** managing all CRUD flows. Buttons support **Bot API 9.4 colored buttons** via raw `httpx` calls.

---

## Environment Variables

### Backend (Railway)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `TELEGRAM_BOT_TOKEN` | Yes | Bot token from @BotFather |
| `ADMIN_SECRET` | Yes | Secret for admin API endpoints |
| `DEEPSEEK_API_KEY` | Yes* | DeepSeek API key (*or OPENAI_API_KEY) |
| `OPENAI_API_KEY` | No | OpenAI API key (fallback) |
| `LLM_PROVIDER` | No | `deepseek` (default) or `openai` |
| `R2_ENDPOINT` | Yes | Cloudflare R2 endpoint URL |
| `R2_ACCESS_KEY_ID` | Yes | R2 access key |
| `R2_SECRET_ACCESS_KEY` | Yes | R2 secret key |
| `R2_BUCKET` | Yes | R2 bucket name |
| `R2_PUBLIC_URL` | Yes | R2 public URL for media access |
| `TONUTILS_URL` | No | TON Storage API URL |
| `TONUTILS_LOGIN` | No | TON Storage basic auth login |
| `TONUTILS_PASSWORD` | No | TON Storage basic auth password |
| `SENTRY_DSN` | No | Sentry DSN for error tracking |

### Frontend (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Backend URL |
| `VITE_ADMIN_SECRET` | No | Admin token for dev panel |
| `VITE_SENTRY_DSN` | No | Sentry DSN for frontend |

---

## Local Development

### Prerequisites
- Node.js 18+
- Python 3.11
- PostgreSQL running locally

### Frontend
```bash
cd frontend
npm install
npm run dev          # → http://localhost:5173
```

### Backend
```bash
cd backend
pip install -r requirements.txt

# Set required env vars
export DATABASE_URL="postgresql://user:pass@localhost:5432/daathapp"
export TELEGRAM_BOT_TOKEN="your-bot-token"

uvicorn main:app --reload --port 8000
```

### Database Setup
```bash
cd backend
alembic upgrade head    # Apply all migrations
```

### Running Tests
```bash
cd backend
pytest                  # Uses fake credentials from conftest.py
```

---

## Deployment

Both frontend and backend deploy automatically on push to `main`:

| Component | Platform | Trigger | Config |
|-----------|----------|---------|--------|
| Frontend | Vercel | Push to `main` (frontend/ changes) | `vercel.json` (SPA rewrite) |
| Backend | Railway | Push to `main` (backend/ changes) | `nixpacks.toml` (Python 3.11) + `start.sh` |
| TON Storage | Railway | Manual deploy | `tonutils-storage/Dockerfile` |

Railway uses `start.sh` to launch FastAPI (uvicorn) and the Telegram bot (polling) in parallel.

---

## Security Audit

A comprehensive security audit was performed across the entire repository:

| Area | Status | Details |
|------|--------|---------|
| API Keys (DeepSeek, OpenAI) | **Secure** | Read from env vars in `llm.py` |
| Telegram Bot Token | **Secure** | Env var, only first 6 chars logged |
| Tonutils Credentials | **Secure** | `TONUTILS_LOGIN`/`TONUTILS_PASSWORD` from env |
| R2 Credentials | **Secure** | Env vars (only `R2_PUBLIC_URL` hardcoded — it's public) |
| Database URL | **Secure** | Env var, raises `RuntimeError` if missing |
| Admin Secret | **Secure** | Env var + `hmac.compare_digest()` (timing-safe) |
| `.env` in gitignore | **Yes** | Lines 4 and 7 of `.gitignore` |
| Committed `.env` | **Safe** | Only `frontend/.env` with `VITE_API_URL=http://localhost:8000` |
| Test fixtures | **Safe** | Use fake tokens (`1234567890:AABBCCDDtest-token`) |
| Git history | **Clean** | No secrets found in any previous commits |
| CORS | **Configured** | Specific origins only (`minestudy.vercel.app`) |

**Result: No hardcoded secrets found. All credentials use environment variables.**

---

## License

Private project. All rights reserved.

---

<p align="center">
  Built with <a href="https://t.me/DaathApp_bot">Telegram Mini Apps</a> · Powered by <a href="https://fastapi.tiangolo.com">FastAPI</a> · AI by <a href="https://deepseek.com">DeepSeek</a>
</p>
