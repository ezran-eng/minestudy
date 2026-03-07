from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes
from database import SessionLocal
import models

from bot_config import ADMIN_ID
from bot_i18n import send_welcome


def admin_only(func):
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE, *args, **kwargs):
        if update.effective_user.id != ADMIN_ID:
            await send_welcome(update, context)
            return
        return await func(update, context, *args, **kwargs)
    return wrapper


async def show_materia_selection(update: Update, prompt: str):
    db = SessionLocal()
    try:
        materias = db.query(models.Materia).all()
        keyboard = []
        for mat in materias:
            keyboard.append([InlineKeyboardButton(f"{mat.emoji or ''} {mat.nombre}", callback_data=f"sel_mat_{mat.id}")])
        keyboard.append([InlineKeyboardButton("🔙 Volver", callback_data="cancel_to_main")])
        reply_markup = InlineKeyboardMarkup(keyboard)
        if update.callback_query:
            await update.callback_query.edit_message_text(prompt, reply_markup=reply_markup)
        else:
            await update.message.reply_text(prompt, reply_markup=reply_markup)
    finally:
        db.close()


async def show_unidad_selection(update: Update, context: ContextTypes.DEFAULT_TYPE, prompt: str):
    mat_id = context.user_data.get('selected_materia_id')
    db = SessionLocal()
    try:
        unidades = db.query(models.Unidad).filter(models.Unidad.id_materia == mat_id).all()
        keyboard = []
        for uni in unidades:
            keyboard.append([InlineKeyboardButton(uni.nombre, callback_data=f"sel_uni_{uni.id}")])
        keyboard.append([InlineKeyboardButton("🔙 Volver", callback_data="cancel_to_main")])
        reply_markup = InlineKeyboardMarkup(keyboard)
        await update.callback_query.edit_message_text(prompt, reply_markup=reply_markup)
    finally:
        db.close()


async def show_tema_selection(update: Update, context: ContextTypes.DEFAULT_TYPE, prompt: str):
    uni_id = context.user_data.get('selected_unidad_id')
    db = SessionLocal()
    try:
        temas = db.query(models.Tema).filter(models.Tema.id_unidad == uni_id).all()
        keyboard = []
        for t in temas:
            keyboard.append([InlineKeyboardButton(t.nombre, callback_data=f"sel_tema_{t.id}")])
        keyboard.append([InlineKeyboardButton("🔙 Volver", callback_data="cancel_to_main")])
        reply_markup = InlineKeyboardMarkup(keyboard)
        await update.callback_query.edit_message_text(prompt, reply_markup=reply_markup)
    finally:
        db.close()


async def show_confirm_action(update: Update, prompt: str):
    keyboard = [
        [InlineKeyboardButton("✅ Sí, borrar", callback_data="confirm_yes"),
         InlineKeyboardButton("❌ Cancelar", callback_data="cancel_to_main")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.callback_query.edit_message_text(prompt, reply_markup=reply_markup)
