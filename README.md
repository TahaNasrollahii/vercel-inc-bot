# the corridor — Telegram bot on Vercel

Your anonymous-message Telegram bot, converted from long-polling to **webhooks**
so it runs on Vercel's serverless platform.

## Why the code changed

Vercel has no long-running process, so `dp.start_polling()` can't work. Two
things had to change:

1. **Webhooks instead of polling.** Telegram POSTs each update to
   `api/webhook.py`, which feeds that one update into aiogram and exits.
2. **Redis instead of in-memory state.** Every invocation is a fresh, isolated
   function, so the old module-level dicts/sets (`message_counter`,
   `blocked_users`, `user_aliases`, …) and the FSM state for multi-step flows
   (`/ritual`, `/letter`, `/countdown`, `/mirror`) would be lost between calls.
   All of it now lives in Redis (Upstash).

## Project layout

```
api/webhook.py     # serverless entry point Telegram calls
api/cron.py        # serverless endpoint that sends due vow reminders
bot/config.py      # reads env vars
bot/texts.py       # all the copy / quote pools
bot/storage.py     # Redis-backed state + FSM storage builders
bot/handlers.py    # every command/callback handler
bot/middleware.py  # activity tracking → notifies the keeper
set_webhook.py     # run once to register the webhook
requirements.txt
vercel.json
```

## Setup

### 1. Create an Upstash Redis database (free)

1. Go to <https://upstash.com>, sign up, create a **Redis** database.
2. Copy the **Redis URL** (looks like `rediss://default:...@...upstash.io:6379`).

> You can also add it through the Vercel Marketplace
> (Vercel → Storage → Upstash), which sets `REDIS_URL` for you automatically.

### 2. Deploy to Vercel

1. Push this folder to a Git repo (GitHub/GitLab/Bitbucket) and **Import** it in
   Vercel, or run `vercel` / `vercel --prod` with the Vercel CLI.
2. In **Project Settings → Environment Variables**, add:

   | Name             | Value                                            |
   |------------------|--------------------------------------------------|
   | `TOKEN`          | your bot token from @BotFather                   |
   | `ADMIN_ID`       | your numeric Telegram id (from @userinfobot)     |
   | `REDIS_URL`      | the Upstash Redis URL                             |
   | `WEBHOOK_SECRET` | any random string (optional but recommended)     |
   | `CRON_SECRET`    | any random string guarding `/api/cron` (vows)    |

3. Redeploy so the env vars take effect. Note your URL, e.g.
   `https://your-project.vercel.app`.

### 3. Register the webhook

Run locally once (uses the same token + secret):

```bash
# bash
TOKEN=123:abc \
WEBHOOK_SECRET=the-same-secret \
WEBHOOK_URL=https://your-project.vercel.app/api/webhook \
python set_webhook.py
```

```powershell
# PowerShell
$env:TOKEN="123:abc"
$env:WEBHOOK_SECRET="the-same-secret"
$env:WEBHOOK_URL="https://your-project.vercel.app/api/webhook"
python set_webhook.py
```

Open the bot in Telegram and send `/start`. Visiting the webhook URL in a
browser should show "the corridor is open."

### 4. Schedule the vow reminders (cron-job.org)

The `/vow` feature stores a promise and a date; a separate endpoint,
**`/api/cron`**, sweeps the stored vows and delivers any that have come due.
Vercel runs nothing on its own here — an external scheduler must hit that
endpoint. The free <https://cron-job.org> works well:

1. Sign up at <https://cron-job.org> and create a new cronjob.
2. **URL:** `https://your-project.vercel.app/api/cron`
3. **Schedule:** once a day (e.g. every day at 09:00). Daily is enough — vow
   reminders are measured in whole days.
4. Under the request settings, add a **header**:
   `Authorization: Bearer <the-same-CRON_SECRET>` — matching the `CRON_SECRET`
   you set on Vercel. Without it the endpoint replies `401 unauthorized`.

You can test it yourself in a browser/terminal:

```bash
curl -H "Authorization: Bearer the-same-secret" \
  https://your-project.vercel.app/api/cron
# -> reminders sent: <n>
```

## Notes

- The webhook path is **`/api/webhook`** — don't forget the suffix.
- After any deploy that changes the project URL, re-run `set_webhook.py`.
- To switch back to polling, run `python set_webhook.py delete` and use the
  original polling script.
- `set_message_reaction` and forwarding require the bot to have already
  interacted with the chat — same as before.
