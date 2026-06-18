import os

# ================== CONFIG ==================
# Telegram bot token from @BotFather
TOKEN = os.getenv("TOKEN", "")

# Your Telegram numeric user id (the "keeper")
ADMIN_ID = int(os.getenv("ADMIN_ID", "0"))

# Redis connection url (Upstash gives you a rediss://... url)
REDIS_URL = os.getenv("REDIS_URL", "")

# Optional shared secret. If set, Telegram sends it back in the
# X-Telegram-Bot-Api-Secret-Token header so we can reject forged requests.
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "")
