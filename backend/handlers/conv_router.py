from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, ConversationHandler

from bot_config import (
    ADMIN_ID, SELECT_MATERIA, SELECT_UNIDAD, SELECT_TEMA, CONFIRM_ACTION,
    WAITING_MATERIA_EMOJI, WAITING_MATERIA_NOMBRE_EDIT, WAITING_UNIDAD_NOMBRE,
    WAITING_UNIDAD_NOMBRE_EDIT, WAITING_TEMA_NOMBRE, WAITING_FLASHCARD_CSV,
    WAITING_QUIZ_JSON, WAITING_INFOGRAFIA_TITULO, WAITING_PDF_TITULO,
    SELECT_INFOGRAFIA, SELECT_PDF,
)
from bot_helpers import (
    show_materia_selection, show_unidad_selection, show_tema_selection,
    show_confirm_action,
)
from bot_menus import send_raw_menu, get_main_menu, send_success_menu
from database import SessionLocal
import models


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
    elif data in ['mat_edit', 'mat_del', 'uni_new', 'tm_new', 'tm_list', 'tm_del', 'uni_edit', 'uni_del', 'fc_new', 'fc_del', 'qz_new', 'qz_del', 'inf_new', 'inf_del', 'pdf_new', 'pdf_del']:
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
    elif action == 'uni_new':
        await query.edit_message_text("Enviá el nombre de la nueva unidad:")
        return WAITING_UNIDAD_NOMBRE
    elif action in ['tm_new', 'tm_list', 'tm_del', 'uni_edit', 'uni_del', 'fc_new', 'fc_del', 'qz_new', 'qz_del', 'inf_new', 'inf_del', 'pdf_new', 'pdf_del']:
        await show_unidad_selection(update, context, "¿A qué unidad pertenece?")
        return SELECT_UNIDAD

    return ConversationHandler.END


async def unidad_selected(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()
    uni_id = int(query.data.split('_')[2])
    context.user_data['selected_unidad_id'] = uni_id
    action = context.user_data.get('action')

    if action == 'uni_edit':
        await query.edit_message_text("Enviá el nuevo nombre para esta unidad:")
        return WAITING_UNIDAD_NOMBRE_EDIT
    elif action == 'uni_del':
        await show_confirm_action(update, "⚠️ ¿Seguro que querés borrar esta unidad y todas sus dependencias?")
        return CONFIRM_ACTION
    elif action == 'tm_new':
        db = SessionLocal()
        try:
            unidad = db.query(models.Unidad).filter(models.Unidad.id == uni_id).first()
            temas = db.query(models.Tema).filter(models.Tema.id_unidad == uni_id).all()
            unidad_nombre = unidad.nombre if unidad else str(uni_id)
            if temas:
                lista = "\n".join(f"- {t.nombre}" for t in temas)
                msg = f"📚 *Unidad: {unidad_nombre}*\n\nTemas existentes:\n{lista}\n\nAhora enviá el nombre del nuevo tema (o /cancelar para salir):"
            else:
                msg = f"📚 *Unidad: {unidad_nombre}*\n\nNo hay temas cargados aún.\n\nEnviá el nombre del primer tema:"
            await query.edit_message_text(msg, parse_mode='Markdown')
        finally:
            db.close()
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
    elif action == 'inf_new':
        db = SessionLocal()
        try:
            unidad = db.query(models.Unidad).filter(models.Unidad.id == uni_id).first()
            uni_nombre = unidad.nombre if unidad else str(uni_id)
        finally:
            db.close()
        await query.edit_message_text(
            f"🖼️ Unidad: *{uni_nombre}*\n\nEnviá el *título* de la infografía:",
            parse_mode='Markdown'
        )
        return WAITING_INFOGRAFIA_TITULO
    elif action == 'inf_del':
        db = SessionLocal()
        try:
            infografias = (
                db.query(models.Infografia)
                .filter(models.Infografia.id_unidad == uni_id)
                .order_by(models.Infografia.orden)
                .all()
            )
            if not infografias:
                await query.edit_message_text("ℹ️ Esta unidad no tiene infografías.")
                return ConversationHandler.END
            keyboard = [
                [InlineKeyboardButton(inf.titulo, callback_data=f"sel_inf_{inf.id}")]
                for inf in infografias
            ]
            keyboard.append([InlineKeyboardButton("🔙 Cancelar", callback_data="cancel_to_main")])
            await query.edit_message_text(
                "🗑️ *Seleccioná la infografía a eliminar:*",
                reply_markup=InlineKeyboardMarkup(keyboard),
                parse_mode='Markdown'
            )
        finally:
            db.close()
        return SELECT_INFOGRAFIA
    elif action == 'pdf_new':
        db = SessionLocal()
        try:
            unidad = db.query(models.Unidad).filter(models.Unidad.id == uni_id).first()
            uni_nombre = unidad.nombre if unidad else str(uni_id)
        finally:
            db.close()
        await query.edit_message_text(
            f"📄 Unidad: *{uni_nombre}*\n\nEnviá el *título* del PDF:",
            parse_mode='Markdown'
        )
        return WAITING_PDF_TITULO
    elif action == 'pdf_del':
        db = SessionLocal()
        try:
            pdfs = (
                db.query(models.Pdf)
                .filter(models.Pdf.id_unidad == uni_id)
                .order_by(models.Pdf.orden)
                .all()
            )
            if not pdfs:
                await query.edit_message_text("ℹ️ Esta unidad no tiene PDFs.")
                return ConversationHandler.END
            keyboard = [
                [InlineKeyboardButton(pdf.titulo, callback_data=f"sel_pdf_{pdf.id}")]
                for pdf in pdfs
            ]
            keyboard.append([InlineKeyboardButton("🔙 Cancelar", callback_data="cancel_to_main")])
            await query.edit_message_text(
                "🗑️ *Seleccioná el PDF a eliminar:*",
                reply_markup=InlineKeyboardMarkup(keyboard),
                parse_mode='Markdown'
            )
        finally:
            db.close()
        return SELECT_PDF

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


async def infografia_selected(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()
    inf_id = int(query.data.split('_')[2])
    context.user_data['selected_infografia_id'] = inf_id

    db = SessionLocal()
    try:
        inf = db.query(models.Infografia).filter(models.Infografia.id == inf_id).first()
        titulo = inf.titulo if inf else str(inf_id)
    finally:
        db.close()

    await show_confirm_action(update, f"⚠️ ¿Confirmás que querés eliminar la infografía *{titulo}*?")
    return CONFIRM_ACTION


async def pdf_selected(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()
    pdf_id = int(query.data.split('_')[2])
    context.user_data['selected_pdf_id'] = pdf_id

    db = SessionLocal()
    try:
        pdf = db.query(models.Pdf).filter(models.Pdf.id == pdf_id).first()
        titulo = pdf.titulo if pdf else str(pdf_id)
    finally:
        db.close()

    await show_confirm_action(update, f"⚠️ ¿Confirmás que querés eliminar el PDF *{titulo}*?")
    return CONFIRM_ACTION
