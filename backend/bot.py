import os
import json
import csv
import asyncio
import httpx
import logging
from datetime import date
from io import StringIO
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler, ConversationHandler
from sqlalchemy.orm import Session
from database import SessionLocal
import models

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logging.getLogger('httpx').setLevel(logging.WARNING)

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")

# Constants for conversation states
(
    WAITING_MATERIA_EMOJI, WAITING_MATERIA_NOMBRE, WAITING_MATERIA_COLOR,
    WAITING_MATERIA_NOMBRE_EDIT,
    WAITING_UNIDAD_NOMBRE, WAITING_UNIDAD_NOMBRE_EDIT,
    WAITING_TEMA_NOMBRE,
    WAITING_FLASHCARD_CSV,
    WAITING_QUIZ_JSON,
    SELECT_MATERIA, SELECT_UNIDAD, SELECT_TEMA, CONFIRM_ACTION
) = range(13)


# Allowed Admin Telegram ID
ADMIN_ID = 1063772095

# Decorator to restrict access to ADMIN_ID
def admin_only(func):
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE, *args, **kwargs):
        if update.effective_user.id != ADMIN_ID:
            await update.message.reply_text("No tienes permisos para usar este comando.")
            return
        return await func(update, context, *args, **kwargs)
    return wrapper

# Provide database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@admin_only
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text("👋 Hola Admin. Estoy listo para gestionar el contenido. Usa /admin para el menú.")

async def send_raw_menu(chat_id, text, reply_markup, message_id=None):
    url = f'https://api.telegram.org/bot{TOKEN}/editMessageText' if message_id else f'https://api.telegram.org/bot{TOKEN}/sendMessage'
    payload = {
        'chat_id': chat_id,
        'text': text,
        'parse_mode': 'Markdown',
        'reply_markup': reply_markup
    }
    if message_id:
        payload['message_id'] = message_id

    async with httpx.AsyncClient() as client:
        await client.post(url, json=payload)

def get_main_menu():
    return {
        'inline_keyboard': [
            [{'text': "📚 Materias", 'callback_data': 'menu_materias', 'style': 'primary'},
             {'text': "💥 Unidades", 'callback_data': 'menu_unidades', 'style': 'primary'}],
            [{'text': "🃏 Flashcards", 'callback_data': 'menu_flashcards', 'style': 'success'},
             {'text': "🎯 Quiz", 'callback_data': 'menu_quiz', 'style': 'success'}],
            [{'text': "📝 Temas", 'callback_data': 'menu_temas', 'style': 'primary'}],
            [{'text': "📊 Stats", 'callback_data': 'menu_stats', 'style': 'primary'},
             {'text': "🔄 Recargar DB", 'callback_data': 'menu_reload', 'style': 'primary'}]
        ]
    }

def get_temas_menu():
    return {
        'inline_keyboard': [
            [{'text': "🟢 Nuevo Tema", 'callback_data': 'tm_new', 'style': 'success'}],
            [{'text': "🔵 Listar Temas de unidad", 'callback_data': 'tm_list', 'style': 'primary'}],
            [{'text': "🔴 Borrar Tema", 'callback_data': 'tm_del', 'style': 'danger'}],
            [{'text': "⚫ Volver", 'callback_data': 'menu_main'}]
        ]
    }

def get_materias_menu():
    return {
        'inline_keyboard': [
            [{'text': "🟢 Nueva Materia", 'callback_data': 'mat_new', 'style': 'success'}],
            [{'text': "🔵 Listar Materias", 'callback_data': 'mat_list', 'style': 'primary'}],
            [{'text': "🟡 Editar Materia", 'callback_data': 'mat_edit'}],
            [{'text': "🔴 Borrar Materia", 'callback_data': 'mat_del', 'style': 'danger'}],
            [{'text': "⚫ Volver", 'callback_data': 'menu_main'}]
        ]
    }

def get_unidades_menu():
    return {
        'inline_keyboard': [
            [{'text': "🟢 Nueva Unidad", 'callback_data': 'uni_new', 'style': 'success'}],
            [{'text': "🔵 Listar Unidades", 'callback_data': 'uni_list', 'style': 'primary'}],
            [{'text': "🟡 Editar Unidad", 'callback_data': 'uni_edit'}],
            [{'text': "🔴 Borrar Unidad", 'callback_data': 'uni_del', 'style': 'danger'}],
            [{'text': "⚫ Volver", 'callback_data': 'menu_main'}]
        ]
    }

def get_flashcards_menu():
    return {
        'inline_keyboard': [
            [{'text': "🟢 Subir CSV", 'callback_data': 'fc_new', 'style': 'success'}],
            [{'text': "🔵 Ver Flashcards de unidad", 'callback_data': 'fc_list', 'style': 'primary'}],
            [{'text': "🔴 Borrar Flashcards de unidad", 'callback_data': 'fc_del', 'style': 'danger'}],
            [{'text': "⚫ Volver", 'callback_data': 'menu_main'}]
        ]
    }

def get_quiz_menu():
    return {
        'inline_keyboard': [
            [{'text': "🟢 Subir JSON", 'callback_data': 'qz_new', 'style': 'success'}],
            [{'text': "🔵 Ver preguntas de unidad", 'callback_data': 'qz_list', 'style': 'primary'}],
            [{'text': "🔴 Borrar Quiz de unidad", 'callback_data': 'qz_del', 'style': 'danger'}],
            [{'text': "⚫ Volver", 'callback_data': 'menu_main'}]
        ]
    }

@admin_only
async def admin_menu(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await send_raw_menu(update.effective_chat.id, "⚙️ **Panel de Administración**", get_main_menu())

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    if query.from_user.id != ADMIN_ID:
        await query.answer("No tienes permisos.", show_alert=True)
        return

    await query.answer()

    chat_id = query.message.chat.id
    msg_id = query.message.message_id

    data = query.data
    if data == 'menu_main':
        await send_raw_menu(chat_id, "⚙️ **Panel de Administración**", get_main_menu(), msg_id)
    elif data == 'menu_materias':
        await send_raw_menu(chat_id, "📚 **Menú de Materias**", get_materias_menu(), msg_id)
    elif data == 'menu_unidades':
        await send_raw_menu(chat_id, "💥 **Menú de Unidades**", get_unidades_menu(), msg_id)
    elif data == 'menu_flashcards':
        await send_raw_menu(chat_id, "🃏 **Menú de Flashcards**", get_flashcards_menu(), msg_id)
    elif data == 'menu_quiz':
        await send_raw_menu(chat_id, "🎯 **Menú de Quiz**", get_quiz_menu(), msg_id)
    elif data == 'menu_temas':
        await send_raw_menu(chat_id, "📝 **Menú de Temas**", get_temas_menu(), msg_id)
    elif data == 'menu_stats':
        # Delegate to stats function, sending as a new message to keep menu
        await stats(update, context, direct=False)
    elif data == 'menu_reload':
        await send_raw_menu(chat_id, "🔄 Caché y BD recargadas (simulado).", get_main_menu(), msg_id)

    # Actions that don't need conversation
    elif data == 'mat_list':
        db = SessionLocal()
        materias = db.query(models.Materia).all()
        msg = "📚 **Materias:**\n"
        for m in materias:
            msg += f"ID: {m.id} | {m.emoji} {m.nombre}\n"
        db.close()
        await send_raw_menu(chat_id, msg if materias else "No hay materias.", get_materias_menu(), msg_id)

    elif data == 'uni_list':
        db = SessionLocal()
        unidades = db.query(models.Unidad).all()
        msg = "💥 **Unidades:**\n"
        for u in unidades:
            msg += f"ID: {u.id} | Mat. ID: {u.id_materia} | {u.nombre}\n"
        db.close()
        await send_raw_menu(chat_id, msg if unidades else "No hay unidades.", get_unidades_menu(), msg_id)

    elif data == 'fc_list':
        await send_raw_menu(chat_id, "🔵 **Ver Flashcards**\nFuncionalidad no implementada aún en la base de datos de listado.", get_flashcards_menu(), msg_id)

    elif data == 'qz_list':
        await send_raw_menu(chat_id, "🔵 **Ver Preguntas**\nFuncionalidad no implementada aún en la base de datos de listado.", get_quiz_menu(), msg_id)


# --- DYNAMIC SELECTION HELPERS ---
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

async def send_success_menu(update: Update, text: str, create_action: str):
    keyboard = [
        [InlineKeyboardButton("➕ Hacer otro", callback_data=create_action)],
        [InlineKeyboardButton("🏠 Menú principal", callback_data="cancel_to_main")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    if update.callback_query:
        await update.callback_query.edit_message_text(text, reply_markup=reply_markup)
    else:
        await update.message.reply_text(text, reply_markup=reply_markup)

# --- CONVERSATION ENTRY HANDLER ---
async def conversation_entry_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    if query.from_user.id != ADMIN_ID:
        await query.answer("No tienes permisos.", show_alert=True)
        return ConversationHandler.END

    await query.answer()
    data = query.data
    context.user_data['action'] = data

    if data == 'mat_new':
        await query.edit_message_text("🟢 **Nueva Materia**\nEnviá el emoji para la materia:")
        return WAITING_MATERIA_EMOJI
    elif data in ['mat_edit', 'mat_del', 'uni_new', 'tm_new', 'tm_list', 'tm_del', 'uni_edit', 'uni_del', 'fc_new', 'fc_del', 'qz_new', 'qz_del']:
        await show_materia_selection(update, "¿A qué materia pertenece?")
        return SELECT_MATERIA

    return ConversationHandler.END

async def cancel_to_main_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()
    context.user_data.clear()
    await send_raw_menu(query.message.chat.id, "⚙️ **Panel de Administración**", get_main_menu(), query.message.message_id)
    return ConversationHandler.END

async def cancel_conversation(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data.clear()
    await update.message.reply_text("Operación cancelada. Usa /admin para el menú.")
    return ConversationHandler.END

# --- DYNAMIC SELECTION HANDLERS ---
async def materia_selected(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()
    mat_id = int(query.data.split('_')[2])
    context.user_data['selected_materia_id'] = mat_id
    action = context.user_data.get('action')

    if action == 'mat_edit':
        await query.edit_message_text("Enviá el nuevo nombre para esta materia (el emoji y color quedarán igual por ahora):")
        return WAITING_MATERIA_NOMBRE_EDIT
    elif action == 'mat_del':
        await show_confirm_action(update, "⚠️ ¿Seguro que querés borrar esta materia y todas sus dependencias?")
        return CONFIRM_ACTION
    elif action in ['uni_new', 'tm_new', 'tm_list', 'tm_del', 'uni_edit', 'uni_del', 'fc_new', 'fc_del', 'qz_new', 'qz_del']:
        await show_unidad_selection(update, context, "¿A qué unidad pertenece?")
        return SELECT_UNIDAD

    return ConversationHandler.END

async def unidad_selected(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()
    uni_id = int(query.data.split('_')[2])
    context.user_data['selected_unidad_id'] = uni_id
    action = context.user_data.get('action')

    if action == 'uni_new':
        await query.edit_message_text("Ahora enviá el nombre de la unidad:")
        return WAITING_UNIDAD_NOMBRE
    elif action == 'uni_edit':
        await query.edit_message_text("Enviá el nuevo nombre para esta unidad:")
        return WAITING_UNIDAD_NOMBRE_EDIT
    elif action == 'uni_del':
        await show_confirm_action(update, "⚠️ ¿Seguro que querés borrar esta unidad y todas sus dependencias?")
        return CONFIRM_ACTION
    elif action == 'tm_new':
        db = next(get_db())
        unidad = db.query(models.Unidad).filter(models.Unidad.id == uni_id).first()
        temas = db.query(models.Tema).filter(models.Tema.id_unidad == uni_id).all()
        db.close()
        unidad_nombre = unidad.nombre if unidad else str(uni_id)
        if temas:
            lista = "\n".join(f"- {t.nombre}" for t in temas)
            msg = f"📚 *Unidad: {unidad_nombre}*\n\nTemas existentes:\n{lista}\n\nAhora enviá el nombre del nuevo tema (o /cancelar para salir):"
        else:
            msg = f"📚 *Unidad: {unidad_nombre}*\n\nNo hay temas cargados aún.\n\nEnviá el nombre del primer tema:"
        await query.edit_message_text(msg, parse_mode='Markdown')
        return WAITING_TEMA_NOMBRE
    elif action == 'tm_del':
        await show_tema_selection(update, context, "¿Qué tema querés borrar?")
        return SELECT_TEMA
    elif action == 'fc_new':
        await query.edit_message_text("Adjuntá el archivo CSV con las flashcards (pregunta,respuesta):")
        return WAITING_FLASHCARD_CSV
    elif action == 'fc_del':
        await show_confirm_action(update, "⚠️ ¿Seguro que querés borrar todas las flashcards de esta unidad?")
        return CONFIRM_ACTION
    elif action == 'qz_new':
        await query.edit_message_text("Adjuntá el archivo JSON con las preguntas del quiz:")
        return WAITING_QUIZ_JSON
    elif action == 'qz_del':
        await show_confirm_action(update, "⚠️ ¿Seguro que querés borrar todo el quiz de esta unidad?")
        return CONFIRM_ACTION
    elif action == 'tm_list':
        db = SessionLocal()
        try:
            temas = db.query(models.Tema).filter(models.Tema.id_unidad == uni_id).all()
            msg = f"📝 **Temas de la Unidad:**\n"
            for t in temas:
                msg += f"• {t.nombre}\n"
            await send_success_menu(update, msg if temas else "No hay temas para esta unidad.", "tm_list")
        finally:
            db.close()
        return ConversationHandler.END

    return ConversationHandler.END

async def tema_selected(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()
    tema_id = int(query.data.split('_')[2])
    context.user_data['selected_tema_id'] = tema_id
    action = context.user_data.get('action')

    if action == 'tm_del':
        await show_confirm_action(update, "⚠️ ¿Seguro que querés borrar este tema?")
        return CONFIRM_ACTION

    return ConversationHandler.END

async def confirm_action_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()
    action = context.user_data.get('action')
    db = SessionLocal()
    try:
        if action == 'mat_del':
            mat_id = context.user_data.get('selected_materia_id')
            mat = db.query(models.Materia).filter(models.Materia.id == mat_id).first()
            if mat:
                db.delete(mat)
                db.commit()
                await send_success_menu(update, f"✅ Materia borrada.", action)
        elif action == 'uni_del':
            uni_id = context.user_data.get('selected_unidad_id')
            uni = db.query(models.Unidad).filter(models.Unidad.id == uni_id).first()
            if uni:
                db.delete(uni)
                db.commit()
                await send_success_menu(update, f"✅ Unidad borrada.", action)
        elif action == 'tm_del':
            tema_id = context.user_data.get('selected_tema_id')
            tema = db.query(models.Tema).filter(models.Tema.id == tema_id).first()
            if tema:
                db.delete(tema)
                db.commit()
                await send_success_menu(update, f"✅ Tema borrado.", action)
        elif action == 'fc_del':
            uni_id = context.user_data.get('selected_unidad_id')
            deleted = db.query(models.Flashcard).filter(models.Flashcard.id_unidad == uni_id).delete()
            db.commit()
            await send_success_menu(update, f"✅ Borradas {deleted} flashcards.", action)
        elif action == 'qz_del':
            uni_id = context.user_data.get('selected_unidad_id')
            deleted = db.query(models.QuizPregunta).filter(models.QuizPregunta.id_unidad == uni_id).delete()
            db.commit()
            await send_success_menu(update, f"✅ Borradas {deleted} preguntas de quiz.", action)
    finally:
        db.close()

    return ConversationHandler.END

# --- MATERIA CONVERSATION ---
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

# --- TEMA CONVERSATION ---
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

# --- UNIDAD CONVERSATION ---
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

# --- FLASHCARD CONVERSATION ---
def parse_flashcard_csv(text_content: str) -> list:
    """Parse a CSV with pregunta/respuesta columns.

    Accepts CSVs with or without a header row. If the first row contains
    'pregunta' and 'respuesta' (case-insensitive), it is treated as a header.
    Otherwise the first column is pregunta and the second is respuesta.
    Handles quoted fields with commas via the standard csv module.
    """
    reader = csv.reader(StringIO(text_content))
    rows = [row for row in reader if any(cell.strip() for cell in row)]
    if not rows:
        return []

    first = [col.strip().lower() for col in rows[0]]
    if 'pregunta' in first and 'respuesta' in first:
        p_idx = first.index('pregunta')
        r_idx = first.index('respuesta')
        data_rows = rows[1:]
    else:
        p_idx, r_idx = 0, 1
        data_rows = rows

    result = []
    for row in data_rows:
        if len(row) > max(p_idx, r_idx):
            pregunta = row[p_idx].strip()
            respuesta = row[r_idx].strip()
            if pregunta and respuesta:
                result.append((pregunta, respuesta))
    return result


async def fc_doc_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    if not update.message.document:
        await update.message.reply_text("Por favor enviá un documento CSV, o /cancel.")
        return WAITING_FLASHCARD_CSV

    uni_id = context.user_data.get('selected_unidad_id')
    file = await context.bot.get_file(update.message.document.file_id)
    content = await file.download_as_bytearray()

    try:
        text_content = content.decode('utf-8')
        pairs = parse_flashcard_csv(text_content)

        if not pairs:
            await update.message.reply_text("❌ El CSV no contiene filas válidas con pregunta y respuesta.")
            return ConversationHandler.END

        db = SessionLocal()
        for pregunta, respuesta in pairs:
            db.add(models.Flashcard(id_unidad=uni_id, pregunta=pregunta, respuesta=respuesta))

        db.commit()
        await send_success_menu(update, f"✅ Importadas {len(pairs)} flashcards.", "fc_new")
    except Exception as e:
        await update.message.reply_text(f"❌ Error procesando CSV: {e}")
    finally:
        if 'db' in locals():
            db.close()

    return ConversationHandler.END

# --- QUIZ CONVERSATION ---
async def qz_doc_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    if not update.message.document:
        await update.message.reply_text("Por favor enviá un documento JSON, o /cancel.")
        return WAITING_QUIZ_JSON

    uni_id = context.user_data.get('selected_unidad_id')
    file = await context.bot.get_file(update.message.document.file_id)
    content = await file.download_as_bytearray()

    try:
        text_content = content.decode('utf-8')
        data = json.loads(text_content)

        if not isinstance(data, list):
             await update.message.reply_text("Error: El JSON debe ser un array de objetos.")
             return ConversationHandler.END

        db = SessionLocal()
        count = 0
        for item in data:
             required_keys = ['pregunta', 'a', 'b', 'c', 'd', 'correcta']
             if not all(k in item for k in required_keys):
                  continue

             q = models.QuizPregunta(
                 id_unidad=uni_id,
                 pregunta=item['pregunta'],
                 opcion_a=item['a'],
                 opcion_b=item['b'],
                 opcion_c=item['c'],
                 opcion_d=item['d'],
                 respuesta_correcta=item['correcta'].lower()
             )
             db.add(q)
             count += 1

        db.commit()
        await send_success_menu(update, f"✅ Importadas {count} preguntas de quiz.", "qz_new")
    except Exception as e:
        await update.message.reply_text(f"❌ Error procesando JSON: {e}")
    finally:
        if 'db' in locals():
            db.close()

    return ConversationHandler.END


@admin_only
async def nueva_materia(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    # Usage: /nueva_materia <emoji> <nombre>
    if len(context.args) < 2:
        await update.message.reply_text("Uso: /nueva_materia <emoji> <nombre>")
        return

    emoji = context.args[0]
    nombre = " ".join(context.args[1:])

    db = SessionLocal()
    try:
        # We can dynamically add random colors or let it be None and modify later. Using a default gold for now.
        materia = models.Materia(nombre=nombre, emoji=emoji, color="#d4a847")
        db.add(materia)
        db.commit()
        db.refresh(materia)
        await update.message.reply_text(f"✅ Materia '{nombre}' creada con ID: {materia.id}")
    except Exception as e:
        await update.message.reply_text(f"❌ Error: {e}")
    finally:
        db.close()

@admin_only
async def nueva_unidad(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    # Usage: /nueva_unidad <id_materia> <nombre>
    if len(context.args) < 2:
        await update.message.reply_text("Uso: /nueva_unidad <id_materia> <nombre>")
        return

    try:
        id_materia = int(context.args[0])
    except ValueError:
        await update.message.reply_text("❌ El <id_materia> debe ser un número entero.")
        return

    nombre = " ".join(context.args[1:])

    db = SessionLocal()
    try:
        unidad = models.Unidad(id_materia=id_materia, nombre=nombre)
        db.add(unidad)
        db.commit()
        db.refresh(unidad)
        await update.message.reply_text(f"✅ Unidad '{nombre}' creada con ID: {unidad.id} (Materia {id_materia})")
    except Exception as e:
        await update.message.reply_text(f"❌ Error: {e}")
    finally:
        db.close()

@admin_only
async def nuevo_tema(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    # Usage: /nuevo_tema <id_unidad> <nombre>
    if len(context.args) < 2:
        await update.message.reply_text("Uso: /nuevo_tema <id_unidad> <nombre>")
        return

    try:
        id_unidad = int(context.args[0])
    except ValueError:
        await update.message.reply_text("❌ El <id_unidad> debe ser un número entero.")
        return

    nombre = " ".join(context.args[1:])

    db = SessionLocal()
    try:
        tema = models.Tema(id_unidad=id_unidad, nombre=nombre)
        db.add(tema)
        db.commit()
        db.refresh(tema)
        await update.message.reply_text(f"✅ Tema '{nombre}' creado con ID: {tema.id} (Unidad {id_unidad})")
    except Exception as e:
        await update.message.reply_text(f"❌ Error: {e}")
    finally:
        db.close()

@admin_only
async def flashcards(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    # Expected: /flashcards <id_unidad> attached CSV
    if not context.args:
        await update.message.reply_text("Uso: /flashcards <id_unidad> (adjunta un archivo CSV)")
        return

    try:
        id_unidad = int(context.args[0])
    except ValueError:
        await update.message.reply_text("❌ El <id_unidad> debe ser un número entero.")
        return

    if not update.message.document:
        await update.message.reply_text("❌ Por favor adjunta un archivo CSV junto con el comando.")
        return

    if not update.message.document.file_name.endswith('.csv'):
         await update.message.reply_text("❌ El archivo debe ser un CSV.")
         return

    file = await context.bot.get_file(update.message.document.file_id)
    content = await file.download_as_bytearray()

    try:
        text_content = content.decode('utf-8')
        pairs = parse_flashcard_csv(text_content)

        if not pairs:
            await update.message.reply_text("❌ El CSV no contiene filas válidas con pregunta y respuesta.")
            return

        db = SessionLocal()
        for pregunta, respuesta in pairs:
            db.add(models.Flashcard(id_unidad=id_unidad, pregunta=pregunta, respuesta=respuesta))

        db.commit()
        await update.message.reply_text(f"✅ Importadas {len(pairs)} flashcards a la unidad {id_unidad}.")

    except Exception as e:
        await update.message.reply_text(f"❌ Error procesando CSV: {e}")
    finally:
        if 'db' in locals():
            db.close()

@admin_only
async def quiz(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    # Expected: /quiz <id_unidad> attached JSON
    if not context.args:
        await update.message.reply_text("Uso: /quiz <id_unidad> (adjunta un archivo JSON)")
        return

    try:
        id_unidad = int(context.args[0])
    except ValueError:
        await update.message.reply_text("❌ El <id_unidad> debe ser un número entero.")
        return

    if not update.message.document:
        await update.message.reply_text("❌ Por favor adjunta un archivo JSON junto con el comando.")
        return

    if not update.message.document.file_name.endswith('.json'):
         await update.message.reply_text("❌ El archivo debe ser un JSON.")
         return

    file = await context.bot.get_file(update.message.document.file_id)
    content = await file.download_as_bytearray()

    try:
        text_content = content.decode('utf-8')
        data = json.loads(text_content)

        if not isinstance(data, list):
             await update.message.reply_text("Error: El JSON debe ser un array de objetos.")
             return

        db = SessionLocal()
        count = 0
        for item in data:
             # Verify keys
             required_keys = ['pregunta', 'a', 'b', 'c', 'd', 'correcta']
             if not all(k in item for k in required_keys):
                  await update.message.reply_text(f"Error: El JSON debe tener el formato: pregunta, a, b, c, d, correcta")
                  return

             q = models.QuizPregunta(
                 id_unidad=id_unidad,
                 pregunta=item['pregunta'],
                 opcion_a=item['a'],
                 opcion_b=item['b'],
                 opcion_c=item['c'],
                 opcion_d=item['d'],
                 respuesta_correcta=item['correcta'].lower()
             )
             db.add(q)
             count += 1

        db.commit()
        await update.message.reply_text(f"✅ Importadas {count} preguntas de quiz a la unidad {id_unidad}.")

    except json.JSONDecodeError:
        await update.message.reply_text("❌ Error: JSON inválido.")
    except Exception as e:
        await update.message.reply_text(f"❌ Error procesando JSON: {e}")
    finally:
        if 'db' in locals():
             db.close()


@admin_only
async def stats(update: Update, context: ContextTypes.DEFAULT_TYPE, direct: bool = True) -> None:
    db = SessionLocal()
    try:
        total_users = db.query(models.User).count()

        # Active today (ultima_actividad == today)
        today = date.today()
        # Ensure we check the date part of the datetime. Need to import func
        from sqlalchemy import func
        active_today = db.query(models.User).filter(func.date(models.User.ultima_actividad) == today.strftime('%Y-%m-%d')).count()

        # Top 3 streaks
        top_streaks = db.query(models.User).order_by(models.User.racha.desc()).limit(3).all()

        msg = "📊 Estadísticas de la App\n\n"
        msg += f"👥 Total de usuarios: {total_users}\n"
        msg += f"🔥 Activos hoy: {active_today}\n\n"
        msg += "🏆 Top 3 Rachas:\n"
        for i, u in enumerate(top_streaks):
            msg += f"{i+1}. {u.first_name} (@{u.username if u.username else 'N/A'}) - {u.racha} días\n"

        if direct:
            await update.message.reply_text(msg)
        else:
            await update.callback_query.message.reply_text(msg)

    except Exception as e:
        if direct:
            await update.message.reply_text(f"❌ Error obteniendo stats: {e}")
        else:
            await update.callback_query.message.reply_text(f"❌ Error obteniendo stats: {e}")
    finally:
        db.close()

# Build application globally so it can be accessed by FastAPI
if TOKEN == "YOUR_BOT_TOKEN_HERE":
    print("Warning: TELEGRAM_BOT_TOKEN is not set.")

application = Application.builder().token(TOKEN).build()

# Add ConversationHandler for the interactive admin flow
admin_conv_handler = ConversationHandler(
    entry_points=[
        CommandHandler('admin', admin_menu),
        CallbackQueryHandler(conversation_entry_handler, pattern='^(mat_new|mat_edit|mat_del|uni_new|uni_edit|uni_del|tm_new|tm_list|tm_del|fc_new|fc_del|qz_new|qz_del)$')
    ],
    states={
        SELECT_MATERIA: [
            CallbackQueryHandler(materia_selected, pattern='^sel_mat_'),
            CallbackQueryHandler(cancel_to_main_handler, pattern='^cancel_to_main$')
        ],
        SELECT_UNIDAD: [
            CallbackQueryHandler(unidad_selected, pattern='^sel_uni_'),
            CallbackQueryHandler(cancel_to_main_handler, pattern='^cancel_to_main$')
        ],
        SELECT_TEMA: [
            CallbackQueryHandler(tema_selected, pattern='^sel_tema_'),
            CallbackQueryHandler(cancel_to_main_handler, pattern='^cancel_to_main$')
        ],
        CONFIRM_ACTION: [
            CallbackQueryHandler(confirm_action_handler, pattern='^confirm_yes$'),
            CallbackQueryHandler(cancel_to_main_handler, pattern='^cancel_to_main$')
        ],
        WAITING_MATERIA_EMOJI: [MessageHandler(filters.TEXT & ~filters.COMMAND, mat_emoji_received)],
        WAITING_MATERIA_NOMBRE: [MessageHandler(filters.TEXT & ~filters.COMMAND, mat_nombre_received)],
        WAITING_MATERIA_COLOR: [MessageHandler(filters.TEXT & ~filters.COMMAND, mat_color_received)],
        WAITING_MATERIA_NOMBRE_EDIT: [MessageHandler(filters.TEXT & ~filters.COMMAND, mat_nombre_edit_received)],
        WAITING_UNIDAD_NOMBRE: [MessageHandler(filters.TEXT & ~filters.COMMAND, uni_nombre_received)],
        WAITING_UNIDAD_NOMBRE_EDIT: [MessageHandler(filters.TEXT & ~filters.COMMAND, uni_nombre_edit_received)],
        WAITING_TEMA_NOMBRE: [MessageHandler(filters.TEXT & ~filters.COMMAND, tm_nombre_received)],
        WAITING_FLASHCARD_CSV: [MessageHandler(filters.Document.ALL | filters.TEXT & ~filters.COMMAND, fc_doc_received)],
        WAITING_QUIZ_JSON: [MessageHandler(filters.Document.ALL | filters.TEXT & ~filters.COMMAND, qz_doc_received)]
    },
    fallbacks=[
        CommandHandler('cancel', cancel_conversation),
        CallbackQueryHandler(cancel_to_main_handler, pattern='^cancel_to_main$')
    ],
    allow_reentry=True
)

application.add_handler(admin_conv_handler)

# General commands handling (legacy / quick usage)
application.add_handler(CommandHandler("start", start))
application.add_handler(CommandHandler("nueva_materia", nueva_materia))
application.add_handler(CommandHandler("nueva_unidad", nueva_unidad))
application.add_handler(CommandHandler("nuevo_tema", nuevo_tema))
application.add_handler(CommandHandler("flashcards", flashcards))
application.add_handler(CommandHandler("quiz", quiz))
application.add_handler(CommandHandler("stats", stats))

# Standalone callback query handler for menus
# Note: Handled AFTER the conversation handler, so conversation fallbacks don't consume it
application.add_handler(CallbackQueryHandler(button_handler, pattern='^(menu_main|menu_materias|menu_unidades|menu_temas|menu_flashcards|menu_quiz|menu_stats|menu_reload|mat_list|uni_list|fc_list|qz_list)$'))

async def error_handler(update, context):
    if 'Conflict' in str(context.error):
        return  # ignore conflict errors during redeploy
    logger.error('Update %s caused error %s', update, context.error)

application.add_error_handler(error_handler)

if __name__ == "__main__":
    print("Bot is starting polling...")
    application.run_polling(
        drop_pending_updates=True,
        allowed_updates=['message', 'callback_query'],
        close_loop=False
    )
