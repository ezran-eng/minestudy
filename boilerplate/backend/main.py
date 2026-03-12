"""
main.py — API principal con FastAPI.

Patrones incluidos listos para usar:
  - Logging estructurado en JSON (visible y filtrable en Railway)
  - Validación de variables de entorno al arrancar (falla rápido con mensaje claro)
  - Sentry (opcional, solo activo si SENTRY_DSN está configurado)
  - CORS configurado para Telegram Mini App ("null" origin es necesario)
  - Autenticación via Telegram initData (HMAC-SHA256)
  - Protección de endpoints admin via X-Admin-Token
  - Rate limiting con slowapi

Para agregar endpoints:
  - Buscá el comentario "# ─── Tus endpoints acá ───"
  - Seguí el patrón de los ejemplos de abajo
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
import sys
import hmac
import hashlib
import json
import logging
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from urllib.parse import unquote

import models
import schemas
from database import engine, get_db


# ─── Logging estructurado en JSON ─────────────────────────────────────────────
class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {"level": record.levelname, "logger": record.name, "msg": record.getMessage()}
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload)

_handler = logging.StreamHandler(sys.stdout)
_handler.setFormatter(_JsonFormatter())
logging.basicConfig(level=logging.INFO, handlers=[_handler])
logger = logging.getLogger("app")


# ─── Validación de variables de entorno al arrancar ───────────────────────────
# Agregá acá cualquier variable que tu app necesite obligatoriamente
_REQUIRED_ENV = [
    "DATABASE_URL",
    "TELEGRAM_BOT_TOKEN",
    "ADMIN_SECRET",
]
_missing = [v for v in _REQUIRED_ENV if not os.environ.get(v)]
if _missing:
    logger.error("Variables de entorno faltantes: %s", _missing)
    sys.exit(1)


# ─── Sentry (opcional) ────────────────────────────────────────────────────────
if os.environ.get("SENTRY_DSN"):
    sentry_sdk.init(
        dsn=os.environ["SENTRY_DSN"],
        integrations=[FastApiIntegration(), SqlalchemyIntegration()],
        traces_sample_rate=0.2,
        send_default_pii=False,
    )
    logger.info("Sentry inicializado")


# ─── Verificación del bot token (espacios rompen HMAC) ────────────────────────
_raw_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
if _raw_token != _raw_token.strip():
    logger.warning("TELEGRAM_BOT_TOKEN tiene espacios — esto rompe la validación de initData")


# ─── App ──────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — agregá jobs de APScheduler acá si los necesitás
    yield
    # Shutdown

app = FastAPI(title="Mi Telegram Mini App", lifespan=lifespan)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    # "null" es necesario para Telegram Desktop y WebViews de Android/iOS
    allow_origins=["https://tu-app.vercel.app", "null"],  # ← cambiar por tu URL de Vercel
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "X-Telegram-Init-Data", "X-Admin-Token"],
)


# ─── Seguridad ────────────────────────────────────────────────────────────────
def _validate_telegram_init_data(init_data: str, bot_token: str) -> bool:
    """Valida la firma HMAC del initData de Telegram."""
    try:
        params = {}
        for part in init_data.split("&"):
            if "=" in part:
                k, v = part.split("=", 1)
                params[k] = v
        received_hash = params.pop("hash", None)
        if not received_hash:
            return False
        data_check_string = "\n".join(f"{k}={unquote(v)}" for k, v in sorted(params.items()))
        secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
        expected = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        if hmac.compare_digest(expected, received_hash):
            return True
        # Fallback: sin URL-decode (algunos clientes de Telegram envían distinto)
        data_check_string_raw = "\n".join(f"{k}={v}" for k, v in sorted(params.items()))
        expected_raw = hmac.new(secret_key, data_check_string_raw.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected_raw, received_hash)
    except Exception:
        return False


def require_init_data(x_telegram_init_data: str = Header(default="")):
    """Dependencia: valida el initData de Telegram en cada request."""
    bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    if not _validate_telegram_init_data(x_telegram_init_data, bot_token):
        raise HTTPException(status_code=403, detail="Invalid or missing Telegram initData")


def require_admin(x_admin_token: str = Header(default="")):
    """Dependencia: valida el token de admin."""
    secret = os.environ.get("ADMIN_SECRET", "")
    if not secret or x_admin_token != secret:
        raise HTTPException(status_code=403, detail="Admin access required")


# ─── Endpoints base ───────────────────────────────────────────────────────────
@app.get("/health")
def health():
    """Health check — Railway lo usa para verificar que el servidor está vivo."""
    return {"status": "ok"}


@app.post("/users", response_model=schemas.UserOut)
@limiter.limit("30/minute")
def create_or_update_user(request: Request, user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    """Crear o actualizar usuario a partir del initData de Telegram."""
    user = db.query(models.User).filter(models.User.id_telegram == user_data.id_telegram).first()
    if user:
        user.first_name = user_data.first_name
        user.last_name  = user_data.last_name
        user.username   = user_data.username
        user.foto_url   = user_data.foto_url
    else:
        user = models.User(**user_data.model_dump())
        db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.get("/users/{id_telegram}", response_model=schemas.UserOut)
def get_user(id_telegram: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id_telegram == id_telegram).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ─── Tus endpoints acá ────────────────────────────────────────────────────────
# Ejemplo:
#
# @app.get("/mis-items", dependencies=[Depends(require_init_data)])
# def get_mis_items(db: Session = Depends(get_db)):
#     return db.query(models.MiModelo).all()
#
# @app.post("/mis-items", dependencies=[Depends(require_init_data)])
# def create_item(item: schemas.MiSchema, db: Session = Depends(get_db)):
#     nuevo = models.MiModelo(**item.model_dump())
#     db.add(nuevo)
#     db.commit()
#     db.refresh(nuevo)
#     return nuevo
