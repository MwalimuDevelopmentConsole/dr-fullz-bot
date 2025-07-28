// handlers/commands.js - Simple version
const keyboards = require('../utils/keyboards');
const userService = require('../services/userService');
const paymentService = require('../services/paymentService');

module.exports = (bot) => {
    // /start command - check username and get user from API
    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        const username = msg.from.username;
        const firstName = msg.from.first_name || 'User';
        
        try {
            // Check if user has a telegram username
            if (!username) {
                const noUsernameText = `❌ Please create a Telegram username first!\n\nTo create a username:\n1. Go to Telegram Settings\n2. Edit Profile\n3. Set a username\n4. Come back and send /start again`;
                
                await bot.sendMessage(chatId, noUsernameText);
                return;
            }

            // Get user from API
            console.log(`Getting user data for: ${username}`);
            const userResult = await userService.getUser(username);
            
            if (!userResult.success) {
                const errorText = `❌ Unable to connect to our servers.\n\nError: ${userResult.error}\n\nPlease try again later or contact support.`;
                await bot.sendMessage(chatId, errorText);
                return;
            }

            const welcomeText = `🎉 Welcome to ShopBot, ${firstName}!\n\n👤 Account: @${username}\n✅ Connected to your account\n\nChoose an option below:`;
            await bot.sendMessage(chatId, welcomeText, keyboards.mainMenu);
            
        } catch (error) {
            console.error('Start command error:', error);
            await bot.sendMessage(chatId, '❌ Something went wrong. Please try again later.');
        }
    });

    // /wallet command - get user wallet info
    bot.onText(/\/wallet/, async (msg) => {
        const chatId = msg.chat.id;
        const username = msg.from.username;
        
        try {
            // Check if user has username
            if (!username) {
                await bot.sendMessage(chatId, '❌ Please create a Telegram username first!');
                return;
            }

            // Get wallet data from API
            console.log(`Getting wallet data for: ${username}`);
            const walletResult = await userService.getUserWallet(username);
            
            if (!walletResult.success) {
                const errorText = `❌ Unable to get wallet information.\n\nError: ${walletResult.error}`;
                await bot.sendMessage(chatId, errorText);
                return;
            }

            // Format transaction history
            let transactionText = '';
            if (walletResult.transactions.length > 0) {
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
            
            await bot.sendMessage(chatId, walletText, {
                parse_mode: 'Markdown',
                ...keyboards.backToMain
            });
            
        } catch (error) {
            console.error('Wallet command error:', error);
            await bot.sendMessage(chatId, '❌ Something went wrong. Please try again later.');
        }
    });

    // /deposit command - get crypto currencies and show options
    bot.onText(/\/deposit/, async (msg) => {
        const chatId = msg.chat.id;
        const username = msg.from.username;
        
        try {
            // Check if user has username
            if (!username) {
                await bot.sendMessage(chatId, '❌ Please create a Telegram username first!');
                return;
            }

            // Show loading message
            const loadingMsg = await bot.sendMessage(chatId, '⏳ Loading available cryptocurrencies...');

            // Get available cryptocurrencies from API
            console.log(`Getting currencies for deposit command`);
            const currenciesResult = await paymentService.getCurrencies();
            
            if (!currenciesResult.success) {
                await bot.editMessageText(`❌ **Unable to load cryptocurrencies**\n\nError: ${currenciesResult.error}`, {
                    chat_id: chatId,
                    message_id: loadingMsg.message_id,
                    parse_mode: 'Markdown',
                    ...keyboards.backToMain
                });
                return;
            }

            const cryptoKeyboard = keyboards.createCryptoKeyboard(currenciesResult.currencies);
            
            await bot.editMessageText('💳 **Deposit Funds**\n\nSelect cryptocurrency:', {
                chat_id: chatId,
                message_id: loadingMsg.message_id,
                parse_mode: 'Markdown',
                ...cryptoKeyboard
            });
            
        } catch (error) {
            console.error('Deposit command error:', error);
            await bot.sendMessage(chatId, '❌ Something went wrong. Please try again later.');
        }
    });
    bot.onText(/\/help/, async (msg) => {
        const chatId = msg.chat.id;
        const helpText = `🤖 **ShopBot Help**\n\n**Commands:**\n• /start - Start the bot\n• /wallet - Check your wallet balance\n• /help - Show this help\n\n**Features:**\n• Browse products in the shop\n• Check your profile\n• Make deposits\n• View transaction history`;
        
        try {
            await bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('Help command error:', error);
        }
    });
};