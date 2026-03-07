import logging
from telegram.ext import (
    Application, CommandHandler, MessageHandler, filters,
    CallbackQueryHandler, ConversationHandler,
)

from bot_config import (
    TOKEN,
    SELECT_MATERIA, SELECT_UNIDAD, SELECT_TEMA, CONFIRM_ACTION,
    WAITING_MATERIA_EMOJI, WAITING_MATERIA_NOMBRE, WAITING_MATERIA_COLOR,
    WAITING_MATERIA_NOMBRE_EDIT,
    WAITING_UNIDAD_NOMBRE, WAITING_UNIDAD_NOMBRE_EDIT,
    WAITING_TEMA_NOMBRE,
    WAITING_FLASHCARD_CSV, WAITING_QUIZ_JSON,
    WAITING_INFOGRAFIA_TITULO, WAITING_INFOGRAFIA_FOTO,
    SELECT_INFOGRAFIA,
    WAITING_PDF_TITULO, WAITING_PDF_DOC,
    SELECT_PDF,
)

from handlers.welcome import start, unknown_handler
from handlers.admin_nav import admin_menu, button_handler
from handlers.conv_router import (
    conversation_entry_handler, cancel_to_main_handler, cancel_conversation,
    materia_selected, unidad_selected, tema_selected,
    infografia_selected, pdf_selected,
)
from handlers.materias import (
    mat_emoji_received, mat_nombre_received, mat_color_received,
    mat_nombre_edit_received,
)
from handlers.unidades import uni_nombre_received, uni_nombre_edit_received
from handlers.temas import tm_nombre_received
from handlers.flashcards import fc_doc_received
from handlers.quiz import qz_doc_received
from handlers.infografias import inf_titulo_received, inf_foto_received
from handlers.pdfs import pdf_titulo_received, pdf_doc_received
from handlers.confirm import confirm_action_handler
from handlers.stats import stats

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logging.getLogger('httpx').setLevel(logging.WARNING)

# Build application globally so it can be accessed by FastAPI
if TOKEN == "YOUR_BOT_TOKEN_HERE":
    print("Warning: TELEGRAM_BOT_TOKEN is not set.")

application = Application.builder().token(TOKEN).build()

# ConversationHandler for the interactive admin flow
admin_conv_handler = ConversationHandler(
    entry_points=[
        CommandHandler('admin', admin_menu),
        CallbackQueryHandler(conversation_entry_handler, pattern='^(mat_new|mat_edit|mat_del|uni_new|uni_edit|uni_del|tm_new|tm_list|tm_del|fc_new|fc_del|qz_new|qz_del|inf_new|inf_del|pdf_new|pdf_del)$')
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
        WAITING_QUIZ_JSON: [MessageHandler(filters.Document.ALL | filters.TEXT & ~filters.COMMAND, qz_doc_received)],
        WAITING_INFOGRAFIA_TITULO: [MessageHandler(filters.TEXT & ~filters.COMMAND, inf_titulo_received)],
        WAITING_INFOGRAFIA_FOTO: [MessageHandler(filters.PHOTO, inf_foto_received)],
        SELECT_INFOGRAFIA: [
            CallbackQueryHandler(infografia_selected, pattern='^sel_inf_'),
            CallbackQueryHandler(cancel_to_main_handler, pattern='^cancel_to_main$'),
        ],
        WAITING_PDF_TITULO: [MessageHandler(filters.TEXT & ~filters.COMMAND, pdf_titulo_received)],
        WAITING_PDF_DOC: [MessageHandler(filters.Document.PDF | filters.Document.ALL, pdf_doc_received)],
        SELECT_PDF: [
            CallbackQueryHandler(pdf_selected, pattern='^sel_pdf_'),
            CallbackQueryHandler(cancel_to_main_handler, pattern='^cancel_to_main$'),
        ],
    },
    fallbacks=[
        CommandHandler('cancel', cancel_conversation),
        CallbackQueryHandler(cancel_to_main_handler, pattern='^cancel_to_main$')
    ],
    allow_reentry=True
)

application.add_handler(admin_conv_handler)

# General commands
application.add_handler(CommandHandler("start", start))
application.add_handler(CommandHandler("stats", stats))

# Standalone callback query handler for menu navigation
application.add_handler(CallbackQueryHandler(button_handler, pattern='^(menu_main|menu_materias|menu_unidades|menu_temas|menu_flashcards|menu_quiz|menu_infografias|menu_pdfs|menu_stats|menu_reload|mat_list|uni_list|fc_list|qz_list)$'))

# Catch-all: unknown commands and free text -> welcome for non-admin users
application.add_handler(MessageHandler(filters.ALL & ~filters.UpdateType.EDITED_MESSAGE, unknown_handler))


async def error_handler(update, context):
    if 'Conflict' in str(context.error):
        return
    logger.error('Update %s caused error %s', update, context.error)

application.add_error_handler(error_handler)

if __name__ == "__main__":
    print("Bot is starting polling...")
    application.run_polling(
        drop_pending_updates=True,
        allowed_updates=['message', 'callback_query'],
        close_loop=False
    )
