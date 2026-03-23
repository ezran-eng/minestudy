"""
Tutor Chat — conversational AI tutoring with Redo.

Unlike mascota_ai.py (ambient 2-sentence bubbles), this module handles
multi-turn teaching conversations scoped to a specific unidad's content.

Architecture:
1. Focused context builder — loads only the target unidad's content
2. Tutor system prompt — allows detailed explanations (up to ~200 words)
3. Conversation window — last 6 exchanges to stay within token budget
4. No caching — each message is a fresh LLM call

Token budget (~1400 per call):
- System prompt: ~300 tokens (prefix-cached after first call)
- Unidad context: ~300-500 tokens
- Conversation history (6 exchanges): ~600 tokens
- Response: max_tokens=350
"""
import json
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func

import models
from llm import chat_completion
from periodic_table import search_elements

logger = logging.getLogger("uvicorn.error")

# ── System prompt (fixed, prefix-cached by DeepSeek) ─────────────────────────
TUTOR_SYSTEM_PROMPT = (
    "Sos Redo, el tutor IA de DaathApp (app de estudio para ingeniería minera). "
    "Estás en modo tutor: el estudiante te hace preguntas y vos explicás.\n\n"
    "Reglas:\n"
    "- Explicá con claridad, usá ejemplos concretos cuando ayuden\n"
    "- Si el contexto incluye flashcards o preguntas de quiz sobre el tema, "
    "referencialas para reforzar el aprendizaje\n"
    "- Si no sabés algo, decilo honestamente\n"
    "- Español rioplatense informal, cálido y directo\n"
    "- Máximo ~150 palabras por respuesta. Sé conciso pero completo\n"
    "- Si el estudiante pregunta algo fuera de la materia, respondé brevemente "
    "y sugerí volver al tema\n"
    "- Podés usar emojis con moderación (máximo 2)\n"
    "- Si preguntan sobre un elemento químico, tenés datos de la tabla periódica "
    "con aplicaciones en minería. Usá ese contexto para dar respuestas relevantes\n"
    "- Usá el nombre del estudiante de vez en cuando\n"
    "- Formato: texto plano, sin markdown, sin bullets largos\n"
    "- Si la pregunta se puede responder con una flashcard existente, "
    "mencioná que hay una flashcard sobre eso para que la repase"
)

MAX_HISTORY = 12  # 6 exchanges (user + assistant each)


def _build_tutor_context(unidad_id: int, user_id: int, db: Session) -> dict:
    """Build focused context for a specific unidad."""
    now = datetime.now(timezone.utc)

    # User info
    user = db.query(models.User).filter(models.User.id_telegram == user_id).first()
    nombre = "estudiante"
    if user:
        nombre = user.first_name or "estudiante"
        if user.last_name:
            nombre += f" {user.last_name}"

    if not unidad_id:
        return {"nombre": nombre, "modo": "general"}

    # Unidad + Materia
    unidad = (
        db.query(models.Unidad)
        .filter(models.Unidad.id == unidad_id)
        .first()
    )
    if not unidad:
        return {"nombre": nombre, "modo": "general"}

    materia = db.query(models.Materia).filter(models.Materia.id == unidad.id_materia).first()

    # Temas
    temas = (
        db.query(models.Tema.nombre)
        .filter(models.Tema.id_unidad == unidad_id)
        .order_by(models.Tema.id)
        .all()
    )

    # Flashcards (Q&A — the actual study content Redo can reference)
    flashcards = (
        db.query(models.Flashcard.pregunta, models.Flashcard.respuesta)
        .filter(models.Flashcard.id_unidad == unidad_id)
        .limit(25)  # cap to control tokens
        .all()
    )

    # Quiz questions (with correct answer + justification)
    quiz = (
        db.query(
            models.QuizPregunta.pregunta,
            models.QuizPregunta.respuesta_correcta,
            models.QuizPregunta.justificacion,
        )
        .filter(models.QuizPregunta.id_unidad == unidad_id)
        .limit(20)
        .all()
    )

    # User progress for this unidad
    progreso = (
        db.query(models.Progreso.porcentaje)
        .filter(
            models.Progreso.id_usuario == user_id,
            models.Progreso.id_unidad == unidad_id,
        )
        .first()
    )

    # Due flashcards count
    due_count = (
        db.query(func.count())
        .select_from(models.CardReview)
        .join(models.Flashcard, models.Flashcard.id == models.CardReview.id_flashcard)
        .filter(
            models.CardReview.id_usuario == user_id,
            models.Flashcard.id_unidad == unidad_id,
            models.CardReview.due_date <= now,
        )
        .scalar()
    ) or 0

    # Best quiz score
    best_quiz = (
        db.query(func.max((models.QuizResultado.correctas * 100) / models.QuizResultado.total))
        .filter(
            models.QuizResultado.id_usuario == user_id,
            models.QuizResultado.id_unidad == unidad_id,
        )
        .scalar()
    )

    # Redo's memories about this student
    memorias = (
        db.query(models.RedoMemoria.contenido)
        .filter(models.RedoMemoria.id_usuario == user_id)
        .order_by(models.RedoMemoria.created_at.desc())
        .limit(3)
        .all()
    )

    # Build compact context
    ctx = {
        "nombre": nombre,
        "materia": materia.nombre if materia else "?",
        "unidad": unidad.nombre,
    }

    if temas:
        ctx["temas"] = [t.nombre for t in temas]

    if flashcards:
        ctx["fc"] = [{"q": f.pregunta, "a": f.respuesta} for f in flashcards]

    if quiz:
        ctx["quiz"] = [
            {"q": q.pregunta, "r": q.respuesta_correcta, "j": q.justificacion or ""}
            for q in quiz
        ]

    if progreso:
        ctx["progreso"] = progreso.porcentaje
    if due_count:
        ctx["fc_due"] = due_count
    if best_quiz is not None:
        ctx["quiz_best"] = round(best_quiz)
    if memorias:
        ctx["mem"] = [m.contenido for m in memorias]

    return ctx


async def tutor_respond(
    user_id: int,
    unidad_id: int | None,
    history: list[dict],
    question: str,
    db: Session,
) -> str:
    """
    Handle a tutor chat message.
    Returns Redo's response string.
    """
    # 1. Build focused context
    ctx = _build_tutor_context(unidad_id, user_id, db)

    context_msg = json.dumps(ctx, ensure_ascii=False, separators=(",", ":"))

    # 2. Build messages array
    messages = [
        {"role": "system", "content": TUTOR_SYSTEM_PROMPT},
        {"role": "user", "content": f"[contexto]\n{context_msg}"},
    ]

    # 3. Append conversation history (capped)
    trimmed = history[-MAX_HISTORY:] if len(history) > MAX_HISTORY else history
    for msg in trimmed:
        messages.append({"role": msg["role"], "content": msg["content"]})

    # 4. Check if question references chemical elements — inject context
    element_hits = search_elements(question)
    if element_hits:
        el_ctx = " | ".join(
            f"{e['symbol']}(Z={e['Z']}) {e['name']}: {e['mining']}"
            for e in element_hits[:3]
        )
        messages.append({
            "role": "user",
            "content": f"[elementos relevantes] {el_ctx}",
        })

    # 5. Append new question
    messages.append({"role": "user", "content": question})

    logger.info(
        "[tutor] user=%s unidad=%s ctx=%d chars history=%d msgs",
        user_id, unidad_id, len(context_msg), len(trimmed),
    )

    # 5. Call LLM with higher token limit and timeout
    response = await chat_completion(messages, max_tokens=350, timeout=15.0)

    return response
