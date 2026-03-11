# DaathApp — Resumen completo del proyecto

> Mini App de estudio para estudiantes de ingeniería minera, accesible desde Telegram via **@DaathApp_bot**.

---

## ¿Qué es DaathApp?

DaathApp es una plataforma de estudio interactiva embebida dentro de Telegram como Mini App. Está diseñada específicamente para estudiantes de ingeniería minera y permite estudiar materias, hacer seguimiento del progreso, competir con compañeros y mantenerse constante mediante un sistema de rachas diarias. Todo desde el mismo Telegram, sin necesidad de instalar ninguna app extra.

---

## Funcionalidades principales

### Para el estudiante

#### Pantalla de Inicio (Home)
- Saludo personalizado con el nombre del usuario
- **Racha diaria** (contador de días consecutivos de estudio)
- **Foco del día**: unidad recomendada para continuar estudiando
- Progreso general en porcentaje
- Historial de actividad reciente (quizzes, flashcards, PDFs, infografías)

#### Explorador de Materias (Study)
- Listado de todas las materias disponibles con barra de búsqueda
- Barra de progreso por materia
- Seguir / dejar de seguir materias
- Badge de vistas (cuántos estudiantes ven esa materia)

#### Detalle de Materia (MateriaDetail)
- Vista de todas las unidades de la materia con progreso individual
- Lista de seguidores con avatares apilados (+ overflow indicator)
- Modal de seguidores completo

#### Unidad de Estudio (UnidadDetail)
- **Anillo de progreso circular (SVG)** mostrando el porcentaje de completitud
- 4 modos de estudio:
  - **Flashcards** — con algoritmo SRS (Spaced Repetition System)
  - **Quiz** — preguntas de opción múltiple con justificación de respuesta correcta
  - **Infografías** — carrusel de imágenes con navegación por thumbnails
  - **PDFs** — visor con control de página y zoom

#### Perfil de Usuario (Profile)
- Desglose de materias cursando vs. completadas
- **6 controles de privacidad** (foto, nombre, username, progreso, cursos, onboarding)
- **4 controles de notificaciones** + selector de hora de recordatorio
- Cards explicativas de cada función del sistema

#### Onboarding (primera vez)
- Wizard de 4 pasos con barra de progreso
- Presentación de funciones (flashcards, quiz, infografías, PDFs, rachas)
- Configuración inicial de privacidad

---

### Para el administrador (vía bot de Telegram)

El administrador gestiona todo el contenido desde el bot `@DaathApp_bot` con el comando `/admin`, sin necesidad de un panel web.

#### Gestión de contenido
- **Materias**: crear, editar (nombre, emoji, color), eliminar
- **Unidades**: crear, editar, eliminar
- **Temas**: crear por unidad
- **Flashcards**: carga masiva desde archivo CSV (`pregunta,respuesta`)
- **Quiz**: carga masiva desde archivo JSON con opciones A/B/C/D y justificación
- **Infografías**: subir imágenes directamente desde Telegram
- **PDFs**: subir documentos directamente desde Telegram
- **Estadísticas**: ver resumen de usuarios, materias y actividad

El flujo usa ConversationHandlers con confirmación antes de operaciones destructivas y botones con colores via Bot API 9.4.

---

## Arquitectura técnica

```
Telegram (usuario)
      │
      ▼
Mini App (React + Vite)          Bot (python-telegram-bot)
  minestudy.vercel.app               @DaathApp_bot
      │                                   │
      └──────────────┬────────────────────┘
                     ▼
              FastAPI (REST API)
         minestudy-production.up.railway.app
                     │
            ┌────────┴────────┐
            ▼                 ▼
       PostgreSQL         Cloudflare R2
      (Railway DB)     (imágenes y PDFs)
```

---

## Stack tecnológico

### Frontend
| Tecnología | Versión | Rol |
|---|---|---|
| React | 19.2 | UI framework |
| Vite | 7.3 | Bundler + dev server |
| React Router | 7.13 | Navegación entre pantallas |
| TanStack Query | 5.90 | Cache de datos + sincronización |
| React PDF | 10.4 | Visor de PDFs |
| Telegram UI | 2.1 | Componentes nativos de Telegram |

### Backend
| Tecnología | Versión | Rol |
|---|---|---|
| FastAPI | 0.134 | API REST async |
| SQLAlchemy | 2.0 | ORM con soporte async |
| PostgreSQL | — | Base de datos principal |
| asyncpg | — | Driver async para PostgreSQL |
| python-telegram-bot | 21.9 | Bot de Telegram |
| httpx | — | Requests HTTP async (Bot API 9.4) |
| boto3 | — | SDK para Cloudflare R2 (S3-compatible) |
| APScheduler | — | Tareas programadas (racha nocturna) |
| slowapi | — | Rate limiting |
| Pydantic | 2.12 | Validación de datos (schemas) |

### Infraestructura
| Servicio | Uso |
|---|---|
| **Vercel** | Deploy automático del frontend desde `main` |
| **Railway** | Deploy automático del backend + base de datos PostgreSQL |
| **Cloudflare R2** | Almacenamiento de imágenes y PDFs (bucket: `daathapp-infografias`) |
| **GitHub** | Control de versiones, trigger de deploys |

---

## Base de datos — Modelos

16 modelos SQLAlchemy cubriendo:

| Modelo | Descripción |
|---|---|
| `User` | Usuario con 15 campos: ID Telegram, nombre, racha, privacidad, onboarding |
| `Materia` | Materia con emoji, color y orden |
| `Unidad` | Unidad perteneciente a una materia |
| `Tema` | Subtema dentro de una unidad |
| `Flashcard` | Tarjeta de memoria con pregunta y respuesta |
| `CardReview` | Datos SRS por usuario/flashcard (interval, ease_factor, due_date) |
| `QuizPregunta` | Pregunta con 4 opciones, respuesta correcta y justificación |
| `QuizResultado` | Resultado de quiz por usuario y unidad |
| `Infografia` | Imagen con título, URL y orden |
| `Pdf` | PDF con título, URL y orden |
| `InfografiaVista` | Registro de qué infografías vio cada usuario |
| `PdfVisto` | Registro de qué PDFs vio cada usuario |
| `Progreso` | Porcentaje de progreso por usuario/materia/unidad |
| `Vista` | Registro de visitas a unidades (para actividad y racha) |
| `MateriaSeguida` | Relación usuario ↔ materia seguida |
| `NotificacionesConfig` | Config de notificaciones por usuario |

---

## API — Endpoints principales

Más de 50 endpoints REST organizados en:

- **Usuarios**: crear/actualizar, perfil, privacidad, notificaciones, onboarding
- **Materias**: listar, seguir/dejar, seguidores, vistas
- **Unidades**: progreso compuesto (flashcards + quiz + PDFs + infografías)
- **Flashcards**: listar, enviar review SRS
- **Quiz**: listar preguntas, registrar resultado
- **Infografías**: listar, registrar vista, subir (admin), eliminar (admin)
- **PDFs**: listar, ver archivo, registrar vista, subir (admin), eliminar (admin)
- **Stats**: ranking, stats de usuario, actividad reciente
- **Admin**: CRUD completo de todo el contenido

**Seguridad:**
- Validación de firma de Telegram `initData` en cada request
- Token de admin via header `X-Admin-Token`
- Rate limiting con slowapi

---

## Calidad y optimizaciones

### Performance backend
- **Eliminación de N+1 queries**: `get_user_stats` pasó de 50+ queries a ~6 usando `joinedload` y batch processing
- **Eager loading en `get_materias`**: una sola query con JOIN en vez de N queries separadas
- **Índices en PostgreSQL**: sobre campos de búsqueda frecuente (usuario, unidad, fecha)
- **Lifespan handlers**: sin warnings de deprecación, patrón moderno de FastAPI

### Performance frontend
- **Lazy loading de pantallas**: cada pantalla se descarga solo cuando el usuario navega a ella
- **Code splitting optimizado** (Vite con `manualChunks` en forma función):
  - `vendor-react` — React + React DOM + React Router (~228 kB, cacheado entre deploys)
  - `vendor-query` — TanStack Query (~33 kB, cacheado)
  - `vendor-pdf` — React PDF + pdfjs (~423 kB, solo si el usuario abre un PDF)
  - `vendor-tg-ui` — Telegram UI (~4 kB JS + 46 kB CSS, cacheado)
  - `index.js` — Entry point propio: **solo 13 kB** (era 193 kB antes de la optimización)
- **React Query**: cache inteligente con stale times diferenciados por tipo de dato (30s a 5min)
- **Sin flash de pantalla**: delay de 300ms antes de mostrar el bloqueo "no estás en Telegram"

### Calidad de código
- **Tests backend** (pytest): `test_auth.py`, `test_users.py`, `test_materias.py`
- **Tests frontend** (Vitest): `api.test.js`, `useTelegram.test.js`
- **Schemas Pydantic** para validación en todos los endpoints
- **Tipos SQLAlchemy 2.0** con soporte async completo
- **ESLint** configurado en frontend

---

## Algoritmo SRS (Spaced Repetition System)

Las flashcards usan un sistema de repetición espaciada similar a Anki:

- Cada flashcard por usuario tiene: `interval`, `ease_factor`, `due_date`, `repeticiones`
- Al marcar "Lo sabía": el intervalo se multiplica por el `ease_factor` (aumenta)
- Al marcar "No sabía": el intervalo se resetea a 1 día
- Las flashcards se ordenan por `due_date` para mostrar las que "toca repasar"

---

## Sistema de rachas

- Cada interacción del usuario (quiz, flashcard, vista de PDF/infografía) registra actividad en la tabla `Vista`
- Un **job nocturno** (APScheduler) verifica qué usuarios no tuvieron actividad en las últimas 24h y resetea su racha a 0
- La racha se muestra en el Home con el emoji 🔥

---

## Privacidad social

Cada usuario controla qué información comparte:
- `mostrar_foto` — si su avatar aparece en listas de seguidores
- `mostrar_nombre` — si su nombre es visible
- `mostrar_username` — si su @username es visible
- `mostrar_progreso` — si su % de progreso aparece en el ranking
- `mostrar_cursos` — si sus materias se muestran en el perfil público

El ranking y la lista de seguidores respetan estas preferencias en tiempo real.

---

## Despliegue

- **Frontend → Vercel**: cualquier push a `main` genera un deploy automático
- **Backend → Railway**: cualquier push a `main` genera un deploy automático con nixpacks (Python 3.11 forzado)
- **Bot**: corre en polling con `drop_pending_updates=True` para evitar procesar mensajes acumulados al reiniciar
- **Sin downtime** en deploys normales — Railway mantiene el proceso anterior hasta que el nuevo está listo

---

*Proyecto desarrollado con React 19, FastAPI, PostgreSQL y python-telegram-bot 21.9. Deploy en Vercel + Railway.*
