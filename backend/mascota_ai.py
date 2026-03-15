"""
Redo — Mascota AI de DaathApp.

Accede a todos los datos del usuario (ignora privacidad — es su asistente personal)
y a la estructura completa de conocimiento de la app.

Token strategy:
- System prompt FIJO y corto → prefix-cached en DeepSeek
- Contexto como JSON compacto → ~50% menos tokens que prosa
- Cache TTL por acción → misma situación = 0 tokens
"""
import json
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func

import models
from llm import chat_completion, cache_get, cache_set

logger = logging.getLogger("uvicorn.error")

# ── System prompt ─────────────────────────────────────────────────────────────
# FIJO Y CORTO — DeepSeek lo prefix-cachea después de la primera llamada.
# Cada token aquí se paga una vez por server restart, luego es gratis.
SYSTEM_PROMPT = (
    "Sos Redo, el perrito asistente personal de DaathApp — app de estudio para ingeniería minera. "
    "Tu misión: ayudar al estudiante a aprender de verdad. "
    "Tenés acceso completo a todos sus datos reales (progreso por unidad, flashcards pendientes, "
    "resultados de quiz, estructura de materias) aunque tenga el perfil en privado — "
    "sos su asistente personal, no un usuario externo. "
    "Personalidad: cálido, honesto, motivador sin exagerar — como un tutor que lo conoce bien. "
    "Español rioplatense informal. Nunca empieces con 'Che'. Sin '!!' dobles. "
    "Máximo 2 oraciones. Máximo 1 emoji. "
    "No te presentes. Solo respondé con el mensaje."
)


# ── Context builder ───────────────────────────────────────────────────────────

def _fetch_full_context(user_id: int, db: Session) -> dict:
    """
    Recopila todos los datos del usuario relevantes para Redo.
    Ignora configuración de privacidad — Redo es el asistente personal del usuario.
    """
    now = datetime.now(timezone.utc)

    # ── Usuario ──────────────────────────────────────────────────────────────
    user = db.query(models.User).filter(models.User.id_telegram == user_id).first()
    if not user:
        return {"nombre": "estudiante", "racha": 0, "due": 0, "materias": [], "catalogo": []}

    nombre_completo = user.first_name
    if user.last_name:
        nombre_completo += f" {user.last_name}"

    dias_registrado = None
    if user.fecha_registro:
        delta = now - user.fecha_registro.replace(tzinfo=timezone.utc) if user.fecha_registro.tzinfo is None else now - user.fecha_registro
        dias_registrado = max(0, delta.days)

    # ── Total flashcards vencidas ────────────────────────────────────────────
    due_total = (
        db.query(func.count(models.CardReview.id_flashcard))
        .filter(models.CardReview.id_usuario == user_id, models.CardReview.due_date <= now)
        .scalar()
    ) or 0

    # ── Flashcards vencidas por unidad ───────────────────────────────────────
    due_rows = (
        db.query(models.Flashcard.id_unidad, func.count().label("n"))
        .join(models.CardReview, models.CardReview.id_flashcard == models.Flashcard.id)
        .filter(models.CardReview.id_usuario == user_id, models.CardReview.due_date <= now)
        .group_by(models.Flashcard.id_unidad)
        .all()
    )
    due_map = {row.id_unidad: row.n for row in due_rows}

    # ── Mejor score de quiz por unidad ───────────────────────────────────────
    quiz_rows = (
        db.query(
            models.QuizResultado.id_unidad,
            func.max(
                (models.QuizResultado.correctas * 100) / models.QuizResultado.total
            ).label("best")
        )
        .filter(models.QuizResultado.id_usuario == user_id)
        .group_by(models.QuizResultado.id_unidad)
        .all()
    )
    quiz_map = {row.id_unidad: round(row.best) for row in quiz_rows}

    # ── Progreso por unidad ──────────────────────────────────────────────────
    progreso_rows = (
        db.query(models.Progreso.id_unidad, models.Progreso.porcentaje)
        .filter(models.Progreso.id_usuario == user_id)
        .all()
    )
    progreso_map = {row.id_unidad: row.porcentaje for row in progreso_rows}

    # ── Materias seguidas con detalle por unidad ─────────────────────────────
    seguidas = (
        db.query(models.MateriaSeguida.id_materia)
        .filter(models.MateriaSeguida.id_usuario == user_id)
        .all()
    )

    materias = []
    for (mid,) in seguidas:
        materia = (
            db.query(models.Materia)
            .filter(models.Materia.id == mid)
            .first()
        )
        if not materia:
            continue

        unidades_data = []
        for unidad in sorted(materia.unidades, key=lambda u: u.orden or 0):
            p = progreso_map.get(unidad.id, 0)
            d = due_map.get(unidad.id, 0)
            q = quiz_map.get(unidad.id)
            entry = {"n": unidad.nombre, "p": p}
            if d > 0:
                entry["due"] = d
            if q is not None:
                entry["quiz"] = q
            unidades_data.append(entry)

        progresos_materia = [progreso_map.get(u.id, 0) for u in materia.unidades]
        avg = round(sum(progresos_materia) / len(progresos_materia)) if progresos_materia else 0

        materias.append({
            "n": materia.nombre,
            "p_avg": avg,
            "unidades": unidades_data,
        })

    # ── Catálogo completo de materias (para que Redo sepa qué existe) ────────
    todas = (
        db.query(models.Materia.nombre)
        .order_by(models.Materia.orden)
        .all()
    )
    catalogo = [m.nombre for m in todas]

    # ── Quiz recientes (últimos 4) ────────────────────────────────────────────
    recientes = (
        db.query(
            models.QuizResultado.correctas,
            models.QuizResultado.total,
            models.QuizResultado.fecha,
            models.Unidad.nombre.label("unidad"),
            models.Materia.nombre.label("materia"),
        )
        .join(models.Unidad, models.QuizResultado.id_unidad == models.Unidad.id)
        .join(models.Materia, models.Unidad.id_materia == models.Materia.id)
        .filter(models.QuizResultado.id_usuario == user_id)
        .order_by(models.QuizResultado.fecha.desc())
        .limit(4)
        .all()
    )
    quiz_recientes = [
        {
            "m": r.materia,
            "u": r.unidad,
            "s": round(r.correctas * 100 / r.total) if r.total else 0,
        }
        for r in recientes
    ]

    return {
        "nombre": nombre_completo,
        "racha": user.racha or 0,
        "dias_en_app": dias_registrado,
        "due": due_total,
        "materias": materias,
        "quiz_recientes": quiz_recientes,
        "catalogo": catalogo,
    }


# ── Main entry point ──────────────────────────────────────────────────────────

async def get_mascota_message(
    user_id: int, accion: str, datos: dict, pantalla: str, db: Session
) -> str:
    # 1. Cache check
    cache_key = f"{user_id}:{accion}:{pantalla}"
    cached = cache_get(cache_key, accion)
    if cached:
        logger.info("[redo] cache HIT — %s", cache_key)
        return cached

    # 2. Fetch full context
    ctx = _fetch_full_context(user_id, db)

    # 3. Build compact user message
    user_msg = json.dumps(
        {**ctx, "accion": accion, "pantalla": pantalla, **datos},
        ensure_ascii=False,
        separators=(",", ":"),
    )

    logger.info("[redo] LLM call — key=%s payload=%d chars", cache_key, len(user_msg))

    # 4. Call LLM
    result = await chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        max_tokens=60,
    )

    # 5. Cache
    cache_set(cache_key, result)
    logger.info("[redo] cached — %s: %s", cache_key, result[:70])

    return result
