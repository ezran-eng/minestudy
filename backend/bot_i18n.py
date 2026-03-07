import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import ContextTypes

from bot_config import MINI_APP_URL

logger = logging.getLogger(__name__)

_WELCOME = {
    "es": (
        "👋 ¡Hola, *{name}*!\n\n"
        "Bienvenido a *DaathApp*, tu plataforma de estudio universitario. 📚\n\n"
        "📚 *¿Qué podés hacer?*\n"
        "• 🃏 Flashcards con *spaced repetition* para memorizar más fácil\n"
        "• 🎯 Cuestionarios para poner a prueba tu conocimiento\n"
        "• 🖼 Infografías y 📄 PDFs organizados por unidad\n"
        "• 📈 Progreso real por materia y unidad\n\n"
        "▶️ *¿Cómo abrir la app?*\n"
        "Tocá el botón azul *Study* en la parte inferior izquierda del chat, "
        "o usá el botón de abajo 👇"
    ),
    "en": (
        "👋 Hey, *{name}*!\n\n"
        "Welcome to *DaathApp*, your university study platform. 📚\n\n"
        "📚 *What can you do?*\n"
        "• 🃏 Flashcards with *spaced repetition* to memorize more easily\n"
        "• 🎯 Quizzes to test your knowledge\n"
        "• 🖼 Infographics and 📄 PDFs organized by unit\n"
        "• 📈 Real progress tracking by subject and unit\n\n"
        "▶️ *How to open the app?*\n"
        "Tap the blue *Study* button at the bottom left of the chat, "
        "or use the button below 👇"
    ),
    "pt": (
        "👋 Olá, *{name}*!\n\n"
        "Bem-vindo ao *DaathApp*, sua plataforma de estudos universitários. 📚\n\n"
        "📚 *O que você pode fazer?*\n"
        "• 🃏 Flashcards com *repetição espaçada* para memorizar mais facilmente\n"
        "• 🎯 Questionários para testar seu conhecimento\n"
        "• 🖼 Infográficos e 📄 PDFs organizados por unidade\n"
        "• 📈 Progresso real por matéria e unidade\n\n"
        "▶️ *Como abrir o app?*\n"
        "Toque no botão azul *Study* no canto inferior esquerdo do chat, "
        "ou use o botão abaixo 👇"
    ),
    "ru": (
        "👋 Привет, *{name}*!\n\n"
        "Добро пожаловать в *DaathApp* — твою платформу для учёбы в университете. 📚\n\n"
        "📚 *Что ты можешь делать?*\n"
        "• 🃏 Карточки с *интервальными повторениями* для лёгкого запоминания\n"
        "• 🎯 Тесты для проверки знаний\n"
        "• 🖼 Инфографики и 📄 PDF-файлы по разделам\n"
        "• 📈 Реальный прогресс по предметам и разделам\n\n"
        "▶️ *Как открыть приложение?*\n"
        "Нажми на синюю кнопку *Study* в нижнем левом углу чата, "
        "или используй кнопку ниже 👇"
    ),
    "ar": (
        "👋 مرحباً، *{name}*!\n\n"
        "أهلاً بك في *DaathApp*، منصتك للدراسة الجامعية. 📚\n\n"
        "📚 *ماذا يمكنك أن تفعل؟*\n"
        "• 🃏 بطاقات تعليمية بتقنية *التكرار المتباعد* للحفظ بسهولة\n"
        "• 🎯 اختبارات لتقييم معرفتك\n"
        "• 🖼 إنفوغرافيك و 📄 ملفات PDF منظمة حسب الوحدة\n"
        "• 📈 تتبع التقدم الحقيقي حسب المادة والوحدة\n\n"
        "▶️ *كيف تفتح التطبيق؟*\n"
        "اضغط على زر *Study* الأزرق في الجزء السفلي الأيسر من المحادثة، "
        "أو استخدم الزر أدناه 👇"
    ),
}

_OPEN_BTN = {
    "es": "📖 Abrir DaathApp",
    "en": "📖 Open DaathApp",
    "pt": "📖 Abrir DaathApp",
    "ru": "📖 Открыть DaathApp",
    "ar": "📖 فتح DaathApp",
}


def _lang(user) -> str:
    raw = user.language_code or ""
    code = raw.split("-")[0].lower() if raw else ""
    resolved = code if code in _WELCOME else "es"
    logger.info("[lang] user=%s id=%s language_code=%r → code=%r → resolved=%s",
                user.first_name, user.id, raw, code, resolved)
    return resolved


async def send_welcome(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    lang = _lang(user)
    text = _WELCOME[lang].format(name=user.first_name or "estudiante")
    keyboard = [[InlineKeyboardButton(_OPEN_BTN[lang], web_app=WebAppInfo(url=MINI_APP_URL))]]
    await update.message.reply_text(
        text,
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )
