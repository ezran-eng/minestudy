# DaathApp — Telegram Mini App de Estudio

> Mini App de estudio con IA para estudiantes de ingeniería minera. Accesible via [@DaathApp_bot](https://t.me/DaathApp_bot) en Telegram.

---

## Stack Tecnológico

| Capa | Tecnología | Hosting |
|------|-----------|---------|
| **Frontend** | React 18 + Vite | [Vercel](https://minestudy.vercel.app) |
| **Backend** | FastAPI + Python 3.11 | [Railway](https://minestudy-production.up.railway.app) |
| **Base de datos** | PostgreSQL | Railway |
| **Bot** | python-telegram-bot 21.9 | Railway (polling) |
| **Media** | Cloudflare R2 | Bucket: `daathapp-infografias` |
| **Archivos comunitarios** | TON Storage (tonutils) | Railway (Dockerfile) |
| **IA** | DeepSeek / OpenAI (configurable) | API externa |
| **Monitoreo** | Sentry | Cloud |

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                    Telegram Mini App                         │
│                  (React + Vite → Vercel)                     │
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌────────────────┐   │
│  │  Home   │ │  Study  │ │ Profile  │ │  Zona Libre    │   │
│  │ • Stats │ │ • Browse│ │ • Config │ │ • Upload TON   │   │
│  │ • Foco  │ │ • Follow│ │ • Privacy│ │ • Report       │   │
│  │ • Racha │ │ • Search│ │ • Notifs │ │ • 300MB cap    │   │
│  └─────────┘ └─────────┘ └──────────┘ └────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────┐ ┌──────────────┐   │
│  │         Unidad Detail               │ │   Mascota    │   │
│  │  🃏 Flashcards (SM-2)              │ │   (Redo)     │   │
│  │  🎯 Quiz (opción múltiple)         │ │  • Lottie    │   │
│  │  🖼️ Infografías (carousel)         │ │  • Drag&Drop │   │
│  │  📄 PDFs (react-pdf)               │ │  • IA chat   │   │
│  └─────────────────────────────────────┘ └──────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │ X-Telegram-Init-Data (HMAC-SHA256)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 FastAPI Backend (Railway)                     │
│                                                             │
│  60+ endpoints:                                             │
│  • /users, /materias, /unidades, /flashcards, /quiz         │
│  • /progreso, /actividad, /ranking                          │
│  • /mascota/chat, /tutor/chat, /tutor/accion                │
│  • /ai/generate/flashcards, /ai/generate/quiz               │
│  • /zona-libre/upload, /community-counter                   │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ PostgreSQL   │  │ Cloudflare   │  │  DeepSeek /      │   │
│  │ (Railway)    │  │ R2 Storage   │  │  OpenAI API      │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Telegram Bot │  │ APScheduler  │  │  TON Storage     │   │
│  │ (polling)    │  │ (cron jobs)  │  │  (Zona Libre)    │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Estructura del Proyecto

```
mineStudy/
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    # Router + onboarding flow
│   │   ├── main.jsx                   # Entry point + Sentry
│   │   ├── index.css                  # Estilos globales
│   │   ├── screens/
│   │   │   ├── Home.jsx               # Dashboard, stats, community counter
│   │   │   ├── Study.jsx              # Catálogo de materias
│   │   │   ├── MateriaDetail.jsx      # Unidades + seguidores
│   │   │   ├── UnidadDetail.jsx       # Flashcards, Quiz, PDFs, Infografías
│   │   │   ├── Profile.jsx            # Perfil, config, privacidad
│   │   │   ├── UserProfile.jsx        # Perfil público de otro usuario
│   │   │   ├── Onboarding.jsx         # Onboarding simple (fallback)
│   │   │   ├── ZonaLibre.jsx          # Archivos comunitarios
│   │   │   └── ZonaLibreOnboarding.jsx
│   │   ├── components/
│   │   │   ├── Onboarding.jsx         # Onboarding cinemático (el principal)
│   │   │   ├── Flashcard.jsx          # Tarjeta con flip + SM-2 buttons
│   │   │   ├── Quiz.jsx               # Quiz interactivo
│   │   │   ├── PDFViewer.jsx          # Visor PDF embebido
│   │   │   ├── InfografiaCarousel.jsx # Carousel de imágenes
│   │   │   ├── BottomNav.jsx          # Navegación inferior
│   │   │   ├── mascota/               # Redo (mascota animada)
│   │   │   ├── RedoMini.jsx           # Redo mini para cards
│   │   │   ├── Timer.jsx              # Pomodoro countdown
│   │   │   ├── PomodoroFloating.jsx   # Panel pomodoro
│   │   │   ├── PomodoroSugerencia.jsx # Intervenciones pomodoro
│   │   │   ├── Toast.jsx              # Notificaciones snackbar
│   │   │   ├── ConfirmModal.jsx       # Modales de confirmación
│   │   │   ├── ZonaLibreUpload.jsx    # Uploader con drag-drop
│   │   │   └── ZonaLibreFileCard.jsx  # Card de archivo
│   │   ├── services/
│   │   │   └── api.js                 # ~55 funciones fetch + auth headers
│   │   ├── hooks/
│   │   │   ├── useTelegram.js         # Hook Telegram WebApp
│   │   │   ├── useQueryHooks.js       # TanStack Query wrappers
│   │   │   └── useMascotaContext.js   # Frases de Redo via i18n
│   │   ├── context/
│   │   │   ├── MascotaContext.jsx     # Estado pantalla/datos mascota
│   │   │   └── PomodoroContext.jsx    # Timer pomodoro + persistencia
│   │   ├── i18n/
│   │   │   ├── index.js              # Setup i18next
│   │   │   ├── en.json               # Traducciones inglés
│   │   │   └── es.json               # Traducciones español
│   │   └── assets/
│   │       └── lotties/mascota.json   # Animación Lottie de Redo
│   ├── package.json
│   ├── vite.config.js
│   └── vercel.json
│
├── backend/
│   ├── main.py                        # FastAPI app (60+ endpoints, 2000+ líneas)
│   ├── models.py                      # SQLAlchemy models (15+ tablas)
│   ├── schemas.py                     # Pydantic DTOs
│   ├── database.py                    # PostgreSQL connection pool
│   ├── bot.py                         # Telegram bot entry + ConversationHandler
│   ├── bot_config.py                  # Constantes del bot
│   ├── bot_helpers.py                 # @admin_only decorator
│   ├── llm.py                         # Cliente LLM genérico + cache TTL
│   ├── mascota_ai.py                  # IA de Redo (mensajes ambientales)
│   ├── tutor_chat.py                  # Chat tutor multi-turno
│   ├── tutor_actions.py               # Acciones de estudio guiadas
│   ├── ai_generate.py                 # Generación de flashcards/quiz con IA
│   ├── ton_storage.py                 # Cliente TON Storage + basic auth
│   ├── start.sh                       # Launcher (FastAPI + bot polling)
│   ├── requirements.txt
│   ├── nixpacks.toml                  # Python 3.11 forzado
│   ├── handlers/
│   │   ├── welcome.py                 # /start
│   │   ├── admin_nav.py               # Menú admin
│   │   ├── conv_router.py             # Router de conversación
│   │   ├── materias.py                # CRUD materias
│   │   ├── unidades.py                # CRUD unidades
│   │   ├── temas.py                   # CRUD temas
│   │   ├── flashcards.py              # Upload CSV flashcards
│   │   ├── quiz.py                    # Upload JSON quiz
│   │   ├── infografias.py             # Upload fotos → R2
│   │   ├── pdfs.py                    # Upload PDFs → R2
│   │   ├── stats.py                   # /stats admin
│   │   └── confirm.py                 # Confirmaciones
│   └── alembic/
│       └── versions/
│           ├── 001_initial.py
│           ├── 002_redo_memoria.py
│           └── 003_zona_libre.py
│
├── tonutils-storage/
│   └── Dockerfile                     # TON Storage daemon
│
└── CLAUDE.md                          # Instrucciones para Claude Code
```

---

## Funcionalidades Principales

### 1. Sistema de Estudio

#### Flashcards con Spaced Repetition (SM-2)
- Algoritmo SM-2 implementado en el backend
- Cada review actualiza: `interval`, `ease_factor`, `due_date`, `repeticiones`
- Cards "dominadas" = `repeticiones > 0`
- Vista de sesión con flip animation y botones de rating

#### Quiz Interactivo
- Preguntas de opción múltiple generadas desde PDFs
- Feedback instantáneo (correcto/incorrecto + justificación)
- Resultados guardados por unidad para tracking de progreso
- Botón "Pedirle a Redo que me explique" (IA)

#### Infografías y PDFs
- Carousel de imágenes con swipe
- Visor PDF embebido (react-pdf)
- Tracking de vistas por usuario

#### Progreso
Fórmula ponderada por unidad:
```
progreso = 50% flashcards_dominadas + 35% quiz_correctas + 15% pdfs_vistos
```
Se redistribuye dinámicamente si faltan componentes.

### 2. Redo — Mascota IA

Redo es el compañero de estudio animado (Lottie). Tiene tres niveles de inteligencia:

| Nivel | Descripción | Tokens |
|-------|-------------|--------|
| **Frases locales** | i18n phrases por pantalla/acción | 0 |
| **Mensajes ambientales** | IA genera 2 oraciones contextuales | ~200/call |
| **Chat tutor** | Conversación multi-turno por unidad | ~1400/call |

**Frases locales**: Definidas en `en.json`/`es.json` bajo `mascota.*`. Se resuelven por `(pantalla, accion, datos)` con interpolación de variables.

**Mensajes ambientales** (`/mascota/chat`): Redo observa tu progreso, flashcards vencidas, racha, y genera un comentario corto. Cache TTL para evitar gastos.

**Chat tutor** (`/tutor/chat`): Conversaciones de hasta 6 turnos sobre una unidad específica. Redo conoce los temas, flashcards y preguntas de la unidad.

**Acciones guiadas** (`/tutor/accion`): Respuestas one-shot optimizadas (~85% menos tokens que chat libre):
- `concepto_clave`: Concepto más importante de la unidad
- `punto_debil`: Dónde estás fallando (basado en quiz + flashcards)
- `practica`: Tip de práctica personalizado
- `explicar_tema`: Explicación de un tema específico

**Generación de contenido** (`/ai/generate/*`):
- Genera flashcards nuevas desde el contexto de la unidad
- Genera preguntas de quiz con opciones y respuesta correcta

### 3. Pomodoro Timer
- Sesiones de 25 minutos de estudio + 5 minutos de descanso
- Floating widget con contador y controles
- Redo interviene cada 10 min (estudio) o 2.5 min (descanso)
- Persistencia en estado del contexto

### 4. Social
- **Seguir materias**: Desbloquea el contenido y trackea progreso
- **Seguidores**: Lista de usuarios por materia (respeta privacidad)
- **Ranking**: Top usuarios por progreso promedio
- **Perfil público**: Configurable con 5 toggles de privacidad

### 5. Zona Libre — Archivos Comunitarios
- Upload de archivos a la red TON (descentralizada)
- Límite: 300 MB global + 50 MB por archivo
- Barra de capacidad visual
- Sistema de reportes (3 reportes = auto-ocultar)
- Onboarding dedicado con 6 slides

### 6. Notificaciones via Telegram Bot
Scheduler asíncrono (APScheduler):

| Notificación | Horario | Descripción |
|-------------|---------|-------------|
| Recordatorio diario | Configurable por usuario | "No estudiaste hoy" |
| Racha en riesgo | 00:00 UTC | Alerta si va a perder la racha |
| Reset de racha | 03:05 UTC | Pone racha en 0 si no hubo actividad |
| Flashcards vencidas | 12:00 UTC | "Tenés N cards para repasar en X" |

### 7. Internacionalización (i18n)
- Inglés (default) y español argentino (voseo)
- Selector de idioma en onboarding (primer slide) y en perfil
- Todas las strings traducidas incluyendo frases de Redo
- Persistencia en `localStorage('daathapp_lang')`

### 8. Community Counter
- Contador público de usuarios que se crearon Telegram por la app
- Estima edad de cuenta por ID de Telegram (IDs son incrementales)
- Threshold: `ID >= 8B` = cuentas 2025+ (nuevas)
- Muestra total + nuevos esta semana/hoy con número animado

---

## Modelo de Datos

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    User      │     │   Materia    │     │   Unidad     │
│──────────────│     │──────────────│     │──────────────│
│ id_telegram  │◄──┐ │ id           │◄──┐ │ id           │
│ first_name   │   │ │ nombre       │   │ │ id_materia   │──► Materia
│ last_name    │   │ │ emoji        │   │ │ nombre       │
│ username     │   │ │ color        │   │ │ orden        │
│ foto_url     │   │ │ orden        │   │ └──────────────┘
│ racha        │   │ └──────────────┘   │        │
│ fecha_registro│  │                     │   ┌────┴─────────┐
│ privacidad×5 │  │ ┌──────────────┐   │   │              │
│ onboarding   │  │ │MateriaSeguida│   │   ▼              ▼
└──────────────┘  │ │──────────────│   │ ┌──────────┐ ┌──────────┐
                  ├─│ id_usuario   │   │ │Flashcard │ │QuizPreg. │
                  │ │ id_materia   │───┘ │──────────│ │──────────│
                  │ └──────────────┘     │ pregunta │ │ pregunta │
                  │                      │ respuesta│ │ opciones │
                  │ ┌──────────────┐     └──────────┘ │ correcta │
                  │ │ CardReview   │          │       │ justific.│
                  │ │──────────────│          │       └──────────┘
                  ├─│ id_usuario   │          │
                  │ │ id_flashcard │──────────┘
                  │ │ interval     │
                  │ │ ease_factor  │     ┌──────────────┐
                  │ │ due_date     │     │  Progreso    │
                  │ │ repeticiones │     │──────────────│
                  │ └──────────────┘     │ id_usuario   │──► User
                  │                      │ id_materia   │──► Materia
                  │ ┌──────────────┐     │ id_unidad    │──► Unidad
                  │ │QuizResultado │     │ porcentaje   │
                  │ │──────────────│     └──────────────┘
                  ├─│ id_usuario   │
                  │ │ id_unidad    │     ┌──────────────────┐
                  │ │ correctas    │     │ NotifConfig      │
                  │ │ total        │     │──────────────────│
                  │ └──────────────┘     │ id_usuario       │──► User
                  │                      │ racha_activa     │
                  │                      │ recordatorio_act.│
                  │                      │ flashcards_activa│
                  │                      │ hora_recordatorio│
                  │                      └──────────────────┘
                  │
                  │ ┌──────────────────┐
                  │ │ ZonaLibreArchivo │
                  │ │──────────────────│
                  └─│ user_id          │
                    │ bag_id (TON)     │
                    │ nombre           │
                    │ tamanio          │
                    │ activo           │
                    └──────────────────┘
```

---

## Autenticación y Seguridad

### Telegram Mini App Auth
```
Frontend → X-Telegram-Init-Data header → Backend
Backend valida HMAC-SHA256 contra TELEGRAM_BOT_TOKEN
```

El backend reconstruye el hash de `initData` y lo compara con el hash firmado por Telegram. Solo requests desde la Mini App real pasan la validación.

### Admin Auth
```
Bot commands → @admin_only decorator (verifica ADMIN_ID = 1063772095)
API admin endpoints → X-Admin-Token header (contra ADMIN_SECRET env var)
```

### Rate Limiting
- Endpoints de usuario: 30/min
- Uploads: 5/min
- AI generation: rate limited por endpoint

---

## Variables de Entorno

### Backend (Railway)

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `TELEGRAM_BOT_TOKEN` | Token del bot @DaathApp_bot |
| `ADMIN_SECRET` | Token para endpoints admin del API |
| `ADMIN_ID` | Telegram ID del admin (1063772095) |
| `DEEPSEEK_API_KEY` | API key DeepSeek (IA principal) |
| `OPENAI_API_KEY` | API key OpenAI (fallback) |
| `LLM_PROVIDER` | `deepseek` o `openai` |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret |
| `R2_ENDPOINT` | Cloudflare R2 endpoint URL |
| `R2_BUCKET` | Nombre del bucket (`daathapp-infografias`) |
| `R2_PUBLIC_URL` | URL pública del bucket R2 |
| `TONUTILS_URL` | URL del servicio tonutils-storage |
| `TONUTILS_LOGIN` | Basic auth login para TON Storage |
| `TONUTILS_PASSWORD` | Basic auth password para TON Storage |
| `SENTRY_DSN` | Sentry DSN para error tracking |

### Frontend (Vercel)

| Variable | Descripción |
|----------|-------------|
| `VITE_API_URL` | URL del backend (`https://minestudy-production.up.railway.app`) |
| `VITE_ADMIN_SECRET` | Token admin para el panel dev |
| `VITE_SENTRY_DSN` | Sentry DSN para frontend |

---

## Desarrollo Local

### Requisitos
- Node.js 18+
- Python 3.11
- PostgreSQL

### Frontend
```bash
cd frontend
npm install
npm run dev    # → http://localhost:5173
```

### Backend
```bash
cd backend
pip install -r requirements.txt
# Configurar DATABASE_URL y TELEGRAM_BOT_TOKEN como env vars
uvicorn main:app --reload --port 8000
```

### Base de datos
```bash
cd backend
alembic upgrade head    # Aplica todas las migraciones
```

---

## Deploy

Ambos deployean automáticamente desde `main`:

- **Frontend**: Push a `main` → Vercel detecta cambios en `/frontend` → build + deploy
- **Backend**: Push a `main` → Railway detecta cambios en `/backend` → build + deploy

Railway usa `nixpacks.toml` para forzar Python 3.11 y `start.sh` para lanzar FastAPI + bot polling en paralelo.

---

## Gestión de Contenido (Bot Admin)

El bot `@DaathApp_bot` tiene un panel admin accesible con `/admin` (solo para `ADMIN_ID`):

1. **Crear materia**: emoji → nombre → color
2. **Crear unidad**: seleccionar materia → nombre
3. **Crear tema**: seleccionar unidad → nombre
4. **Subir flashcards**: Enviar archivo CSV (`pregunta,respuesta`)
5. **Subir quiz**: Enviar archivo JSON con preguntas
6. **Subir infografías**: Enviar fotos → se suben a R2
7. **Subir PDFs**: Enviar documentos → se suben a R2
8. **Ver stats**: `/stats` muestra usuarios, activos, rachas, crecimiento

Los botones del bot usan `httpx` raw contra Bot API 9.4 para soportar colores personalizados.

---

## Reglas Importantes

- **NUNCA** usar SQLite — siempre PostgreSQL via `DATABASE_URL`
- **NUNCA** commitear `app.db`
- El bot usa polling con `drop_pending_updates=True`
- Python 3.11 forzado via `nixpacks.toml`
- Admin ID: `1063772095`

---

## Licencia

Proyecto privado. Todos los derechos reservados.
