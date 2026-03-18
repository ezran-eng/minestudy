"""
AI Content Generation — flashcards and quiz questions.

Uses the LLM to generate study content for a given unidad,
informed by existing temas, flashcards, and quiz questions
to avoid duplicates.
"""
import json
import logging
from sqlalchemy.orm import Session

import models
from llm import chat_completion

logger = logging.getLogger("uvicorn.error")

# ── Flashcard generation ──────────────────────────────────────────────────────

FLASHCARD_SYSTEM = (
    "Sos un generador de flashcards para una app de estudio universitario "
    "(ingeniería minera, Argentina). Generás flashcards de alta calidad.\n\n"
    "Reglas:\n"
    "- Pregunta clara y específica, respuesta concisa pero completa\n"
    "- Nivel universitario, técnicamente preciso\n"
    "- Variá entre definiciones, aplicaciones, comparaciones y datos clave\n"
    "- NO repitas flashcards que ya existen (se te dan las existentes)\n"
    "- Español argentino\n\n"
    "Respondé SOLO con un JSON array, sin texto adicional:\n"
    '[{"pregunta": "...", "respuesta": "..."}, ...]'
)


async def generate_flashcards(
    unidad_id: int, count: int, db: Session
) -> list[dict]:
    """Generate `count` new flashcards for a unidad using AI."""
    unidad = db.query(models.Unidad).filter(models.Unidad.id == unidad_id).first()
    if not unidad:
        raise ValueError(f"Unidad {unidad_id} not found")

    materia = db.query(models.Materia).filter(models.Materia.id == unidad.id_materia).first()

    # Existing content for context (avoid duplicates)
    temas = [t.nombre for t in db.query(models.Tema.nombre).filter(models.Tema.id_unidad == unidad_id).all()]
    existing = [
        f.pregunta for f in
        db.query(models.Flashcard.pregunta).filter(models.Flashcard.id_unidad == unidad_id).all()
    ]

    context = {
        "materia": materia.nombre if materia else "?",
        "unidad": unidad.nombre,
    }
    if temas:
        context["temas"] = temas
    if existing:
        context["existentes"] = existing[:30]  # cap to save tokens

    user_msg = (
        f"Generá {count} flashcards para:\n"
        f"{json.dumps(context, ensure_ascii=False, separators=(',', ':'))}"
    )

    raw = await chat_completion(
        messages=[
            {"role": "system", "content": FLASHCARD_SYSTEM},
            {"role": "user", "content": user_msg},
        ],
        max_tokens=1500,
        timeout=20.0,
    )

    # Parse JSON from response
    cards = _parse_json_array(raw)
    if not cards:
        logger.warning("[ai-gen] Failed to parse flashcards from: %s", raw[:200])
        return []

    # Validate and insert
    created = []
    for card in cards[:count]:
        q = card.get("pregunta", "").strip()
        a = card.get("respuesta", "").strip()
        if not q or not a:
            continue

        fc = models.Flashcard(id_unidad=unidad_id, pregunta=q, respuesta=a)
        db.add(fc)
        created.append({"pregunta": q, "respuesta": a})

    if created:
        db.commit()
        logger.info("[ai-gen] Created %d flashcards for unidad %d", len(created), unidad_id)

    return created


# ── Quiz generation ───────────────────────────────────────────────────────────

QUIZ_SYSTEM = (
    "Sos un generador de preguntas de quiz para una app de estudio universitario "
    "(ingeniería minera, Argentina). Generás preguntas de opción múltiple.\n\n"
    "Reglas:\n"
    "- 4 opciones (a, b, c, d), solo una correcta\n"
    "- Incluí justificación breve de la respuesta correcta\n"
    "- Nivel universitario, distractores plausibles\n"
    "- NO repitas preguntas que ya existen\n"
    "- Español argentino\n\n"
    "Respondé SOLO con un JSON array, sin texto adicional:\n"
    '[{"pregunta": "...", "opcion_a": "...", "opcion_b": "...", '
    '"opcion_c": "...", "opcion_d": "...", '
    '"respuesta_correcta": "a|b|c|d", "justificacion": "..."}]'
)


async def generate_quiz(
    unidad_id: int, count: int, db: Session
) -> list[dict]:
    """Generate `count` new quiz questions for a unidad using AI."""
    unidad = db.query(models.Unidad).filter(models.Unidad.id == unidad_id).first()
    if not unidad:
        raise ValueError(f"Unidad {unidad_id} not found")

    materia = db.query(models.Materia).filter(models.Materia.id == unidad.id_materia).first()

    temas = [t.nombre for t in db.query(models.Tema.nombre).filter(models.Tema.id_unidad == unidad_id).all()]
    existing = [
        q.pregunta for q in
        db.query(models.QuizPregunta.pregunta).filter(models.QuizPregunta.id_unidad == unidad_id).all()
    ]

    # Also use flashcards as knowledge source
    flashcards = [
        {"q": f.pregunta, "a": f.respuesta} for f in
        db.query(models.Flashcard.pregunta, models.Flashcard.respuesta)
        .filter(models.Flashcard.id_unidad == unidad_id).limit(20).all()
    ]

    context = {
        "materia": materia.nombre if materia else "?",
        "unidad": unidad.nombre,
    }
    if temas:
        context["temas"] = temas
    if existing:
        context["existentes"] = existing[:20]
    if flashcards:
        context["flashcards"] = flashcards

    user_msg = (
        f"Generá {count} preguntas de quiz para:\n"
        f"{json.dumps(context, ensure_ascii=False, separators=(',', ':'))}"
    )

    raw = await chat_completion(
        messages=[
            {"role": "system", "content": QUIZ_SYSTEM},
            {"role": "user", "content": user_msg},
        ],
        max_tokens=2000,
        timeout=25.0,
    )

    questions = _parse_json_array(raw)
    if not questions:
        logger.warning("[ai-gen] Failed to parse quiz from: %s", raw[:200])
        return []

    created = []
    for q in questions[:count]:
        pregunta = q.get("pregunta", "").strip()
        if not pregunta:
            continue
        rc = q.get("respuesta_correcta", "").strip().lower()
        if rc not in ("a", "b", "c", "d"):
            continue

        quiz_q = models.QuizPregunta(
            id_unidad=unidad_id,
            pregunta=pregunta,
            opcion_a=q.get("opcion_a", "").strip(),
            opcion_b=q.get("opcion_b", "").strip(),
            opcion_c=q.get("opcion_c", "").strip(),
            opcion_d=q.get("opcion_d", "").strip(),
            respuesta_correcta=rc,
            justificacion=q.get("justificacion", "").strip() or None,
        )
        db.add(quiz_q)
        created.append({"pregunta": pregunta, "respuesta_correcta": rc})

    if created:
        db.commit()
        logger.info("[ai-gen] Created %d quiz questions for unidad %d", len(created), unidad_id)

    return created


# ── JSON parser helper ────────────────────────────────────────────────────────

def _parse_json_array(raw: str) -> list[dict]:
    """Extract a JSON array from LLM output, handling markdown fences."""
    text = raw.strip()
    # Strip markdown code fences
    if text.startswith("```"):
        lines = text.split("\n")
        lines = lines[1:]  # remove opening fence
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()

    try:
        data = json.loads(text)
        if isinstance(data, list):
            return data
    except json.JSONDecodeError:
        # Try to find array within the text
        start = text.find("[")
        end = text.rfind("]")
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except json.JSONDecodeError:
                pass
    return []
