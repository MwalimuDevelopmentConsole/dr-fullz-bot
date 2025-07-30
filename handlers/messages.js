// handlers/messages.js - Updated with safe message handling and rate limiting
const keyboards = require('../utils/keyboards');
const messageHandler = require('../utils/messageHandler');
const rateLimiter = require('../utils/rateLimiter');
const sharedState = require('../utils/sharedState');

module.exports = (bot) => {
    // Handle all text messages (except commands)  
    bot.on('message', async (msg) => {
        // Skip commands
        if (msg.text && msg.text.startsWith('/')) {
            return;
        }

        // Skip non-text messages
        if (!msg.text) {
            return;
        }

        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const text = msg.text.trim();
        const username = msg.from.username;
        
        console.log(`Message received from user ${userId}: "${text}"`);

        // Rate limiting check
        if (rateLimiter.isRateLimited(userId, 15, 60000)) { // 15 messages per minute
            await messageHandler.safeSendMessage(bot, chatId, 
                "⚠️ Please slow down and try again in a minute");
            return;
        }

        // Check for spam/duplicate messages
        if (rateLimiter.isDuplicateRequest(userId, 'message', 2000)) { // 2 second cooldown
            return; // Silently ignore rapid duplicate messages
        }
        
        // Get user state using the same system as callbacks
        const userState = sharedState.getUserState(userId);
        console.log('Current user state:', userState);
        
        // Handle quantity input for product purchase
        if (userState && userState.step === 'entering_quantity') {
            console.log('Processing quantity input:', text);
            await handleQuantityInput(bot, chatId, userId, text, userState);
            return;
        }
        
        // Handle custom deposit amount input
        if (userState && userState.step === 'entering_custom_amount') {
            console.log('Processing custom amount input:', text);
            await handleCustomAmountInput(bot, chatId, userId, text, username);
            return;
        }
        
        // Default response - redirect to menu
        await messageHandler.safeSendMessage(bot, chatId, 
            'Please use the menu buttons to navigate! 😊\n\nUse /start to get the main menu.', 
            keyboards.mainMenu
        );
    });

    // Handle quantity input
    async function handleQuantityInput(bot, chatId, userId, text, userState) {
        try {
            const quantity = parseInt(text);
            
            if (isNaN(quantity) || quantity <= 0) {
                await messageHandler.safeSendMessage(bot, chatId, 
                    '❌ Please enter a valid number (e.g., 5)', {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '⬅️ Back to Shop', callback_data: 'shop' }]
                        ]
                    }
                });
                return;
            }

            if (quantity > userState.availableQuantity) {
                await messageHandler.safeSendMessage(bot, chatId, 
                    `❌ Only ${userState.availableQuantity} items available. Please enter a smaller number.`, {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '⬅️ Back to Shop', callback_data: 'shop' }]
                        ]
                    }
                });
                return;
            }

            // Create checkout confirmation and store filters in user state
            console.log('Creating checkout keyboard for quantity:', quantity);
            const checkoutKeyboard = keyboards.validateAndFixKeyboard(
                keyboards.createCheckoutKeyboard(userState.filters, quantity),
                'CheckoutKeyboard'
            );
            
            // Update user state to include quantity and filters for checkout
            sharedState.setUserState(userId, {
                step: 'confirming_checkout',
                filters: userState.filters,
                quantity: quantity,
                availableQuantity: userState.availableQuantity
            });
            
            await messageHandler.safeSendMessage(bot, chatId, 
                `🛒 **Order Summary**\n\n**Quantity:** ${quantity} items\n**Available:** ${userState.availableQuantity} items\n\nConfirm your purchase?`, {
                parse_mode: 'Markdown',
                ...checkoutKeyboard
            });
        } catch (error) {
            console.error('Quantity input error:', error);
            await messageHandler.safeSendMessage(bot, chatId, 
                '❌ Something went wrong. Please try again.', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '⬅️ Back to Shop', callback_data: 'shop' }]
                    ]
                }
            });
        }
    }

    // Handle custom deposit amount input
    async function handleCustomAmountInput(bot, chatId, userId, text, username) {
        try {
            const amount = parseFloat(text);
            
            if (isNaN(amount) || amount <= 0) {
                await messageHandler.safeSendMessage(bot, chatId, 
                    '❌ Please enter a valid amount (e.g., 25.50)', {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '⬅️ Back to Deposit', callback_data: 'deposit' }]
                        ]
                    }
                });
                return;
            }

            if (amount < 10) {
                await messageHandler.safeSendMessage(bot, chatId, 
                    '❌ Minimum deposit amount is $10', {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '⬅️ Back to Deposit', callback_data: 'deposit' }]
                        ]
                    }
                });
                return;
            }

            if (amount > 10000) {
                await messageHandler.safeSendMessage(bot, chatId, 
                    '❌ Maximum deposit amount is $10,000', {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '⬅️ Back to Deposit', callback_data: 'deposit' }]
                        ]
                    }
                });
                return;
            }

            // Update user state with the custom amount and move to crypto selection
            sharedState.setUserState(userId, { 
                step: 'selecting_crypto_custom',
                customAmount: amount 
            });
            
            // Show loading message
            const loadingMessage = await messageHandler.safeSendMessage(bot, chatId, 
                '⏳ Loading cryptocurrencies...');
            
            // Get available cryptocurrencies
            const paymentService = require('../services/paymentService');
            
            try {
                const currenciesResult = await paymentService.getCurrencies();
                
                if (!currenciesResult.success) {
                    await messageHandler.safeEditMessage(bot, chatId, loadingMessage.message_id,
                        `❌ **Unable to load cryptocurrencies**\n\nError: ${currenciesResult.error}`, {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '⬅️ Back to Deposit', callback_data: 'deposit' }]
                            ]
                        }
                    });
                    return;
                }

                const cryptoKeyboard = keyboards.validateAndFixKeyboard(
                    keyboards.createCryptoKeyboard(currenciesResult.currencies),
                    'CryptoKeyboard'
                );
                
                await messageHandler.safeEditMessage(bot, chatId, loadingMessage.message_id,
                    `💰 **Deposit $${amount}**\n\nSelect cryptocurrency:`, {
                    parse_mode: 'Markdown',
                    ...cryptoKeyboard
                });
                
            } catch (error) {
                console.error('Custom amount crypto selection error:', error);
                await messageHandler.safeEditMessage(bot, chatId, loadingMessage.message_id,
                    '❌ Something went wrong. Please try again.', {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '⬅️ Back to Deposit', callback_data: 'deposit' }]
                        ]
                    }
                });
            }
        } catch (error) {
            console.error('Custom amount input error:', error);
            await messageHandler.safeSendMessage(bot, chatId, 
                '❌ Something went wrong. Please try again.', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '⬅️ Back to Deposit', callback_data: 'deposit' }]
                    ]
                }
            });
        }
    }
};