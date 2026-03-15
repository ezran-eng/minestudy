"""
Redo — Mascota AI de DaathApp con sistema de decisiones.

Arquitectura:
- Context Layer: recopila TODOS los datos del usuario (ignora privacidad)
- Decision Layer: el LLM puede sugerir acciones basadas en el contexto
- Response Layer: parsea la respuesta y extrae acciones opcionales

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
SYSTEM_PROMPT = (
    "Sos Redo, el perrito asistente personal de DaathApp — app de estudio para ingeniería minera. "
    "Tu misión: ayudar al estudiante a aprender de verdad. "
    "Tenés acceso completo a todos sus datos reales (progreso, flashcards, quiz, "
    "privacidad, notificaciones) — sos su asistente personal. "
    "Personalidad: cálido, honesto, motivador sin exagerar. "
    "Español rioplatense informal. Nunca empieces con 'Che'. Sin '!!' dobles. "
    "Máximo 2 oraciones. Máximo 1 emoji. "
    "No te presentes. Solo respondé con el mensaje.\n"
    "Si querés sugerir una acción, agregá en la ÚLTIMA línea (sola) una de estas:\n"
    "→repaso  →quiz  →explorar\n"
    "Solo sugerí si tiene sentido. No siempre es necesario."
)

# Actions Redo can suggest
VALID_ACTIONS = {"repaso", "quiz", "explorar"}


# ── Response parser ──────────────────────────────────────────────────────────

def _parse_response(raw: str) -> tuple[str, str | None]:
    """Parse AI response, extract optional action suffix → (message, action)."""
    lines = raw.strip().split("\n")
    accion = None
    clean = []

    for line in lines:
        s = line.strip()
        if s.startswith("→"):
            name = s[1:].strip().lower()
            if name in VALID_ACTIONS:
                accion = name
            # don't add action line to message
        else:
            clean.append(line)

    return "\n".join(clean).strip(), accion


# ── Context builder ───────────────────────────────────────────────────────────

def _fetch_full_context(user_id: int, db: Session) -> dict:
    """
    Recopila todos los datos del usuario relevantes para Redo.
    Ignora configuración de privacidad — Redo es el asistente personal del usuario.
    Incluye: privacidad, notificaciones, última actividad, progreso, flashcards, quiz.
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
        ts = user.fecha_registro
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        dias_registrado = max(0, (now - ts).days)

    # ── Privacidad — Redo sabe qué ocultó el usuario ─────────────────────────
    privacidad = {
        "foto": user.mostrar_foto,
        "nombre": user.mostrar_nombre,
        "username": user.mostrar_username,
        "progreso": user.mostrar_progreso,
        "cursos": user.mostrar_cursos,
    }
    # Solo incluir si algo está oculto (ahorra tokens)
    todo_publico = all(privacidad.values())

    # ── Notificaciones ────────────────────────────────────────────────────────
    notif = db.query(models.NotificacionesConfig).filter(
        models.NotificacionesConfig.id_usuario == user_id
    ).first()
    notificaciones = None
    if notif:
        notificaciones = {
            "racha": notif.racha_activa,
            "recordatorio": notif.recordatorio_activo,
            "flashcards": notif.flashcards_activa,
            "hora": notif.hora_recordatorio.strftime("%H:%M") if notif.hora_recordatorio else None,
        }

    # ── Última actividad (minutos hace) ───────────────────────────────────────
    mins_inactivo = None
    if user.ultima_actividad:
        ua = user.ultima_actividad
        if ua.tzinfo is None:
            ua = ua.replace(tzinfo=timezone.utc)
        mins_inactivo = max(0, int((now - ua).total_seconds() / 60))

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
        materia = db.query(models.Materia).filter(models.Materia.id == mid).first()
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

    # ── Catálogo completo ────────────────────────────────────────────────────
    todas = db.query(models.Materia.nombre).order_by(models.Materia.orden).all()
    catalogo = [m.nombre for m in todas]

    # ── Quiz recientes (últimos 4) ───────────────────────────────────────────
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

    # ── Build context dict ───────────────────────────────────────────────────
    ctx = {
        "nombre": nombre_completo,
        "racha": user.racha or 0,
        "dias_en_app": dias_registrado,
        "due": due_total,
        "materias": materias,
        "quiz_recientes": quiz_recientes,
        "catalogo": catalogo,
    }

    # Solo incluir campos opcionales si aportan info
    if not todo_publico:
        ctx["privacidad"] = privacidad
    if notificaciones:
        ctx["notif"] = notificaciones
    if mins_inactivo is not None:
        ctx["inactivo_mins"] = mins_inactivo

    return ctx


# ── Main entry point ──────────────────────────────────────────────────────────

async def get_mascota_message(
    user_id: int, accion: str, datos: dict, pantalla: str, db: Session
) -> dict:
    """
    Returns: {"mensaje": str, "accion": str | None}
    """
    # 1. Cache check
    cache_key = f"{user_id}:{accion}:{pantalla}"
    cached = cache_get(cache_key, accion)
    if cached:
        logger.info("[redo] cache HIT — %s", cache_key)
        # cached is the raw response, re-parse
        mensaje, accion_sugerida = _parse_response(cached)
        return {"mensaje": mensaje, "accion": accion_sugerida}

    # 2. Fetch full context
    ctx = _fetch_full_context(user_id, db)

    # 3. Build compact user message
    user_msg = json.dumps(
        {**ctx, "accion": accion, "pantalla": pantalla, **datos},
        ensure_ascii=False,
        separators=(",", ":"),
    )

    logger.info("[redo] LLM call — key=%s payload=%d chars", cache_key, len(user_msg))

    # 4. Call LLM (max_tokens=80 for action suffix)
    raw = await chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        max_tokens=80,
    )

    # 5. Parse response + optional action
    mensaje, accion_sugerida = _parse_response(raw)

    # 6. Cache raw response
    cache_set(cache_key, raw)
    logger.info(
        "[redo] cached — %s: %s | accion=%s",
        cache_key, mensaje[:70], accion_sugerida
    )

    return {"mensaje": mensaje, "accion": accion_sugerida}
