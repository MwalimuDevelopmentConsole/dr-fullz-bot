// bot.js - Simple structured version
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// Simple config check
if (!process.env.BOT_TOKEN) {
    console.error('❌ BOT_TOKEN missing in .env file!');
    process.exit(1);
}

// Initialize bot
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Import handlers (simple versions)
require('./handlers/commands')(bot);
require('./handlers/messages')(bot);
require('./handlers/callbacks')(bot);



console.log('🤖 Bot is running!');
console.log('Send /start to get menus');