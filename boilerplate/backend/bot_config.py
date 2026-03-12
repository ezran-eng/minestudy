import os

TOKEN        = os.getenv("TELEGRAM_BOT_TOKEN", "")
ADMIN_ID     = int(os.getenv("ADMIN_ID", "0"))   # tu ID numérico de Telegram
MINI_APP_URL = os.getenv("MINI_APP_URL", "https://tu-app.vercel.app")
API_URL      = os.getenv("API_URL", "http://localhost:8000")
