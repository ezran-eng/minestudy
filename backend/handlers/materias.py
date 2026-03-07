from telegram import Update
from telegram.ext import ContextTypes, ConversationHandler

from bot_config import WAITING_MATERIA_NOMBRE, WAITING_MATERIA_COLOR
from bot_menus import send_success_menu
from database import SessionLocal
import models


async def mat_emoji_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data['temp_emoji'] = update.message.text
    await update.message.reply_text("Genial. Ahora enviá el nombre de la materia:")
    return WAITING_MATERIA_NOMBRE


async def mat_nombre_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data['temp_nombre'] = update.message.text
    await update.message.reply_text("Por último, enviá el color en formato Hex (ej. #d4a847) o 'skip' para usar el default:")
    return WAITING_MATERIA_COLOR


async def mat_color_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    color = update.message.text
    if color.lower() == 'skip':
        color = '#d4a847'

    db = SessionLocal()
    try:
        materia = models.Materia(
            nombre=context.user_data['temp_nombre'],
            emoji=context.user_data['temp_emoji'],
            color=color
        )
        db.add(materia)
        db.commit()
        await send_success_menu(update, f"✅ Materia '{materia.nombre}' creada exitosamente.", "mat_new")
    except Exception as e:
        await update.message.reply_text(f"❌ Error guardando materia: {e}")
    finally:
        db.close()

    return ConversationHandler.END


async def mat_nombre_edit_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    nuevo_nombre = update.message.text
    mat_id = context.user_data.get('selected_materia_id')

    db = SessionLocal()
    try:
        mat = db.query(models.Materia).filter(models.Materia.id == mat_id).first()
        if mat:
            mat.nombre = nuevo_nombre
            db.commit()
            await send_success_menu(update, f"✅ Materia actualizada a '{nuevo_nombre}'.", "mat_edit")
        else:
            await update.message.reply_text(f"❌ Materia no encontrada.")
    except Exception as e:
         await update.message.reply_text(f"❌ Error: {e}")
    finally:
        db.close()

    return ConversationHandler.END
