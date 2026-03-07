import json
import logging

from telegram import Update
from telegram.ext import ContextTypes, ConversationHandler

from bot_config import WAITING_QUIZ_JSON
from bot_menus import send_success_menu
from database import SessionLocal
import models

logger = logging.getLogger(__name__)


async def qz_doc_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    if not update.message.document:
        await update.message.reply_text("Por favor enviá un documento JSON, o /cancel.")
        return WAITING_QUIZ_JSON

    uni_id = context.user_data.get('selected_unidad_id')
    logger.info(f"qz_doc_received: uni_id={uni_id}")

    if not uni_id:
        logger.error("qz_doc_received: uni_id is None — user_data lost")
        await update.message.reply_text("❌ Error interno: se perdió la unidad seleccionada. Empezá de nuevo con /admin.")
        return ConversationHandler.END

    try:
        logger.info(f"qz_doc_received: downloading file_id={update.message.document.file_id}")
        file = await context.bot.get_file(update.message.document.file_id)
        content = await file.download_as_bytearray()
        logger.info(f"qz_doc_received: downloaded {len(content)} bytes")

        text_content = content.decode('utf-8')
        data = json.loads(text_content)

        if not isinstance(data, list):
            await update.message.reply_text("❌ Error: El JSON debe ser un array de objetos.")
            return ConversationHandler.END

        logger.info(f"qz_doc_received: {len(data)} items en el JSON, primer item: {data[0] if data else 'lista vacía'}")

        db = SessionLocal()
        count = 0
        for item in data:
            required_keys = ['pregunta', 'opcion_a', 'opcion_b', 'opcion_c', 'opcion_d', 'respuesta_correcta']
            if not all(k in item for k in required_keys):
                logger.info(f"qz_doc_received: item saltado por claves faltantes — claves presentes: {list(item.keys())}")
                continue

            q = models.QuizPregunta(
                id_unidad=uni_id,
                pregunta=item['pregunta'],
                opcion_a=item['opcion_a'],
                opcion_b=item['opcion_b'],
                opcion_c=item['opcion_c'],
                opcion_d=item['opcion_d'],
                respuesta_correcta=item['respuesta_correcta'].lower(),
                justificacion=item.get('justificacion'),
            )
            db.add(q)
            count += 1

        db.commit()
        logger.info(f"qz_doc_received: inserted {count} questions for uni_id={uni_id}")
        await send_success_menu(update, f"✅ Importadas {count} preguntas de quiz.", "qz_new")
    except Exception as e:
        logger.error(f"qz_doc_received: exception — {type(e).__name__}: {e}", exc_info=True)
        await update.message.reply_text(f"❌ Error procesando JSON: {type(e).__name__}: {e}")
    finally:
        if 'db' in locals():
            db.close()

    return ConversationHandler.END
