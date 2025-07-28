// config/config.js
const config = {
    BOT_TOKEN: process.env.BOT_TOKEN,
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000/api',
    API_TIMEOUT: 10000,
    BOT_NAME: 'ShopBot',
    WEBHOOK_URL: process.env.WEBHOOK_URL || null
};

// Debug: Show what we got from environment
console.log('🔧 Environment Debug:');
console.log('BOT_TOKEN:', config.BOT_TOKEN ? `Set (${config.BOT_TOKEN.substring(0, 10)}...)` : 'MISSING ❌');
console.log('API_BASE_URL:', config.API_BASE_URL);
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');

// Validate required environment variables
if (!config.BOT_TOKEN) {
    console.error('\n❌ ERROR: BOT_TOKEN is missing!');
    console.log('\nTo fix this:');
    console.log('1. Create a .env file in your project root');
    console.log('2. Add this line: BOT_TOKEN=your_actual_token_here');
    console.log('3. Get your token from @BotFather on Telegram');
    console.log('\nExample .env file:');
    console.log('BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz');
    console.log('API_BASE_URL=http://localhost:3000/api');
    process.exit(1);
}

if (!config.API_BASE_URL) {
    console.error('\n❌ ERROR: API_BASE_URL is missing!');
    process.exit(1);
}

console.log('✅ Configuration validated successfully\n');

module.exports = config;