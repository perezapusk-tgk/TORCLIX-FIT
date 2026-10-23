# Telegram setup

1. Create a bot with @BotFather.
2. Enable Mini App / Web App and set the production HTTPS URL.
3. Put the bot token into TELEGRAM_BOT_TOKEN on the API server.
4. Serve apps/miniapp over HTTPS.
5. Configure the Mini App button to open the Mini App URL.
6. The browser sends Telegram.WebApp.initData to /api/auth/telegram.
7. The API validates the Telegram signature before trusting the user.

Never commit the bot token to Git.