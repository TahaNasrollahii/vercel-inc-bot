"""One-off helper to point Telegram at your Vercel deployment.

Run this locally (not on Vercel) once after each deploy whose URL changed:

    # PowerShell
    $env:TOKEN="123:abc"; $env:WEBHOOK_URL="https://your-project.vercel.app/api/webhook"; python set_webhook.py

    # bash
    TOKEN=123:abc WEBHOOK_URL=https://your-project.vercel.app/api/webhook python set_webhook.py

Optional: set WEBHOOK_SECRET to the same value configured on Vercel so Telegram
attaches it to every request and forged calls get rejected.

Pass `delete` as an argument to remove the webhook (e.g. to go back to polling):

    python set_webhook.py delete
"""

import asyncio
import os
import sys

from aiogram import Bot


async def main() -> None:
    token = os.environ["TOKEN"]
    bot = Bot(token=token)

    if len(sys.argv) > 1 and sys.argv[1] == "delete":
        await bot.delete_webhook(drop_pending_updates=True)
        print("webhook deleted.")
    else:
        url = os.environ["WEBHOOK_URL"]
        secret = os.getenv("WEBHOOK_SECRET") or None
        await bot.set_webhook(
            url,
            drop_pending_updates=True,
            secret_token=secret,
            allowed_updates=["message", "callback_query"],
        )
        info = await bot.get_webhook_info()
        print(f"webhook set to: {info.url}")
        print(f"pending updates: {info.pending_update_count}")

    await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
