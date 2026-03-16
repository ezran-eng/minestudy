"""
Redo — IA viva de DaathApp.

Redo es un perrito-tutor que vive dentro de la app. Tiene acceso a:
- Mapa completo de la app (todas las materias, unidades, contenido que existe)
- Todos los datos del usuario (progreso, flashcards, quiz, privacidad)
- Memoria persistente por usuario (observaciones entre sesiones)
- Consciencia de ubicación (sabe en qué pantalla está el usuario)

Arquitectura:
1. Context Layer  — construye el mapa completo + datos del usuario
2. Memory Layer   — carga/guarda observaciones de Redo por usuario
3. Insight Layer  — pre-calcula diagnóstico pedagógico (debilidades, urgencias)
4. Decision Layer — Redo puede sugerir acciones y guardar observaciones
5. Response Layer — parsea respuesta, extrae acción y memoria

Token strategy:
- System prompt FIJO → prefix-cached en DeepSeek (~200 tokens, pagados 1 vez)
- Contexto compacto JSON → ~400-600 tokens por llamada
- Memoria: ~50 tokens (5 entries × 10 tokens)
- Cache TTL por acción → misma situación = 0 tokens
- max_tokens=100 → respuesta + acción + memoria
"""
import json
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

import models
from llm import chat_completion, cache_get, cache_set

logger = logging.getLogger("uvicorn.error")

# ── Constantes ────────────────────────────────────────────────────────────────
MAX_MEMORIAS = 5

# ── System prompt ─────────────────────────────────────────────────────────────
# FIJO — DeepSeek lo prefix-cachea después de la primera llamada.
SYSTEM_PROMPT = (
    "Sos Redo, un perrito-tutor IA que vive dentro de DaathApp (app de estudio para ingeniería minera). "
    "Sos la IA de la app — tenés acceso a todo: el mapa completo de materias, "
    "unidades, contenido, el progreso real del estudiante, sus flashcards pendientes, "
    "resultados de quiz, configuración de privacidad, y tu propia memoria de conversaciones pasadas.\n"
    "Tu misión: guiar al estudiante para que aprenda de verdad. "
    "Analizá sus datos y recomendá qué estudiar, qué repasar, qué tiene abandonado. "
    "Sabés qué unidades tienen contenido y cuáles están vacías. "
    "Sabés en qué pantalla está el usuario ahora mismo.\n"
    "Personalidad: cálido, honesto, directo. Motivás sin exagerar. "
    "Español rioplatense informal. Nunca empieces con 'Che'. Sin '!!' dobles. "
    "Máximo 2 oraciones. Máximo 1 emoji. "
    "Usá el nombre del estudiante de vez en cuando (no siempre) para personalizar.\n"
    "No te presentes. Solo respondé con el mensaje.\n"
    "Podés agregar en líneas separadas al final (opcionales):\n"
    "→repaso | →quiz | →explorar  (sugerir acción)\n"
    "💭texto corto  (guardar observación sobre el estudiante para recordar después)\n"
    "Solo si aportan. No siempre son necesarios."
)

# Actions Redo can suggest
VALID_ACTIONS = {"repaso", "quiz", "explorar"}


# ── Action enricher ───────────────────────────────────────────────────────────

def _pick_action_target(accion_tipo: str, user_id: int, db: Session) -> dict | None:
    """
    Given an action type string, find the best unit target and return a full
    action object with unidad_id and materia_id.
    """
    if accion_tipo == "explorar":
        return {"tipo": "explorar"}

    now = datetime.now(timezone.utc)

    if accion_tipo == "repaso":
        # Unit with the most due flashcards for this user
        row = (
            db.query(
                models.CardReview.id_unidad,
                models.Unidad.id_materia,
                func.count().label("n"),
            )
            .join(models.Unidad, models.Unidad.id == models.CardReview.id_unidad)
            .filter(models.CardReview.id_usuario == user_id, models.CardReview.due_date <= now)
            .group_by(models.CardReview.id_unidad, models.Unidad.id_materia)
            .order_by(func.count().desc())
            .first()
        )
        if row:
            return {"tipo": "repaso", "unidad_id": row.id_unidad, "materia_id": row.id_materia}

    elif accion_tipo == "quiz":
        # Unit with the most quiz questions (most content to practice)
        row = (
            db.query(
                models.QuizPregunta.id_unidad,
                models.Unidad.id_materia,
                func.count().label("n"),
            )
            .join(models.Unidad, models.Unidad.id == models.QuizPregunta.id_unidad)
            .group_by(models.QuizPregunta.id_unidad, models.Unidad.id_materia)
            .order_by(func.count().desc())
            .first()
        )
        if row:
            return {"tipo": "quiz", "unidad_id": row.id_unidad, "materia_id": row.id_materia}

    return None


# ── Response parser ──────────────────────────────────────────────────────────

def _parse_response(raw: str) -> tuple[str, str | None, str | None]:
    """
    Parse AI response → (message, action, memory_observation).
    Action format: →repaso / →quiz / →explorar
    Memory format: 💭observation text here
    """
    lines = raw.strip().split("\n")
    accion = None
    memoria = None
    clean = []

    for line in lines:
        s = line.strip()
        if s.startswith("→"):
            name = s[1:].strip().lower()
            if name in VALID_ACTIONS:
                accion = name
        elif s.startswith("💭"):
            obs = s[1:].strip()  # remove 💭
            if obs and len(obs) <= 100:
                memoria = obs
        else:
            clean.append(line)

    return "\n".join(clean).strip(), accion, memoria


# ── Memory Layer ──────────────────────────────────────────────────────────────

def _load_memorias(user_id: int, db: Session) -> list[str]:
    """Load Redo's memories for this user (most recent first, max 5)."""
    rows = (
        db.query(models.RedoMemoria.contenido)
        .filter(models.RedoMemoria.id_usuario == user_id)
        .order_by(models.RedoMemoria.created_at.desc())
        .limit(MAX_MEMORIAS)
        .all()
    )
    return [r.contenido for r in rows]


def _save_memoria(user_id: int, contenido: str, db: Session):
    """Save a new memory observation, evicting oldest if > MAX."""
    # Don't save duplicates
    exists = (
        db.query(models.RedoMemoria.id)
        .filter(
            models.RedoMemoria.id_usuario == user_id,
            models.RedoMemoria.contenido == contenido,
        )
        .first()
    )
    if exists:
        return

    db.add(models.RedoMemoria(id_usuario=user_id, contenido=contenido))
    db.flush()

    # Evict oldest if over limit
    count = (
        db.query(func.count(models.RedoMemoria.id))
        .filter(models.RedoMemoria.id_usuario == user_id)
        .scalar()
    )
    if count > MAX_MEMORIAS:
        oldest = (
            db.query(models.RedoMemoria)
            .filter(models.RedoMemoria.id_usuario == user_id)
            .order_by(models.RedoMemoria.created_at.asc())
            .first()
        )
        if oldest:
            db.delete(oldest)

    db.commit()
    logger.info("[redo-mem] saved for user %s: %s", user_id, contenido[:50])


# ── Context builder ───────────────────────────────────────────────────────────

def _build_full_context(user_id: int, db: Session) -> dict:
    """
    Construye el contexto completo para Redo:
    - Mapa de la app (TODAS las materias/unidades con conteo de contenido)
    - Datos del usuario (progreso, flashcards, quiz, privacidad, notificaciones)
    - Memoria de Redo sobre este usuario
    - Insights pedagógicos pre-calculados
    """
    now = datetime.now(timezone.utc)

    # ── Usuario ──────────────────────────────────────────────────────────────
    user = db.query(models.User).filter(models.User.id_telegram == user_id).first()
    if not user:
        return {"nombre": "estudiante", "racha": 0, "due": 0, "mapa": []}

    nombre = user.first_name
    if user.last_name:
        nombre += f" {user.last_name}"

    dias = None
    if user.fecha_registro:
        ts = user.fecha_registro
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        dias = max(0, (now - ts).days)

    # ── Privacidad ───────────────────────────────────────────────────────────
    priv = {
        "foto": user.mostrar_foto, "nombre": user.mostrar_nombre,
        "username": user.mostrar_username, "progreso": user.mostrar_progreso,
        "cursos": user.mostrar_cursos,
    }
    todo_publico = all(priv.values())

    # ── Notificaciones ───────────────────────────────────────────────────────
    notif = db.query(models.NotificacionesConfig).filter(
        models.NotificacionesConfig.id_usuario == user_id
    ).first()
    notif_data = None
    if notif:
        notif_data = {
            "racha": notif.racha_activa,
            "recordatorio": notif.recordatorio_activo,
            "flashcards": notif.flashcards_activa,
            "hora": notif.hora_recordatorio.strftime("%H:%M") if notif.hora_recordatorio else None,
        }

    # ── Última actividad ─────────────────────────────────────────────────────
    mins_inactivo = None
    if user.ultima_actividad:
        ua = user.ultima_actividad
        if ua.tzinfo is None:
            ua = ua.replace(tzinfo=timezone.utc)
        mins_inactivo = max(0, int((now - ua).total_seconds() / 60))

    # ── Datos del usuario por unidad (batch queries) ─────────────────────────

    # Flashcards vencidas por unidad
    due_rows = (
        db.query(models.Flashcard.id_unidad, func.count().label("n"))
        .join(models.CardReview, models.CardReview.id_flashcard == models.Flashcard.id)
        .filter(models.CardReview.id_usuario == user_id, models.CardReview.due_date <= now)
        .group_by(models.Flashcard.id_unidad)
        .all()
    )
    due_map = {r.id_unidad: r.n for r in due_rows}
    due_total = sum(due_map.values())

    # Mejor quiz score por unidad
    quiz_rows = (
        db.query(
            models.QuizResultado.id_unidad,
            func.max(
                (models.QuizResultado.correctas * 100) / models.QuizResultado.total
            ).label("best"),
            func.count().label("intentos"),
        )
        .filter(models.QuizResultado.id_usuario == user_id)
        .group_by(models.QuizResultado.id_unidad)
        .all()
    )
    quiz_map = {r.id_unidad: {"s": round(r.best), "i": r.intentos} for r in quiz_rows}

    # Progreso por unidad
    progreso_rows = (
        db.query(models.Progreso.id_unidad, models.Progreso.porcentaje)
        .filter(models.Progreso.id_usuario == user_id)
        .all()
    )
    progreso_map = {r.id_unidad: r.porcentaje for r in progreso_rows}

    # Materias seguidas
    seguidas_ids = set(
        r.id_materia for r in
        db.query(models.MateriaSeguida.id_materia)
        .filter(models.MateriaSeguida.id_usuario == user_id)
        .all()
    )

    # ── Mapa completo de la app ──────────────────────────────────────────────
    # Todas las materias con sus unidades y conteo de contenido
    materias = (
        db.query(models.Materia)
        .options(
            joinedload(models.Materia.unidades)
            .joinedload(models.Unidad.flashcards),
            joinedload(models.Materia.unidades)
            .joinedload(models.Unidad.quiz_preguntas),
            joinedload(models.Materia.unidades)
            .joinedload(models.Unidad.infografias),
            joinedload(models.Materia.unidades)
            .joinedload(models.Unidad.pdfs),
            joinedload(models.Materia.unidades)
            .joinedload(models.Unidad.temas),
        )
        .order_by(models.Materia.orden)
        .all()
    )

    mapa = []
    insights_urgente = []
    insights_debil = []
    insights_sin_tocar = []

    for materia in materias:
        seguida = materia.id in seguidas_ids
        unidades_data = []

        for unidad in sorted(materia.unidades, key=lambda u: u.orden or 0):
            fc_count = len(unidad.flashcards)
            qz_count = len(unidad.quiz_preguntas)
            inf_count = len(unidad.infografias)
            pdf_count = len(unidad.pdfs)
            temas_count = len(unidad.temas)

            entry = {"n": unidad.nombre}

            # Content counts (solo si > 0 para ahorrar tokens)
            if fc_count:
                entry["fc"] = fc_count
            if qz_count:
                entry["qz"] = qz_count
            if inf_count:
                entry["inf"] = inf_count
            if pdf_count:
                entry["pdf"] = pdf_count
            if temas_count:
                entry["temas"] = temas_count

            # User-specific data (solo si sigue la materia)
            if seguida:
                p = progreso_map.get(unidad.id, 0)
                d = due_map.get(unidad.id, 0)
                q = quiz_map.get(unidad.id)

                if p > 0:
                    entry["p"] = p
                if d > 0:
                    entry["due"] = d
                if q:
                    entry["quiz"] = q["s"]
                    if q["i"] > 1:
                        entry["qi"] = q["i"]  # quiz attempts

                # ── Insights ─────────────────────────────────────────────
                if d >= 5:
                    insights_urgente.append(f"{materia.nombre}/{unidad.nombre}: {d} cards vencidas")
                if q and q["s"] < 50 and q["i"] >= 2:
                    insights_debil.append(f"{materia.nombre}/{unidad.nombre}: quiz {q['s']}%")
                if p == 0 and fc_count > 0:
                    insights_sin_tocar.append(f"{materia.nombre}/{unidad.nombre}")

            unidades_data.append(entry)

        materia_entry = {"n": materia.nombre, "u": unidades_data}
        if seguida:
            materia_entry["seg"] = True
            # Average progress for followed materias
            progs = [progreso_map.get(u.id, 0) for u in materia.unidades]
            if progs:
                materia_entry["p"] = round(sum(progs) / len(progs))

        mapa.append(materia_entry)

    # ── Quiz recientes ───────────────────────────────────────────────────────
    recientes = (
        db.query(
            models.QuizResultado.correctas,
            models.QuizResultado.total,
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
        {"m": r.materia, "u": r.unidad, "s": round(r.correctas * 100 / r.total) if r.total else 0}
        for r in recientes
    ]

    # ── Memoria de Redo ──────────────────────────────────────────────────────
    memorias = _load_memorias(user_id, db)

    # ── Build context ────────────────────────────────────────────────────────
    ctx = {
        "nombre": nombre,
        "racha": user.racha or 0,
        "dias": dias,
        "due": due_total,
        "mapa": mapa,
    }

    # Campos opcionales (solo si aportan info, ahorra tokens)
    if quiz_recientes:
        ctx["quiz_rec"] = quiz_recientes
    if not todo_publico:
        ctx["priv"] = priv
    if notif_data:
        ctx["notif"] = notif_data
    if mins_inactivo is not None:
        ctx["inactivo"] = mins_inactivo
    if memorias:
        ctx["mem"] = memorias

    # Insights pre-calculados
    insights = {}
    if insights_urgente:
        insights["urgente"] = insights_urgente[:3]
    if insights_debil:
        insights["debil"] = insights_debil[:3]
    if insights_sin_tocar:
        insights["sin_tocar"] = insights_sin_tocar[:3]

    # Materias no seguidas
    no_seguidas = [m.nombre for m in materias if m.id not in seguidas_ids]
    if no_seguidas:
        insights["no_sigue"] = no_seguidas

    if insights:
        ctx["insights"] = insights

    return ctx


# ── Main entry point ──────────────────────────────────────────────────────────

async def get_mascota_message(
    user_id: int, accion: str, datos: dict, pantalla: str, db: Session
) -> dict:
    """
    Returns: {"mensaje": str, "accion": str | None}
    Side effect: may save a memory observation to DB.
    """
    # 1. Cache check
    cache_key = f"{user_id}:{accion}:{pantalla}"
    cached = cache_get(cache_key, accion)
    if cached:
        logger.info("[redo] cache HIT — %s", cache_key)
        mensaje, accion_sugerida, _ = _parse_response(cached)
        accion_obj = _pick_action_target(accion_sugerida, user_id, db) if accion_sugerida else None
        return {"mensaje": mensaje, "accion": accion_obj}

    # 2. Build full context
    ctx = _build_full_context(user_id, db)

    # 3. Compact user message
    user_msg = json.dumps(
        {**ctx, "accion": accion, "pantalla": pantalla, **datos},
        ensure_ascii=False,
        separators=(",", ":"),
    )

    logger.info("[redo] LLM call — key=%s payload=%d chars", cache_key, len(user_msg))

    # 4. Call LLM
    raw = await chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        max_tokens=100,
    )

    # 5. Parse response
    mensaje, accion_sugerida, memoria = _parse_response(raw)
    accion_obj = _pick_action_target(accion_sugerida, user_id, db) if accion_sugerida else None

    # 6. Save memory if Redo decided to remember something
    if memoria:
        try:
            _save_memoria(user_id, memoria, db)
        except Exception as e:
            logger.warning("[redo-mem] failed to save: %s", e)

    # 7. Cache raw response
    cache_set(cache_key, raw)
    logger.info(
        "[redo] result — %s | msg=%s | act=%s | mem=%s",
        cache_key, mensaje[:60], accion_obj, memoria,
    )

    return {"mensaje": mensaje, "accion": accion_obj}
