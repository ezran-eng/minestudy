"""
bot.py — proceso del bot de Telegram.
Corre en paralelo a uvicorn desde start.sh.

Para agregar comandos o conversaciones:
  - Creá handlers en archivos separados (ej: handlers/admin.py)
  - Registralos con application.add_handler() acá abajo
"""
import logging
from telegram.ext import Application, CommandHandler, MessageHandler, filters
from bot_config import TOKEN, ADMIN_ID
from bot_helpers import admin_only, send_welcome

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logging.getLogger("httpx").setLevel(logging.WARNING)

application = Application.builder().token(TOKEN).build()


async def start(update, context):
    await send_welcome(update, context)


@admin_only
async def admin(update, context):
    """Panel de admin — personalizá este handler."""
    await update.message.reply_text("Panel de admin.")


async def unknown_handler(update, context):
    """Catch-all: muestra bienvenida a usuarios no-admin."""
    if update.effective_user.id == ADMIN_ID:
        return
    await send_welcome(update, context)


async def error_handler(update, context):
    if "Conflict" in str(context.error):
        return  # otra instancia del bot corriendo — ignorar
    logger.error("Update %s causó error %s", update, context.error)


application.add_handler(CommandHandler("start", start))
application.add_handler(CommandHandler("admin", admin))
application.add_handler(MessageHandler(
    filters.ALL & ~filters.UpdateType.EDITED_MESSAGE,
    unknown_handler,
))
application.add_error_handler(error_handler)

# Agregá tus handlers acá:
# application.add_handler(...)

if __name__ == "__main__":
    application.run_polling(
        drop_pending_updates=True,
        allowed_updates=["message", "callback_query"],
        close_loop=False,
    )
