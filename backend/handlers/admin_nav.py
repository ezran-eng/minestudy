from telegram import Update
from telegram.ext import ContextTypes

from bot_config import ADMIN_ID
from bot_helpers import admin_only
from bot_menus import (
    send_raw_menu, get_main_menu, get_materias_menu, get_unidades_menu,
    get_flashcards_menu, get_quiz_menu, get_temas_menu, get_infografias_menu,
    get_pdfs_menu,
)
from database import SessionLocal
import models


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
    elif data == 'menu_infografias':
        await send_raw_menu(chat_id, "🖼️ **Menú de Infografías**", get_infografias_menu(), msg_id)
    elif data == 'menu_pdfs':
        await send_raw_menu(chat_id, "📄 **Menú de PDFs**", get_pdfs_menu(), msg_id)
    elif data == 'menu_stats':
        from handlers.stats import stats
        await stats(update, context, direct=False)
    elif data == 'menu_reload':
        await send_raw_menu(chat_id, "🔄 Caché y BD recargadas (simulado).", get_main_menu(), msg_id)

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
