from telegram import Update
from telegram.ext import ContextTypes, ConversationHandler

from bot_menus import send_success_menu
from database import SessionLocal
import models


async def uni_nombre_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    nombre = update.message.text
    mat_id = context.user_data.get('selected_materia_id')
    db = SessionLocal()
    try:
        uni = models.Unidad(id_materia=mat_id, nombre=nombre)
        db.add(uni)
        db.commit()
        await send_success_menu(update, f"✅ Unidad '{nombre}' creada exitosamente.", "uni_new")
    except Exception as e:
         await update.message.reply_text(f"❌ Error: {e}")
    finally:
        db.close()
    return ConversationHandler.END


async def uni_nombre_edit_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    nombre = update.message.text
    uni_id = context.user_data.get('selected_unidad_id')
    db = SessionLocal()
    try:
        uni = db.query(models.Unidad).filter(models.Unidad.id == uni_id).first()
        if uni:
            uni.nombre = nombre
            db.commit()
            await send_success_menu(update, f"✅ Unidad actualizada a '{nombre}'.", "uni_edit")
        else:
            await update.message.reply_text(f"❌ Unidad no encontrada.")
    except Exception as e:
         await update.message.reply_text(f"❌ Error: {e}")
    finally:
        db.close()
    return ConversationHandler.END
