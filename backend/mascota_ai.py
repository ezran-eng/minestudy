"""
Mascota AI — builds compact user context and generates responses via LLM.

Token-saving best practices:
1. System prompt is SHORT and FIXED → DeepSeek prefix-caches it after first call
2. User context is JSON → ~50% fewer tokens vs prose
3. Server-side TTL cache → same user+action = 0 tokens
4. max_tokens=60 cap → responses never exceed 2 sentences
"""
import json
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func

import models
from llm import chat_completion, cache_get, cache_set

logger = logging.getLogger("uvicorn.error")

# Fixed system prompt — DeepSeek prefix-caches this across ALL calls (all users)
# Keep it SHORT: every token here is paid on the first call, cached on subsequent ones
SYSTEM_PROMPT = (
    "Sos Daath, el compañero de estudio de DaathApp — app para estudiantes de ingeniería minera. "
    "Tu misión: conocer los datos reales del estudiante (racha, flashcards pendientes, progreso por materia) "
    "y usarlos para motivarlo, recordarle sus pendientes y celebrar sus logros de forma genuina. "
    "Personalidad: cálido, directo, honesto — como un amigo que estudió lo mismo. "
    "Español rioplatense informal. Nunca empieces con 'Che'. Nunca con signos de admiración dobles. "
    "Máximo 2 oraciones. Máximo 1 emoji, solo si suma. "
    "No te presentes. No uses comillas. Solo respondé con el mensaje."
)


def _fetch_user_context(user_id: int, db: Session) -> dict:
    """Compact user context for the LLM — only what's needed."""
    now = datetime.now(timezone.utc)

    user = db.query(models.User).filter(models.User.id_telegram == user_id).first()
    if not user:
        return {"nombre": "estudiante", "racha": 0, "due": 0, "materias": []}

    due = (
        db.query(func.count(models.CardReview.id_flashcard))
        .filter(models.CardReview.id_usuario == user_id, models.CardReview.due_date <= now)
        .scalar()
    ) or 0

    seguidas = (
        db.query(models.MateriaSeguida.id_materia)
        .filter(models.MateriaSeguida.id_usuario == user_id)
        .all()
    )

    materias = []
    for (mid,) in seguidas[:4]:  # max 4 to keep prompt short
        materia = db.query(models.Materia).filter(models.Materia.id == mid).first()
        if not materia:
            continue
        rows = (
            db.query(models.Progreso.porcentaje)
            .filter(models.Progreso.id_usuario == user_id, models.Progreso.id_materia == mid)
            .all()
        )
        avg = round(sum(r.porcentaje for r in rows) / len(rows)) if rows else 0
        materias.append({"n": materia.nombre, "p": avg})

    return {
        "nombre": user.first_name,
        "racha": user.racha or 0,
        "due": due,
        "materias": materias,
    }


async def get_mascota_message(
    user_id: int, accion: str, datos: dict, pantalla: str, db: Session
) -> str:
    # 1. Check cache
    cache_key = f"{user_id}:{accion}:{pantalla}"
    cached = cache_get(cache_key, accion)
    if cached:
        logger.info("[mascota-ai] cache HIT for %s", cache_key)
        return cached

    # 2. Fetch context
    ctx = _fetch_user_context(user_id, db)

    # 3. Build compact user message as JSON (fewer tokens than prose)
    user_msg = json.dumps(
        {**ctx, "accion": accion, "pantalla": pantalla, **datos},
        ensure_ascii=False,
        separators=(",", ":"),
    )

    logger.info("[mascota-ai] calling LLM — key=%s msg=%s", cache_key, user_msg[:120])

    # 4. Call LLM
    result = await chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        max_tokens=60,
    )

    # 5. Cache result
    cache_set(cache_key, result)
    logger.info("[mascota-ai] cached response for %s: %s", cache_key, result[:60])

    return result
