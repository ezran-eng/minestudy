import csv
from io import StringIO

from telegram import Update
from telegram.ext import ContextTypes, ConversationHandler

from bot_config import WAITING_FLASHCARD_CSV
from bot_menus import send_success_menu
from database import SessionLocal
import models


def parse_flashcard_csv(text_content: str) -> list:
    """Parse a CSV with pregunta/respuesta columns.

    Accepts CSVs with or without a header row. If the first row contains
    'pregunta' and 'respuesta' (case-insensitive), it is treated as a header.
    Otherwise the first column is pregunta and the second is respuesta.
    Handles quoted fields with commas via the standard csv module.
    """
    reader = csv.reader(StringIO(text_content))
    rows = [row for row in reader if any(cell.strip() for cell in row)]
    if not rows:
        return []

    first = [col.strip().lower() for col in rows[0]]
    if 'pregunta' in first and 'respuesta' in first:
        p_idx = first.index('pregunta')
        r_idx = first.index('respuesta')
        data_rows = rows[1:]
    else:
        p_idx, r_idx = 0, 1
        data_rows = rows

    result = []
    for row in data_rows:
        if len(row) > max(p_idx, r_idx):
            pregunta = row[p_idx].strip()
            respuesta = row[r_idx].strip()
            if pregunta and respuesta:
                result.append((pregunta, respuesta))
    return result


async def fc_doc_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    if not update.message.document:
        await update.message.reply_text("Por favor enviá un documento CSV, o /cancel.")
        return WAITING_FLASHCARD_CSV

    uni_id = context.user_data.get('selected_unidad_id')
    file = await context.bot.get_file(update.message.document.file_id)
    content = await file.download_as_bytearray()

    try:
        text_content = content.decode('utf-8')
        pairs = parse_flashcard_csv(text_content)

        if not pairs:
            await update.message.reply_text("❌ El CSV no contiene filas válidas con pregunta y respuesta.")
            return ConversationHandler.END

        db = SessionLocal()
        for pregunta, respuesta in pairs:
            db.add(models.Flashcard(id_unidad=uni_id, pregunta=pregunta, respuesta=respuesta))

        db.commit()
        await send_success_menu(update, f"✅ Importadas {len(pairs)} flashcards.", "fc_new")
    except Exception as e:
        await update.message.reply_text(f"❌ Error procesando CSV: {e}")
    finally:
        if 'db' in locals():
            db.close()

    return ConversationHandler.END
