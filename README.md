# 🇪🇹 Birr Spin — Simple Build

This version intentionally uses a small number of files:
- index.html — Mini App UI
- style.css — all UI styling
- app.js — Mini App behavior
- api/action.js — Firebase-authoritative rewards, spins, ads, tasks and withdrawals
- api/bot.js — Telegram /start + admin paid callback
- api/setup.js — one-time webhook setup
- package.json / vercel.json — Vercel config

## Vercel environment variables
BOT_TOKEN
BOT_USERNAME
WEBAPP_URL
FIREBASE_SERVICE_ACCOUNT_JSON
ADMIN_IDS=5980396006,5479488791
SETUP_KEY

## Monetag
The exact SDK supplied by the owner is included once in index.html:
<script src='//libtl.com/sdk.js' data-zone='11746054' data-sdk='show_11746054'></script>

The Watch Ads button calls show_11746054({type:'end', ymid:<telegram id>, requestVar:'watch_ads', catchIfNoFeed:true}).
A spin is awarded only after the SDK promise resolves successfully and the backend accepts the completion.

## Channels / tasks
1. https://t.me/usdt_hub_payment_proof
2. https://t.me/usdt_g_ram
3. https://t.me/phone_teach
4. https://t.me/forex_big

The bot must have enough access in each channel to use getChatMember for verification.

## Withdrawal
Telebirr only, minimum 100 Birr.
Withdrawal requests are sent to admin IDs 5980396006 and 5479488791 and to:
https://t.me/usdt_hub_payment_proof
The admin message has a DONE / PAID button. Paid status is set only by the backend callback.

## Important
Do not put private secrets into source files. Keep them in Vercel environment variables.
The backend is the authority for balance, spins, ad counters, task rewards and withdrawal status.
