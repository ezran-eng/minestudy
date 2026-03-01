import os
import json
import csv
import asyncio
import httpx
from datetime import date
from io import StringIO
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler, ConversationHandler
from sqlalchemy.orm import Session
from database import SessionLocal
import models

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")

# Constants for conversation states
(
    WAITING_MATERIA_EMOJI, WAITING_MATERIA_NOMBRE, WAITING_MATERIA_COLOR,
    WAITING_MATERIA_ID_EDIT, WAITING_MATERIA_NOMBRE_EDIT, WAITING_MATERIA_ID_DEL,
    WAITING_UNIDAD_MATERIA_ID, WAITING_UNIDAD_NOMBRE,
    WAITING_UNIDAD_ID_EDIT, WAITING_UNIDAD_NOMBRE_EDIT, WAITING_UNIDAD_ID_DEL,
    WAITING_FLASHCARD_CSV, WAITING_FLASHCARD_DEL,
    WAITING_QUIZ_JSON, WAITING_QUIZ_DEL
) = range(15)


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
            [{'text': "📚 Materias", 'callback_data': 'menu_materias'},
             {'text': "💥 Unidades", 'callback_data': 'menu_unidades'}],
            [{'text': "🃏 Flashcards", 'callback_data': 'menu_flashcards'},
             {'text': "🎯 Quiz", 'callback_data': 'menu_quiz'}],
            [{'text': "📊 Stats", 'callback_data': 'menu_stats'},
             {'text': "🔄 Recargar DB", 'callback_data': 'menu_reload'}]
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

async def conversation_entry_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    if query.from_user.id != ADMIN_ID:
        await query.answer("No tienes permisos.", show_alert=True)
        return ConversationHandler.END

    await query.answer()
    data = query.data

    # MATERIAS
    if data == 'mat_new':
        await query.message.reply_text("🟢 **Nueva Materia**\nEnviá el emoji para la materia:")
        return WAITING_MATERIA_EMOJI
    elif data == 'mat_edit':
        await query.message.reply_text("🟡 **Editar Materia**\nEnviá el ID de la materia que querés editar:")
        return WAITING_MATERIA_ID_EDIT
    elif data == 'mat_del':
        await query.message.reply_text("🔴 **Borrar Materia**\nEnviá el ID de la materia que querés borrar:")
        return WAITING_MATERIA_ID_DEL

    # UNIDADES
    elif data == 'uni_new':
        await query.message.reply_text("🟢 **Nueva Unidad**\nEnviá el ID de la materia a la que pertenece:")
        return WAITING_UNIDAD_MATERIA_ID
    elif data == 'uni_edit':
        await query.message.reply_text("🟡 **Editar Unidad**\nEnviá el ID de la unidad que querés editar:")
        return WAITING_UNIDAD_ID_EDIT
    elif data == 'uni_del':
        await query.message.reply_text("🔴 **Borrar Unidad**\nEnviá el ID de la unidad que querés borrar:")
        return WAITING_UNIDAD_ID_DEL

    # FLASHCARDS
    elif data == 'fc_new':
        await query.message.reply_text("🟢 **Subir Flashcards**\nEnviá el ID de la unidad:")
        return WAITING_FLASHCARD_CSV
    elif data == 'fc_list':
        await query.message.reply_text("🔵 **Ver Flashcards**\nFuncionalidad no implementada aún en la base de datos de listado.")
        return ConversationHandler.END
    elif data == 'fc_del':
        await query.message.reply_text("🔴 **Borrar Flashcards**\nEnviá el ID de la unidad para borrar sus flashcards:")
        return WAITING_FLASHCARD_DEL

    # QUIZ
    elif data == 'qz_new':
        await query.message.reply_text("🟢 **Subir Quiz**\nEnviá el ID de la unidad:")
        return WAITING_QUIZ_JSON
    elif data == 'qz_list':
        await query.message.reply_text("🔵 **Ver Preguntas**\nFuncionalidad no implementada aún en la base de datos de listado.")
        return ConversationHandler.END
    elif data == 'qz_del':
        await query.message.reply_text("🔴 **Borrar Quiz**\nEnviá el ID de la unidad para borrar su quiz:")
        return WAITING_QUIZ_DEL

    # If it's a menu navigation, we shouldn't block conversation but we don't start a state
    return ConversationHandler.END

async def cancel_conversation(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    await update.message.reply_text("Operación cancelada. Usa /admin para el menú.")
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
        await update.message.reply_text(f"✅ Materia '{materia.nombre}' creada exitosamente con ID {materia.id}.")
    except Exception as e:
        await update.message.reply_text(f"❌ Error guardando materia: {e}")
    finally:
        db.close()

    context.user_data.clear()
    return ConversationHandler.END

async def mat_id_edit_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data['temp_id'] = update.message.text
    await update.message.reply_text("Enviá el nuevo nombre para esta materia (el emoji y color quedarán igual por ahora):")
    return WAITING_MATERIA_NOMBRE_EDIT

async def mat_nombre_edit_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    nuevo_nombre = update.message.text
    mat_id = context.user_data.get('temp_id')

    db = SessionLocal()
    try:
        mat = db.query(models.Materia).filter(models.Materia.id == mat_id).first()
        if mat:
            mat.nombre = nuevo_nombre
            db.commit()
            await update.message.reply_text(f"✅ Materia {mat_id} actualizada a '{nuevo_nombre}'.")
        else:
            await update.message.reply_text(f"❌ Materia con ID {mat_id} no encontrada.")
    except Exception as e:
         await update.message.reply_text(f"❌ Error: {e}")
    finally:
        db.close()

    return ConversationHandler.END

async def mat_del_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    mat_id = update.message.text
    db = SessionLocal()
    try:
        mat = db.query(models.Materia).filter(models.Materia.id == mat_id).first()
        if mat:
            db.delete(mat)
            db.commit()
            await update.message.reply_text(f"✅ Materia {mat_id} y sus dependencias han sido borradas.")
        else:
            await update.message.reply_text(f"❌ Materia con ID {mat_id} no encontrada.")
    except Exception as e:
         await update.message.reply_text(f"❌ Error: {e}")
    finally:
        db.close()
    return ConversationHandler.END

# --- UNIDAD CONVERSATION ---
async def uni_mat_id_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data['temp_mat_id'] = update.message.text
    await update.message.reply_text("Ahora enviá el nombre de la unidad:")
    return WAITING_UNIDAD_NOMBRE

async def uni_nombre_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    nombre = update.message.text
    mat_id = context.user_data.get('temp_mat_id')
    db = SessionLocal()
    try:
        uni = models.Unidad(id_materia=mat_id, nombre=nombre)
        db.add(uni)
        db.commit()
        await update.message.reply_text(f"✅ Unidad '{nombre}' creada con ID {uni.id}.")
    except Exception as e:
         await update.message.reply_text(f"❌ Error: {e}")
    finally:
        db.close()
    return ConversationHandler.END

async def uni_id_edit_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data['temp_uni_id'] = update.message.text
    await update.message.reply_text("Enviá el nuevo nombre para esta unidad:")
    return WAITING_UNIDAD_NOMBRE_EDIT

async def uni_nombre_edit_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    nombre = update.message.text
    uni_id = context.user_data.get('temp_uni_id')
    db = SessionLocal()
    try:
        uni = db.query(models.Unidad).filter(models.Unidad.id == uni_id).first()
        if uni:
            uni.nombre = nombre
            db.commit()
            await update.message.reply_text(f"✅ Unidad {uni_id} actualizada a '{nombre}'.")
        else:
            await update.message.reply_text(f"❌ Unidad con ID {uni_id} no encontrada.")
    except Exception as e:
         await update.message.reply_text(f"❌ Error: {e}")
    finally:
        db.close()
    return ConversationHandler.END

async def uni_del_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    uni_id = update.message.text
    db = SessionLocal()
    try:
        uni = db.query(models.Unidad).filter(models.Unidad.id == uni_id).first()
        if uni:
            db.delete(uni)
            db.commit()
            await update.message.reply_text(f"✅ Unidad {uni_id} borrada.")
        else:
            await update.message.reply_text(f"❌ Unidad con ID {uni_id} no encontrada.")
    except Exception as e:
         await update.message.reply_text(f"❌ Error: {e}")
    finally:
        db.close()
    return ConversationHandler.END

# --- FLASHCARD CONVERSATION ---
async def fc_id_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data['temp_uni_id_fc'] = update.message.text
    await update.message.reply_text("Ahora adjuntá el archivo CSV con las flashcards (pregunta,respuesta):")
    # State remains WAITING_FLASHCARD_CSV but expecting document
    return WAITING_FLASHCARD_CSV

async def fc_doc_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    if not update.message.document:
        await update.message.reply_text("Por favor enviá un documento CSV, o /cancel.")
        return WAITING_FLASHCARD_CSV

    uni_id = context.user_data.get('temp_uni_id_fc')
    file = await context.bot.get_file(update.message.document.file_id)
    content = await file.download_as_bytearray()

    try:
        text_content = content.decode('utf-8')
        csv_reader = csv.DictReader(StringIO(text_content))

        if not all(col in csv_reader.fieldnames for col in ['pregunta', 'respuesta']):
            await update.message.reply_text("Error: El CSV debe tener las columnas pregunta y respuesta")
            return ConversationHandler.END

        db = SessionLocal()
        count = 0
        for row in csv_reader:
            fc = models.Flashcard(
                id_unidad=uni_id,
                pregunta=row['pregunta'],
                respuesta=row['respuesta']
            )
            db.add(fc)
            count += 1

        db.commit()
        await update.message.reply_text(f"✅ Importadas {count} flashcards a la unidad {uni_id}.")
    except Exception as e:
        await update.message.reply_text(f"❌ Error procesando CSV: {e}")
    finally:
        if 'db' in locals():
            db.close()

    return ConversationHandler.END

async def fc_del_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    uni_id = update.message.text
    db = SessionLocal()
    try:
        deleted = db.query(models.Flashcard).filter(models.Flashcard.id_unidad == uni_id).delete()
        db.commit()
        await update.message.reply_text(f"✅ Borradas {deleted} flashcards de la unidad {uni_id}.")
    except Exception as e:
         await update.message.reply_text(f"❌ Error: {e}")
    finally:
        db.close()
    return ConversationHandler.END

# --- QUIZ CONVERSATION ---
async def qz_id_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data['temp_uni_id_qz'] = update.message.text
    await update.message.reply_text("Ahora adjuntá el archivo JSON con las preguntas del quiz:")
    return WAITING_QUIZ_JSON

async def qz_doc_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    if not update.message.document:
        await update.message.reply_text("Por favor enviá un documento JSON, o /cancel.")
        return WAITING_QUIZ_JSON

    uni_id = context.user_data.get('temp_uni_id_qz')
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
        await update.message.reply_text(f"✅ Importadas {count} preguntas de quiz a la unidad {uni_id}.")
    except Exception as e:
        await update.message.reply_text(f"❌ Error procesando JSON: {e}")
    finally:
        if 'db' in locals():
            db.close()

    return ConversationHandler.END

async def qz_del_received(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    uni_id = update.message.text
    db = SessionLocal()
    try:
        deleted = db.query(models.QuizPregunta).filter(models.QuizPregunta.id_unidad == uni_id).delete()
        db.commit()
        await update.message.reply_text(f"✅ Borradas {deleted} preguntas de quiz de la unidad {uni_id}.")
    except Exception as e:
         await update.message.reply_text(f"❌ Error: {e}")
    finally:
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
        csv_reader = csv.DictReader(StringIO(text_content))

        # Verify columns
        if not all(col in csv_reader.fieldnames for col in ['pregunta', 'respuesta']):
            await update.message.reply_text("Error: El CSV debe tener las columnas pregunta y respuesta")
            return

        db = SessionLocal()
        count = 0
        for row in csv_reader:
            fc = models.Flashcard(
                id_unidad=id_unidad,
                pregunta=row['pregunta'],
                respuesta=row['respuesta']
            )
            db.add(fc)
            count += 1

        db.commit()
        await update.message.reply_text(f"✅ Importadas {count} flashcards a la unidad {id_unidad}.")

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
        # Note SQLite datetime comparison could be tricky, func.date() works in standard SQL/SQLite
        active_today = db.query(models.User).filter(func.date(models.User.ultima_actividad) == today.strftime('%Y-%m-%d')).count()

        # Top 3 streaks
        top_streaks = db.query(models.User).order_by(models.User.racha.desc()).limit(3).all()

        msg = "📊 **Estadísticas de la App**\n\n"
        msg += f"👥 Total de usuarios: {total_users}\n"
        msg += f"🔥 Activos hoy: {active_today}\n\n"
        msg += "🏆 **Top 3 Rachas**:\n"
        for i, u in enumerate(top_streaks):
            msg += f"{i+1}. {u.first_name} (@{u.username if u.username else 'N/A'}) - {u.racha} días\n"

        if direct:
            await update.message.reply_text(msg, parse_mode='Markdown')
        else:
            await update.callback_query.message.reply_text(msg, parse_mode='Markdown')

    except Exception as e:
        if direct:
            await update.message.reply_text(f"❌ Error obteniendo stats: {e}")
        else:
            await update.callback_query.message.reply_text(f"❌ Error obteniendo stats: {e}")
    finally:
        db.close()

def main() -> None:
    # Use placeholder if not set
    TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")
    if TOKEN == "YOUR_BOT_TOKEN_HERE":
         print("Warning: TELEGRAM_BOT_TOKEN is not set.")

    application = Application.builder().token(TOKEN).build()

    # Add ConversationHandler for the interactive admin flow
    admin_conv_handler = ConversationHandler(
        entry_points=[
            CommandHandler('admin', admin_menu),
            CallbackQueryHandler(conversation_entry_handler)
        ],
        states={
            # Materia
            WAITING_MATERIA_EMOJI: [MessageHandler(filters.TEXT & ~filters.COMMAND, mat_emoji_received)],
            WAITING_MATERIA_NOMBRE: [MessageHandler(filters.TEXT & ~filters.COMMAND, mat_nombre_received)],
            WAITING_MATERIA_COLOR: [MessageHandler(filters.TEXT & ~filters.COMMAND, mat_color_received)],
            WAITING_MATERIA_ID_EDIT: [MessageHandler(filters.TEXT & ~filters.COMMAND, mat_id_edit_received)],
            WAITING_MATERIA_NOMBRE_EDIT: [MessageHandler(filters.TEXT & ~filters.COMMAND, mat_nombre_edit_received)],
            WAITING_MATERIA_ID_DEL: [MessageHandler(filters.TEXT & ~filters.COMMAND, mat_del_received)],
            # Unidad
            WAITING_UNIDAD_MATERIA_ID: [MessageHandler(filters.TEXT & ~filters.COMMAND, uni_mat_id_received)],
            WAITING_UNIDAD_NOMBRE: [MessageHandler(filters.TEXT & ~filters.COMMAND, uni_nombre_received)],
            WAITING_UNIDAD_ID_EDIT: [MessageHandler(filters.TEXT & ~filters.COMMAND, uni_id_edit_received)],
            WAITING_UNIDAD_NOMBRE_EDIT: [MessageHandler(filters.TEXT & ~filters.COMMAND, uni_nombre_edit_received)],
            WAITING_UNIDAD_ID_DEL: [MessageHandler(filters.TEXT & ~filters.COMMAND, uni_del_received)],
            # Flashcards
            WAITING_FLASHCARD_CSV: [MessageHandler(filters.Document.ALL | filters.TEXT & ~filters.COMMAND, fc_doc_received)],
            WAITING_FLASHCARD_DEL: [MessageHandler(filters.TEXT & ~filters.COMMAND, fc_del_received)],
            # Quiz
            WAITING_QUIZ_JSON: [MessageHandler(filters.Document.ALL | filters.TEXT & ~filters.COMMAND, qz_doc_received)],
            WAITING_QUIZ_DEL: [MessageHandler(filters.TEXT & ~filters.COMMAND, qz_del_received)]
        },
        fallbacks=[CommandHandler('cancel', cancel_conversation)],
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
    application.add_handler(CallbackQueryHandler(button_handler))

    print("Bot is running...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()
