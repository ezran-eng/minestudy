from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import ContextTypes
from bot_config import ADMIN_ID, MINI_APP_URL


def admin_only(func):
    """Decorator: solo permite ejecutar el comando al ADMIN_ID."""
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE, *args, **kwargs):
        if update.effective_user.id != ADMIN_ID:
            await send_welcome(update, context)
            return
        return await func(update, context, *args, **kwargs)
    return wrapper


async def send_welcome(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Mensaje de bienvenida con botón para abrir la Mini App."""
    user = update.effective_user
    name = user.first_name or "usuario"
    keyboard = [[InlineKeyboardButton("Abrir App", web_app=WebAppInfo(url=MINI_APP_URL))]]
    await update.message.reply_text(
        f"Hola, *{name}*! Tocá el botón para abrir la app.",
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )
