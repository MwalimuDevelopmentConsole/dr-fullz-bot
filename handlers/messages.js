// handlers/messages.js - Fixed version for quantity input
const keyboards = require('../utils/keyboards');
const sharedState = require('../utils/sharedState'); // Use the same state system as callbacks

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
        
        // Get user state using the same system as callbacks
        const userState = sharedState.getUserState(userId);
        console.log('Current user state:', userState);
        
        // Handle quantity input for product purchase
        if (userState && userState.step === 'entering_quantity') {
            console.log('Processing quantity input:', text);
            
            const quantity = parseInt(text);
            
            if (isNaN(quantity) || quantity <= 0) {
                await bot.sendMessage(chatId, '❌ Please enter a valid number (e.g., 5)', {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '⬅️ Back to Shop', callback_data: 'shop' }]
                        ]
                    }
                });
                return;
            }

            if (quantity > userState.availableQuantity) {
                await bot.sendMessage(chatId, `❌ Only ${userState.availableQuantity} items available. Please enter a smaller number.`, {
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
            
            await bot.sendMessage(chatId, `🛒 **Order Summary**\n\n**Quantity:** ${quantity} items\n**Available:** ${userState.availableQuantity} items\n\nConfirm your purchase?`, {
                parse_mode: 'Markdown',
                ...checkoutKeyboard
            });
            return;
        }
        
        
        // Handle custom deposit amount input
        if (userState && userState.step === 'entering_custom_amount') {
            const amount = parseFloat(text);
            
            if (isNaN(amount) || amount <= 0) {
                await bot.sendMessage(chatId, '❌ Please enter a valid amount (e.g., 25.50)', {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '⬅️ Back to Deposit', callback_data: 'deposit' }]
                        ]
                    }
                });
                return;
            }

            if (amount < 10) {
                await bot.sendMessage(chatId, '❌ Minimum deposit amount is $10', {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '⬅️ Back to Deposit', callback_data: 'deposit' }]
                        ]
                    }
                });
                return;
            }

            if (amount > 10000) {
                await bot.sendMessage(chatId, '❌ Maximum deposit amount is $10,000', {
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
            
            // Get available cryptocurrencies
            const paymentService = require('../services/paymentService');
            
            try {
                const currenciesResult = await paymentService.getCurrencies();
                
                if (!currenciesResult.success) {
                    await bot.sendMessage(chatId, `❌ **Unable to load cryptocurrencies**\n\nError: ${currenciesResult.error}`, {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '⬅️ Back to Deposit', callback_data: 'deposit' }]
                            ]
                        }
                    });
                    return;
                }

                const cryptoKeyboard = keyboards.createCryptoKeyboard(currenciesResult.currencies);
                
                await bot.sendMessage(chatId, `💰 **Deposit ${amount}**\n\nSelect cryptocurrency:`, {
                    parse_mode: 'Markdown',
                    ...cryptoKeyboard
                });
                
            } catch (error) {
                console.error('Custom amount crypto selection error:', error);
                await bot.sendMessage(chatId, '❌ Something went wrong. Please try again.', {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '⬅️ Back to Deposit', callback_data: 'deposit' }]
                        ]
                    }
                });
            }
            return;
        }
        
        // Default response - redirect to menu
        await bot.sendMessage(chatId, 
            'Please use the menu buttons to navigate! 😊\n\nUse /start to get the main menu.', 
            keyboards.mainMenu
        );
    });
};