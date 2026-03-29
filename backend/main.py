from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse, RedirectResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
import sqlalchemy as sa
from sqlalchemy import func, extract, desc
from collections import defaultdict
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from typing import List, Optional
import os
import sys
import time
import uuid
import hmac
import hashlib
import json
import boto3
from botocore.client import Config
from fastapi import Header, Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

import httpx
import logging
from urllib.parse import unquote
import models
import schemas
from database import engine, get_db
from mascota_ai import get_mascota_message
from tutor_chat import tutor_respond
from tutor_actions import accion_concepto_clave, accion_punto_debil, accion_practica, accion_explicar_tema, accion_elemento
from periodic_table import lookup_element, search_elements, element_context_for_llm
from ai_generate import generate_flashcards, generate_quiz
from quota_check import check_quota, get_quota_status
from bot_config import ADMIN_ID
from ton_storage import upload_to_ton, get_local_file_path
from ton_wallet import generate_nonce, verify_ton_proof, get_nfts_for_wallet
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

# ─── Logging estructurado ─────────────────────────────────────────────────────
class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload)

_handler = logging.StreamHandler(sys.stdout)
_handler.setFormatter(_JsonFormatter())
logging.basicConfig(level=logging.INFO, handlers=[_handler])
logger = logging.getLogger("minestudy")

# ─── Validación de variables de entorno al arrancar ───────────────────────────
_REQUIRED_ENV = [
    "DATABASE_URL",
    "TELEGRAM_BOT_TOKEN",
    "R2_ENDPOINT",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET",
]
_missing = [v for v in _REQUIRED_ENV if not os.environ.get(v)]
if _missing:
    logger.error("Variables de entorno faltantes al arrancar: %s", _missing)
    sys.exit(1)

# ─── Sentry (opcional — solo activo si SENTRY_DSN está configurado) ───────────
_sentry_dsn = os.environ.get("SENTRY_DSN")
if _sentry_dsn:
    sentry_sdk.init(
        dsn=_sentry_dsn,
        integrations=[StarletteIntegration(), FastApiIntegration(), SqlalchemyIntegration()],
        traces_sample_rate=0.2,
        send_default_pii=False,
    )
    logger.info("Sentry inicializado")
from sqlalchemy.exc import IntegrityError

R2_PUBLIC_URL = "https://pub-d070e7bf4b014f54acc4915474377809.r2.dev"

_BIO_UNAVAILABLE = object()  # sentinel: API call failed, don't touch descripcion

def _get_telegram_bio(id_telegram: int):
    """Returns bio string or None if call succeeded, _BIO_UNAVAILABLE if call failed."""
    bot_token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not bot_token:
        return _BIO_UNAVAILABLE
    try:
        resp = httpx.get(
            f"https://api.telegram.org/bot{bot_token}/getChat",
            params={"chat_id": id_telegram},
            timeout=5.0,
        )
        data = resp.json()
        if data.get("ok"):
            return data["result"].get("bio") or None
        return _BIO_UNAVAILABLE
    except Exception:
        return _BIO_UNAVAILABLE

def get_r2_client():
    return boto3.client(
        "s3",
        endpoint_url=os.environ["R2_ENDPOINT"],
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        _scheduler.add_job(_job_recordatorio, 'interval', minutes=1)
        _scheduler.add_job(_job_racha, CronTrigger(hour=0, minute=0, timezone='UTC'))
        _scheduler.add_job(_job_reset_racha, CronTrigger(hour=3, minute=5, timezone='UTC'))
        _scheduler.add_job(_job_flashcards, CronTrigger(hour=12, minute=0, timezone='UTC'))
        _scheduler.start()
        logger.info("Scheduler iniciado — recordatorio cada minuto, racha 00:00 UTC, reset-racha 03:05 UTC, flashcards 12:00 UTC")
    except Exception as e:
        logger.error("Error iniciando scheduler: %s", e)
    yield
    # Shutdown
    _scheduler.shutdown(wait=False)


app = FastAPI(title="MineStudy Hub API", lifespan=lifespan)

# Startup diagnostic: confirm bot token format (never log the full token)
_raw_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
_token_stripped = _raw_token.strip()
if _raw_token != _token_stripped:
    logger.warning("TELEGRAM_BOT_TOKEN tiene espacios al inicio/fin — esto rompe la validación HMAC")
else:
    logger.info("TELEGRAM_BOT_TOKEN OK", extra={"prefix": _token_stripped[:6]})

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    # "null" origin covers Telegram Desktop and native mobile WebViews that
    # send Origin: null for embedded web apps (file:// / android-app:// contexts)
    allow_origins=["https://minestudy.vercel.app", "null"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "X-Telegram-Init-Data", "X-Admin-Token"],
)

# ─── Notification scheduler ───────────────────────────────────────────────────
_scheduler = AsyncIOScheduler(timezone='UTC')
# In-memory dedup: {(id_usuario, type, date_str)} — prevents double-sending on minute retries
_notified_today: set = set()


async def _send_telegram_notification(id_telegram: int, text: str):
    bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    if not bot_token:
        return
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                json={"chat_id": id_telegram, "text": text},
            )
    except Exception as e:
        logger.error(f"[notif] sendMessage failed for {id_telegram}: {e}")


async def _job_recordatorio():
    """Runs every minute. Sends study reminder when ART hour:minute matches hora_recordatorio."""
    from database import SessionLocal
    now_utc = datetime.now(timezone.utc)
    art_hour = (now_utc.hour - 3) % 24  # Argentina is UTC-3, no DST
    art_minute = now_utc.minute
    today_str = now_utc.date().isoformat()
    print(f"[notif:recordatorio] tick UTC={now_utc.strftime('%H:%M')} ART={art_hour:02d}:{art_minute:02d}")
    db = SessionLocal()
    try:
        configs = (
            db.query(models.NotificacionesConfig)
            .filter(
                models.NotificacionesConfig.recordatorio_activo == True,
                extract("hour", models.NotificacionesConfig.hora_recordatorio) == art_hour,
                extract("minute", models.NotificacionesConfig.hora_recordatorio) == art_minute,
            )
            .all()
        )
        today = now_utc.date()
        for cfg in configs:
            dedup_key = (cfg.id_usuario, "recordatorio", today_str)
            if dedup_key in _notified_today:
                print(f"[notif:recordatorio] skip {cfg.id_usuario} — ya notificado hoy")
                continue
            user = db.query(models.User).filter(models.User.id_telegram == cfg.id_usuario).first()
            if not user:
                continue
            if user.ultima_actividad and user.ultima_actividad.date() >= today:
                print(f"[notif:recordatorio] skip {cfg.id_usuario} — ultima_actividad={user.ultima_actividad.date()}")
                continue
            await _send_telegram_notification(
                user.id_telegram,
                f"📚 Hey {user.first_name}, no estudiaste hoy. ¡Tu racha de {user.racha} días te espera!",
            )
            _notified_today.add(dedup_key)
            print(f"[notif:recordatorio] sent to {cfg.id_usuario}")
    except Exception as e:
        print(f"[notif:recordatorio] ERROR: {e}")
        logger.error(f"[notif] _job_recordatorio error: {e}", exc_info=True)
    finally:
        db.close()


async def _job_racha():
    """Runs at 00:00 UTC (21:00 ART). Warns users at risk of losing their streak."""
    from database import SessionLocal
    now_utc = datetime.now(timezone.utc)
    today_str = now_utc.date().isoformat()
    db = SessionLocal()
    try:
        configs = (
            db.query(models.NotificacionesConfig)
            .filter(models.NotificacionesConfig.racha_activa == True)
            .all()
        )
        today = now_utc.date()
        for cfg in configs:
            dedup_key = (cfg.id_usuario, "racha", today_str)
            if dedup_key in _notified_today:
                continue
            user = db.query(models.User).filter(models.User.id_telegram == cfg.id_usuario).first()
            if not user or user.racha == 0:
                continue
            if user.ultima_actividad and user.ultima_actividad.date() >= today:
                continue
            await _send_telegram_notification(
                user.id_telegram,
                f"🔥 ¡Tu racha de {user.racha} días está en riesgo! Entrá a DaathApp antes de medianoche.",
            )
            _notified_today.add(dedup_key)
            print(f"[notif] racha sent to {cfg.id_usuario}")
    except Exception as e:
        logger.error(f"[notif] _job_racha error: {e}", exc_info=True)
        print(f"[notif] _job_racha error: {e}")
    finally:
        db.close()


async def _job_reset_racha():
    """Runs at 03:05 UTC (00:05 ART). Resets streak to 0 for users who missed yesterday."""
    from database import SessionLocal
    from zoneinfo import ZoneInfo
    db = SessionLocal()
    try:
        art_now = datetime.now(ZoneInfo("America/Argentina/Buenos_Aires"))
        yesterday_art = (art_now - timedelta(days=1)).date()
        # Users with racha > 0 whose last activity was before yesterday
        affected = (
            db.query(models.User)
            .filter(
                models.User.racha > 0,
                models.User.ultima_actividad != None,
                models.User.ultima_actividad < datetime.combine(yesterday_art, datetime.min.time()),
            )
            .all()
        )
        for user in affected:
            user.racha = 0
        if affected:
            db.commit()
            print(f"[racha-reset] reset {len(affected)} users")
        else:
            print("[racha-reset] no users to reset")
    except Exception as e:
        logger.error(f"[racha-reset] error: {e}", exc_info=True)
        print(f"[racha-reset] error: {e}")
    finally:
        db.close()


async def _job_flashcards():
    """Runs at 12:00 UTC (09:00 ART). Notifies users with due flashcards per materia."""
    from database import SessionLocal
    now_utc = datetime.now(timezone.utc)
    today_str = now_utc.date().isoformat()
    db = SessionLocal()
    try:
        configs = (
            db.query(models.NotificacionesConfig)
            .filter(models.NotificacionesConfig.flashcards_activa == True)
            .all()
        )
        for cfg in configs:
            dedup_key = (cfg.id_usuario, "flashcards", today_str)
            if dedup_key in _notified_today:
                continue
            rows = (
                db.query(models.Materia.nombre, func.count(models.CardReview.id_flashcard).label("cnt"))
                .join(models.Unidad, models.Unidad.id_materia == models.Materia.id)
                .join(models.Flashcard, models.Flashcard.id_unidad == models.Unidad.id)
                .join(models.CardReview, (models.CardReview.id_flashcard == models.Flashcard.id) &
                      (models.CardReview.id_usuario == cfg.id_usuario))
                .filter(models.CardReview.due_date <= now_utc)
                .group_by(models.Materia.id, models.Materia.nombre)
                .all()
            )
            if rows:
                for materia_nombre, cnt in rows:
                    await _send_telegram_notification(
                        cfg.id_usuario,
                        f"🃏 Tenés {cnt} flashcard{'s' if cnt != 1 else ''} para repasar hoy en {materia_nombre}",
                    )
                _notified_today.add(dedup_key)
                print(f"[notif] flashcards sent to {cfg.id_usuario}")
    except Exception as e:
        logger.error(f"[notif] _job_flashcards error: {e}", exc_info=True)
        print(f"[notif] _job_flashcards error: {e}")
    finally:
        db.close()



# ─── Security dependencies ────────────────────────────────────────────────────
def require_admin(x_admin_token: Optional[str] = Header(default=None)):
    secret = os.environ.get("ADMIN_SECRET", "")
    if not secret or not x_admin_token:
        raise HTTPException(status_code=403, detail="Forbidden")
    if not hmac.compare_digest(x_admin_token.encode(), secret.encode()):
        raise HTTPException(status_code=403, detail="Forbidden")


def _validate_telegram_init_data(init_data: str, bot_token: str) -> bool:
    try:
        pairs = dict(pair.split('=', 1) for pair in init_data.split('&') if '=' in pair)
        received_hash = pairs.pop('hash', None)
        if not received_hash:
            logger.warning("[auth] initData has no hash field — keys present: %s", list(pairs.keys()))
            return False

        auth_date = int(pairs.get('auth_date', 0))
        if not auth_date or (time.time() - auth_date) > 86_400:
            logger.warning("[auth] initData expired or missing auth_date (age=%ds)", int(time.time() - auth_date))
            return False

        secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()

        # Attempt 1: raw values (URL-encoded, as received)
        data_check_string = '\n'.join(f"{k}={v}" for k, v in sorted(pairs.items()))
        expected_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

        logger.info("[auth] data_check_string (raw): %s", data_check_string[:120])
        logger.info("[auth] received_hash:  %s", received_hash)
        logger.info("[auth] computed_hash (raw): %s", expected_hash)

        if hmac.compare_digest(received_hash, expected_hash):
            return True

        # Attempt 2: URL-decoded values (some Telegram clients send decoded initData)
        decoded_pairs = {k: unquote(v) for k, v in pairs.items()}
        data_check_string_decoded = '\n'.join(f"{k}={v}" for k, v in sorted(decoded_pairs.items()))
        expected_hash_decoded = hmac.new(secret_key, data_check_string_decoded.encode(), hashlib.sha256).hexdigest()

        logger.info("[auth] data_check_string (decoded): %s", data_check_string_decoded[:120])
        logger.info("[auth] computed_hash (decoded): %s", expected_hash_decoded)

        if hmac.compare_digest(received_hash, expected_hash_decoded):
            logger.warning("[auth] MATCH on decoded values — client is sending URL-decoded initData")
            return True

        logger.warning(
            "[auth] HMAC mismatch — neither raw nor decoded matched. "
            "received=%s raw_computed=%s decoded_computed=%s",
            received_hash, expected_hash, expected_hash_decoded,
        )
        return False

    except Exception as exc:
        logger.exception("[auth] exception during initData validation: %s", exc)
        return False


def require_init_data(x_telegram_init_data: Optional[str] = Header(default=None)):
    bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()  # strip whitespace from env var
    if not x_telegram_init_data:
        print("[auth] 403: X-Telegram-Init-Data header missing")
        raise HTTPException(status_code=403, detail="Telegram auth required")
    if not bot_token:
        print("[auth] 500: TELEGRAM_BOT_TOKEN env var not set or empty after strip")
        raise HTTPException(status_code=500, detail="Server misconfigured")
    if not _validate_telegram_init_data(x_telegram_init_data, bot_token):
        print(f"[auth] 403: initData hash invalid. initData[:60]={x_telegram_init_data[:60]!r}")
        raise HTTPException(status_code=403, detail="Invalid Telegram auth")


def _extract_user_id(request: Request) -> Optional[int]:
    """Extract user ID from Telegram initData header."""
    import json
    from urllib.parse import unquote
    init_data = request.headers.get("x-telegram-init-data", "")
    if not init_data:
        return None
    try:
        pairs = dict(pair.split('=', 1) for pair in init_data.split('&') if '=' in pair)
        user_str = unquote(pairs.get("user", ""))
        if user_str:
            user_obj = json.loads(user_str)
            return int(user_obj.get("id", 0)) or None
    except Exception:
        pass
    return None


def _require_self_or_admin(path_user_id: int, request: Request) -> int:
    """Check that caller is acting on their own account (or is admin). Returns authenticated user_id."""
    user_id = _extract_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if user_id != path_user_id and user_id != ADMIN_ID:
        raise HTTPException(status_code=403, detail="No tenés permisos")
    return user_id


def _require_self(request: Request, body_user_id: int) -> int:
    """Check that the authenticated user matches the user_id in the request body. Returns authenticated user_id."""
    user_id = _extract_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if user_id != body_user_id and user_id != ADMIN_ID:
        raise HTTPException(status_code=403, detail="No podés operar en nombre de otro usuario")
    return user_id


def _require_owner_or_admin(materia_id: int, request: Request, db: Session):
    """Check that caller is the materia owner or admin. Returns (user_id, materia)."""
    user_id = _extract_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    materia = db.query(models.Materia).filter(models.Materia.id == materia_id).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Materia not found")
    if user_id != ADMIN_ID and materia.creador_id != user_id:
        raise HTTPException(status_code=403, detail="No tenés permisos")
    return user_id, materia


def _require_owner_or_admin_by_unidad(unidad_id: int, request: Request, db: Session):
    """Resolve unidad → materia and check ownership. Returns (user_id, materia, unidad)."""
    unidad = db.query(models.Unidad).filter(models.Unidad.id == unidad_id).first()
    if not unidad:
        raise HTTPException(status_code=404, detail="Unidad not found")
    user_id, materia = _require_owner_or_admin(unidad.id_materia, request, db)
    return user_id, materia, unidad


# Telegram IDs are sequential — these breakpoints map ID ranges to approximate
# account creation years based on community research (Fragment, tgstat, etc.)
_TG_ID_BREAKPOINTS = [
    (100_000,        2013),
    (10_000_000,     2014),
    (100_000_000,    2016),
    (500_000_000,    2018),
    (1_000_000_000,  2019),
    (2_000_000_000,  2020),
    (3_500_000_000,  2021),
    (5_000_000_000,  2022),
    (6_000_000_000,  2023),
    (7_000_000_000,  2024),
    (8_000_000_000,  2025),
]

def _estimate_tg_year(id_telegram: int) -> int:
    for threshold, year in _TG_ID_BREAKPOINTS:
        if id_telegram < threshold:
            return year
    return 2026  # IDs >= 8B → 2026


@app.get("/community-counter")
def community_counter(db: Session = Depends(get_db)):
    """Public counter of users and Telegram account age distribution."""
    from datetime import datetime, timedelta, timezone
    total = db.query(models.User).count()

    # Growth by registration in DaathApp
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    new_this_week = db.query(models.User).filter(
        models.User.fecha_registro >= week_ago
    ).count()
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    new_today = db.query(models.User).filter(
        models.User.fecha_registro >= today_start
    ).count()

    # Users with Telegram account estimated 2025+ (ID >= 8B)
    # These are accounts created recently — likely joined Telegram for DaathApp
    RECENT_TG_THRESHOLD = 8_000_000_000
    recent_tg = db.query(models.User).filter(
        models.User.id_telegram >= RECENT_TG_THRESHOLD
    ).count()

    # Breakdown by estimated Telegram year for all users
    all_users = db.query(models.User.id_telegram).all()
    year_dist: dict[int, int] = {}
    for (uid,) in all_users:
        y = _estimate_tg_year(uid)
        year_dist[y] = year_dist.get(y, 0) + 1

    return {
        "total": total,
        "new_this_week": new_this_week,
        "new_today": new_today,
        "recent_tg_accounts": recent_tg,   # accounts estimated 2023+
        "year_distribution": year_dist,
    }


@app.post("/users", response_model=schemas.User)
@limiter.limit("30/minute")
def create_or_update_user(request: Request, user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id_telegram == user.id_telegram).first()
    if db_user:
        for key, value in user.model_dump(exclude_unset=True).items():
            setattr(db_user, key, value)
    else:
        db_user = models.User(**user.model_dump())
        db.add(db_user)

    bio = _get_telegram_bio(user.id_telegram)
    if bio is not _BIO_UNAVAILABLE:
        db_user.descripcion = bio  # str if has bio, None if no bio

    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/users/{id_telegram}", response_model=schemas.User)
def get_user_profile(id_telegram: int, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id_telegram == id_telegram).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user

@app.put("/progreso", response_model=schemas.Progreso, dependencies=[Depends(require_init_data)])
def update_progress(progreso: schemas.ProgresoCreate, request: Request, db: Session = Depends(get_db)):
    _require_self(request, progreso.id_usuario)
    # Check if user exists
    db_user = db.query(models.User).filter(models.User.id_telegram == progreso.id_usuario).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # The materia needs to exist too, assuming it will be prepopulated.
    # We check if a progress record exists
    db_progreso = db.query(models.Progreso).filter(
        models.Progreso.id_usuario == progreso.id_usuario,
        models.Progreso.id_materia == progreso.id_materia,
        models.Progreso.id_unidad == progreso.id_unidad
    ).first()

    if db_progreso:
        # Update existing
        db_progreso.porcentaje = progreso.porcentaje
    else:
        # Create new
        db_progreso = models.Progreso(**progreso.model_dump())
        db.add(db_progreso)

    db.commit()
    db.refresh(db_progreso)
    return db_progreso

@app.get("/materias", response_model=List[schemas.MateriaBase])
def get_materias(user_id: int = None, db: Session = Depends(get_db)):
    query = (
        db.query(models.Materia)
        .options(
            joinedload(models.Materia.unidades).joinedload(models.Unidad.temas),
            joinedload(models.Materia.creador),
        )
    )
    if user_id:
        # Private materias the user already follows (grandfathered access)
        followed_private = (
            db.query(models.MateriaSeguida.id_materia)
            .join(models.Materia, models.Materia.id == models.MateriaSeguida.id_materia)
            .filter(
                models.MateriaSeguida.id_usuario == user_id,
                models.Materia.es_publica == False,
            )
            .subquery()
        )
        query = query.filter(
            sa.or_(
                models.Materia.es_publica == True,
                models.Materia.creador_id == user_id,
                models.Materia.id.in_(followed_private),
            )
        )
    else:
        query = query.filter(models.Materia.es_publica == True)
    db_materias = query.order_by(models.Materia.orden).all()
    results = []
    for materia in db_materias:
        materia.unidades.sort(key=lambda u: (u.orden is None, u.orden))
        for unidad in materia.unidades:
            unidad.temas.sort(key=lambda t: t.id)
        # Build creator name respecting privacy settings
        creador_nombre = None
        if materia.creador:
            u = materia.creador
            if u.mostrar_nombre:
                creador_nombre = u.first_name
            elif u.mostrar_username and u.username:
                creador_nombre = f"@{u.username}"
            else:
                creador_nombre = "Anónimo"
        materia.creador_nombre = creador_nombre
        results.append(materia)
    return results

@app.post("/materias", response_model=schemas.MateriaBase, dependencies=[Depends(require_init_data)])
def create_materia(body: schemas.MateriaCreate, request: Request, db: Session = Depends(get_db)):
    user_id = _extract_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="User not found")
    # Limit: max 10 materias per user
    count = db.query(func.count(models.Materia.id)).filter(models.Materia.creador_id == user_id).scalar()
    if count >= 10:
        raise HTTPException(status_code=400, detail="Máximo 10 materias por usuario")
    nueva = models.Materia(
        nombre=body.nombre.strip(),
        emoji=body.emoji,
        color=body.color,
        creador_id=user_id,
        es_publica=True,
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    # Auto-follow
    db.add(models.MateriaSeguida(id_usuario=user_id, id_materia=nueva.id))
    db.commit()
    return nueva

@app.put("/materias/{id}", response_model=schemas.MateriaBase, dependencies=[Depends(require_init_data)])
def update_materia(id: int, materia: schemas.MateriaUpdate, request: Request, db: Session = Depends(get_db)):
    user_id, db_materia = _require_owner_or_admin(id, request, db)
    update_data = materia.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_materia, key, value)
    db.commit()
    db.refresh(db_materia)
    return db_materia

@app.delete("/materias/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_init_data)])
def delete_materia(id: int, request: Request, db: Session = Depends(get_db)):
    user_id, db_materia = _require_owner_or_admin(id, request, db)
    db.delete(db_materia)
    db.commit()
    return

@app.get("/materias/{id}/unidades", response_model=List[schemas.UnidadBase])
def get_unidades(id: int, db: Session = Depends(get_db)):
    db_unidades = db.query(models.Unidad).filter(models.Unidad.id_materia == id).all()
    if not db_unidades:
        return []
    return db_unidades

@app.post("/materias/{id}/unidades", response_model=schemas.UnidadBase, dependencies=[Depends(require_init_data)])
def create_unidad(id: int, body: schemas.UnidadCreate, request: Request, db: Session = Depends(get_db)):
    user_id, materia = _require_owner_or_admin(id, request, db)
    count = db.query(func.count(models.Unidad.id)).filter(models.Unidad.id_materia == id).scalar()
    if count >= 30:
        raise HTTPException(status_code=400, detail="Máximo 30 unidades por materia")
    orden = body.orden if body.orden is not None else count + 1
    nueva = models.Unidad(nombre=body.nombre.strip(), id_materia=id, orden=orden, estado_default="pendiente")
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva

@app.put("/unidades/{id}", response_model=schemas.UnidadBase, dependencies=[Depends(require_init_data)])
def update_unidad(id: int, unidad: schemas.UnidadUpdate, request: Request, db: Session = Depends(get_db)):
    user_id, materia, db_unidad = _require_owner_or_admin_by_unidad(id, request, db)
    update_data = unidad.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_unidad, key, value)
    db.commit()
    db.refresh(db_unidad)
    return db_unidad

@app.delete("/unidades/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_init_data)])
def delete_unidad(id: int, request: Request, db: Session = Depends(get_db)):
    user_id, materia, db_unidad = _require_owner_or_admin_by_unidad(id, request, db)
    db.delete(db_unidad)
    db.commit()
    return

@app.post("/unidades/{id}/temas", response_model=schemas.TemaBase, dependencies=[Depends(require_init_data)])
def create_tema(id: int, body: schemas.TemaCreate, request: Request, db: Session = Depends(get_db)):
    user_id, materia, unidad = _require_owner_or_admin_by_unidad(id, request, db)
    count = db.query(func.count(models.Tema.id)).filter(models.Tema.id_unidad == id).scalar()
    if count >= 20:
        raise HTTPException(status_code=400, detail="Máximo 20 temas por unidad")
    nuevo = models.Tema(nombre=body.nombre.strip(), id_unidad=id)
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@app.put("/temas/{id}", response_model=schemas.TemaBase, dependencies=[Depends(require_init_data)])
def update_tema(id: int, body: schemas.TemaUpdate, request: Request, db: Session = Depends(get_db)):
    db_tema = db.query(models.Tema).filter(models.Tema.id == id).first()
    if not db_tema:
        raise HTTPException(status_code=404, detail="Tema not found")
    _require_owner_or_admin_by_unidad(db_tema.id_unidad, request, db)
    if body.nombre is not None:
        db_tema.nombre = body.nombre.strip()
    db.commit()
    db.refresh(db_tema)
    return db_tema

@app.delete("/temas/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_init_data)])
def delete_tema(id: int, request: Request, db: Session = Depends(get_db)):
    db_tema = db.query(models.Tema).filter(models.Tema.id == id).first()
    if not db_tema:
        raise HTTPException(status_code=404, detail="Tema not found")
    _require_owner_or_admin_by_unidad(db_tema.id_unidad, request, db)
    db.delete(db_tema)
    db.commit()
    return

@app.get("/unidades/{id_unidad}/flashcards", response_model=List[schemas.FlashcardBase])
def get_flashcards(id_unidad: int, db: Session = Depends(get_db)):
    db_flashcards = db.query(models.Flashcard).filter(models.Flashcard.id_unidad == id_unidad).all()
    if not db_flashcards:
        return []
    return db_flashcards

@app.get("/unidades/{id_unidad}/quiz", response_model=List[schemas.QuizPreguntaBase])
def get_quiz(id_unidad: int, db: Session = Depends(get_db)):
    db_quiz = db.query(models.QuizPregunta).filter(models.QuizPregunta.id_unidad == id_unidad).all()
    if not db_quiz:
        return []
    return db_quiz

@app.post("/unidades/{id_unidad}/quiz/pregunta", response_model=schemas.QuizPreguntaBase, dependencies=[Depends(require_init_data)])
def create_quiz_pregunta(id_unidad: int, body: schemas.QuizPreguntaCreate, request: Request, db: Session = Depends(get_db)):
    user_id, materia, unidad = _require_owner_or_admin_by_unidad(id_unidad, request, db)
    count = db.query(func.count(models.QuizPregunta.id)).filter(models.QuizPregunta.id_unidad == id_unidad).scalar()
    if count >= 50:
        raise HTTPException(status_code=400, detail="Máximo 50 preguntas por unidad")
    if body.respuesta_correcta not in ("a", "b", "c", "d"):
        raise HTTPException(status_code=400, detail="respuesta_correcta debe ser a, b, c o d")
    nueva = models.QuizPregunta(
        id_unidad=id_unidad,
        pregunta=body.pregunta.strip(),
        opcion_a=body.opcion_a.strip(),
        opcion_b=body.opcion_b.strip(),
        opcion_c=body.opcion_c.strip(),
        opcion_d=body.opcion_d.strip(),
        respuesta_correcta=body.respuesta_correcta,
        justificacion=body.justificacion.strip() if body.justificacion else None,
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva

@app.put("/quiz/{id}", response_model=schemas.QuizPreguntaBase, dependencies=[Depends(require_init_data)])
def update_quiz_pregunta(id: int, body: schemas.QuizPreguntaUpdate, request: Request, db: Session = Depends(get_db)):
    db_q = db.query(models.QuizPregunta).filter(models.QuizPregunta.id == id).first()
    if not db_q:
        raise HTTPException(status_code=404, detail="Pregunta not found")
    _require_owner_or_admin_by_unidad(db_q.id_unidad, request, db)
    update_data = body.model_dump(exclude_unset=True)
    if "respuesta_correcta" in update_data and update_data["respuesta_correcta"] not in ("a", "b", "c", "d"):
        raise HTTPException(status_code=400, detail="respuesta_correcta debe ser a, b, c o d")
    for key, value in update_data.items():
        setattr(db_q, key, value.strip() if isinstance(value, str) else value)
    db.commit()
    db.refresh(db_q)
    return db_q

@app.delete("/quiz/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_init_data)])
def delete_quiz_pregunta(id: int, request: Request, db: Session = Depends(get_db)):
    db_q = db.query(models.QuizPregunta).filter(models.QuizPregunta.id == id).first()
    if not db_q:
        raise HTTPException(status_code=404, detail="Pregunta not found")
    _require_owner_or_admin_by_unidad(db_q.id_unidad, request, db)
    db.delete(db_q)
    db.commit()
    return

@app.delete("/unidades/{id_unidad}/flashcards", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_flashcards_by_unidad(id_unidad: int, db: Session = Depends(get_db)):
    deleted = db.query(models.Flashcard).filter(models.Flashcard.id_unidad == id_unidad).delete()
    db.commit()
    return

@app.delete("/unidades/{id_unidad}/quiz", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_quiz_by_unidad(id_unidad: int, db: Session = Depends(get_db)):
    deleted = db.query(models.QuizPregunta).filter(models.QuizPregunta.id_unidad == id_unidad).delete()
    db.commit()
    return

@app.get("/ranking", response_model=List[schemas.RankingUser])
def get_ranking(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    limit = min(limit, 100)  # máximo 100 por página
    ranking_data = db.query(
        models.User,
        func.coalesce(func.avg(models.Progreso.porcentaje), 0).label('total_progress')
    ).outerjoin(models.Progreso).group_by(models.User.id_telegram).order_by(
        func.coalesce(func.avg(models.Progreso.porcentaje), 0).desc()
    ).offset(offset).limit(limit).all()

    result = []
    for user, total_progress in ranking_data:
        result.append({
            "id_telegram": user.id_telegram,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "username": user.username,
            "foto_url": user.foto_url,
            "total_progress": total_progress
        })
    return result

from datetime import datetime, date, timedelta, timezone, time as time_obj

@app.post("/flashcards/{id}/review", response_model=schemas.CardReviewOut, dependencies=[Depends(require_init_data)])
@limiter.limit("60/minute")
def review_flashcard(request: Request, id: int, body: schemas.ReviewRequest, db: Session = Depends(get_db)):
    _require_self(request, body.id_usuario)
    flashcard = db.query(models.Flashcard).filter(models.Flashcard.id == id).first()
    if not flashcard:
        raise HTTPException(status_code=404, detail="Flashcard not found")

    review = db.query(models.CardReview).filter(
        models.CardReview.id_usuario == body.id_usuario,
        models.CardReview.id_flashcard == id
    ).first()

    now = datetime.now(timezone.utc)

    if review is None:
        review = models.CardReview(
            id_usuario=body.id_usuario,
            id_flashcard=id,
            interval=1,
            ease_factor=2.5,
            due_date=now,
            last_reviewed=now,
            repeticiones=0,
        )
        db.add(review)

    if body.knew:
        new_interval = max(1, round(review.interval * review.ease_factor))
        new_ease = review.ease_factor + 0.1
        new_repeticiones = review.repeticiones + 1
    else:
        new_interval = 1
        new_ease = max(1.3, review.ease_factor - 0.2)
        new_repeticiones = 0

    review.interval = new_interval
    review.ease_factor = new_ease
    review.repeticiones = new_repeticiones
    review.last_reviewed = now
    review.due_date = now + timedelta(days=new_interval)

    db.commit()
    db.refresh(review)
    return review


@app.get("/flashcards/due", response_model=List[schemas.FlashcardBase])
def get_due_flashcards(id_unidad: int, id_usuario: int, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)

    all_cards = db.query(models.Flashcard).filter(models.Flashcard.id_unidad == id_unidad).all()
    if not all_cards:
        return []

    card_ids = [c.id for c in all_cards]
    reviews = db.query(models.CardReview).filter(
        models.CardReview.id_usuario == id_usuario,
        models.CardReview.id_flashcard.in_(card_ids)
    ).all()
    review_map = {r.id_flashcard: r for r in reviews}

    due, not_due, never = [], [], []
    for card in all_cards:
        r = review_map.get(card.id)
        if r is None:
            never.append(card)
        elif r.due_date <= now:
            due.append((r.due_date, card))
        else:
            not_due.append((r.due_date, card))

    due.sort(key=lambda x: x[0])
    not_due.sort(key=lambda x: x[0])

    return [c for _, c in due] + never + [c for _, c in not_due]


@app.post("/actividad", response_model=schemas.ActividadResponse, dependencies=[Depends(require_init_data)])
@limiter.limit("60/minute")
def registrar_actividad(request: Request, actividad: schemas.ActividadCreate, db: Session = Depends(get_db)):
    _require_self(request, actividad.id_telegram)
    db_user = db.query(models.User).filter(models.User.id_telegram == actividad.id_telegram).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    try:
        fecha_actividad = datetime.strptime(actividad.fecha_local, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, should be YYYY-MM-DD")

    nueva_racha = False
    primer_dia = False

    if db_user.ultima_actividad:
        ultima_fecha = db_user.ultima_actividad.date()
        delta = (fecha_actividad - ultima_fecha).days

        if delta == 0:
            # Already completed an activity today
            pass
        elif delta == 1:
            # Completed yesterday, increment streak
            db_user.racha += 1
            nueva_racha = True
        elif delta > 1:
            # Streak broken
            db_user.racha = 1
            nueva_racha = True
            primer_dia = True
        else:
            # In case the activity date is older than last activity (should not happen)
            pass
    else:
        # First activity ever
        db_user.racha = 1
        nueva_racha = True
        primer_dia = True

    # Only update the timestamp if it's the current date being processed (delta >= 0)
    # Actually, we should always update it to the latest activity date
    if not db_user.ultima_actividad or (fecha_actividad - db_user.ultima_actividad.date()).days >= 0:
        db_user.ultima_actividad = datetime.combine(fecha_actividad, datetime.min.time())

    db.commit()

    return schemas.ActividadResponse(
        racha=db_user.racha,
        nueva_racha=nueva_racha,
        primer_dia=primer_dia
    )


@app.post("/pdfs/{id}/visto", dependencies=[Depends(require_init_data)])
def registrar_pdf_visto(id: int, body: schemas.PdfVistoCreate, request: Request, db: Session = Depends(get_db)):
    _require_self(request, body.id_usuario)
    existing = db.query(models.PdfVisto).filter(
        models.PdfVisto.id_usuario == body.id_usuario,
        models.PdfVisto.id_pdf == id
    ).first()
    if not existing:
        db.add(models.PdfVisto(id_usuario=body.id_usuario, id_pdf=id))
        db.commit()
    return {"ok": True}


@app.post("/infografias/{id}/vista", dependencies=[Depends(require_init_data)])
def registrar_infografia_vista(id: int, body: schemas.InfografiaVistaCreate, request: Request, db: Session = Depends(get_db)):
    _require_self(request, body.id_usuario)
    existing = db.query(models.InfografiaVista).filter(
        models.InfografiaVista.id_usuario == body.id_usuario,
        models.InfografiaVista.id_infografia == id
    ).first()
    if not existing:
        db.add(models.InfografiaVista(id_usuario=body.id_usuario, id_infografia=id))
        db.commit()
    return {"ok": True}


@app.post("/quiz/resultado", dependencies=[Depends(require_init_data)])
def guardar_quiz_resultado(body: schemas.QuizResultadoCreate, request: Request, db: Session = Depends(get_db)):
    _require_self(request, body.id_usuario)
    resultado = models.QuizResultado(
        id_usuario=body.id_usuario,
        id_unidad=body.id_unidad,
        correctas=body.correctas,
        total=body.total,
    )
    db.add(resultado)
    db.commit()
    return {"ok": True}


@app.get("/unidades/{id}/progreso")
def get_progreso_unidad(id: int, id_usuario: int, db: Session = Depends(get_db)):
    unidad = db.query(models.Unidad.id_materia).filter(models.Unidad.id == id).first()
    id_materia = unidad[0] if unidad else None

    # Flashcards — 2 queries: count total + count dominadas
    total_fc = db.query(func.count(models.Flashcard.id)).filter(models.Flashcard.id_unidad == id).scalar()
    dominadas = 0
    if total_fc > 0:
        dominadas = (
            db.query(func.count(models.CardReview.id_flashcard))
            .join(models.Flashcard, models.Flashcard.id == models.CardReview.id_flashcard)
            .filter(
                models.Flashcard.id_unidad == id,
                models.CardReview.id_usuario == id_usuario,
                models.CardReview.repeticiones > 0,
            )
            .scalar()
        )
    fc_pct = (dominadas / total_fc * 100) if total_fc > 0 else 0

    # Cuestionario — 2 queries: count total + último resultado
    total_quiz = db.query(func.count(models.QuizPregunta.id)).filter(models.QuizPregunta.id_unidad == id).scalar()
    correctas = 0
    if total_quiz > 0:
        ultimo = (
            db.query(models.QuizResultado.correctas)
            .filter(models.QuizResultado.id_usuario == id_usuario, models.QuizResultado.id_unidad == id)
            .order_by(models.QuizResultado.fecha.desc())
            .first()
        )
        if ultimo:
            correctas = ultimo[0]
    qz_pct = (correctas / total_quiz * 100) if total_quiz > 0 else 0

    # PDFs — 1 query con LEFT JOIN para obtener total + ids vistos
    total_pdfs = db.query(func.count(models.Pdf.id)).filter(models.Pdf.id_unidad == id).scalar()
    ids_pdfs_vistos = []
    if total_pdfs > 0:
        ids_pdfs_vistos = [
            r[0] for r in
            db.query(models.PdfVisto.id_pdf)
            .join(models.Pdf, models.Pdf.id == models.PdfVisto.id_pdf)
            .filter(models.Pdf.id_unidad == id, models.PdfVisto.id_usuario == id_usuario)
            .all()
        ]
    pdfs_vistos = len(ids_pdfs_vistos)
    pdf_pct = (pdfs_vistos / total_pdfs * 100) if total_pdfs > 0 else 0

    # Infografías — 1 query con JOIN para ids vistas
    total_inf = db.query(func.count(models.Infografia.id)).filter(models.Infografia.id_unidad == id).scalar()
    ids_inf_vistas = []
    if total_inf > 0:
        ids_inf_vistas = [
            r[0] for r in
            db.query(models.InfografiaVista.id_infografia)
            .join(models.Infografia, models.Infografia.id == models.InfografiaVista.id_infografia)
            .filter(models.Infografia.id_unidad == id, models.InfografiaVista.id_usuario == id_usuario)
            .all()
        ]
    inf_vistas = len(ids_inf_vistas)

    # Porcentaje total con redistribución de pesos
    components = {}
    if total_fc > 0:
        components['fc'] = (fc_pct, 0.50)
    if total_quiz > 0:
        components['qz'] = (qz_pct, 0.35)
    if total_pdfs > 0:
        components['pdf'] = (pdf_pct, 0.15)

    if components:
        total_weight = sum(w for _, w in components.values())
        porcentaje_total = sum(score * (w / total_weight) for score, w in components.values())
    else:
        porcentaje_total = 0

    return {
        "id_materia": id_materia,
        "porcentaje_total": round(porcentaje_total, 1),
        "flashcards": {"dominadas": dominadas, "total": total_fc, "porcentaje": round(fc_pct, 1)},
        "cuestionario": {"correctas": correctas, "total": total_quiz, "porcentaje": round(qz_pct, 1)},
        "pdfs": {"vistos": pdfs_vistos, "total": total_pdfs, "ids_vistos": ids_pdfs_vistos},
        "infografias": {"vistas": inf_vistas, "total": total_inf, "ids_vistas": ids_inf_vistas},
    }


@app.get("/infografias", response_model=List[schemas.InfografiaBase])
def get_infografias(id_unidad: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Infografia)
        .filter(models.Infografia.id_unidad == id_unidad)
        .order_by(models.Infografia.orden)
        .all()
    )


@app.post("/admin/infografias/upload", response_model=schemas.InfografiaBase, dependencies=[Depends(require_admin)])
@limiter.limit("20/minute")
async def upload_infografia(
    request: Request,
    file: UploadFile = File(...),
    id_unidad: int = Form(...),
    titulo: str = Form(...),
    db: Session = Depends(get_db),
):
    db_unidad = db.query(models.Unidad).filter(models.Unidad.id == id_unidad).first()
    if not db_unidad:
        raise HTTPException(status_code=404, detail="Unidad not found")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in {"jpg", "jpeg", "png", "webp"}:
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido")
    filename = f"{id_unidad}/{uuid.uuid4()}.{ext}"

    content = await file.read()
    r2 = get_r2_client()
    r2.put_object(
        Bucket=os.environ["R2_BUCKET"],
        Key=filename,
        Body=content,
        ContentType=file.content_type or "image/jpeg",
    )

    max_orden = (
        db.query(func.max(models.Infografia.orden))
        .filter(models.Infografia.id_unidad == id_unidad)
        .scalar()
    ) or 0

    infografia = models.Infografia(
        id_unidad=id_unidad,
        titulo=titulo,
        url=f"{R2_PUBLIC_URL}/{filename}",
        orden=max_orden + 1,
    )
    db.add(infografia)
    db.commit()
    db.refresh(infografia)
    return infografia


@app.get("/pdfs", response_model=List[schemas.PdfBase])
def get_pdfs(id_unidad: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Pdf)
        .filter(models.Pdf.id_unidad == id_unidad)
        .order_by(models.Pdf.orden)
        .all()
    )


@app.get("/pdfs/{id}/file")
async def proxy_pdf(id: int, db: Session = Depends(get_db)):
    """Proxy the PDF from R2 so the browser can fetch it via JS (avoids CORS issues)."""
    pdf = db.query(models.Pdf).filter(models.Pdf.id == id).first()
    if not pdf:
        raise HTTPException(status_code=404, detail="PDF not found")
    async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
        r = await client.get(pdf.url)
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail="No se pudo obtener el PDF")
    return StreamingResponse(
        iter([r.content]),
        media_type="application/pdf",
        headers={"Cache-Control": "public, max-age=3600"},
    )


@app.post("/admin/pdfs/upload", response_model=schemas.PdfBase, dependencies=[Depends(require_admin)])
@limiter.limit("20/minute")
async def upload_pdf(
    request: Request,
    file: UploadFile = File(...),
    id_unidad: int = Form(...),
    titulo: str = Form(...),
    db: Session = Depends(get_db),
):
    db_unidad = db.query(models.Unidad).filter(models.Unidad.id == id_unidad).first()
    if not db_unidad:
        raise HTTPException(status_code=404, detail="Unidad not found")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in {"pdf"}:
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido")
    filename = f"pdfs/{id_unidad}/{uuid.uuid4()}.{ext}"

    content = await file.read()
    r2 = get_r2_client()
    r2.put_object(
        Bucket=os.environ["R2_BUCKET"],
        Key=filename,
        Body=content,
        ContentType=file.content_type or "application/pdf",
    )

    max_orden = (
        db.query(func.max(models.Pdf.orden))
        .filter(models.Pdf.id_unidad == id_unidad)
        .scalar()
    ) or 0

    pdf = models.Pdf(
        id_unidad=id_unidad,
        titulo=titulo,
        url=f"{R2_PUBLIC_URL}/{filename}",
        orden=max_orden + 1,
    )
    db.add(pdf)
    db.commit()
    db.refresh(pdf)
    return pdf


@app.delete("/admin/pdfs/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
@limiter.limit("20/minute")
def delete_pdf(request: Request, id: int, db: Session = Depends(get_db)):
    pdf = db.query(models.Pdf).filter(models.Pdf.id == id).first()
    if not pdf:
        raise HTTPException(status_code=404, detail="Pdf not found")

    stored_url = pdf.url
    key = stored_url.removeprefix(f"{R2_PUBLIC_URL}/")
    bucket = os.environ["R2_BUCKET"]
    try:
        r2 = get_r2_client()
        r2.delete_object(Bucket=bucket, Key=key)
    except Exception as e:
        print(f"[R2 delete pdf] ERROR type={type(e).__name__} msg={e}")

    db.delete(pdf)
    db.commit()
    return


@app.post("/materias/{id}/seguir", response_model=schemas.SeguirResponse, dependencies=[Depends(require_init_data)])
def set_seguir_materia(id: int, body: schemas.SeguirCreate, request: Request, db: Session = Depends(get_db)):
    _require_self(request, body.id_usuario)
    logger.info(f"set_seguir_materia: materia={id} usuario={body.id_usuario} siguiendo={body.siguiendo}")
    existing = db.query(models.MateriaSeguida).filter(
        models.MateriaSeguida.id_usuario == body.id_usuario,
        models.MateriaSeguida.id_materia == id,
    ).first()

    if body.siguiendo is True:
        # Idempotent follow: ensure record exists regardless of current state
        if not existing:
            db.add(models.MateriaSeguida(id_usuario=body.id_usuario, id_materia=id))
            try:
                db.flush()
            except IntegrityError:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="user_not_registered",
                )
        siguiendo = True
    elif body.siguiendo is False:
        # Idempotent unfollow: ensure record doesn't exist
        if existing:
            db.delete(existing)
        siguiendo = False
    else:
        # Legacy toggle (None) — kept for backwards compatibility
        if existing:
            db.delete(existing)
            siguiendo = False
        else:
            db.add(models.MateriaSeguida(id_usuario=body.id_usuario, id_materia=id))
            siguiendo = True

    db.commit()
    total = db.query(models.MateriaSeguida).filter(models.MateriaSeguida.id_materia == id).count()
    return {"siguiendo": siguiendo, "total_seguidores": total}


@app.get("/materias/{id}/seguidores")
def get_seguidores_materia(id: int, db: Session = Depends(get_db)):
    total = db.query(models.MateriaSeguida).filter(models.MateriaSeguida.id_materia == id).count()
    rows = (
        db.query(models.User)
        .join(models.MateriaSeguida, models.MateriaSeguida.id_usuario == models.User.id_telegram)
        .filter(models.MateriaSeguida.id_materia == id)
        .order_by(models.MateriaSeguida.fecha.desc())
        .all()
    )
    result = []
    for u in rows:
        result.append({
            "id_telegram": u.id_telegram,
            "first_name": u.first_name if u.mostrar_nombre else "Anónimo",
            "foto_url": u.foto_url if u.mostrar_foto else None,
        })
    logger.info(f"get_seguidores_materia: materia={id} total_in_table={total} joined={len(result)}")
    return {"seguidores": result, "total_seguidores": total}


@app.get("/materias/{id}/resumen")
def get_materia_resumen(id: int, id_usuario: Optional[int] = None, db: Session = Depends(get_db)):
    from datetime import datetime, timezone
    materia = db.query(models.Materia).filter(models.Materia.id == id).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Materia not found")

    unidad_ids = [u.id for u in materia.unidades]
    total_unidades = len(unidad_ids)

    total_temas = (
        db.query(func.count(models.Tema.id))
        .filter(models.Tema.id_unidad.in_(unidad_ids))
        .scalar()
    ) if unidad_ids else 0

    total_flashcards = db.query(func.count(models.Flashcard.id)).filter(models.Flashcard.id_unidad.in_(unidad_ids)).scalar() if unidad_ids else 0

    seguidores = db.query(func.count(models.MateriaSeguida.id_materia)).filter(models.MateriaSeguida.id_materia == id).scalar()

    vencidas = 0
    progreso = 0
    if id_usuario and unidad_ids:
        now = datetime.now(timezone.utc)
        fc_ids = [r.id for r in db.query(models.Flashcard.id).filter(models.Flashcard.id_unidad.in_(unidad_ids)).all()]
        if fc_ids:
            vencidas = (
                db.query(func.count(models.CardReview.id_flashcard))
                .filter(
                    models.CardReview.id_usuario == id_usuario,
                    models.CardReview.id_flashcard.in_(fc_ids),
                    models.CardReview.due_date <= now,
                )
                .scalar()
            ) or 0

        progresos = (
            db.query(models.Progreso.porcentaje)
            .filter(models.Progreso.id_usuario == id_usuario, models.Progreso.id_materia == id)
            .all()
        )
        if progresos:
            progreso = round(sum(p.porcentaje for p in progresos) / len(progresos))

    return {
        "nombre": materia.nombre,
        "unidades": total_unidades,
        "temas": total_temas,
        "flashcards": total_flashcards,
        "vencidas": vencidas,
        "progreso": progreso,
        "seguidores": seguidores,
    }


@app.get("/usuarios/{id}/privacidad", response_model=schemas.PrivacidadOut, dependencies=[Depends(require_init_data)])
def get_privacidad(id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id_telegram == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.put("/usuarios/{id}/privacidad", response_model=schemas.PrivacidadOut, dependencies=[Depends(require_init_data)])
def update_privacidad(id: int, body: schemas.PrivacidadUpdate, request: Request, db: Session = Depends(get_db)):
    _require_self_or_admin(id, request)
    user = db.query(models.User).filter(models.User.id_telegram == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@app.post("/usuarios/{id}/onboarding", dependencies=[Depends(require_init_data)])
def complete_onboarding(id: int, body: schemas.PrivacidadUpdate, request: Request, db: Session = Depends(get_db)):
    """Mark onboarding as completed and save initial privacy settings in one call."""
    _require_self_or_admin(id, request)
    user = db.query(models.User).filter(models.User.id_telegram == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.onboarding_completado = True
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    db.commit()
    return {"ok": True}


@app.delete("/usuarios/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_init_data)])
def delete_account(id: int, request: Request, db: Session = Depends(get_db)):
    """Permanently deletes a user and all their data. Next login shows onboarding again."""
    _require_self_or_admin(id, request)
    user = db.query(models.User).filter(models.User.id_telegram == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Delete child records in dependency order
    db.query(models.Progreso).filter(models.Progreso.id_usuario == id).delete(synchronize_session=False)
    db.query(models.CardReview).filter(models.CardReview.id_usuario == id).delete(synchronize_session=False)
    db.query(models.PdfVisto).filter(models.PdfVisto.id_usuario == id).delete(synchronize_session=False)
    db.query(models.InfografiaVista).filter(models.InfografiaVista.id_usuario == id).delete(synchronize_session=False)
    db.query(models.QuizResultado).filter(models.QuizResultado.id_usuario == id).delete(synchronize_session=False)
    db.query(models.Vista).filter(models.Vista.id_usuario == id).delete(synchronize_session=False)
    db.query(models.MateriaSeguida).filter(models.MateriaSeguida.id_usuario == id).delete(synchronize_session=False)
    db.query(models.NotificacionesConfig).filter(models.NotificacionesConfig.id_usuario == id).delete(synchronize_session=False)
    db.delete(user)
    db.commit()
    logger.info(f"[delete_account] Usuario {id} eliminado permanentemente")


@app.delete("/usuarios/{id_usuario}/progreso-materia/{id_materia}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_init_data)])
def delete_progreso_materia(id_usuario: int, id_materia: int, body: schemas.DeleteProgresoBody, request: Request, db: Session = Depends(get_db)):
    """Wipes all progress of a user for every unit in the given materia."""
    _require_self_or_admin(id_usuario, request)
    unidades = db.query(models.Unidad).filter(models.Unidad.id_materia == id_materia).all()
    unidad_ids = [u.id for u in unidades]
    if not unidad_ids:
        return

    # card_reviews
    fc_ids = [r[0] for r in db.query(models.Flashcard.id).filter(models.Flashcard.id_unidad.in_(unidad_ids)).all()]
    if fc_ids:
        db.query(models.CardReview).filter(
            models.CardReview.id_usuario == id_usuario,
            models.CardReview.id_flashcard.in_(fc_ids),
        ).delete(synchronize_session=False)

    # quiz_resultado
    db.query(models.QuizResultado).filter(
        models.QuizResultado.id_usuario == id_usuario,
        models.QuizResultado.id_unidad.in_(unidad_ids),
    ).delete(synchronize_session=False)

    # pdf_visto
    pdf_ids = [r[0] for r in db.query(models.Pdf.id).filter(models.Pdf.id_unidad.in_(unidad_ids)).all()]
    if pdf_ids:
        db.query(models.PdfVisto).filter(
            models.PdfVisto.id_usuario == id_usuario,
            models.PdfVisto.id_pdf.in_(pdf_ids),
        ).delete(synchronize_session=False)

    # infografia_vista
    inf_ids = [r[0] for r in db.query(models.Infografia.id).filter(models.Infografia.id_unidad.in_(unidad_ids)).all()]
    if inf_ids:
        db.query(models.InfografiaVista).filter(
            models.InfografiaVista.id_usuario == id_usuario,
            models.InfografiaVista.id_infografia.in_(inf_ids),
        ).delete(synchronize_session=False)

    db.commit()


@app.get("/usuarios/{id}/materias-seguidas", dependencies=[Depends(require_init_data)])
def get_materias_seguidas(id: int, db: Session = Depends(get_db)):
    rows = db.query(models.MateriaSeguida.id_materia).filter(
        models.MateriaSeguida.id_usuario == id
    ).all()
    return {"materia_ids": [r[0] for r in rows]}


@app.get("/usuarios/{id}/perfil", response_model=schemas.UserPerfil)
def get_user_perfil(id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id_telegram == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    seguidas = (
        db.query(models.Materia)
        .options(joinedload(models.Materia.unidades))
        .join(models.MateriaSeguida, models.MateriaSeguida.id_materia == models.Materia.id)
        .filter(models.MateriaSeguida.id_usuario == id)
        .order_by(models.MateriaSeguida.fecha.desc())
        .all()
    )
    # Collect all unit IDs across all followed materias for batch query
    all_unidad_ids = [u.id for m in seguidas for u in m.unidades]
    progreso_map = _compute_progreso_batch(all_unidad_ids, id, db) if all_unidad_ids else {}

    materias_cursando = []
    materias_completadas = []
    for materia in seguidas:
        unidades = sorted(materia.unidades, key=lambda u: (u.orden is None, u.orden))
        if unidades:
            pct = sum(progreso_map.get(u.id, 0.0) for u in unidades) / len(unidades)
        else:
            pct = 0.0
        item = {
            "id": materia.id, "nombre": materia.nombre,
            "emoji": materia.emoji, "color": materia.color,
            "porcentaje": round(pct, 1) if user.mostrar_progreso else 0,
        }
        if unidades and round(pct, 1) >= 100.0:
            materias_completadas.append(item)
        else:
            materias_cursando.append(item)
    return {
        "id_telegram": user.id_telegram,
        "first_name": user.first_name if user.mostrar_nombre else "Anónimo",
        "last_name": user.last_name if user.mostrar_nombre else None,
        "foto_url": user.foto_url if user.mostrar_foto else None,
        "descripcion": user.descripcion,
        "racha": user.racha or 0,
        "materias_cursando": materias_cursando if user.mostrar_cursos else [],
        "materias_completadas": materias_completadas if user.mostrar_cursos else [],
        "wallet_address": user.wallet_address,
        "nft_activo_address": user.nft_activo_address,
        "mostrar_nft": user.mostrar_nft if user.mostrar_nft is not None else False,
    }


@app.post("/unidades/{id}/vista", dependencies=[Depends(require_init_data)])
@limiter.limit("60/minute")
def registrar_vista(request: Request, id: int, body: schemas.VistaCreate, db: Session = Depends(get_db)):
    _require_self(request, body.id_usuario)
    cooldown = datetime.now(timezone.utc) - timedelta(minutes=30)
    existing = db.query(models.Vista).filter(
        models.Vista.id_usuario == body.id_usuario,
        models.Vista.id_unidad == id,
        models.Vista.fecha >= cooldown,
    ).first()
    if not existing:
        db.add(models.Vista(id_usuario=body.id_usuario, id_unidad=id))
        db.commit()
    return {"ok": True}


@app.get("/unidades/{id}/vistas")
def get_vistas_unidad(id: int, db: Session = Depends(get_db)):
    total = db.query(models.Vista).filter(models.Vista.id_unidad == id).count()
    return {"total": total}


@app.get("/materias/{id}/vistas")
def get_vistas_materia(id: int, db: Session = Depends(get_db)):
    total = (
        db.query(models.Vista)
        .join(models.Unidad, models.Vista.id_unidad == models.Unidad.id)
        .filter(models.Unidad.id_materia == id)
        .count()
    )
    return {"total": total}


def _compute_progreso_batch(unidad_ids: list[int], id_usuario: int, db: Session) -> dict[int, float]:
    """Computes porcentaje_total for multiple units in batch (few queries total)."""
    if not unidad_ids:
        return {}

    # Flashcards: total per unit
    fc_totals = dict(
        db.query(models.Flashcard.id_unidad, func.count(models.Flashcard.id))
        .filter(models.Flashcard.id_unidad.in_(unidad_ids))
        .group_by(models.Flashcard.id_unidad)
        .all()
    )
    # Flashcards: dominadas per unit
    fc_dominadas = dict(
        db.query(models.Flashcard.id_unidad, func.count(models.CardReview.id_flashcard))
        .join(models.CardReview, models.CardReview.id_flashcard == models.Flashcard.id)
        .filter(
            models.Flashcard.id_unidad.in_(unidad_ids),
            models.CardReview.id_usuario == id_usuario,
            models.CardReview.repeticiones > 0,
        )
        .group_by(models.Flashcard.id_unidad)
        .all()
    )

    # Quiz: total preguntas per unit
    qz_totals = dict(
        db.query(models.QuizPregunta.id_unidad, func.count(models.QuizPregunta.id))
        .filter(models.QuizPregunta.id_unidad.in_(unidad_ids))
        .group_by(models.QuizPregunta.id_unidad)
        .all()
    )
    # Quiz: último resultado per unit (use window function via subquery)
    latest_quiz_sub = (
        db.query(
            models.QuizResultado.id_unidad,
            models.QuizResultado.correctas,
            func.row_number().over(
                partition_by=models.QuizResultado.id_unidad,
                order_by=desc(models.QuizResultado.fecha),
            ).label("rn"),
        )
        .filter(
            models.QuizResultado.id_usuario == id_usuario,
            models.QuizResultado.id_unidad.in_(unidad_ids),
        )
        .subquery()
    )
    qz_correctas = dict(
        db.query(latest_quiz_sub.c.id_unidad, latest_quiz_sub.c.correctas)
        .filter(latest_quiz_sub.c.rn == 1)
        .all()
    )

    # PDFs: total per unit
    pdf_totals = dict(
        db.query(models.Pdf.id_unidad, func.count(models.Pdf.id))
        .filter(models.Pdf.id_unidad.in_(unidad_ids))
        .group_by(models.Pdf.id_unidad)
        .all()
    )
    # PDFs: vistos per unit
    pdf_vistos = dict(
        db.query(models.Pdf.id_unidad, func.count(models.PdfVisto.id_pdf))
        .join(models.PdfVisto, models.PdfVisto.id_pdf == models.Pdf.id)
        .filter(
            models.Pdf.id_unidad.in_(unidad_ids),
            models.PdfVisto.id_usuario == id_usuario,
        )
        .group_by(models.Pdf.id_unidad)
        .all()
    )

    # Compute percentages
    result = {}
    for uid in unidad_ids:
        total_fc = fc_totals.get(uid, 0)
        dom = fc_dominadas.get(uid, 0)
        fc_pct = (dom / total_fc * 100) if total_fc > 0 else 0

        total_qz = qz_totals.get(uid, 0)
        corr = qz_correctas.get(uid, 0)
        qz_pct = (corr / total_qz * 100) if total_qz > 0 else 0

        total_pdf = pdf_totals.get(uid, 0)
        vis = pdf_vistos.get(uid, 0)
        pdf_pct = (vis / total_pdf * 100) if total_pdf > 0 else 0

        components = {}
        if total_fc > 0: components['fc'] = (fc_pct, 0.50)
        if total_qz > 0: components['qz'] = (qz_pct, 0.35)
        if total_pdf > 0: components['pdf'] = (pdf_pct, 0.15)
        if not components:
            result[uid] = 0.0
            continue
        total_weight = sum(w for _, w in components.values())
        result[uid] = sum(score * (w / total_weight) for score, w in components.values())

    return result


def _compute_progreso_unidad(id_unidad: int, id_usuario: int, db: Session) -> float:
    """Computes porcentaje_total for a single unit. Delegates to batch."""
    return _compute_progreso_batch([id_unidad], id_usuario, db).get(id_unidad, 0.0)


@app.get("/usuarios/{id}/stats")
def get_user_stats(id: int, db: Session = Depends(get_db)):
    # 1. Flashcards dominadas
    flashcards_dominadas = db.query(models.CardReview).filter(
        models.CardReview.id_usuario == id,
        models.CardReview.repeticiones > 0,
    ).count()

    # 2. Cuestionarios completados
    cuestionarios_completados = db.query(models.QuizResultado).filter(
        models.QuizResultado.id_usuario == id,
    ).count()

    # 3. Progreso general & foco del día (unit with lowest pct excluding 100%)
    materias = (
        db.query(models.Materia)
        .options(joinedload(models.Materia.unidades))
        .order_by(models.Materia.orden)
        .all()
    )
    all_unidad_ids = [u.id for m in materias for u in m.unidades]
    progreso_map = _compute_progreso_batch(all_unidad_ids, id, db) if all_unidad_ids else {}

    all_pcts = []
    foco = None
    foco_pct = 101.0
    for materia in materias:
        unidades_sorted = sorted(materia.unidades, key=lambda u: (u.orden is None, u.orden))
        for unidad in unidades_sorted:
            pct = progreso_map.get(unidad.id, 0.0)
            all_pcts.append(pct)
            if pct < 100.0 and pct < foco_pct:
                foco_pct = pct
                foco = {
                    "materia_id": materia.id,
                    "materia_nombre": materia.nombre,
                    "unidad_id": unidad.id,
                    "unidad_nombre": unidad.nombre,
                    "porcentaje": round(pct, 1),
                }
    progreso_general = round(sum(all_pcts) / len(all_pcts), 1) if all_pcts else 0.0

    # 4. Materias activas — at least 1 action in any unit of the materia
    active_unidad_ids: set[int] = set()

    fc_ids = [r[0] for r in db.query(models.CardReview.id_flashcard).filter(
        models.CardReview.id_usuario == id).all()]
    if fc_ids:
        rows = db.query(models.Flashcard.id_unidad).filter(models.Flashcard.id.in_(fc_ids)).distinct().all()
        active_unidad_ids.update(r[0] for r in rows)

    rows = db.query(models.QuizResultado.id_unidad).filter(
        models.QuizResultado.id_usuario == id).distinct().all()
    active_unidad_ids.update(r[0] for r in rows)

    rows = db.query(models.Pdf.id_unidad).join(
        models.PdfVisto, (models.PdfVisto.id_pdf == models.Pdf.id) & (models.PdfVisto.id_usuario == id)
    ).distinct().all()
    active_unidad_ids.update(r[0] for r in rows)

    rows = db.query(models.Infografia.id_unidad).join(
        models.InfografiaVista,
        (models.InfografiaVista.id_infografia == models.Infografia.id) & (models.InfografiaVista.id_usuario == id),
    ).distinct().all()
    active_unidad_ids.update(r[0] for r in rows)

    materias_activas = 0
    if active_unidad_ids:
        materias_activas = db.query(models.Unidad.id_materia).filter(
            models.Unidad.id.in_(active_unidad_ids)
        ).distinct().count()

    return {
        "flashcards_dominadas": flashcards_dominadas,
        "cuestionarios_completados": cuestionarios_completados,
        "progreso_general": progreso_general,
        "materias_activas": materias_activas,
        "foco": foco,
    }


@app.get("/usuarios/{id}/actividad-reciente")
def get_actividad_reciente(id: int, limit: int = 10, db: Session = Depends(get_db)):
    limit = min(limit, 50)  # máximo 50
    now = datetime.now(timezone.utc)

    def _hace(dt):
        if dt is None:
            return ""
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        secs = int((now - dt).total_seconds())
        if secs < 3600:
            return f"hace {max(1, secs // 60)} min"
        if secs < 86400:
            h = secs // 3600
            return f"hace {h} {'hora' if h == 1 else 'horas'}"
        if secs < 172800:
            return "ayer"
        return f"hace {secs // 86400} días"

    events = []

    # Traemos `limit` registros de cada tipo y al final ordenamos y recortamos
    _sub = limit

    # Quiz resultados
    quizzes = (
        db.query(
            models.QuizResultado,
            models.Unidad.nombre.label("u_nombre"),
            models.Unidad.id.label("u_id"),
            models.Unidad.id_materia.label("m_id"),
        )
        .join(models.Unidad, models.QuizResultado.id_unidad == models.Unidad.id)
        .filter(models.QuizResultado.id_usuario == id)
        .order_by(models.QuizResultado.fecha.desc())
        .limit(_sub)
        .all()
    )
    for q, u_nombre, u_id, m_id in quizzes:
        events.append({
            "tipo": "quiz",
            "titulo": "Cuestionario completado",
            "detalle": f"{q.correctas}/{q.total} correctas · {u_nombre}",
            "ts": q.fecha,
            "unidad_id": u_id,
            "materia_id": m_id,
        })

    # PDFs vistos
    pdfs_v = (
        db.query(
            models.PdfVisto,
            models.Pdf.titulo.label("pdf_titulo"),
            models.Unidad.id.label("u_id"),
            models.Unidad.id_materia.label("m_id"),
        )
        .join(models.Pdf, models.PdfVisto.id_pdf == models.Pdf.id)
        .join(models.Unidad, models.Pdf.id_unidad == models.Unidad.id)
        .filter(models.PdfVisto.id_usuario == id)
        .order_by(models.PdfVisto.visto_at.desc())
        .limit(_sub)
        .all()
    )
    for pv, titulo, u_id, m_id in pdfs_v:
        events.append({
            "tipo": "pdf",
            "titulo": "PDF visto",
            "detalle": titulo,
            "ts": pv.visto_at,
            "unidad_id": u_id,
            "materia_id": m_id,
        })

    # Infografías vistas
    infs_v = (
        db.query(
            models.InfografiaVista,
            models.Infografia.titulo.label("inf_titulo"),
            models.Unidad.id.label("u_id"),
            models.Unidad.id_materia.label("m_id"),
        )
        .join(models.Infografia, models.InfografiaVista.id_infografia == models.Infografia.id)
        .join(models.Unidad, models.Infografia.id_unidad == models.Unidad.id)
        .filter(models.InfografiaVista.id_usuario == id)
        .order_by(models.InfografiaVista.visto_at.desc())
        .limit(_sub)
        .all()
    )
    for iv, titulo, u_id, m_id in infs_v:
        events.append({
            "tipo": "infografia",
            "titulo": "Infografía vista",
            "detalle": titulo,
            "ts": iv.visto_at,
            "unidad_id": u_id,
            "materia_id": m_id,
        })

    # Flashcards: group reviews by calendar date
    reviews_by_day = (
        db.query(
            func.date(models.CardReview.last_reviewed).label("review_date"),
            func.count(models.CardReview.id_flashcard).label("cnt"),
            func.max(models.CardReview.last_reviewed).label("last_ts"),
        )
        .filter(models.CardReview.id_usuario == id)
        .group_by(func.date(models.CardReview.last_reviewed))
        .order_by(func.date(models.CardReview.last_reviewed).desc())
        .limit(_sub)
        .all()
    )
    for row in reviews_by_day:
        events.append({
            "tipo": "flashcard",
            "titulo": "Flashcards repasadas",
            "detalle": f"{row.cnt} tarjetas",
            "ts": row.last_ts,
        })

    # Sort by timestamp desc, take top `limit`, add "hace"
    def sort_key(e):
        ts = e["ts"]
        if ts is None:
            return datetime.min.replace(tzinfo=timezone.utc)
        return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)

    events.sort(key=sort_key, reverse=True)
    return [
        {
            "tipo": e["tipo"],
            "titulo": e["titulo"],
            "detalle": e["detalle"],
            "hace": _hace(e["ts"]),
            "materia_id": e.get("materia_id"),
            "unidad_id": e.get("unidad_id"),
        }
        for e in events[:limit]
    ]


@app.get("/usuarios/{id}/mascota-hint")
def get_mascota_hint(id: int, db: Session = Depends(get_db)):
    """Returns the most relevant study hint for the mascot: most overdue flashcard or lowest-progress unidad."""
    now = datetime.now(timezone.utc)

    # Most overdue flashcard (earliest due_date <= now)
    row = (
        db.query(
            models.Materia.id.label("materia_id"),
            models.Materia.nombre.label("materia_nombre"),
            models.Unidad.id.label("unidad_id"),
            models.Unidad.nombre.label("unidad_nombre"),
            models.CardReview.due_date,
        )
        .join(models.Flashcard, models.CardReview.id_flashcard == models.Flashcard.id)
        .join(models.Unidad, models.Flashcard.id_unidad == models.Unidad.id)
        .join(models.Materia, models.Unidad.id_materia == models.Materia.id)
        .filter(models.CardReview.id_usuario == id, models.CardReview.due_date <= now)
        .order_by(models.CardReview.due_date.asc())
        .first()
    )

    if row:
        total_due = (
            db.query(func.count(models.CardReview.id_flashcard))
            .filter(models.CardReview.id_usuario == id, models.CardReview.due_date <= now)
            .scalar()
        )
        return {
            "flashcards_due": total_due,
            "materia_id": row.materia_id,
            "unidad_id": row.unidad_id,
            "materia_nombre": row.materia_nombre,
            "unidad_nombre": row.unidad_nombre,
        }

    # No due flashcards — fall back to lowest-progress unidad
    seguidas = db.query(models.MateriaSeguida.id_materia).filter(
        models.MateriaSeguida.id_usuario == id
    ).all()
    if not seguidas:
        return {"flashcards_due": 0, "materia_id": None, "unidad_id": None, "materia_nombre": None, "unidad_nombre": None}

    materia_ids = [s.id_materia for s in seguidas]
    unidades = (
        db.query(models.Unidad, models.Materia)
        .join(models.Materia, models.Unidad.id_materia == models.Materia.id)
        .filter(models.Materia.id.in_(materia_ids))
        .all()
    )
    if not unidades:
        return {"flashcards_due": 0, "materia_id": None, "unidad_id": None, "materia_nombre": None, "unidad_nombre": None}

    unidad_ids = [u.id for u, _ in unidades]
    progresos = (
        db.query(models.Progreso.id_unidad, models.Progreso.porcentaje)
        .filter(models.Progreso.id_usuario == id, models.Progreso.id_unidad.in_(unidad_ids))
        .all()
    )
    progreso_map = {p.id_unidad: p.porcentaje for p in progresos}
    lowest_unidad, lowest_materia = min(unidades, key=lambda x: progreso_map.get(x[0].id, 0))
    return {
        "flashcards_due": 0,
        "materia_id": lowest_materia.id,
        "unidad_id": lowest_unidad.id,
        "materia_nombre": lowest_materia.nombre,
        "unidad_nombre": lowest_unidad.nombre,
    }


@app.post("/mascota/chat")
async def mascota_chat(body: schemas.MascotaChatRequest, db: Session = Depends(get_db)):
    """Generate a context-aware mascota message using the configured LLM provider.
    No auth required — non-destructive read-only endpoint, userId in body suffices."""
    try:
        # Quota check
        if body.user_id:
            allowed, reason = check_quota(body.user_id, db)
            if not allowed:
                msg = "Hoy ya charlamos bastante! Seguí con flashcards y quiz, nos vemos mañana 🐾" if reason == "daily_limit" else "Estuve muy activo este mes. Seguí estudiando por tu cuenta, ya te voy a volver a ayudar pronto!"
                return {"mensaje": msg, "accion": None}
        result = await get_mascota_message(body.user_id, body.accion, body.datos, body.pantalla, db)
        logger.info(
            "[mascota/chat] OK — accion=%s pantalla=%s msg=%s decision=%s",
            body.accion, body.pantalla,
            (result.get("mensaje") or "")[:50],
            result.get("accion"),
        )
        return result
    except Exception as e:
        logger.error("[mascota/chat] FAIL — accion=%s error=%s", body.accion, e)
        return {"mensaje": None, "accion": None}


@app.post("/tutor/chat", dependencies=[Depends(require_init_data)])
async def tutor_chat(body: schemas.TutorChatRequest, db: Session = Depends(get_db)):
    """Multi-turn tutor chat with Redo, scoped to a specific unidad."""
    try:
        # Quota check
        allowed, reason = check_quota(body.user_id, db)
        if not allowed:
            return {"respuesta": "Hoy ya tuvimos bastante charla! Seguí repasando con flashcards y quiz, mañana seguimos 🐾"}
        history = [{"role": m.role, "content": m.content} for m in body.messages]
        respuesta = await tutor_respond(
            body.user_id, body.unidad_id, history, body.question, db
        )
        logger.info("[tutor/chat] OK — user=%s unidad=%s", body.user_id, body.unidad_id)
        return {"respuesta": respuesta}
    except Exception as e:
        logger.error("[tutor/chat] FAIL — user=%s error=%s", body.user_id, e)
        return {"respuesta": "Perdón, no pude procesar tu pregunta. Intentá de nuevo."}


@app.post("/tutor/accion")
async def tutor_accion(body: schemas.TutorAccionRequest, db: Session = Depends(get_db)):
    """Single focused study action — no history, minimal tokens (~150-280/call)."""
    try:
        # Quota check
        if body.user_id:
            allowed, reason = check_quota(body.user_id, db)
            if not allowed:
                return {"respuesta": "Hoy ya usamos bastante la IA. Seguí con flashcards y quiz!"}
        if not body.unidad_id:
            return {"respuesta": "Para usar esta acción, entrá a una unidad primero."}
        if body.accion == "concepto_clave":
            resp = await accion_concepto_clave(body.unidad_id, db, user_id=body.user_id)
        elif body.accion == "punto_debil":
            resp = await accion_punto_debil(body.user_id, body.unidad_id, db)
        elif body.accion == "practica":
            resp = await accion_practica(body.unidad_id, db, user_id=body.user_id)
        elif body.accion == "explicar_tema":
            if not body.tema_nombre:
                raise HTTPException(status_code=400, detail="tema_nombre required")
            resp = await accion_explicar_tema(body.unidad_id, body.tema_nombre, db, user_id=body.user_id)
        elif body.accion == "elemento":
            if not body.tema_nombre:
                raise HTTPException(status_code=400, detail="tema_nombre (symbol) required")
            resp = await accion_elemento(body.tema_nombre, db=db, user_id=body.user_id)
        else:
            raise HTTPException(status_code=400, detail=f"Acción desconocida: {body.accion}")
        logger.info("[tutor/accion] %s OK — user=%s unidad=%s", body.accion, body.user_id, body.unidad_id)
        return {"respuesta": resp}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[tutor/accion] FAIL — %s user=%s error=%s", body.accion, body.user_id, e)
        return {"respuesta": "Perdón, no pude procesar la acción. Intentá de nuevo."}


@app.get("/unidades/{id}/temas")
def get_unidad_temas(id: int, db: Session = Depends(get_db)):
    """Lightweight temas list + unidad/materia names (used by TutorChat)."""
    unidad = db.query(models.Unidad).filter(models.Unidad.id == id).first()
    if not unidad:
        raise HTTPException(status_code=404, detail="Unidad not found")
    materia = db.query(models.Materia).filter(models.Materia.id == unidad.id_materia).first()
    temas = db.query(models.Tema).filter(models.Tema.id_unidad == id).all()
    return {
        "unidad_nombre": unidad.nombre,
        "materia_nombre": materia.nombre if materia else "",
        "temas": [{"id": t.id, "nombre": t.nombre} for t in temas],
    }


@app.post("/ai/generate/flashcards", dependencies=[Depends(require_init_data)])
async def ai_generate_flashcards(body: schemas.AIGenerateRequest, db: Session = Depends(get_db)):
    """Generate flashcards for a unidad using AI."""
    try:
        cards = await generate_flashcards(body.unidad_id, min(body.count, 15), db)
        return {"generated": cards, "count": len(cards)}
    except Exception as e:
        logger.error("[ai-gen] flashcards FAIL: %s", e)
        raise HTTPException(status_code=500, detail="Error generating flashcards")


@app.post("/ai/generate/quiz", dependencies=[Depends(require_init_data)])
async def ai_generate_quiz(body: schemas.AIGenerateRequest, db: Session = Depends(get_db)):
    """Generate quiz questions for a unidad using AI."""
    try:
        questions = await generate_quiz(body.unidad_id, min(body.count, 10), db)
        return {"generated": questions, "count": len(questions)}
    except Exception as e:
        logger.error("[ai-gen] quiz FAIL: %s", e)
        raise HTTPException(status_code=500, detail="Error generating quiz")


def _notif_defaults() -> dict:
    return {"racha_activa": True, "recordatorio_activo": True, "flashcards_activa": True, "hora_recordatorio": "08:00"}


def _notif_to_dict(cfg: models.NotificacionesConfig) -> dict:
    return {
        "racha_activa": cfg.racha_activa,
        "recordatorio_activo": cfg.recordatorio_activo,
        "flashcards_activa": cfg.flashcards_activa,
        "hora_recordatorio": f"{cfg.hora_recordatorio.hour:02d}:{cfg.hora_recordatorio.minute:02d}",
    }


@app.get("/usuarios/{id}/notificaciones", dependencies=[Depends(require_init_data)])
def get_notificaciones(id: int, db: Session = Depends(get_db)):
    cfg = db.query(models.NotificacionesConfig).filter(models.NotificacionesConfig.id_usuario == id).first()
    if not cfg:
        return _notif_defaults()
    return _notif_to_dict(cfg)


@app.patch("/usuarios/{id}/notificaciones", dependencies=[Depends(require_init_data)])
def update_notificaciones(id: int, body: schemas.NotificacionesConfigUpdate, db: Session = Depends(get_db)):
    cfg = db.query(models.NotificacionesConfig).filter(models.NotificacionesConfig.id_usuario == id).first()
    if not cfg:
        cfg = models.NotificacionesConfig(
            id_usuario=id,
            hora_recordatorio=time_obj(8, 0),
        )
        db.add(cfg)
    if body.racha_activa is not None:
        cfg.racha_activa = body.racha_activa
    if body.recordatorio_activo is not None:
        cfg.recordatorio_activo = body.recordatorio_activo
    if body.flashcards_activa is not None:
        cfg.flashcards_activa = body.flashcards_activa
    if body.hora_recordatorio is not None:
        h, m = body.hora_recordatorio.split(":")
        cfg.hora_recordatorio = time_obj(int(h), int(m))
    db.commit()
    db.refresh(cfg)
    return _notif_to_dict(cfg)


@app.post("/usuarios/{id}/notificaciones/test", dependencies=[Depends(require_init_data)])
async def test_notificacion(id: int, request: Request, db: Session = Depends(get_db)):
    _require_self_or_admin(id, request)
    user = db.query(models.User).filter(models.User.id_telegram == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await _send_telegram_notification(
        id,
        f"✅ DaathApp puede enviarte notificaciones. ¡Todo funciona, {user.first_name}! 🎉",
    )
    return {"ok": True}


@app.delete("/admin/infografias/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
@limiter.limit("20/minute")
def delete_infografia(request: Request, id: int, db: Session = Depends(get_db)):
    infografia = db.query(models.Infografia).filter(models.Infografia.id == id).first()
    if not infografia:
        raise HTTPException(status_code=404, detail="Infografia not found")

    # Extract R2 key from public URL: everything after the domain
    stored_url = infografia.url
    key = stored_url.removeprefix(f"{R2_PUBLIC_URL}/")
    bucket = os.environ["R2_BUCKET"]
    print(f"[R2 delete] stored_url='{stored_url}'")
    print(f"[R2 delete] R2_PUBLIC_URL='{R2_PUBLIC_URL}'")
    print(f"[R2 delete] extracted key='{key}'")
    print(f"[R2 delete] bucket='{bucket}'")
    try:
        r2 = get_r2_client()
        response = r2.delete_object(Bucket=bucket, Key=key)
        print(f"[R2 delete] response={response}")
    except Exception as e:
        print(f"[R2 delete] ERROR type={type(e).__name__} msg={e}")

    db.delete(infografia)
    db.commit()
    return


# ── Zona Libre ────────────────────────────────────────────────────────────────

ZL_MAX_TOTAL = 300 * 1024 * 1024   # 300 MB global cap
ZL_MAX_FILE  =  50 * 1024 * 1024   # 50 MB per file


@app.get("/zona-libre/archivos", dependencies=[Depends(require_init_data)])
@limiter.limit("30/minute")
def zona_libre_list(request: Request, db: Session = Depends(get_db)):
    archivos = (
        db.query(models.ZonaLibreArchivo)
        .filter(models.ZonaLibreArchivo.activo == True)
        .order_by(models.ZonaLibreArchivo.fecha.desc())
        .limit(100)
        .all()
    )
    total_bytes = (
        db.query(func.coalesce(func.sum(models.ZonaLibreArchivo.tamanio), 0))
        .filter(models.ZonaLibreArchivo.activo == True)
        .scalar()
    )
    result = []
    for a in archivos:
        user = db.query(models.User).filter(models.User.id_telegram == a.user_id).first()
        result.append({
            "id": a.id,
            "bag_id": a.bag_id,
            "nombre": a.nombre,
            "tamanio": a.tamanio,
            "descripcion": a.descripcion,
            "fecha": a.fecha.isoformat() if a.fecha else None,
            "username": user.username if user else None,
        })
    return {"archivos": result, "total_bytes": total_bytes, "max_bytes": ZL_MAX_TOTAL}


@app.post("/zona-libre/upload", dependencies=[Depends(require_init_data)])
@limiter.limit("5/minute")
async def zona_libre_upload(
    request: Request,
    archivo: UploadFile = File(...),
    user_id: int = Form(...),
    descripcion: str = Form(default=""),
    db: Session = Depends(get_db),
):
    _require_self(request, user_id)
    user = db.query(models.User).filter(models.User.id_telegram == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Read file
    file_bytes = await archivo.read()
    if len(file_bytes) > ZL_MAX_FILE:
        raise HTTPException(status_code=413, detail="Archivo demasiado grande (máx 50MB)")

    # Check global capacity
    total_used = (
        db.query(func.coalesce(func.sum(models.ZonaLibreArchivo.tamanio), 0))
        .filter(models.ZonaLibreArchivo.activo == True)
        .scalar()
    )
    if total_used + len(file_bytes) > ZL_MAX_TOTAL:
        raise HTTPException(status_code=400, detail="La Zona Libre alcanzó su capacidad máxima por ahora. Volvé pronto.")

    filename = archivo.filename or "archivo"

    # Upload to TON Storage, fallback to R2
    bag_id = None
    storage_type = "ton"
    try:
        bag_id = await upload_to_ton(file_bytes, filename)
    except Exception as e:
        logger.warning("[zona-libre] TON upload failed, falling back to R2: %s", e)
        try:
            import uuid
            r2_key = f"zona-libre/{uuid.uuid4().hex[:12]}_{filename}"
            r2 = get_r2_client()
            r2.put_object(
                Bucket=os.environ["R2_BUCKET"],
                Key=r2_key,
                Body=file_bytes,
                ContentType=archivo.content_type or "application/octet-stream",
            )
            bag_id = f"r2://{r2_key}"
            storage_type = "r2"
            logger.info("[zona-libre] R2 fallback upload OK: %s", r2_key)
        except Exception as e2:
            logger.error("[zona-libre] R2 fallback also failed: %s", e2)
            raise HTTPException(status_code=502, detail="No se pudo subir el archivo. Intentá de nuevo más tarde.")

    # Save to DB
    nuevo = models.ZonaLibreArchivo(
        bag_id=bag_id,
        nombre=filename,
        tamanio=len(file_bytes),
        descripcion=descripcion or None,
        user_id=user_id,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    if bag_id.startswith("r2://"):
        r2_key = bag_id[5:]
        url_descarga = f"{R2_PUBLIC_URL}/{r2_key}"
    else:
        url_descarga = f"/zona-libre/archivo/{bag_id}"

    return {
        "bag_id": bag_id,
        "nombre": filename,
        "tamanio": len(file_bytes),
        "url_descarga": url_descarga,
        "subido_por": {"user_id": user_id, "username": user.username},
    }


@app.get("/zona-libre/archivo/{bag_id}")
@limiter.limit("30/minute")
async def zona_libre_download(request: Request, bag_id: str, db: Session = Depends(get_db)):
    archivo = (
        db.query(models.ZonaLibreArchivo)
        .filter(models.ZonaLibreArchivo.bag_id == bag_id, models.ZonaLibreArchivo.activo == True)
        .first()
    )
    if not archivo:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    if bag_id.startswith("r2://"):
        r2_key = bag_id[5:]
        url = f"{R2_PUBLIC_URL}/{r2_key}"
        return RedirectResponse(url=url)
    else:
        file_path = get_local_file_path(bag_id)
        if not file_path:
            raise HTTPException(status_code=404, detail="Archivo no disponible localmente")
        return FileResponse(file_path, filename=archivo.nombre)


@app.post("/zona-libre/reportar", dependencies=[Depends(require_init_data)])
@limiter.limit("10/minute")
def zona_libre_report(request: Request, body: dict, db: Session = Depends(get_db)):
    archivo_id = body.get("archivo_id")
    user_id = body.get("user_id")
    motivo = body.get("motivo", "otro")

    if not archivo_id or not user_id:
        raise HTTPException(status_code=400, detail="archivo_id y user_id requeridos")
    _require_self(request, int(user_id))

    archivo = db.query(models.ZonaLibreArchivo).filter(models.ZonaLibreArchivo.id == archivo_id).first()
    if not archivo:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    # Check duplicate report
    existing = (
        db.query(models.ZonaLibreReporte)
        .filter(
            models.ZonaLibreReporte.archivo_id == archivo_id,
            models.ZonaLibreReporte.user_id == user_id,
        )
        .first()
    )
    if existing:
        return {"ok": True, "msg": "Ya reportaste este archivo"}

    reporte = models.ZonaLibreReporte(
        archivo_id=archivo_id,
        user_id=user_id,
        motivo=motivo,
    )
    db.add(reporte)
    db.commit()

    # Auto-hide if 3+ reports
    count = db.query(models.ZonaLibreReporte).filter(models.ZonaLibreReporte.archivo_id == archivo_id).count()
    if count >= 3:
        archivo.activo = False
        db.commit()
        logger.info("[zona-libre] archivo %d oculto por %d reportes", archivo_id, count)

    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════════════════
# TABLA PERIÓDICA
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/elementos/{symbol}")
def get_element(symbol: str):
    """Look up a single element by symbol or name."""
    el = lookup_element(symbol)
    if not el:
        raise HTTPException(status_code=404, detail="Elemento no encontrado")
    return el


@app.get("/elementos")
def search_elements_endpoint(q: str = ""):
    """Search elements by name, symbol, category, or mining application."""
    if not q or len(q) < 1:
        raise HTTPException(status_code=400, detail="Parámetro 'q' requerido")
    return search_elements(q)


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN AI ANALYTICS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/admin/ai/summary", dependencies=[Depends(require_admin)])
def admin_ai_summary(db: Session = Depends(get_db)):
    """Totals for today, this week, this month, and all-time."""
    from datetime import datetime, timedelta, timezone as tz
    now = datetime.now(tz.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    def _stats(since=None):
        q = db.query(
            func.count(models.AICallLog.id).label("calls"),
            func.coalesce(func.sum(models.AICallLog.tokens_in), 0).label("tokens_in"),
            func.coalesce(func.sum(models.AICallLog.tokens_out), 0).label("tokens_out"),
            func.coalesce(func.sum(models.AICallLog.tokens_cached), 0).label("tokens_cached"),
            func.coalesce(func.sum(models.AICallLog.costo_usd), 0).label("costo"),
            func.coalesce(func.avg(models.AICallLog.latencia_ms), 0).label("latencia_avg"),
        )
        if since:
            q = q.filter(models.AICallLog.created_at >= since)
        row = q.first()
        return {
            "calls": row.calls,
            "tokens_in": int(row.tokens_in),
            "tokens_out": int(row.tokens_out),
            "tokens_cached": int(row.tokens_cached),
            "costo_usd": round(float(row.costo), 6),
            "latencia_avg_ms": round(float(row.latencia_avg)),
        }

    cache_hits = db.query(func.count(models.AICallLog.id)).filter(
        models.AICallLog.cache_hit == True, models.AICallLog.created_at >= today
    ).scalar()

    return {
        "today": _stats(today),
        "week": _stats(week_ago),
        "month": _stats(month_ago),
        "total": _stats(),
        "cache_hits_today": cache_hits,
    }


@app.get("/admin/ai/by-module", dependencies=[Depends(require_admin)])
def admin_ai_by_module(days: int = 7, db: Session = Depends(get_db)):
    """Breakdown by module for last N days."""
    from datetime import datetime, timedelta, timezone as tz
    since = datetime.now(tz.utc) - timedelta(days=days)
    rows = (
        db.query(
            models.AICallLog.modulo,
            func.count(models.AICallLog.id).label("calls"),
            func.coalesce(func.sum(models.AICallLog.tokens_in + models.AICallLog.tokens_out), 0).label("tokens"),
            func.coalesce(func.sum(models.AICallLog.costo_usd), 0).label("costo"),
            func.coalesce(func.avg(models.AICallLog.latencia_ms), 0).label("latencia_avg"),
        )
        .filter(models.AICallLog.created_at >= since)
        .group_by(models.AICallLog.modulo)
        .order_by(desc(func.sum(models.AICallLog.costo_usd)))
        .all()
    )
    return [
        {
            "modulo": r.modulo,
            "calls": r.calls,
            "tokens": int(r.tokens),
            "costo_usd": round(float(r.costo), 6),
            "latencia_avg_ms": round(float(r.latencia_avg)),
        }
        for r in rows
    ]


@app.get("/admin/ai/by-user", dependencies=[Depends(require_admin)])
def admin_ai_by_user(days: int = 7, db: Session = Depends(get_db)):
    """Top 20 users by cost in last N days."""
    from datetime import datetime, timedelta, timezone as tz
    since = datetime.now(tz.utc) - timedelta(days=days)
    rows = (
        db.query(
            models.AICallLog.id_usuario,
            func.count(models.AICallLog.id).label("calls"),
            func.coalesce(func.sum(models.AICallLog.tokens_in + models.AICallLog.tokens_out), 0).label("tokens"),
            func.coalesce(func.sum(models.AICallLog.costo_usd), 0).label("costo"),
        )
        .filter(models.AICallLog.created_at >= since, models.AICallLog.id_usuario.isnot(None))
        .group_by(models.AICallLog.id_usuario)
        .order_by(desc(func.sum(models.AICallLog.costo_usd)))
        .limit(20)
        .all()
    )
    result = []
    for r in rows:
        user = db.query(models.User).filter(models.User.id_telegram == r.id_usuario).first()
        result.append({
            "id_usuario": r.id_usuario,
            "nombre": user.first_name if user else "?",
            "calls": r.calls,
            "tokens": int(r.tokens),
            "costo_usd": round(float(r.costo), 6),
        })
    return result


@app.get("/admin/ai/timeline", dependencies=[Depends(require_admin)])
def admin_ai_timeline(days: int = 30, db: Session = Depends(get_db)):
    """Daily series for charts — last N days."""
    from datetime import datetime, timedelta, timezone as tz
    since = datetime.now(tz.utc) - timedelta(days=days)
    rows = (
        db.query(
            func.date_trunc('day', models.AICallLog.created_at).label("dia"),
            func.count(models.AICallLog.id).label("calls"),
            func.coalesce(func.sum(models.AICallLog.tokens_in + models.AICallLog.tokens_out), 0).label("tokens"),
            func.coalesce(func.sum(models.AICallLog.costo_usd), 0).label("costo"),
        )
        .filter(models.AICallLog.created_at >= since)
        .group_by(func.date_trunc('day', models.AICallLog.created_at))
        .order_by(func.date_trunc('day', models.AICallLog.created_at))
        .all()
    )
    return [
        {
            "dia": r.dia.strftime("%Y-%m-%d") if r.dia else "",
            "calls": r.calls,
            "tokens": int(r.tokens),
            "costo_usd": round(float(r.costo), 6),
        }
        for r in rows
    ]


@app.get("/admin/ai/recent", dependencies=[Depends(require_admin)])
def admin_ai_recent(db: Session = Depends(get_db)):
    """Last 50 AI calls — live feed."""
    rows = (
        db.query(models.AICallLog)
        .order_by(models.AICallLog.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": r.id,
            "id_usuario": r.id_usuario,
            "modulo": r.modulo,
            "accion": r.accion,
            "modelo": r.modelo,
            "tokens_in": r.tokens_in,
            "tokens_out": r.tokens_out,
            "tokens_cached": r.tokens_cached,
            "costo_usd": round(r.costo_usd, 6),
            "latencia_ms": r.latencia_ms,
            "cache_hit": r.cache_hit,
            "error": r.error,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@app.get("/admin/ai/budget/{user_id}", dependencies=[Depends(require_admin)])
def admin_ai_get_budget(user_id: int, db: Session = Depends(get_db)):
    """Get budget + current usage for a user."""
    return get_quota_status(user_id, db)


@app.put("/admin/ai/budget/{user_id}", dependencies=[Depends(require_admin)])
def admin_ai_set_budget(user_id: int, db: Session = Depends(get_db),
                        daily_limit_calls: int = 50,
                        monthly_limit_usd: float = 0.10,
                        is_blocked: bool = False):
    """Set custom AI budget for a user."""
    budget = db.query(models.UserAIBudget).filter(
        models.UserAIBudget.id_usuario == user_id
    ).first()
    if budget:
        budget.daily_limit_calls = daily_limit_calls
        budget.monthly_limit_usd = monthly_limit_usd
        budget.is_blocked = is_blocked
    else:
        budget = models.UserAIBudget(
            id_usuario=user_id,
            daily_limit_calls=daily_limit_calls,
            monthly_limit_usd=monthly_limit_usd,
            is_blocked=is_blocked,
        )
        db.add(budget)
    db.commit()
    return {"ok": True, "budget": {
        "daily_limit_calls": budget.daily_limit_calls,
        "monthly_limit_usd": budget.monthly_limit_usd,
        "is_blocked": budget.is_blocked,
    }}


# ── TON Wallet + NFT ──────────────────────────────────────────────────────────

@app.get("/wallet/nonce")
def wallet_get_nonce():
    """Genera un nonce de un solo uso para ton_proof. Válido 5 minutos."""
    return {"nonce": generate_nonce()}


@app.post("/wallet/connect", dependencies=[Depends(require_init_data)])
@limiter.limit("10/minute")
async def wallet_connect(request: Request, body: schemas.WalletConnectBody, db: Session = Depends(get_db)):
    """
    Verifica el ton_proof y vincula la wallet al usuario autenticado.
    La wallet NUNCA se guarda sin verificación de firma ed25519.
    """
    user_id = _extract_user_id(request)
    if not user_id:
        raise HTTPException(status_code=403, detail="Not authenticated")

    try:
        valid = await verify_ton_proof(body.address, body.proof, body.state_init)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    if not valid:
        raise HTTPException(status_code=400, detail="Firma TON inválida o nonce expirado")

    user = db.query(models.User).filter(models.User.id_telegram == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.wallet_address = body.address
    db.commit()
    logger.info("[wallet] Usuario %s vinculó wallet %s", user_id, body.address[:20])
    return {"ok": True, "address": body.address}


@app.post("/wallet/disconnect", dependencies=[Depends(require_init_data)])
def wallet_disconnect(request: Request, db: Session = Depends(get_db)):
    """Desvincula la wallet del usuario y limpia NFT activo."""
    user_id = _extract_user_id(request)
    if not user_id:
        raise HTTPException(status_code=403, detail="Not authenticated")
    user = db.query(models.User).filter(models.User.id_telegram == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.wallet_address = None
    user.nft_activo_address = None
    db.commit()
    logger.info("[wallet] Usuario %s desvinculó wallet", user_id)
    return {"ok": True}


@app.get("/usuarios/{id}/nfts", dependencies=[Depends(require_init_data)])
@limiter.limit("10/minute")
async def get_user_nfts(request: Request, id: int, db: Session = Depends(get_db)):
    """
    Devuelve los Telegram Gift NFTs de la wallet vinculada del usuario.
    Cachea en nft_cache por 24h.
    """
    _require_self(request, id)
    user = db.query(models.User).filter(models.User.id_telegram == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.wallet_address:
        raise HTTPException(status_code=400, detail="Wallet no vinculada")

    try:
        nfts = await get_nfts_for_wallet(user.wallet_address)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error consultando TonAPI: {e}")

    # Upsert into nft_cache
    now_utc = datetime.now(timezone.utc)
    for nft in nfts:
        cached = db.query(models.NftCache).filter(models.NftCache.address == nft["address"]).first()
        if cached:
            cached.nombre = nft["nombre"]
            cached.coleccion = nft.get("coleccion")
            cached.imagen_url = nft.get("imagen_url")
            cached.traits = nft.get("traits")
            cached.cached_at = now_utc
        else:
            db.add(models.NftCache(
                address=nft["address"],
                nombre=nft["nombre"],
                coleccion=nft.get("coleccion"),
                imagen_url=nft.get("imagen_url"),
                traits=nft.get("traits"),
            ))
    db.commit()

    return {"nfts": nfts, "wallet_address": user.wallet_address, "nft_activo_address": user.nft_activo_address}


@app.post("/usuarios/{id}/nft-activo", dependencies=[Depends(require_init_data)])
@limiter.limit("20/minute")
async def set_nft_activo(request: Request, id: int, body: schemas.NftActivoBody, db: Session = Depends(get_db)):
    """
    Establece el NFT activo del usuario. Verifica que le pertenezca.
    Enviar nft_address=null para deseleccionar.
    """
    _require_self(request, id)
    user = db.query(models.User).filter(models.User.id_telegram == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.nft_address is None:
        user.nft_activo_address = None
        db.commit()
        return {"ok": True, "nft_activo_address": None}

    if not user.wallet_address:
        raise HTTPException(status_code=400, detail="Wallet no vinculada")

    # Verify NFT belongs to user's wallet before saving
    try:
        nfts = await get_nfts_for_wallet(user.wallet_address)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error verificando NFT: {e}")

    if body.nft_address not in {nft["address"] for nft in nfts}:
        raise HTTPException(status_code=403, detail="El NFT no pertenece a tu wallet")

    user.nft_activo_address = body.nft_address
    db.commit()
    return {"ok": True, "nft_activo_address": body.nft_address}
