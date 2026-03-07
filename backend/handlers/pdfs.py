import logging
import httpx

from telegram import Update
from telegram.ext import ContextTypes, ConversationHandler

from bot_config import API_URL, WAITING_PDF_DOC
from bot_menus import send_success_menu

logger = logging.getLogger(__name__)


async def pdf_titulo_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data['pdf_titulo'] = update.message.text.strip()
    await update.message.reply_text("📎 Ahora enviá el archivo PDF:")
    return WAITING_PDF_DOC


async def pdf_doc_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    if not update.message.document:
        await update.message.reply_text("Por favor enviá un archivo PDF, o /cancel.")
        return WAITING_PDF_DOC

    uni_id = context.user_data.get('selected_unidad_id')
    titulo = context.user_data.get('pdf_titulo', 'Sin título')
    logger.info(f"pdf_doc_received: uni_id={uni_id}, titulo={titulo}")

    if not uni_id:
        logger.error("pdf_doc_received: uni_id is None — user_data lost")
        await update.message.reply_text("❌ Error interno: se perdió la unidad seleccionada. Empezá de nuevo con /admin.")
        return ConversationHandler.END

    try:
        doc = update.message.document
        logger.info(f"pdf_doc_received: downloading file_id={doc.file_id}, name={doc.file_name}")
        tg_file = await context.bot.get_file(doc.file_id)
        content = await tg_file.download_as_bytearray()
        logger.info(f"pdf_doc_received: downloaded {len(content)} bytes")

        filename = doc.file_name or "documento.pdf"
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                f"{API_URL}/admin/pdfs/upload",
                files={"file": (filename, bytes(content), "application/pdf")},
                data={"id_unidad": str(uni_id), "titulo": titulo},
            )
        logger.info(f"pdf_doc_received: API response status={response.status_code}, body={response.text[:200]}")

        if response.status_code == 200:
            await send_success_menu(update, "✅ PDF subido correctamente.", "pdf_new")
        else:
            await update.message.reply_text(f"❌ Error del servidor: {response.status_code}\n{response.text[:300]}")

    except Exception as e:
        logger.error(f"pdf_doc_received: exception — {type(e).__name__}: {e}", exc_info=True)
        await update.message.reply_text(f"❌ Error inesperado: {type(e).__name__}: {e}")

    return ConversationHandler.END
