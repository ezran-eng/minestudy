from telegram import Update
from telegram.ext import ContextTypes

from bot_config import ADMIN_ID
from bot_i18n import send_welcome


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await send_welcome(update, context)


async def unknown_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Catch-all: any message or unknown command from non-admin -> welcome."""
    if update.effective_user.id == ADMIN_ID:
        return
    await send_welcome(update, context)
