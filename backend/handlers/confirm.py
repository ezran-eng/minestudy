import logging
import os
import httpx

from telegram import Update
from telegram.ext import ContextTypes, ConversationHandler

from bot_config import API_URL
from bot_menus import send_success_menu

logger = logging.getLogger(__name__)


def _admin_headers() -> dict:
    return {"X-Admin-Token": os.environ.get("ADMIN_SECRET", "")}


async def _api_delete(path: str) -> httpx.Response:
    async with httpx.AsyncClient(timeout=30) as client:
        return await client.delete(f"{API_URL}{path}", headers=_admin_headers())


async def confirm_action_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()
    action = context.user_data.get('action')

    try:
        if action == 'mat_del':
            mat_id = context.user_data.get('selected_materia_id')
            resp = await _api_delete(f"/materias/{mat_id}")
            if resp.status_code == 204:
                await send_success_menu(update, "✅ Materia borrada.", action)
            elif resp.status_code == 404:
                await send_success_menu(update, "⚠️ La materia ya no existe.", action)
            else:
                await query.edit_message_text(f"❌ Error al eliminar: {resp.status_code}")

        elif action == 'uni_del':
            uni_id = context.user_data.get('selected_unidad_id')
            resp = await _api_delete(f"/unidades/{uni_id}")
            if resp.status_code == 204:
                await send_success_menu(update, "✅ Unidad borrada.", action)
            elif resp.status_code == 404:
                await send_success_menu(update, "⚠️ La unidad ya no existe.", action)
            else:
                await query.edit_message_text(f"❌ Error al eliminar: {resp.status_code}")

        elif action == 'tm_del':
            tema_id = context.user_data.get('selected_tema_id')
            resp = await _api_delete(f"/temas/{tema_id}")
            if resp.status_code == 204:
                await send_success_menu(update, "✅ Tema borrado.", action)
            elif resp.status_code == 404:
                await send_success_menu(update, "⚠️ El tema ya no existe.", action)
            else:
                await query.edit_message_text(f"❌ Error al eliminar: {resp.status_code}")

        elif action == 'fc_del':
            uni_id = context.user_data.get('selected_unidad_id')
            resp = await _api_delete(f"/unidades/{uni_id}/flashcards")
            if resp.status_code == 204:
                await send_success_menu(update, "✅ Flashcards borradas.", action)
            else:
                await query.edit_message_text(f"❌ Error al eliminar: {resp.status_code}")

        elif action == 'qz_del':
            uni_id = context.user_data.get('selected_unidad_id')
            resp = await _api_delete(f"/unidades/{uni_id}/quiz")
            if resp.status_code == 204:
                await send_success_menu(update, "✅ Preguntas de quiz borradas.", action)
            else:
                await query.edit_message_text(f"❌ Error al eliminar: {resp.status_code}")

        elif action == 'inf_del':
            inf_id = context.user_data.get('selected_infografia_id')
            resp = await _api_delete(f"/admin/infografias/{inf_id}")
            if resp.status_code == 204:
                await send_success_menu(update, "✅ Infografía eliminada.", action)
            elif resp.status_code == 404:
                await send_success_menu(update, "⚠️ La infografía ya no existe.", action)
            else:
                await query.edit_message_text(f"❌ Error al eliminar: {resp.status_code}")

        elif action == 'pdf_del':
            pdf_id = context.user_data.get('selected_pdf_id')
            resp = await _api_delete(f"/admin/pdfs/{pdf_id}")
            if resp.status_code == 204:
                await send_success_menu(update, "✅ PDF eliminado.", action)
            elif resp.status_code == 404:
                await send_success_menu(update, "⚠️ El PDF ya no existe.", action)
            else:
                await query.edit_message_text(f"❌ Error al eliminar: {resp.status_code}")

    except Exception as e:
        logger.error(f"confirm_action_handler: {action} failed — {type(e).__name__}: {e}", exc_info=True)
        await query.edit_message_text(f"❌ Error inesperado: {type(e).__name__}: {e}")

    return ConversationHandler.END
