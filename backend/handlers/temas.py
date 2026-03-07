from telegram import Update
from telegram.ext import ContextTypes, ConversationHandler

from bot_menus import send_success_menu
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
        await send_success_menu(update, f"✅ Tema '{nombre}' creado exitosamente.", "tm_new")
    except Exception as e:
         await update.message.reply_text(f"❌ Error: {e}")
    finally:
        db.close()
    return ConversationHandler.END
