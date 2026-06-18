"""Vercel serverless entry point — receives Telegram webhook updates.

Vercel is serverless: there is no long-running process, so the polling model
(`dp.start_polling`) cannot work. Instead Telegram POSTs each update to this
function at  https://<your-project>.vercel.app/api/webhook  and we feed that
single update into aiogram, then tear everything down.

Vercel's Python runtime looks for a class named ``handler`` that subclasses
BaseHTTPRequestHandler — that's what this file exports.
"""

import asyncio
import json
import os
import sys
from http.server import BaseHTTPRequestHandler

# Make the top-level `bot` package importable regardless of how Vercel invokes us.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from aiogram import Bot, Dispatcher  # noqa: E402
from aiogram.types import Update  # noqa: E402

from bot.config import TOKEN, WEBHOOK_SECRET  # noqa: E402
from bot.handlers import router  # noqa: E402
from bot.storage import Store, make_fsm_storage, make_redis  # noqa: E402


async def process_update(update_data: dict) -> None:
    """Build fresh resources, dispatch one update, then close everything.

    A new Bot/Dispatcher/Redis connection is created per invocation. That is the
    safe pattern under serverless: each request gets its own event loop, so we
    never reuse aiohttp/redis connections bound to a loop that has been closed.
    """
    fsm_storage = make_fsm_storage()
    redis = make_redis()
    store = Store(redis)

    bot = Bot(token=TOKEN)
    dp = Dispatcher(storage=fsm_storage)
    dp.include_router(router)

    try:
        update = Update.model_validate(update_data, context={"bot": bot})
        # `store` is injected into any handler that declares a `store` parameter.
        await dp.feed_update(bot, update, store=store)
    finally:
        await bot.session.close()
        await fsm_storage.close()
        await redis.aclose()


class handler(BaseHTTPRequestHandler):
    def _send(self, code: int, body: bytes = b"ok") -> None:
        self.send_response(code)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        # A friendly response so visiting the URL in a browser confirms it's alive.
        self._send(200, "the corridor is open. 🕯️".encode("utf-8"))

    def do_POST(self):
        # Reject forged requests if a secret token was configured.
        if WEBHOOK_SECRET:
            received = self.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
            if received != WEBHOOK_SECRET:
                self._send(401, b"unauthorized")
                return

        length = int(self.headers.get("Content-Length", 0) or 0)
        raw = self.rfile.read(length) if length else b"{}"

        try:
            update_data = json.loads(raw)
            asyncio.run(process_update(update_data))
        except Exception as exc:  # never 500 back to Telegram or it will retry forever
            print(f"webhook error: {exc}", file=sys.stderr)

        # Always 200 so Telegram considers the update delivered.
        self._send(200)
