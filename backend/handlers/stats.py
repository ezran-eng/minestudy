from datetime import date

from telegram import Update
from telegram.ext import ContextTypes
from sqlalchemy import func

from bot_helpers import admin_only
from database import SessionLocal
import models


@admin_only
async def stats(update: Update, context: ContextTypes.DEFAULT_TYPE, direct: bool = True) -> None:
    db = SessionLocal()
    try:
        total_users = db.query(models.User).count()

        today = date.today()
        active_today = db.query(models.User).filter(func.date(models.User.ultima_actividad) == today.strftime('%Y-%m-%d')).count()

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
