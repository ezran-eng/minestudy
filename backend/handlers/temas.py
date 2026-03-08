from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, ConversationHandler

from database import SessionLocal
import models


async def tm_nombre_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    nombre = update.message.text
    unidad_id = context.user_data.get('selected_unidad_id')
    db = SessionLocal()
    try:
        tema = models.Tema(id_unidad=unidad_id, nombre=nombre)
        db.add(tema)
        db.commit()
        keyboard = [
            [InlineKeyboardButton("➕ Agregar otro tema", callback_data="tm_new")],
            [InlineKeyboardButton("↩️ Volver a unidades", callback_data="menu_unidades")],
            [InlineKeyboardButton("🏠 Menú principal", callback_data="menu_main")],
        ]
        await update.message.reply_text(
            f"✅ Tema '{nombre}' creado exitosamente.",
            reply_markup=InlineKeyboardMarkup(keyboard),
        )
    except Exception as e:
        await update.message.reply_text(f"❌ Error: {e}")
    finally:
        db.close()
    return ConversationHandler.END
