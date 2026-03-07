from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from collections import defaultdict
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from typing import List, Optional
import os
import uuid
import hmac
import hashlib
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

logger = logging.getLogger("minestudy.auth")
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

# Create the database tables
models.Base.metadata.create_all(bind=engine)

# Manual migrations for columns added after initial table creation
# (create_all does not ALTER existing tables)
with engine.connect() as conn:
    for ddl in [
        "ALTER TABLE quiz_preguntas ADD COLUMN IF NOT EXISTS justificacion VARCHAR",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completado BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS mostrar_foto BOOLEAN NOT NULL DEFAULT TRUE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS mostrar_nombre BOOLEAN NOT NULL DEFAULT TRUE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS mostrar_username BOOLEAN NOT NULL DEFAULT TRUE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS mostrar_progreso BOOLEAN NOT NULL DEFAULT TRUE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS mostrar_cursos BOOLEAN NOT NULL DEFAULT TRUE",
    ]:
        conn.execute(__import__('sqlalchemy').text(ddl))
    conn.commit()

app = FastAPI(title="MineStudy Hub API")

# Startup diagnostic: confirm bot token is loaded (never log the full token)
_raw_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
_token_stripped = _raw_token.strip()
if not _token_stripped:
    print("[startup] WARNING: TELEGRAM_BOT_TOKEN is not set — all initData validation will fail")
elif _raw_token != _token_stripped:
    print(f"[startup] WARNING: TELEGRAM_BOT_TOKEN has leading/trailing whitespace (len before={len(_raw_token)} after={len(_token_stripped)}) — this will break HMAC validation")
else:
    print(f"[startup] TELEGRAM_BOT_TOKEN OK — len={len(_token_stripped)}, prefix={_token_stripped[:6]!r}")

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
    allow_methods=["*"],
    allow_headers=["*"],
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


@app.on_event("startup")
async def start_scheduler():
    try:
        _scheduler.add_job(_job_recordatorio, 'interval', minutes=1)
        _scheduler.add_job(_job_racha, CronTrigger(hour=0, minute=0, timezone='UTC'))    # 21:00 ART
        _scheduler.add_job(_job_flashcards, CronTrigger(hour=12, minute=0, timezone='UTC'))  # 09:00 ART
        _scheduler.start()
        print("[scheduler] started — recordatorio cada minuto, racha 00:00 UTC, flashcards 12:00 UTC")
    except Exception as e:
        print(f"[scheduler] ERROR during startup: {e}")


@app.on_event("shutdown")
async def stop_scheduler():
    _scheduler.shutdown(wait=False)


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
def update_progress(progreso: schemas.ProgresoCreate, db: Session = Depends(get_db)):
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
def get_materias(db: Session = Depends(get_db)):
    db_materias = db.query(models.Materia).order_by(models.Materia.orden).all()
    # Unidades and temas will be fetched automatically due to relationship setup
    # Make sure to sort them correctly before returning
    for materia in db_materias:
        materia.unidades.sort(key=lambda u: (u.orden is None, u.orden))
        for unidad in materia.unidades:
            unidad.temas.sort(key=lambda t: t.id) # Sort by id for temas as they don't have orden
    return db_materias

@app.put("/materias/{id}", response_model=schemas.MateriaBase, dependencies=[Depends(require_admin)])
def update_materia(id: int, materia: schemas.MateriaUpdate, db: Session = Depends(get_db)):
    db_materia = db.query(models.Materia).filter(models.Materia.id == id).first()
    if not db_materia:
        raise HTTPException(status_code=404, detail="Materia not found")

    update_data = materia.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_materia, key, value)

    db.commit()
    db.refresh(db_materia)
    return db_materia

@app.delete("/materias/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_materia(id: int, db: Session = Depends(get_db)):
    db_materia = db.query(models.Materia).filter(models.Materia.id == id).first()
    if not db_materia:
        raise HTTPException(status_code=404, detail="Materia not found")
    # Due to cascade="all, delete-orphan", this will also delete unidades, temas, etc.
    db.delete(db_materia)
    db.commit()
    return

@app.get("/materias/{id}/unidades", response_model=List[schemas.UnidadBase])
def get_unidades(id: int, db: Session = Depends(get_db)):
    db_unidades = db.query(models.Unidad).filter(models.Unidad.id_materia == id).all()
    if not db_unidades:
        return []
    return db_unidades

@app.put("/unidades/{id}", response_model=schemas.UnidadBase, dependencies=[Depends(require_admin)])
def update_unidad(id: int, unidad: schemas.UnidadUpdate, db: Session = Depends(get_db)):
    db_unidad = db.query(models.Unidad).filter(models.Unidad.id == id).first()
    if not db_unidad:
        raise HTTPException(status_code=404, detail="Unidad not found")

    update_data = unidad.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_unidad, key, value)

    db.commit()
    db.refresh(db_unidad)
    return db_unidad

@app.delete("/unidades/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_unidad(id: int, db: Session = Depends(get_db)):
    db_unidad = db.query(models.Unidad).filter(models.Unidad.id == id).first()
    if not db_unidad:
        raise HTTPException(status_code=404, detail="Unidad not found")
    db.delete(db_unidad)
    db.commit()
    return

@app.delete("/temas/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_tema(id: int, db: Session = Depends(get_db)):
    db_tema = db.query(models.Tema).filter(models.Tema.id == id).first()
    if not db_tema:
        raise HTTPException(status_code=404, detail="Tema not found")
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
def get_ranking(db: Session = Depends(get_db)):
    # Query to calculate average percentage for each user across all their progress records
    ranking_data = db.query(
        models.User,
        func.coalesce(func.avg(models.Progreso.porcentaje), 0).label('total_progress')
    ).outerjoin(models.Progreso).group_by(models.User.id_telegram).order_by(
        func.coalesce(func.avg(models.Progreso.porcentaje), 0).desc()
    ).all()

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
def registrar_pdf_visto(id: int, body: schemas.PdfVistoCreate, db: Session = Depends(get_db)):
    existing = db.query(models.PdfVisto).filter(
        models.PdfVisto.id_usuario == body.id_usuario,
        models.PdfVisto.id_pdf == id
    ).first()
    if not existing:
        db.add(models.PdfVisto(id_usuario=body.id_usuario, id_pdf=id))
        db.commit()
    return {"ok": True}


@app.post("/infografias/{id}/vista", dependencies=[Depends(require_init_data)])
def registrar_infografia_vista(id: int, body: schemas.InfografiaVistaCreate, db: Session = Depends(get_db)):
    existing = db.query(models.InfografiaVista).filter(
        models.InfografiaVista.id_usuario == body.id_usuario,
        models.InfografiaVista.id_infografia == id
    ).first()
    if not existing:
        db.add(models.InfografiaVista(id_usuario=body.id_usuario, id_infografia=id))
        db.commit()
    return {"ok": True}


@app.post("/quiz/resultado", dependencies=[Depends(require_init_data)])
def guardar_quiz_resultado(body: schemas.QuizResultadoCreate, db: Session = Depends(get_db)):
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
    unidad = db.query(models.Unidad).filter(models.Unidad.id == id).first()
    id_materia = unidad.id_materia if unidad else None
    # Flashcards
    all_flashcards = db.query(models.Flashcard).filter(models.Flashcard.id_unidad == id).all()
    total_fc = len(all_flashcards)
    dominadas = 0
    if total_fc > 0:
        fc_ids = [f.id for f in all_flashcards]
        dominadas = db.query(models.CardReview).filter(
            models.CardReview.id_usuario == id_usuario,
            models.CardReview.id_flashcard.in_(fc_ids),
            models.CardReview.repeticiones > 0
        ).count()
    fc_pct = (dominadas / total_fc * 100) if total_fc > 0 else 0

    # Cuestionario — último resultado
    total_quiz = db.query(models.QuizPregunta).filter(models.QuizPregunta.id_unidad == id).count()
    correctas = 0
    if total_quiz > 0:
        ultimo = (
            db.query(models.QuizResultado)
            .filter(models.QuizResultado.id_usuario == id_usuario, models.QuizResultado.id_unidad == id)
            .order_by(models.QuizResultado.fecha.desc())
            .first()
        )
        if ultimo:
            correctas = ultimo.correctas
    qz_pct = (correctas / total_quiz * 100) if total_quiz > 0 else 0

    # PDFs
    all_pdfs = db.query(models.Pdf).filter(models.Pdf.id_unidad == id).all()
    total_pdfs = len(all_pdfs)
    pdfs_vistos = 0
    ids_pdfs_vistos = []
    if total_pdfs > 0:
        pdf_ids = [p.id for p in all_pdfs]
        vistos = db.query(models.PdfVisto).filter(
            models.PdfVisto.id_usuario == id_usuario,
            models.PdfVisto.id_pdf.in_(pdf_ids)
        ).all()
        pdfs_vistos = len(vistos)
        ids_pdfs_vistos = [v.id_pdf for v in vistos]
    pdf_pct = (pdfs_vistos / total_pdfs * 100) if total_pdfs > 0 else 0

    # Infografías
    all_inf = db.query(models.Infografia).filter(models.Infografia.id_unidad == id).all()
    total_inf = len(all_inf)
    inf_vistas = 0
    ids_inf_vistas = []
    if total_inf > 0:
        inf_ids = [i.id for i in all_inf]
        vistas = db.query(models.InfografiaVista).filter(
            models.InfografiaVista.id_usuario == id_usuario,
            models.InfografiaVista.id_infografia.in_(inf_ids)
        ).all()
        inf_vistas = len(vistas)
        ids_inf_vistas = [v.id_infografia for v in vistas]

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
def set_seguir_materia(id: int, body: schemas.SeguirCreate, db: Session = Depends(get_db)):
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


@app.get("/usuarios/{id}/privacidad", response_model=schemas.PrivacidadOut, dependencies=[Depends(require_init_data)])
def get_privacidad(id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id_telegram == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.put("/usuarios/{id}/privacidad", response_model=schemas.PrivacidadOut, dependencies=[Depends(require_init_data)])
def update_privacidad(id: int, body: schemas.PrivacidadUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id_telegram == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@app.post("/usuarios/{id}/onboarding", dependencies=[Depends(require_init_data)])
def complete_onboarding(id: int, body: schemas.PrivacidadUpdate, db: Session = Depends(get_db)):
    """Mark onboarding as completed and save initial privacy settings in one call."""
    user = db.query(models.User).filter(models.User.id_telegram == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.onboarding_completado = True
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    db.commit()
    return {"ok": True}


@app.delete("/usuarios/{id_usuario}/progreso-materia/{id_materia}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_init_data)])
def delete_progreso_materia(id_usuario: int, id_materia: int, body: schemas.DeleteProgresoBody, db: Session = Depends(get_db)):
    """Wipes all progress of a user for every unit in the given materia."""
    if body.id_usuario != id_usuario:
        raise HTTPException(status_code=403, detail="Forbidden")
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

    # vistas
    db.query(models.Vista).filter(
        models.Vista.id_usuario == id_usuario,
        models.Vista.id_unidad.in_(unidad_ids),
    ).delete(synchronize_session=False)

    db.commit()


@app.get("/usuarios/{id}/materias-seguidas")
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
        .join(models.MateriaSeguida, models.MateriaSeguida.id_materia == models.Materia.id)
        .filter(models.MateriaSeguida.id_usuario == id)
        .order_by(models.MateriaSeguida.fecha.desc())
        .all()
    )
    materias_cursando = []
    materias_completadas = []
    for materia in seguidas:
        unidades = sorted(materia.unidades, key=lambda u: (u.orden is None, u.orden))
        if unidades:
            pct = sum(_compute_progreso_unidad(u.id, id, db) for u in unidades) / len(unidades)
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
    }


@app.post("/unidades/{id}/vista", dependencies=[Depends(require_init_data)])
@limiter.limit("60/minute")
def registrar_vista(request: Request, id: int, body: schemas.VistaCreate, db: Session = Depends(get_db)):
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


def _compute_progreso_unidad(id_unidad: int, id_usuario: int, db: Session) -> float:
    """Computes porcentaje_total for a unit (reused by stats endpoint)."""
    all_flashcards = db.query(models.Flashcard).filter(models.Flashcard.id_unidad == id_unidad).all()
    total_fc = len(all_flashcards)
    dominadas = 0
    if total_fc > 0:
        fc_ids = [f.id for f in all_flashcards]
        dominadas = db.query(models.CardReview).filter(
            models.CardReview.id_usuario == id_usuario,
            models.CardReview.id_flashcard.in_(fc_ids),
            models.CardReview.repeticiones > 0,
        ).count()
    fc_pct = (dominadas / total_fc * 100) if total_fc > 0 else 0

    total_quiz = db.query(models.QuizPregunta).filter(models.QuizPregunta.id_unidad == id_unidad).count()
    correctas = 0
    if total_quiz > 0:
        ultimo = (
            db.query(models.QuizResultado)
            .filter(models.QuizResultado.id_usuario == id_usuario, models.QuizResultado.id_unidad == id_unidad)
            .order_by(models.QuizResultado.fecha.desc())
            .first()
        )
        if ultimo:
            correctas = ultimo.correctas
    qz_pct = (correctas / total_quiz * 100) if total_quiz > 0 else 0

    all_pdfs = db.query(models.Pdf).filter(models.Pdf.id_unidad == id_unidad).all()
    total_pdfs = len(all_pdfs)
    pdf_pct = 0
    if total_pdfs > 0:
        pdf_ids = [p.id for p in all_pdfs]
        pdfs_vistos = db.query(models.PdfVisto).filter(
            models.PdfVisto.id_usuario == id_usuario,
            models.PdfVisto.id_pdf.in_(pdf_ids),
        ).count()
        pdf_pct = pdfs_vistos / total_pdfs * 100

    components = {}
    if total_fc > 0: components['fc'] = (fc_pct, 0.50)
    if total_quiz > 0: components['qz'] = (qz_pct, 0.35)
    if total_pdfs > 0: components['pdf'] = (pdf_pct, 0.15)
    if not components:
        return 0.0
    total_weight = sum(w for _, w in components.values())
    return sum(score * (w / total_weight) for score, w in components.values())


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
    materias = db.query(models.Materia).order_by(models.Materia.orden).all()
    all_pcts = []
    foco = None
    foco_pct = 101.0
    for materia in materias:
        unidades_sorted = sorted(materia.unidades, key=lambda u: (u.orden is None, u.orden))
        for unidad in unidades_sorted:
            pct = _compute_progreso_unidad(unidad.id, id, db)
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
def get_actividad_reciente(id: int, db: Session = Depends(get_db)):
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

    # Quiz resultados
    quizzes = (
        db.query(models.QuizResultado, models.Unidad.nombre.label("u_nombre"))
        .join(models.Unidad, models.QuizResultado.id_unidad == models.Unidad.id)
        .filter(models.QuizResultado.id_usuario == id)
        .order_by(models.QuizResultado.fecha.desc())
        .limit(5)
        .all()
    )
    for q, u_nombre in quizzes:
        events.append({
            "tipo": "quiz",
            "titulo": "Cuestionario completado",
            "detalle": f"{q.correctas}/{q.total} correctas · {u_nombre}",
            "ts": q.fecha,
        })

    # PDFs vistos
    pdfs_v = (
        db.query(models.PdfVisto, models.Pdf.titulo.label("pdf_titulo"))
        .join(models.Pdf, models.PdfVisto.id_pdf == models.Pdf.id)
        .filter(models.PdfVisto.id_usuario == id)
        .order_by(models.PdfVisto.visto_at.desc())
        .limit(5)
        .all()
    )
    for pv, titulo in pdfs_v:
        events.append({
            "tipo": "pdf",
            "titulo": "PDF visto",
            "detalle": titulo,
            "ts": pv.visto_at,
        })

    # Infografías vistas
    infs_v = (
        db.query(models.InfografiaVista, models.Infografia.titulo.label("inf_titulo"))
        .join(models.Infografia, models.InfografiaVista.id_infografia == models.Infografia.id)
        .filter(models.InfografiaVista.id_usuario == id)
        .order_by(models.InfografiaVista.visto_at.desc())
        .limit(5)
        .all()
    )
    for iv, titulo in infs_v:
        events.append({
            "tipo": "infografia",
            "titulo": "Infografía vista",
            "detalle": titulo,
            "ts": iv.visto_at,
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
        .limit(5)
        .all()
    )
    for row in reviews_by_day:
        events.append({
            "tipo": "flashcard",
            "titulo": "Flashcards repasadas",
            "detalle": f"{row.cnt} tarjetas",
            "ts": row.last_ts,
        })

    # Sort by timestamp desc, take top 5, add "hace"
    def sort_key(e):
        ts = e["ts"]
        if ts is None:
            return datetime.min.replace(tzinfo=timezone.utc)
        return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)

    events.sort(key=sort_key, reverse=True)
    return [
        {"tipo": e["tipo"], "titulo": e["titulo"], "detalle": e["detalle"], "hace": _hace(e["ts"])}
        for e in events[:5]
    ]


def _notif_defaults() -> dict:
    return {"racha_activa": True, "recordatorio_activo": True, "flashcards_activa": True, "hora_recordatorio": "20:00"}


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
            hora_recordatorio=time_obj(20, 0),
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
async def test_notificacion(id: int, db: Session = Depends(get_db)):
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
