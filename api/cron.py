"""Vercel serverless endpoint that delivers due vow reminders.

Vercel is serverless and has no scheduler of its own that we rely on here — an
external, free cron service (cron-job.org) is configured to GET this endpoint
once a day. On each call we sweep every stored vow and, for any whose moment has
come and that hasn't been reminded yet, carry the reminder back to its author
and mark it done.

It is guarded by a shared secret: the scheduler must send
``Authorization: Bearer <CRON_SECRET>``. If CRON_SECRET is unset the guard is
disabled (handy for local testing), mirroring how WEBHOOK_SECRET behaves.

Like the webhook, the Bot and Redis connections are built once per warm
container and reused, and a lock serializes the shared event loop so it is never
run concurrently.
"""

import asyncio
import os
import sys
import threading
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler

# Make the top-level `bot` package importable regardless of how Vercel invokes us.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from aiogram import Bot  # noqa: E402

from bot.config import CRON_SECRET, TOKEN  # noqa: E402
from bot.storage import Store, make_redis  # noqa: E402
from bot.texts import VOW_REMINDER_TEXT  # noqa: E402

# ---- built once per warm container, reused across invocations ----
_loop = asyncio.new_event_loop()
asyncio.set_event_loop(_loop)
_lock = threading.Lock()

_redis = make_redis()
_store = Store(_redis)
_bot = Bot(token=TOKEN)


async def _run_reminders() -> int:
    """Deliver every due, un-reminded vow. Returns how many were sent."""
    now = datetime.now(timezone.utc).timestamp()
    sent = 0

    for key in await _store.all_vow_keys():
        # key looks like "corridor:vow:<uid>"
        try:
            uid = int(key.rsplit(":", 1)[1])
        except (ValueError, IndexError):
            continue

        vow = await _store.get_vow(uid)
        if not vow or vow.get("reminded"):
            continue
        if vow.get("remind_at", 0) > now:
            continue

        try:
            await _bot.send_message(uid, VOW_REMINDER_TEXT.format(text=vow["text"]))
        except Exception as exc:
            # the soul may have blocked the bot — leave the vow for a later sweep
            print(f"cron: could not remind {uid}: {exc}", file=sys.stderr)
            continue

        vow["reminded"] = True
        await _store.set_vow(uid, vow)
        sent += 1

    return sent


class handler(BaseHTTPRequestHandler):
    def _send(self, code: int, body: bytes = b"ok") -> None:
        self.send_response(code)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        # Reject anything without the shared secret if one is configured.
        if CRON_SECRET:
            received = self.headers.get("Authorization", "")
            if received != f"Bearer {CRON_SECRET}":
                self._send(401, b"unauthorized")
                return

        try:
            with _lock:
                sent = _loop.run_until_complete(_run_reminders())
            self._send(200, f"reminders sent: {sent}".encode("utf-8"))
        except Exception as exc:
            print(f"cron error: {exc}", file=sys.stderr)
            self._send(200, b"error")
