# Telegram Mini App Boilerplate — Guía de setup completa

Este boilerplate te permite arrancar una Telegram Mini App con toda la
infraestructura lista: autenticación, base de datos, migraciones, bot,
deploy automático, tests y monitoreo de errores.

**Stack:** React + Vite → Vercel | FastAPI + PostgreSQL → Railway | Bot: python-telegram-bot

---

## Requisitos previos

- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **Python 3.11** — [python.org](https://www.python.org/downloads/)
- **Git** — [git-scm.com](https://git-scm.com)
- Cuentas en: **GitHub**, **Railway**, **Vercel**, **Telegram**
- Cuenta en **Sentry** (opcional, para monitoreo de errores)

---

## Paso 1 — Crear el bot en Telegram

### 1.1 Crear el bot con BotFather

1. Abrí Telegram y buscá `@BotFather`
2. Escribí `/newbot`
3. Seguí las instrucciones: elegí un nombre y un username (debe terminar en `bot`)
4. BotFather te da el **token** — guardalo, lo vas a necesitar:
   ```
   123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi
   ```

### 1.2 Obtener tu ID de Telegram

1. Buscá `@userinfobot` en Telegram
2. Escribí cualquier mensaje
3. Te responde con tu **ID numérico** — guardalo (ej: `1063772095`)

### 1.3 Configurar el botón del menú (lo terminás después del Paso 4)

1. En BotFather: `/mybots` → seleccioná tu bot → **Bot Settings** → **Menu Button**
2. Elegí **Configure menu button**
3. Ingresá la URL de Vercel (la tenés después del Paso 4)
4. Elegí el texto del botón (ej: "Abrir App")

---

## Paso 2 — Crear el repositorio en GitHub

```bash
# Copiá los archivos del boilerplate a tu nueva carpeta
cp -r boilerplate/ mi-nueva-app/
cd mi-nueva-app/

# Inicializá git
git init
git add .
git commit -m "feat: initial boilerplate"

# Creá el repo en GitHub (desde github.com) y luego:
git remote add origin https://github.com/TU_USUARIO/mi-nueva-app.git
git push -u origin main
```

---

## Paso 3 — Deploy del backend en Railway

### 3.1 Crear el proyecto

1. Entrá a [railway.app](https://railway.app) → **New Project**
2. Elegí **Deploy from GitHub repo**
3. Conectá tu cuenta de GitHub si es la primera vez
4. Seleccioná el repo `mi-nueva-app`

### 3.2 Configurar el servicio

1. Hacé click en el servicio creado → pestaña **Settings**
2. En **Root Directory** escribí: `backend`
3. En **Build Command** dejalo vacío (nixpacks lo detecta solo)
4. En **Start Command** dejalo vacío (usa el `Procfile`)

### 3.3 Agregar la base de datos PostgreSQL

1. En el proyecto de Railway hacé click en **+ New** (arriba a la derecha)
2. Elegí **Database** → **Add PostgreSQL**
3. Railway crea la DB y la conecta automáticamente

### 3.4 Configurar variables de entorno

En el servicio backend → pestaña **Variables** → agregá estas variables:

| Variable | Valor | Cómo obtenerlo |
|---|---|---|
| `DATABASE_URL` | (automático) | Railway lo inyecta desde el plugin de PostgreSQL |
| `TELEGRAM_BOT_TOKEN` | `123456789:ABCDEF...` | BotFather — Paso 1.1 |
| `ADMIN_SECRET` | cadena aleatoria segura | Generala con: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `ADMIN_ID` | tu ID numérico de Telegram | `@userinfobot` — Paso 1.2 |
| `MINI_APP_URL` | `https://tu-app.vercel.app` | Completar después del Paso 4 |
| `SENTRY_DSN` | DSN del proyecto FastAPI | Paso 6 (opcional) |

> ⚠️ **Importante:** al pegar el `TELEGRAM_BOT_TOKEN` en Railway, asegurate de que
> no tenga espacios al inicio ni al final. El sistema lo verifica al arrancar.

### 3.5 Obtener la URL pública del backend

1. En el servicio → pestaña **Settings** → sección **Networking**
2. Click en **Generate Domain**
3. Copiá la URL (ej: `https://mi-app-production.up.railway.app`)
4. La vas a necesitar en el Paso 4

### 3.6 Verificar el deploy

Entrá a la pestaña **Deploy** → **View Logs**. Deberías ver:
```
[start] Corriendo migraciones...
[migrate] DB nueva detectada. Corriendo migraciones...
[migrate] OK.
[start] Iniciando bot y servidor...
INFO: Application startup complete.
```

---

## Paso 4 — Deploy del frontend en Vercel

### 4.1 Crear el proyecto

1. Entrá a [vercel.com](https://vercel.com) → **Add New Project**
2. Importá el repo `mi-nueva-app` desde GitHub
3. En la configuración del proyecto:

| Campo | Valor |
|---|---|
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Install Command** | `npm run vercel-install` |
| **Output Directory** | `dist` |

> ⚠️ **Importante:** usá `npm run vercel-install` (no `npm install`).
> `@telegram-apps/telegram-ui` tiene peer deps que requieren `--legacy-peer-deps`.

### 4.2 Variables de entorno en Vercel

En **Settings** → **Environment Variables**:

| Variable | Valor |
|---|---|
| `VITE_API_URL` | URL del backend de Railway (Paso 3.5) |
| `VITE_ADMIN_SECRET` | El mismo valor que `ADMIN_SECRET` en Railway |
| `VITE_SENTRY_DSN` | DSN del proyecto React en Sentry (Paso 6, opcional) |

### 4.3 Después del deploy

1. Copiá la URL de Vercel (ej: `https://mi-app.vercel.app`)
2. En Railway → Variables → actualizá `MINI_APP_URL` con esta URL
3. En BotFather → completá el Menu Button con esta URL (Paso 1.3)

---

## Paso 5 — Verificar que todo funciona

1. Abrí Telegram → buscá tu bot → tocá el botón del menú
2. La app debería abrirse dentro de Telegram
3. Verás tu nombre y tu ID de Telegram en la pantalla principal
4. En Railway → Logs deberías ver el POST a `/users` del usuario

---

## Paso 6 — Configurar Sentry (opcional pero recomendado)

Sentry te avisa cuando hay errores reales de usuarios en producción.

### 6.1 Crear los proyectos

1. Entrá a [sentry.io](https://sentry.io) → creá una cuenta gratis
2. Creá un proyecto → elegí **FastAPI** → copiá el DSN
3. Creá otro proyecto → elegí **React** → copiá ese DSN

### 6.2 Agregar las variables

- En **Railway** → Variables → `SENTRY_DSN = <dsn del proyecto FastAPI>`
- En **Vercel** → Environment Variables → `VITE_SENTRY_DSN = <dsn del proyecto React>`

Railway y Vercel redesployarán automáticamente con Sentry activo.

---

## Paso 7 — Desarrollo local

### 7.1 Backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Crear archivo .env (no lo subas a git)
cp .env.example .env
# Editá .env con tus valores

# Correr la API
uvicorn main:app --reload

# En otra terminal: correr el bot
python bot.py
```

Contenido del `backend/.env`:
```env
DATABASE_URL=postgresql://usuario:password@localhost:5432/miapp
TELEGRAM_BOT_TOKEN=123456789:ABCDEF...
ADMIN_SECRET=cualquier-valor-para-dev
ADMIN_ID=tu_id_telegram
MINI_APP_URL=http://localhost:5173
```

> Para desarrollo sin PostgreSQL local, podés usar la URL de Railway directamente
> en tu `.env` local. No lo uses en producción con tráfico real.

### 7.2 Frontend

```bash
cd frontend

# Instalar dependencias
npm install --legacy-peer-deps

# Crear archivo .env.local (no lo subas a git)
echo "VITE_API_URL=http://localhost:8000" > .env.local
echo "VITE_ADMIN_SECRET=cualquier-valor-para-dev" >> .env.local

# Correr el servidor de desarrollo
npm run dev
```

Abrí `http://localhost:5173` en el navegador. En dev muestra el usuario fallback
(id: `123456789`, nombre: `Dev`) — normal, no estás en Telegram.

---

## Paso 8 — Agregar nuevos modelos a la base de datos

Este es el flujo correcto cada vez que querés agregar o modificar tablas:

```bash
# 1. Editá backend/models.py y agregá tu modelo
#    Ejemplo: agregar modelo "Producto"

# 2. Generá la migración (desde la carpeta backend/)
cd backend
alembic revision --autogenerate -m "add_productos_table"

# 3. IMPORTANTE: revisá el archivo generado en alembic/versions/
#    Alembic a veces genera cosas extra — leelo antes de aplicar

# 4. Aplicar localmente (necesitás DATABASE_URL en .env)
alembic upgrade head

# 5. Commit y push — Railway lo aplica automáticamente
git add alembic/versions/
git commit -m "feat: add Producto model"
git push
```

Railway corre `python migrate.py` antes de arrancar, lo que aplica
todas las migraciones pendientes automáticamente.

---

## Paso 9 — Correr los tests

### Backend

```bash
cd backend
python -m pytest -v
```

Los tests usan SQLite en memoria — no necesitás una DB real para correrlos.

### Frontend

```bash
cd frontend
npm test
```

---

## Estructura de archivos — qué modificar primero

```
backend/
├── models.py        ← Agregá tus modelos acá
├── schemas.py       ← Agregá tus schemas Pydantic acá
├── main.py          ← Agregá tus endpoints (buscá el comentario al final)
├── bot.py           ← Agregá handlers del bot acá
└── bot_config.py    ← Configuración del bot

frontend/src/
├── App.jsx          ← Agregá tus rutas acá + cambiá la URL del bot
├── index.css        ← Cambiá --accent por el color de tu app
├── screens/
│   └── Home.jsx     ← Reemplazá con tu pantalla real
├── hooks/
│   └── useTelegram.js  ← Solo modificar el fallback dev si querés
└── services/
    └── api.js       ← Agregá tus funciones de API acá
```

---

## Notas importantes — errores comunes

### "TELEGRAM_BOT_TOKEN tiene espacios"
Railway a veces agrega espacios si pegás el token manualmente. El sistema
lo detecta al arrancar. Solución: en Railway → Variables → editá el token
y asegurate de que no tenga espacios.

### "Invalid or missing Telegram initData" (403)
Estás haciendo un request a un endpoint protegido desde fuera de Telegram.
En tests locales desde el navegador esto es normal. En Telegram debería
funcionar. Verificá que `TELEGRAM_BOT_TOKEN` sea el correcto.

### La app muestra "Solo disponible en Telegram" en el navegador
Normal — el boilerplate bloquea acceso fuera de Telegram. Para testear
en el navegador: comentá temporalmente el bloque `if (telegramChecked && ...)` en `App.jsx`.

### Railway produce `postgres://` en vez de `postgresql://`
Manejado automáticamente en `database.py` y `migrate.py`. No hace falta hacer nada.

### El bot no responde
Verificá que `TELEGRAM_BOT_TOKEN` sea correcto en Railway y que el proceso
del bot esté corriendo (en los logs deberías ver `Polling...`).

### Vercel falla en el build con errores de peer deps
Asegurate de que el **Install Command** en Vercel sea `npm run vercel-install`
y no `npm install`. Esto agrega `--legacy-peer-deps` necesario para
`@telegram-apps/telegram-ui` con React 19.

---

## Variables de entorno — resumen completo

### Railway (backend)

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | ✅ | URL de PostgreSQL (Railway la inyecta automáticamente) |
| `TELEGRAM_BOT_TOKEN` | ✅ | Token de BotFather |
| `ADMIN_SECRET` | ✅ | Token para endpoints admin (inventalo vos) |
| `ADMIN_ID` | ✅ | Tu ID numérico de Telegram |
| `MINI_APP_URL` | ✅ | URL de Vercel del frontend |
| `SENTRY_DSN` | ❌ | DSN de Sentry para el backend (opcional) |

### Vercel (frontend)

| Variable | Obligatoria | Descripción |
|---|---|---|
| `VITE_API_URL` | ✅ | URL del backend de Railway |
| `VITE_ADMIN_SECRET` | ✅ | Mismo valor que `ADMIN_SECRET` en Railway |
| `VITE_SENTRY_DSN` | ❌ | DSN de Sentry para el frontend (opcional) |

---

## Flujo de deploy

Cada vez que hacés `git push origin main`:

1. **Railway** detecta el push → redeploya el backend
   - Corre `python migrate.py` (aplica migraciones pendientes)
   - Arranca `python bot.py` en background
   - Arranca `uvicorn main:app`

2. **Vercel** detecta el push → redeploya el frontend
   - Corre `npm run build`
   - Publica en CDN global

Sin intervención manual. El deploy tarda ~2 minutos en Railway y ~1 minuto en Vercel.
