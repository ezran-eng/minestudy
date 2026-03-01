import os
import json
import csv
import asyncio
from datetime import date
from io import StringIO
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from sqlalchemy.orm import Session
from database import SessionLocal
import models

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
    await update.message.reply_text("👋 Hola Admin. Estoy listo para gestionar el contenido.")

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
async def stats(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
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

        await update.message.reply_text(msg, parse_mode='Markdown')

    except Exception as e:
        await update.message.reply_text(f"❌ Error obteniendo stats: {e}")
    finally:
        db.close()

def main() -> None:
    # Use placeholder if not set
    TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")
    if TOKEN == "YOUR_BOT_TOKEN_HERE":
         print("Warning: TELEGRAM_BOT_TOKEN is not set.")

    application = Application.builder().token(TOKEN).build()

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("nueva_materia", nueva_materia))
    application.add_handler(CommandHandler("nueva_unidad", nueva_unidad))
    application.add_handler(CommandHandler("nuevo_tema", nuevo_tema))
    application.add_handler(CommandHandler("flashcards", flashcards))
    application.add_handler(CommandHandler("quiz", quiz))
    application.add_handler(CommandHandler("stats", stats))

    print("Bot is running...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()
