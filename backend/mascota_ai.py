"""
Redo — IA viva de DaathApp.

Arquitectura:
1. Context Tiers  — carga solo lo necesario según la acción (ahorro 50-70%)
2. Memory Layer   — carga/guarda observaciones de Redo por usuario
3. Insight Layer  — diagnóstico pedagógico (Bloom, spaced repetition, emocional)
4. Decision Layer — Redo sugiere acciones y guarda observaciones
5. Response Layer — parsea respuesta, extrae acción y memoria

Token strategy:
- System prompt FIJO → prefix-cached en DeepSeek (~150 tokens, pagados 1 vez)
- Context tiers: T0 (~50tok siempre), T1 (~150tok estudio), T2 (~300tok full)
- Memoria: ~50 tokens (5 entries × 10 tokens)
- Cache TTL por acción → misma situación = 0 tokens
- Emotional hint: ~15 tokens extra contextuales
- Spaced repetition insights: ~30 tokens cuando hay cards vencidas
"""
import json
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

import models
from llm import chat_completion, chat_completion_tracked, cache_get, cache_set
from token_tracker import log_ai_call

logger = logging.getLogger("uvicorn.error")

# ── Constantes ────────────────────────────────────────────────────────────────
MAX_MEMORIAS = 5

# ── System prompt ─────────────────────────────────────────────────────────────
# FIJO — DeepSeek prefix-cachea los primeros ~150 tokens. NO modificar el inicio.
SYSTEM_PROMPT = (
    "Sos Redo, perrito-tutor IA de DaathApp (estudio ingeniería minera). "
    "Tenés acceso completo: materias, unidades, progreso, flashcards, quiz, memoria.\n"
    "Misión: guiar al estudiante con datos reales. Recomendá qué estudiar/repasar.\n"
    "Personalidad: cálido, directo. Rioplatense informal. Sin 'Che'. Sin '!!' dobles.\n"
    "Max 2 oraciones. Max 1 emoji. Usá el nombre a veces. No te presentes.\n"
    "Líneas opcionales al final:\n"
    "→repaso|→quiz|→explorar (sugerir acción)\n"
    "💭texto corto (guardar observación para recordar)\n"
    "Solo si aportan.\n"
    "Si el contexto incluye 'nft': el estudiante tiene ese Telegram Gift como identidad. "
    "Podés mencionarlo naturalmente y con rareza — solo si encaja en la conversación."
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
                models.Flashcard.id_unidad,
                models.Unidad.id_materia,
                func.count().label("n"),
            )
            .join(models.CardReview, models.CardReview.id_flashcard == models.Flashcard.id)
            .join(models.Unidad, models.Unidad.id == models.Flashcard.id_unidad)
            .filter(models.CardReview.id_usuario == user_id, models.CardReview.due_date <= now)
            .group_by(models.Flashcard.id_unidad, models.Unidad.id_materia)
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


# ── Context Tier System ───────────────────────────────────────────────────────
# Tier 0 (~50 tok): nombre, racha, due count — ALWAYS loaded
# Tier 1 (~150 tok): progreso por materia, insights, quiz recientes — study actions
# Tier 2 (~300 tok): mapa completo de la app — only when needed (admin/debug)
#
# Action → Tier mapping:
_TIER_MAP = {
    "app_open": 1, "idle": 1, "enter": 1,
    "flashcard_complete": 1, "quiz_complete": 1,
    "drop_materia": 0,
}

def _get_tier(accion: str) -> int:
    return _TIER_MAP.get(accion, 1)


def _emotional_hint(racha: int, racha_perdida: bool, due_total: int, avg_quiz: float | None) -> str | None:
    """Generate an emotional calibration hint (~15 tokens) for Redo's tone."""
    hints = []
    if racha >= 7:
        hints.append("buen ritmo, mantené momentum")
    if racha_perdida:
        hints.append("perdió la racha, puede estar desmotivado, alentá")
    if avg_quiz is not None and avg_quiz < 40:
        hints.append("quizzes bajos, está luchando, no abrumar")
    if due_total > 20:
        hints.append("muchas cards atrasadas, priorizar repaso")
    elif due_total > 10:
        hints.append("cards acumulándose, sugerir repaso")
    return " | ".join(hints) if hints else None


def _spaced_repetition_insights(user_id: int, db: Session) -> dict | None:
    """Calculate spaced repetition awareness data."""
    from datetime import timedelta
    now = datetime.now(timezone.utc)

    # Cards with interval >= 7 days that are heavily overdue (due_date was > 14 days ago)
    decay_threshold = now - timedelta(days=14)
    decay_risk = (
        db.query(func.count())
        .select_from(models.CardReview)
        .filter(
            models.CardReview.id_usuario == user_id,
            models.CardReview.interval >= 7,
            models.CardReview.due_date <= decay_threshold,
        )
        .scalar()
    ) or 0

    # Cards due in next 2 hours
    two_hours = now + timedelta(hours=2)
    review_soon = (
        db.query(func.count())
        .select_from(models.CardReview)
        .filter(
            models.CardReview.id_usuario == user_id,
            models.CardReview.due_date > now,
            models.CardReview.due_date <= two_hours,
        )
        .scalar()
    ) or 0

    if not decay_risk and not review_soon:
        return None

    sr = {}
    if decay_risk:
        sr["decay_risk"] = decay_risk
    if review_soon:
        sr["review_soon"] = review_soon
    return sr


def _build_context(user_id: int, accion: str, db: Session) -> dict:
    """
    Tiered context builder — loads only what's needed per action.
    Saves 50-70% tokens on common actions vs loading everything.
    """
    now = datetime.now(timezone.utc)
    tier = _get_tier(accion)

    # ── TIER 0: Always loaded (~50 tokens) ────────────────────────────────
    user = db.query(models.User).filter(models.User.id_telegram == user_id).first()
    if not user:
        return {"nombre": "estudiante", "racha": 0, "due": 0}

    nombre = user.first_name or "estudiante"

    # Due total (quick count)
    due_total = (
        db.query(func.count())
        .select_from(models.CardReview)
        .filter(models.CardReview.id_usuario == user_id, models.CardReview.due_date <= now)
        .scalar()
    ) or 0

    # Racha perdida detection
    racha = user.racha or 0
    racha_perdida = False
    if user.ultima_actividad:
        ua = user.ultima_actividad
        if ua.tzinfo is None:
            ua = ua.replace(tzinfo=timezone.utc)
        hours_inactive = (now - ua).total_seconds() / 3600
        if hours_inactive > 48 and racha == 0:
            racha_perdida = True

    ctx = {
        "nombre": nombre,
        "racha": racha,
        "due": due_total,
    }

    # Emotional calibration hint
    avg_quiz = None
    if tier >= 1:
        avg_quiz_row = (
            db.query(func.avg((models.QuizResultado.correctas * 100) / models.QuizResultado.total))
            .filter(models.QuizResultado.id_usuario == user_id)
            .scalar()
        )
        avg_quiz = round(float(avg_quiz_row)) if avg_quiz_row else None

    emo = _emotional_hint(racha, racha_perdida, due_total, avg_quiz)
    if emo:
        ctx["hint"] = emo

    # Memoria
    memorias = _load_memorias(user_id, db)
    if memorias:
        ctx["mem"] = memorias

    # NFT activo — ~20 tokens extra, adds personal identity context
    if user.nft_activo_address:
        nft = db.query(models.NftCache).filter(
            models.NftCache.address == user.nft_activo_address
        ).first()
        if nft:
            ctx["nft"] = nft.nombre
            if nft.coleccion:
                ctx["nft_col"] = nft.coleccion

    if tier == 0:
        return ctx

    # ── TIER 1: Study context (~150 tokens extra) ────────────────────────
    # Materias seguidas + progreso
    seguidas_ids = set(
        r.id_materia for r in
        db.query(models.MateriaSeguida.id_materia)
        .filter(models.MateriaSeguida.id_usuario == user_id)
        .all()
    )

    progreso_rows = (
        db.query(models.Progreso.id_unidad, models.Progreso.id_materia, models.Progreso.porcentaje)
        .filter(models.Progreso.id_usuario == user_id)
        .all()
    )
    progreso_map = {r.id_unidad: r.porcentaje for r in progreso_rows}

    # Due per unidad
    due_rows = (
        db.query(models.Flashcard.id_unidad, func.count().label("n"))
        .join(models.CardReview, models.CardReview.id_flashcard == models.Flashcard.id)
        .filter(models.CardReview.id_usuario == user_id, models.CardReview.due_date <= now)
        .group_by(models.Flashcard.id_unidad)
        .all()
    )
    due_map = {r.id_unidad: r.n for r in due_rows}

    # Quiz scores
    quiz_rows = (
        db.query(
            models.QuizResultado.id_unidad,
            func.max((models.QuizResultado.correctas * 100) / models.QuizResultado.total).label("best"),
            func.count().label("intentos"),
        )
        .filter(models.QuizResultado.id_usuario == user_id)
        .group_by(models.QuizResultado.id_unidad)
        .all()
    )
    quiz_map = {r.id_unidad: {"s": round(r.best), "i": r.intentos} for r in quiz_rows}

    # Build compact materia summaries (only followed)
    materias = (
        db.query(models.Materia)
        .options(joinedload(models.Materia.unidades))
        .filter(models.Materia.id.in_(seguidas_ids))
        .order_by(models.Materia.orden)
        .all()
    ) if seguidas_ids else []

    mapa = []
    insights_urgente = []
    insights_debil = []

    for materia in materias:
        unidades_data = []
        for unidad in sorted(materia.unidades, key=lambda u: u.orden or 0):
            entry = {"n": unidad.nombre}
            p = progreso_map.get(unidad.id, 0)
            d = due_map.get(unidad.id, 0)
            q = quiz_map.get(unidad.id)
            if p > 0: entry["p"] = p
            if d > 0: entry["due"] = d
            if q: entry["quiz"] = q["s"]

            if d >= 5:
                insights_urgente.append(f"{materia.nombre}/{unidad.nombre}: {d} vencidas")
            if q and q["s"] < 50 and q["i"] >= 2:
                insights_debil.append(f"{materia.nombre}/{unidad.nombre}: quiz {q['s']}%")

            unidades_data.append(entry)

        progs = [progreso_map.get(u.id, 0) for u in materia.unidades]
        mapa.append({
            "n": materia.nombre, "seg": True, "u": unidades_data,
            "p": round(sum(progs) / len(progs)) if progs else 0,
        })

    if mapa:
        ctx["mapa"] = mapa

    # Insights
    insights = {}
    if insights_urgente:
        insights["urgente"] = insights_urgente[:3]
    if insights_debil:
        insights["debil"] = insights_debil[:3]

    # Materias no seguidas (just names, minimal tokens)
    all_materia_ids = set(m.id for m in db.query(models.Materia.id).all())
    no_seguidas_ids = all_materia_ids - seguidas_ids
    if no_seguidas_ids:
        no_seg_names = [
            m.nombre for m in
            db.query(models.Materia.nombre).filter(models.Materia.id.in_(no_seguidas_ids)).all()
        ]
        if no_seg_names:
            insights["no_sigue"] = no_seg_names

    if insights:
        ctx["insights"] = insights

    # Quiz recientes
    recientes = (
        db.query(
            models.QuizResultado.correctas,
            models.QuizResultado.total,
            models.Unidad.nombre.label("unidad"),
        )
        .join(models.Unidad, models.QuizResultado.id_unidad == models.Unidad.id)
        .filter(models.QuizResultado.id_usuario == user_id)
        .order_by(models.QuizResultado.fecha.desc())
        .limit(3)
        .all()
    )
    if recientes:
        ctx["quiz_rec"] = [
            {"u": r.unidad, "s": round(r.correctas * 100 / r.total) if r.total else 0}
            for r in recientes
        ]

    # Spaced repetition awareness
    sr = _spaced_repetition_insights(user_id, db)
    if sr:
        ctx["sr"] = sr

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
        log_ai_call(db, user_id, "mascota", accion, "deepseek-chat", 0, 0, 0, 0, cache_hit=True)
        mensaje, accion_sugerida, _ = _parse_response(cached)
        accion_obj = _pick_action_target(accion_sugerida, user_id, db) if accion_sugerida else None
        return {"mensaje": mensaje, "accion": accion_obj}

    # 2. Build tiered context (loads only what's needed)
    ctx = _build_context(user_id, accion, db)

    # 3. Compact user message
    user_msg = json.dumps(
        {**ctx, "accion": accion, "pantalla": pantalla, **datos},
        ensure_ascii=False,
        separators=(",", ":"),
    )

    logger.info("[redo] LLM call — key=%s payload=%d chars", cache_key, len(user_msg))

    # 4. Call LLM (tracked)
    llm_result = await chat_completion_tracked(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        max_tokens=100,
    )
    raw = llm_result["content"]

    # 4b. Log AI call
    log_ai_call(
        db, user_id, "mascota", accion, llm_result["model"],
        llm_result["tokens_in"], llm_result["tokens_out"],
        llm_result["tokens_cached"], llm_result["latencia_ms"],
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
