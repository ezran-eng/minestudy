import logging
import httpx

from telegram import Update
from telegram.ext import ContextTypes, ConversationHandler

from bot_config import API_URL, WAITING_INFOGRAFIA_FOTO
from bot_menus import send_success_menu

logger = logging.getLogger(__name__)


async def inf_titulo_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data['inf_titulo'] = update.message.text.strip()
    await update.message.reply_text("📸 Ahora enviá la imagen:")
    return WAITING_INFOGRAFIA_FOTO


async def inf_foto_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    if not update.message.photo:
        await update.message.reply_text("Por favor enviá una imagen (foto), o /cancel.")
        return WAITING_INFOGRAFIA_FOTO

    uni_id = context.user_data.get('selected_unidad_id')
    titulo = context.user_data.get('inf_titulo', 'Sin título')
    logger.info(f"inf_foto_received: uni_id={uni_id}, titulo={titulo}")

    if not uni_id:
        logger.error("inf_foto_received: uni_id is None — user_data lost")
        await update.message.reply_text("❌ Error interno: se perdió la unidad seleccionada. Empezá de nuevo con /admin.")
        return ConversationHandler.END

    try:
        photo = update.message.photo[-1]
        logger.info(f"inf_foto_received: downloading file_id={photo.file_id}")
        tg_file = await context.bot.get_file(photo.file_id)
        content = await tg_file.download_as_bytearray()
        logger.info(f"inf_foto_received: downloaded {len(content)} bytes")

        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{API_URL}/admin/infografias/upload",
                files={"file": ("infografia.jpg", bytes(content), "image/jpeg")},
                data={"id_unidad": str(uni_id), "titulo": titulo},
            )
        logger.info(f"inf_foto_received: API response status={response.status_code}, body={response.text[:200]}")

        if response.status_code == 200:
            await send_success_menu(update, "✅ Infografía subida correctamente.", "inf_new")
        else:
            await update.message.reply_text(f"❌ Error del servidor: {response.status_code}\n{response.text[:300]}")

    except Exception as e:
        logger.error(f"inf_foto_received: exception — {type(e).__name__}: {e}", exc_info=True)
        await update.message.reply_text(f"❌ Error inesperado: {type(e).__name__}: {e}")

    return ConversationHandler.END
