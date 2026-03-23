"""
Focused AI study actions for Redo mascot.
No conversation history — each action is a single targeted call.
Estimated cost per action: ~150-280 tokens (vs ~1750 for open chat).
"""
import models
from llm import chat_completion
from datetime import datetime, timezone
from periodic_table import lookup_element, element_context_for_llm

_SYS = (
    "Sos Redo, tutor de ingeniería minera. "
    "Respondé en español rioplatense, breve y claro. "
    "Nunca uses markdown ni asteriscos."
)


def _unidad_ctx(unidad, materia, temas):
    t = ", ".join(t.nombre for t in temas) if temas else "ninguno"
    return f"Materia: {materia.nombre}. Unidad: {unidad.nombre}. Temas: {t}."


async def accion_concepto_clave(unidad_id: int, db) -> str:
    unidad = db.query(models.Unidad).filter(models.Unidad.id == unidad_id).first()
    if not unidad:
        return "No encontré la unidad."
    materia = db.query(models.Materia).filter(models.Materia.id == unidad.id_materia).first()
    temas = db.query(models.Tema).filter(models.Tema.id_unidad == unidad_id).all()

    # Add a few flashcards as content reference
    flashcards = (
        db.query(models.Flashcard)
        .filter(models.Flashcard.id_unidad == unidad_id)
        .limit(6)
        .all()
    )
    fc_hint = ""
    if flashcards:
        fc_hint = " Conceptos clave: " + "; ".join(
            f"{fc.pregunta} → {fc.respuesta}" for fc in flashcards[:4]
        ) + "."

    msgs = [
        {"role": "system", "content": _SYS},
        {"role": "user", "content": (
            f"{_unidad_ctx(unidad, materia, temas)}{fc_hint}\n"
            "¿Cuál es el concepto más importante de esta unidad? Respondé en 2-3 oraciones."
        )},
    ]
    return await chat_completion(msgs, max_tokens=110, timeout=10.0)


async def accion_punto_debil(user_id: int, unidad_id: int, db) -> str:
    unidad = db.query(models.Unidad).filter(models.Unidad.id == unidad_id).first()
    if not unidad:
        return "No encontré la unidad."
    materia = db.query(models.Materia).filter(models.Materia.id == unidad.id_materia).first()

    now = datetime.now(timezone.utc)

    quizzes = (
        db.query(models.QuizResultado)
        .filter(
            models.QuizResultado.id_usuario == user_id,
            models.QuizResultado.id_unidad == unidad_id,
        )
        .order_by(models.QuizResultado.fecha.desc())
        .limit(3)
        .all()
    )

    due_count = (
        db.query(models.CardReview)
        .join(models.Flashcard, models.CardReview.id_flashcard == models.Flashcard.id)
        .filter(
            models.CardReview.id_usuario == user_id,
            models.Flashcard.id_unidad == unidad_id,
            models.CardReview.due_date <= now,
        )
        .count()
    )

    ctx = f"Materia: {materia.nombre}. Unidad: {unidad.nombre}."
    if quizzes:
        ctx += " Últimos quiz: " + ", ".join(f"{q.correctas}/{q.total}" for q in quizzes) + "."
    else:
        ctx += " Sin quiz completados."
    ctx += f" Flashcards vencidas sin repasar: {due_count}."

    msgs = [
        {"role": "system", "content": _SYS},
        {"role": "user", "content": (
            f"{ctx}\n"
            "¿Cuál es mi punto más débil en esta unidad? Dame un consejo concreto en 2 oraciones."
        )},
    ]
    return await chat_completion(msgs, max_tokens=90, timeout=10.0)


async def accion_practica(unidad_id: int, db) -> str:
    unidad = db.query(models.Unidad).filter(models.Unidad.id == unidad_id).first()
    if not unidad:
        return "No encontré la unidad."
    materia = db.query(models.Materia).filter(models.Materia.id == unidad.id_materia).first()
    temas = db.query(models.Tema).filter(models.Tema.id_unidad == unidad_id).all()
    flashcards = (
        db.query(models.Flashcard)
        .filter(models.Flashcard.id_unidad == unidad_id)
        .limit(8)
        .all()
    )

    ctx = _unidad_ctx(unidad, materia, temas)
    if flashcards:
        ctx += "\nContenido: " + " | ".join(
            f"{fc.pregunta}: {fc.respuesta}" for fc in flashcards[:5]
        )

    msgs = [
        {"role": "system", "content": _SYS + " Al generar una pregunta de práctica, terminá siempre con 'Respuesta: ...' en una línea aparte."},
        {"role": "user", "content": f"{ctx}\nGenerame UNA pregunta de práctica sobre esta unidad con su respuesta."},
    ]
    return await chat_completion(msgs, max_tokens=160, timeout=10.0)


async def accion_explicar_tema(unidad_id: int, tema_nombre: str, db) -> str:
    unidad = db.query(models.Unidad).filter(models.Unidad.id == unidad_id).first()
    if not unidad:
        return "No encontré la unidad."
    materia = db.query(models.Materia).filter(models.Materia.id == unidad.id_materia).first()

    # Include any flashcards related to this tema as context
    flashcards = (
        db.query(models.Flashcard)
        .filter(models.Flashcard.id_unidad == unidad_id)
        .limit(10)
        .all()
    )
    fc_ctx = ""
    if flashcards:
        relevant = [fc for fc in flashcards if tema_nombre.lower() in fc.pregunta.lower() or tema_nombre.lower() in fc.respuesta.lower()]
        if relevant:
            fc_ctx = "\nContexto: " + " | ".join(f"{fc.pregunta}: {fc.respuesta}" for fc in relevant[:3])

    msgs = [
        {"role": "system", "content": _SYS},
        {"role": "user", "content": (
            f"Materia: {materia.nombre}. Unidad: {unidad.nombre}.{fc_ctx}\n"
            f"Explicame el tema '{tema_nombre}' en 3 oraciones simples con un ejemplo concreto."
        )},
    ]
    return await chat_completion(msgs, max_tokens=130, timeout=10.0)


async def accion_elemento(symbol: str) -> str:
    """Explain a chemical element with mining context."""
    el = lookup_element(symbol)
    if not el:
        return f"No encontré el elemento '{symbol}'."

    ctx = element_context_for_llm(symbol)
    msgs = [
        {"role": "system", "content": _SYS},
        {"role": "user", "content": (
            f"Dato del elemento: {ctx}\n"
            "Explicame este elemento en el contexto de ingeniería minera. "
            "Incluí su importancia, mineral principal y aplicación. 3-4 oraciones."
        )},
    ]
    return await chat_completion(msgs, max_tokens=150, timeout=10.0)
