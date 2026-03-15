"""
Mascota AI — builds user context from DB and generates responses via LLM.
"""
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func

import models
from llm import chat_completion

SYSTEM_PROMPT = """\
Sos la mascota-perrito de DaathApp, una app de estudio para ingeniería minera.
Tu nombre es Daath. Personalidad:
- Español rioplatense informal (vos, dale, che)
- Mensajes MUY cortos: máximo 1-2 oraciones
- Empático, motivador pero sin exagerar — nada de "¡¡Increíble!!"
- Usás los datos reales del estudiante de forma natural cuando son relevantes
- Máximo 1 emoji por mensaje, solo si suma
- No usás comillas, no te presentás, no explicás que sos un bot
Solo respondé con el mensaje, sin prefijos ni formato extra.\
"""


def _fetch_user_context(user_id: int, db: Session) -> dict:
    """Collect all relevant study data for the user."""
    now = datetime.now(timezone.utc)

    user = db.query(models.User).filter(models.User.id_telegram == user_id).first()
    if not user:
        return {"nombre": "estudiante", "racha": 0, "flashcards_due": 0, "materias": []}

    flashcards_due = (
        db.query(func.count(models.CardReview.id_flashcard))
        .filter(models.CardReview.id_usuario == user_id, models.CardReview.due_date <= now)
        .scalar()
    ) or 0

    seguidas = (
        db.query(models.MateriaSeguida)
        .filter(models.MateriaSeguida.id_usuario == user_id)
        .all()
    )

    materias = []
    for ms in seguidas[:5]:
        materia = db.query(models.Materia).filter(models.Materia.id == ms.id_materia).first()
        if not materia:
            continue
        progresos = (
            db.query(models.Progreso.porcentaje)
            .filter(models.Progreso.id_usuario == user_id, models.Progreso.id_materia == ms.id_materia)
            .all()
        )
        avg = round(sum(p.porcentaje for p in progresos) / len(progresos)) if progresos else 0
        materias.append({"nombre": materia.nombre, "progreso": avg})

    return {
        "nombre": user.first_name,
        "racha": user.racha or 0,
        "flashcards_due": flashcards_due,
        "materias": materias,
    }


def _build_situacion(accion: str, pantalla: str, datos: dict, ctx: dict) -> str:
    """Describe the current student situation for the LLM prompt."""
    nombre = ctx["nombre"]
    racha = ctx["racha"]
    due = ctx["flashcards_due"]
    materias = ctx["materias"]

    if accion == "app_open":
        parts = [f"{nombre} acaba de abrir la app."]
        if due > 0:
            parts.append(f"Tiene {due} flashcards vencidas.")
        if racha > 1:
            parts.append(f"Lleva {racha} días de racha.")
        return " ".join(parts)

    if accion == "enter":
        if pantalla == "home":
            mat_str = ", ".join(f"{m['nombre']} ({m['progreso']}%)" for m in materias) or "ninguna"
            return (
                f"{nombre} está en el inicio. Racha: {racha} días. "
                f"Flashcards vencidas: {due}. Materias: {mat_str}."
            )
        if pantalla == "study":
            return f"{nombre} está explorando las materias disponibles. Sigue {len(materias)} materias."
        if pantalla == "unidad":
            unidad = datos.get("unidad_nombre", "una unidad")
            progreso = datos.get("unidad_progreso", 0)
            return f"{nombre} entró a la unidad '{unidad}' con {progreso}% de progreso."
        if pantalla == "perfil":
            return f"{nombre} está viendo su perfil. Racha: {racha} días. Sigue {len(materias)} materias."

    if accion == "idle":
        return f"{nombre} lleva un rato sin interactuar en la pantalla '{pantalla}'."

    if accion == "flashcard_complete":
        return f"{nombre} terminó una sesión completa de flashcards."

    if accion == "drop_materia":
        mat_nombre = datos.get("nombre", "una materia")
        progreso = datos.get("progreso", datos.get("porcentaje_total", 0))
        vencidas = datos.get("vencidas", 0)
        return (
            f"{nombre} arrastró la mascota sobre la materia '{mat_nombre}' "
            f"(progreso: {progreso}%, flashcards vencidas: {vencidas})."
        )

    # Generic fallback
    return f"{nombre} realizó la acción '{accion}' en '{pantalla}'."


async def get_mascota_message(
    user_id: int, accion: str, datos: dict, pantalla: str, db: Session
) -> str:
    ctx = _fetch_user_context(user_id, db)
    situacion = _build_situacion(accion, pantalla, datos, ctx)

    return await chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": situacion},
        ],
        max_tokens=60,
    )
