"""Vercel serverless entry point — receives Telegram webhook updates.

Vercel is serverless: there is no long-running process, so the polling model
(`dp.start_polling`) cannot work. Instead Telegram POSTs each update to this
function at  https://<your-project>.vercel.app/api/webhook  and we feed that
single update into aiogram.

Important serverless detail: Vercel keeps the Python process *warm* and reuses
it across requests. So we build the Bot, Dispatcher and Redis connections ONCE
per container (module load) and reuse them. Two reasons:

  * a Router can be attached to only one Dispatcher for its lifetime — building
    a fresh Dispatcher and re-including the module-level router on every request
    raises "Router is already attached";
  * the aiohttp/redis connections bind to an event loop, so we keep a single
    persistent loop alive and reuse it instead of spinning up a new one per call.

A lock serializes invocations, so the shared loop is never run concurrently.

Vercel's Python runtime uses the ``handler`` class (BaseHTTPRequestHandler)
declared here, wired up via the ``[tool.vercel] entrypoint`` in pyproject.toml.
"""

import asyncio
import json
import os
import sys
import threading
from http.server import BaseHTTPRequestHandler

# Make the top-level `bot` package importable regardless of how Vercel invokes us.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from aiogram import Bot, Dispatcher  # noqa: E402
from aiogram.types import Update  # noqa: E402

from bot.config import TOKEN, WEBHOOK_SECRET  # noqa: E402
from bot.handlers import router  # noqa: E402
from bot.middleware import ActivityMiddleware  # noqa: E402
from bot.storage import Store, make_fsm_storage, make_redis  # noqa: E402

# ---- built once per warm container, reused across invocations ----
_loop = asyncio.new_event_loop()
asyncio.set_event_loop(_loop)
_lock = threading.Lock()


def _run_loop() -> None:
    asyncio.set_event_loop(_loop)
    _loop.run_forever()


_fsm_storage = make_fsm_storage()
_redis = make_redis()
_store = Store(_redis)

_bot = Bot(token=TOKEN)
_dp = Dispatcher(storage=_fsm_storage)
# Announce every command and button tap to the keeper (outer = runs even when a
# handler short-circuits, e.g. a blocked user or a wrong-state message).
_activity = ActivityMiddleware()
_dp.message.outer_middleware(_activity)
_dp.callback_query.outer_middleware(_activity)
_dp.include_router(router)  # attach the router exactly once for the process lifetime

_loop_thread = threading.Thread(target=_run_loop, daemon=True)
_loop_thread.start()


async def _process(update_data: dict) -> None:
    update = Update.model_validate(update_data, context={"bot": _bot})
    # `store` is injected into any handler that declares a `store` parameter.
    await _dp.feed_update(_bot, update, store=_store)


class handler(BaseHTTPRequestHandler):
    def _send(self, code: int, body: bytes = b"ok") -> None:
        self.send_response(code)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        # Visiting the URL in a browser confirms the function is alive.
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
            # Serialize so the reused event loop is never run concurrently.
            with _lock:
                future = asyncio.run_coroutine_threadsafe(_process(update_data), _loop)
                future.result()
        except Exception as exc:  # never 500 back to Telegram or it retries forever
            print(f"webhook error: {exc}", file=sys.stderr)

        # Always 200 so Telegram considers the update delivered.
        self._send(200)
