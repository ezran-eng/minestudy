import httpx
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from bot_config import TOKEN


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
            [{'text': "🖼️ Infografías", 'callback_data': 'menu_infografias', 'style': 'success'},
             {'text': "📄 PDFs", 'callback_data': 'menu_pdfs', 'style': 'success'}],
            [{'text': "📊 Stats", 'callback_data': 'menu_stats', 'style': 'primary'},
             {'text': "🔄 Recargar DB", 'callback_data': 'menu_reload', 'style': 'primary'}]
        ]
    }


def get_pdfs_menu():
    return {
        'inline_keyboard': [
            [{'text': "🟢 Subir PDF", 'callback_data': 'pdf_new', 'style': 'success'}],
            [{'text': "🗑️ Eliminar PDF", 'callback_data': 'pdf_del', 'style': 'danger'}],
            [{'text': "⚫ Volver", 'callback_data': 'menu_main'}]
        ]
    }


def get_infografias_menu():
    return {
        'inline_keyboard': [
            [{'text': "🟢 Subir Infografía", 'callback_data': 'inf_new', 'style': 'success'}],
            [{'text': "🗑️ Eliminar Infografía", 'callback_data': 'inf_del', 'style': 'danger'}],
            [{'text': "⚫ Volver", 'callback_data': 'menu_main'}]
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


async def send_success_menu(update: Update, text: str, create_action: str):
    keyboard = [
        [InlineKeyboardButton("➕ Hacer otro", callback_data=create_action)],
        [InlineKeyboardButton("🏠 Menú principal", callback_data="menu_main")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    if update.callback_query:
        await update.callback_query.edit_message_text(text, reply_markup=reply_markup)
    else:
        await update.message.reply_text(text, reply_markup=reply_markup)
