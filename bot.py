from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

# Define a simple start command
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user.first_name
    await update.message.reply_text(f'Hello {user}! Welcome to the Tiger Token Hub. Enter a YouTube code to start earning:')

if __name__ == '__main__':
    # Initialize the bot with your token from BotFather
    app = ApplicationBuilder().token("YOUR_TELEGRAM_BOT_TOKEN").build()
    
    # Register the command handler
    app.add_handler(CommandHandler("start", start))
    
    # Start polling for user messages
    print("Bot is running...")
    app.run_polling()
