// handlers/commands.js - Updated with safe message handling and rate limiting
const keyboards = require('../utils/keyboards');
const messageHandler = require('../utils/messageHandler');
const rateLimiter = require('../utils/rateLimiter');
const userService = require('../services/userService');
const paymentService = require('../services/paymentService');

module.exports = (bot) => {
    // /start command - check username and get user from API
    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const username = msg.from.username;
        const firstName = msg.from.first_name || 'User';
        
        // Rate limiting check
        if (rateLimiter.isRateLimited(userId, 5, 60000)) { // 5 start commands per minute
            await messageHandler.safeSendMessage(bot, chatId, 
                "⚠️ Please wait a moment before using /start again");
            return;
        }

        try {
            // Check if user has a telegram username
            if (!username) {
                const noUsernameText = `❌ Please create a Telegram username first!\n\nTo create a username:\n1. Go to Telegram Settings\n2. Edit Profile\n3. Set a username\n4. Come back and send /start again`;
                
                await messageHandler.safeSendMessage(bot, chatId, noUsernameText);
                return;
            }

            // Show loading message
            const loadingMessage = await messageHandler.safeSendMessage(bot, chatId, 
                '⏳ Connecting to your account...');

            // Get user from API
            console.log(`Getting user data for: ${username}`);
            const userResult = await userService.getUser(username);
            
            if (!userResult.success) {
                await messageHandler.safeEditMessage(bot, chatId, loadingMessage.message_id,
                    `❌ Unable to connect to our servers.\n\nError: ${userResult.error}\n\nPlease try again later or contact support.`);
                return;
            }

            const welcomeText = `🎉 Welcome to Dr Fullz, ${firstName}!\n\n👤 Account: @${username}\n✅ Connected to your account\n\nChoose an option below:`;
            
            await messageHandler.safeEditMessage(bot, chatId, loadingMessage.message_id, 
                welcomeText, keyboards.mainMenu);
            
        } catch (error) {
            console.error('Start command error:', error);
            await messageHandler.safeSendMessage(bot, chatId, 
                '❌ Something went wrong. Please try again later.');
        }
    });

    // /wallet command - get user wallet info
    bot.onText(/\/wallet/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const username = msg.from.username;
        
        // Rate limiting check
        if (rateLimiter.isRateLimited(userId, 10, 60000)) { // 10 wallet checks per minute
            await messageHandler.safeSendMessage(bot, chatId, 
                "⚠️ Please wait before checking your wallet again");
            return;
        }

        try {
            // Check if user has username
            if (!username) {
                await messageHandler.safeSendMessage(bot, chatId, 
                    '❌ Please create a Telegram username first!');
                return;
            }

            // Show loading message
            const loadingMessage = await messageHandler.safeSendMessage(bot, chatId, 
                '⏳ Loading wallet information...');

            // Get wallet data from API
            console.log(`Getting wallet data for: ${username}`);
            const walletResult = await userService.getUserWallet(username);
            
            if (!walletResult.success) {
                await messageHandler.safeEditMessage(bot, chatId, loadingMessage.message_id,
                    `❌ Unable to get wallet information.\n\nError: ${walletResult.error}`);
                return;
            }

            // Format transaction history
            let transactionText = '';
            if (walletResult.transactions && walletResult.transactions.length > 0) {
                transactionText = '\n\n📊 **Recent Transactions:**\n';
                walletResult.transactions.slice(0, 5).forEach((tx, index) => {
                    const date = new Date(tx.createdAt).toLocaleDateString();
                    const statusEmoji = tx.status === 'waiting' ? '⏳' : tx.status === 'completed' ? '✅' : '❌';
                    transactionText += `${index + 1}. ${statusEmoji} ${tx.priceAmount} ${tx.payCurrency.toUpperCase()} - ${date}\n`;
                });
                
                if (walletResult.transactions.length > 5) {
                    transactionText += `\n... and ${walletResult.transactions.length - 5} more`;
                }
            } else {
                transactionText = '\n\n📊 No transactions yet';
            }

            const walletText = `💰 **Your Wallet**\n\n💵 **Balance:** ${walletResult.balance}${transactionText}`;
            
            await messageHandler.safeEditMessage(bot, chatId, loadingMessage.message_id, 
                walletText, {
                parse_mode: 'Markdown',
                ...keyboards.backToMain
            });
            
        } catch (error) {
            console.error('Wallet command error:', error);
            await messageHandler.safeSendMessage(bot, chatId, 
                '❌ Something went wrong. Please try again later.');
        }
    });

    // /deposit command - get crypto currencies and show options
    bot.onText(/\/deposit/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const username = msg.from.username;
        
        // Rate limiting check
        if (rateLimiter.isRateLimited(userId, 8, 60000)) { // 8 deposit commands per minute
            await messageHandler.safeSendMessage(bot, chatId, 
                "⚠️ Please wait before accessing deposit again");
            return;
        }

        try {
            // Check if user has username
            if (!username) {
                await messageHandler.safeSendMessage(bot, chatId, 
                    '❌ Please create a Telegram username first!');
                return;
            }

            // Show loading message
            const loadingMessage = await messageHandler.safeSendMessage(bot, chatId, 
                '⏳ Loading available cryptocurrencies...');

            // Get available cryptocurrencies from API
            console.log(`Getting currencies for deposit command`);
            const currenciesResult = await paymentService.getCurrencies();
            
            if (!currenciesResult.success) {
                await messageHandler.safeEditMessage(bot, chatId, loadingMessage.message_id,
                    `❌ **Unable to load cryptocurrencies**\n\nError: ${currenciesResult.error}`, {
                    parse_mode: 'Markdown',
                    ...keyboards.backToMain
                });
                return;
            }

            const cryptoKeyboard = keyboards.validateAndFixKeyboard(
                keyboards.createCryptoKeyboard(currenciesResult.currencies),
                'CryptoKeyboard'
            );
            
            await messageHandler.safeEditMessage(bot, chatId, loadingMessage.message_id,
                '💳 **Deposit Funds**\n\nSelect cryptocurrency:', {
                parse_mode: 'Markdown',
                ...cryptoKeyboard
            });
            
        } catch (error) {
            console.error('Deposit command error:', error);
            await messageHandler.safeSendMessage(bot, chatId, 
                '❌ Something went wrong. Please try again later.');
        }
    });

    // /help command - redirect to help menu
    bot.onText(/\/help/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        
        // Rate limiting check
        if (rateLimiter.isRateLimited(userId, 5, 60000)) { // 5 help commands per minute
            await messageHandler.safeSendMessage(bot, chatId, 
                "⚠️ Please wait before accessing help again");
            return;
        }

        const supportContact = process.env.SUPPORT_CONTACT || 'https://t.me/petergach';
        const channelLink = process.env.CHANNEL_LINK || 'https://t.me/channel';
        
        const helpText = `❓ **Help & Support**\n\n🤖 **Welcome to Dr Fullz!**\n\nOur bot provides secure access to high-quality fullz with cryptocurrency payments.\n\n**Quick Start:**\n• Use /wallet to check your balance\n• Use /deposit to add funds\n• Browse 🛍️ Shop for products\n• Get instant downloads after purchase\n\n**Need Help?**\n• Contact our support team\n• Join our channel for updates\n• Check "How It Works" for details`;
        
        try {
            await messageHandler.safeSendMessage(bot, chatId, helpText, {
                parse_mode: 'Markdown',
                ...keyboards.helpMenu
            });
        } catch (error) {
            console.error('Help command error:', error);
            await messageHandler.safeSendMessage(bot, chatId, 
                '❌ Something went wrong. Please try again later.');
        }
    });

    // /status command - show bot status (admin/debug)
    bot.onText(/\/status/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        
        // Rate limiting check
        if (rateLimiter.isRateLimited(userId, 3, 60000)) { // 3 status commands per minute
            await messageHandler.safeSendMessage(bot, chatId, 
                "⚠️ Please wait before checking status again");
            return;
        }

        try {
            const sharedState = require('../utils/sharedState');
            
            const stats = sharedState.getStats();
            const rateLimitStats = rateLimiter.getStats();
            const messageHandlerStats = messageHandler.getDebugInfo();
            
            const statusText = `🤖 **Bot Status**\n\n` +
                `📊 **Active Users:** ${stats.totalStates}\n` +
                `⏱️ **Average Session Age:** ${stats.averageAge} min\n` +
                `🔄 **Pending Operations:** ${messageHandlerStats.pendingEdits}\n` +
                `📈 **Rate Limiter:** ${rateLimitStats.activeUsers} users\n` +
                `💾 **Memory:** ${Math.round(stats.memoryUsage.heapUsed / 1024 / 1024)}MB\n\n` +
                `✅ **All systems operational**`;
            
            await messageHandler.safeSendMessage(bot, chatId, statusText, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
                    ]
                }
            });
        } catch (error) {
            console.error('Status command error:', error);
            await messageHandler.safeSendMessage(bot, chatId, 
                '❌ Could not retrieve status information.');
        }
    });

    // /clear command - clear user session (debug)
    bot.onText(/\/clear/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        
        try {
            const sharedState = require('../utils/sharedState');
            sharedState.clearUserState(userId);
            rateLimiter.resetUserLimits(userId);
            
            await messageHandler.safeSendMessage(bot, chatId, 
                '🗑️ Your session has been cleared.', keyboards.mainMenu);
        } catch (error) {
            console.error('Clear command error:', error);
            await messageHandler.safeSendMessage(bot, chatId, 
                '❌ Could not clear session.');
        }
    });
};