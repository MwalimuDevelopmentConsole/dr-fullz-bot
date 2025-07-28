// handlers/callbacks.js - Complete fixed version
const keyboards = require('../utils/keyboards');
const userService = require('../services/userService');
const paymentService = require('../services/paymentService');
const shopService = require('../services/shopService');
const sharedState = require('../utils/sharedState');

// For download URL construction
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

module.exports = (bot) => {
    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;
        const data = query.data;
        const username = query.from.username;

        try {
            switch(data) {
                case 'main_menu':
                    await bot.editMessageText('🏠 Main Menu\n\nWhat would you like to do?', {
                        chat_id: chatId,
                        message_id: messageId,
                        ...keyboards.mainMenu
                    });
                    break;

                case 'profile':
                    if (!username) {
                        await bot.editMessageText('❌ Please create a Telegram username first!', {
                            chat_id: chatId,
                            message_id: messageId,
                            ...keyboards.backToMain
                        });
                        break;
                    }

                    const userResult = await userService.getUser(username);
                    
                    if (!userResult.success) {
                        await bot.editMessageText(`❌ Unable to get profile.\n\nError: ${userResult.error}`, {
                            chat_id: chatId,
                            message_id: messageId,
                            ...keyboards.backToMain
                        });
                        break;
                    }

                    const profileText = `👤 **Your Profile**\n\n**Username:** @${username}\n**Name:** ${userResult.user.name || 'Not set'}\n**Status:** ${userResult.user.status || 'Active'}`;
                    
                    await bot.editMessageText(profileText, {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: 'Markdown',
                        ...keyboards.backToMain
                    });
                    break;

                case 'wallet':
                    if (!username) {
                        await bot.editMessageText('❌ Please create a Telegram username first!', {
                            chat_id: chatId,
                            message_id: messageId,
                            ...keyboards.backToMain
                        });
                        break;
                    }

                    const walletResult = await userService.getUserWallet(username);
                    
                    if (!walletResult.success) {
                        await bot.editMessageText(`❌ Unable to get wallet information.\n\nError: ${walletResult.error}`, {
                            chat_id: chatId,
                            message_id: messageId,
                            ...keyboards.backToMain
                        });
                        break;
                    }

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
                    
                    await bot.editMessageText(walletText, {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: 'Markdown',
                        ...keyboards.backToMain
                    });
                    break;

                case 'shop':
                    // Get shop categories from API
                    if (!username) {
                        await bot.editMessageText('❌ Please create a Telegram username first!', {
                            chat_id: chatId,
                            message_id: messageId,
                            ...keyboards.backToMain
                        });
                        break;
                    }

                    await bot.editMessageText('⏳ Loading shop categories...', {
                        chat_id: chatId,
                        message_id: messageId
                    });

                    const categoriesResult = await shopService.getCategories();
                    
                    if (!categoriesResult.success) {
                        await bot.editMessageText(`❌ **Unable to load shop categories**\n\nError: ${categoriesResult.error}`, {
                            chat_id: chatId,
                            message_id: messageId,
                            parse_mode: 'Markdown',
                            ...keyboards.backToMain
                        });
                        break;
                    }

                    const categoriesKeyboard = keyboards.validateAndFixKeyboard(
                        keyboards.createCategoriesKeyboard(categoriesResult.categories),
                        'CategoriesKeyboard'
                    );
                    
                    await bot.editMessageText('🛍️ **Shop Categories**\n\nSelect a category (base and price):', {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: 'Markdown',
                        ...categoriesKeyboard
                    });
                    break;

                case 'deposit':
                    if (!username) {
                        await bot.editMessageText('❌ Please create a Telegram username first!', {
                            chat_id: chatId,
                            message_id: messageId,
                            ...keyboards.backToMain
                        });
                        break;
                    }

                    await bot.editMessageText('⏳ Loading available cryptocurrencies...', {
                        chat_id: chatId,
                        message_id: messageId
                    });

                    const currenciesResult = await paymentService.getCurrencies();
                    
                    if (!currenciesResult.success) {
                        await bot.editMessageText(`❌ **Unable to load cryptocurrencies**\n\nError: ${currenciesResult.error}`, {
                            chat_id: chatId,
                            message_id: messageId,
                            parse_mode: 'Markdown',
                            ...keyboards.backToMain
                        });
                        break;
                    }

                    const cryptoKeyboard = keyboards.validateAndFixKeyboard(
                        keyboards.createCryptoKeyboard(currenciesResult.currencies),
                        'CryptoKeyboard'
                    );
                    
                    await bot.editMessageText('💳 **Deposit Funds**\n\nSelect cryptocurrency:', {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: 'Markdown',
                        ...cryptoKeyboard
                    });
                    break;

                default:
                    console.log('Processing callback data:', data);
                    
                    if (data.startsWith('crypto_')) {
                        const cryptoCode = data.split('_')[1];
                        console.log('Crypto selected:', cryptoCode);
                        
                        const amountKeyboard = keyboards.validateAndFixKeyboard(
                            keyboards.createAmountKeyboard(cryptoCode),
                            'AmountKeyboard'
                        );
                        
                        await bot.editMessageText(`💰 **Deposit with ${cryptoCode.toUpperCase()}**\n\nSelect amount:`, {
                            chat_id: chatId,
                            message_id: messageId,
                            parse_mode: 'Markdown',
                            ...amountKeyboard
                        });
                    }
                    else if (data.startsWith('amount_')) {
                        const parts = data.split('_');
                        const cryptoCode = parts[1];
                        const amount = parts[2];
                        
                        console.log('Amount selected:', amount, 'for crypto:', cryptoCode);
                        
                        await processDeposit(bot, chatId, messageId, username, amount, cryptoCode);
                    }
                    // Handle category selection - UPDATED TO USE INDEX
                    else if (data.startsWith('category_')) {
                        const categoryIndex = parseInt(data.split('_')[1]); // This is now the array index
                        console.log('Category index selected:', categoryIndex);
                        
                        // Get the categories again to find the actual category by index
                        const categoriesResult = await shopService.getCategories();
                        
                        if (!categoriesResult.success || !categoriesResult.categories[categoryIndex]) {
                            await bot.editMessageText('❌ Category not found. Please try again.', {
                                chat_id: chatId,
                                message_id: messageId,
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: '🛍️ Back to Shop', callback_data: 'shop' }]
                                    ]
                                }
                            });
                            break;
                        }
                        
                        const selectedCategory = categoriesResult.categories[categoryIndex];
                        const baseId = selectedCategory._id;
                        
                        console.log('Selected category:', selectedCategory);
                        console.log('Base ID:', baseId);
                        
                        // Store base selection in user state
                        sharedState.setUserState(query.from.id, { 
                            step: 'selecting_year',
                            baseId: baseId,
                            categoryIndex: categoryIndex // Store index for reference
                        });
                        
                        const yearKeyboard = keyboards.createYearRangeKeyboard(baseId);
                        
                        await bot.editMessageText(`📅 **Year Range Filter**\n\nSelected: ${selectedCategory.base}\n\nSelect a year range or skip to see all products:`, {
                            chat_id: chatId,
                            message_id: messageId,
                            parse_mode: 'Markdown',
                            ...yearKeyboard
                        });
                    }
                    // Handle year range selection
                    else if (data.startsWith('year_range_')) {
                        const parts = data.split('_');
                        console.log('Year range callback parts:', parts);
                        
                        // Get baseId from user state
                        const userState = sharedState.getUserState(query.from.id);
                        const baseId = userState?.baseId;
                        const yearFrom = parts[2]; // Now parts[2] since no baseId in callback
                        const yearTo = parts[3];   // Now parts[3] since no baseId in callback
                        
                        console.log('Year range selected:', yearFrom, '-', yearTo, 'for base:', baseId);
                        
                        if (!baseId) {
                            await bot.editMessageText('❌ Session expired. Please start again.', {
                                chat_id: chatId,
                                message_id: messageId,
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: '🛍️ Back to Shop', callback_data: 'shop' }]
                                    ]
                                }
                            });
                            break;
                        }
                        
                        const filters = {
                            base: baseId,
                            yearFrom: parseInt(yearFrom),
                            yearTo: parseInt(yearTo)
                        };
                        
                        // Update user state to include year range and move to state selection
                        sharedState.setUserState(query.from.id, { 
                            step: 'selecting_state',
                            baseId: baseId,
                            filters: filters
                        });
                        
                        const stateKeyboard = keyboards.createStateFilterKeyboard();
                        
                        await bot.editMessageText(`🏛️ **State Filter**\n\nSelect a US state or skip to see all products:`, {
                            chat_id: chatId,
                            message_id: messageId,
                            parse_mode: 'Markdown',
                            ...stateKeyboard
                        });
                    }
                    // Handle skip year filter
                    else if (data === 'skip_year') { // Now just 'skip_year' without baseId
                        // Get baseId from user state
                        const userState = sharedState.getUserState(query.from.id);
                        const baseId = userState?.baseId;
                        
                        console.log('Skipping year filter for base:', baseId);
                        
                        if (!baseId) {
                            await bot.editMessageText('❌ Session expired. Please start again.', {
                                chat_id: chatId,
                                message_id: messageId,
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: '🛍️ Back to Shop', callback_data: 'shop' }]
                                    ]
                                }
                            });
                            break;
                        }
                        
                        const filters = {
                            base: baseId
                        };
                        
                        // Update user state to move to state selection  
                        sharedState.setUserState(query.from.id, { 
                            step: 'selecting_state',
                            baseId: baseId,
                            filters: filters
                        });
                        
                        const stateKeyboard = keyboards.createStateFilterKeyboard();
                        
                        await bot.editMessageText(`🏛️ **State Filter**\n\nSelect a US state or skip to see all products:`, {
                            chat_id: chatId,
                            message_id: messageId,
                            parse_mode: 'Markdown',
                            ...stateKeyboard
                        });
                    }
                    // Handle state selection
                    else if (data.startsWith('state_')) {
                        const selectedState = data.split('_')[1]; // e.g., 'CA', 'TX', etc.
                        console.log('State selected:', selectedState);
                        
                        // Get current filters from user state
                        const userState = sharedState.getUserState(query.from.id);
                        if (!userState || !userState.filters) {
                            await bot.editMessageText('❌ Session expired. Please start again.', {
                                chat_id: chatId,
                                message_id: messageId,
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: '🛍️ Back to Shop', callback_data: 'shop' }]
                                    ]
                                }
                            });
                            break;
                        }
                        
                        // Add state to filters
                        const filters = {
                            ...userState.filters,
                            state: selectedState
                        };
                        
                        console.log('Final filters with state:', filters);
                        await handleProductSearch(bot, chatId, messageId, username, filters, query.from.id);
                    }
                    // Handle skip state filter
                    else if (data === 'skip_state') {
                        console.log('Skipping state filter');
                        
                        // Get current filters from user state
                        const userState = sharedState.getUserState(query.from.id);
                        if (!userState || !userState.filters) {
                            await bot.editMessageText('❌ Session expired. Please start again.', {
                                chat_id: chatId,
                                message_id: messageId,
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: '🛍️ Back to Shop', callback_data: 'shop' }]
                                    ]
                                }
                            });
                            break;
                        }
                        
                        const filters = userState.filters;
                        console.log('Final filters without state:', filters);
                        await handleProductSearch(bot, chatId, messageId, username, filters, query.from.id);
                    }
                    // Handle checkout confirmation - UPDATED VERSION
                    else if (data.startsWith('confirm_checkout_') || data.startsWith('checkout_')) {
                        let quantity;
                        
                        if (data.startsWith('confirm_checkout_')) {
                            const parts = data.split('_');
                            quantity = parseInt(parts[2]);
                        } else if (data.startsWith('checkout_')) {
                            const parts = data.split('_');
                            quantity = parseInt(parts[1]);
                        }
                        
                        console.log('Checkout confirmation received for quantity:', quantity);
                        
                        // Get filters from user state instead of callback data
                        const userState = sharedState.getUserState(query.from.id);
                        
                        if (!userState || !userState.filters) {
                            await bot.editMessageText('❌ Session expired. Please start again.', {
                                chat_id: chatId,
                                message_id: messageId,
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: '🛍️ Back to Shop', callback_data: 'shop' }]
                                    ]
                                }
                            });
                            break;
                        }
                        
                        const filters = userState.filters;
                        console.log('Checkout confirmed:', quantity, filters);
                        
                        await handleCheckout(bot, chatId, messageId, username, filters, quantity, query.from.id);
                    }
                    // Handle file delivery options
                    else if (data === 'send_file_telegram') {
                        const userState = sharedState.getUserState(query.from.id);
                        
                        if (!userState || !userState.fileData) {
                            await bot.editMessageText('❌ File not available. Please make a new purchase.', {
                                chat_id: chatId,
                                message_id: messageId,
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: '🛍️ Back to Shop', callback_data: 'shop' }]
                                    ]
                                }
                            });
                            break;
                        }

                        await bot.editMessageText('📤 Sending file to Telegram...', {
                            chat_id: chatId,
                            message_id: messageId
                        });

                        try {
                            // Send the file to user
                            await bot.sendDocument(chatId, Buffer.from(userState.fileData, 'base64'), {
                                filename: userState.fileName
                            });

                            const fileSizeText = userState.fileSize ? 
                                ` (${(userState.fileSize / 1024).toFixed(2)} KB)` : '';

                            await bot.editMessageText(`✅ **File Sent Successfully!**\n\n📄 Your file **${userState.fileName}**${fileSizeText} has been sent above.`, {
                                chat_id: chatId,
                                message_id: messageId,
                                parse_mode: 'Markdown',
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: '💰 Check Wallet', callback_data: 'wallet' }],
                                        [{ text: '🛍️ Shop Again', callback_data: 'shop' }],
                                        [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
                                    ]
                                }
                            });

                            // Clear user state after successful delivery
                            sharedState.clearUserState(query.from.id);

                        } catch (fileError) {
                            console.error('File send error:', fileError);
                            await bot.editMessageText('❌ Failed to send file. Please try the download link option.', {
                                chat_id: chatId,
                                message_id: messageId,
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: '🔗 Try Download Link', callback_data: 'send_download_link' }],
                                        [{ text: '🛍️ Back to Shop', callback_data: 'shop' }]
                                    ]
                                }
                            });
                        }
                    }
                    else if (data === 'send_download_link') {
                        const userState = sharedState.getUserState(query.from.id);
                        
                        if (!userState || !userState.fileName) {
                            await bot.editMessageText('❌ File not available. Please make a new purchase.', {
                                chat_id: chatId,
                                message_id: messageId,
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: '🛍️ Back to Shop', callback_data: 'shop' }]
                                    ]
                                }
                            });
                            break;
                        }

                        // Create download URL (you might need to adjust this based on your backend)
                        const baseUrl = API_BASE_URL.replace('/api', '');
                        const downloadUrl = userState.downloadUrl || `${baseUrl}/uploads/${userState.fileName}`;
                        const fileSizeText = userState.fileSize ? 
                            ` (${(userState.fileSize / 1024).toFixed(2)} KB)` : '';

                        await bot.editMessageText(`🔗 **Download Link Ready**\n\n📄 **File:** ${userState.fileName}${fileSizeText}\n\n👆 Click the link below to download your file:\n\n🔗 [Download ${userState.fileName}](${downloadUrl})\n\n⚠️ **Note:** This link will expire after some time for security.`, {
                            chat_id: chatId,
                            message_id: messageId,
                            parse_mode: 'Markdown',
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: '📱 Send to Telegram Instead', callback_data: 'send_file_telegram' }],
                                    [{ text: '💰 Check Wallet', callback_data: 'wallet' }],
                                    [{ text: '🛍️ Shop Again', callback_data: 'shop' }],
                                    [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
                                ]
                            }
                        });

                        // Clear user state after providing download link
                        sharedState.clearUserState(query.from.id);
                    }
                    else {
                        console.log('Unknown callback data:', data);
                        await bot.answerCallbackQuery(query.id, 'Feature coming soon!');
                    }
            }

            await bot.answerCallbackQuery(query.id);

        } catch (error) {
            console.error('Callback error:', error);
            await bot.answerCallbackQuery(query.id, 'Error occurred');
            
            await bot.editMessageText('❌ Something went wrong. Please try again.', {
                chat_id: chatId,
                message_id: messageId,
                ...keyboards.mainMenu
            });
        }
    });

    // Helper function to handle product search
    async function handleProductSearch(bot, chatId, messageId, username, filters, userId) {
        try {
            await bot.editMessageText('⏳ Searching for products...', {
                chat_id: chatId,
                message_id: messageId
            });

            const productsResult = await shopService.getProducts(username, filters);
            
            if (!productsResult.success) {
                await bot.editMessageText(`❌ **Unable to get products**\n\nError: ${productsResult.error}`, {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🛍️ Back to Shop', callback_data: 'shop' }]
                        ]
                    }
                });
                return;
            }

            if (productsResult.availableQuantity === 0) {
                await bot.editMessageText(`📭 **No Products Available**\n\nNo products found with your current filters.`, {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🔄 Try Different Category', callback_data: 'shop' }],
                            [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
                        ]
                    }
                });
                return;
            }

            // Store filters and quantity in user state for quantity input
            sharedState.setUserState(userId, { 
                step: 'entering_quantity',
                filters: filters,
                availableQuantity: productsResult.availableQuantity 
            });

            const quantityKeyboard = keyboards.createQuantityKeyboard(productsResult.availableQuantity, filters);
            
            await bot.editMessageText(`📦 **Products Found**\n\n**Available Quantity:** ${productsResult.availableQuantity}\n\nPlease type the quantity you want to purchase (1-${productsResult.availableQuantity}):`, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                ...quantityKeyboard
            });

        } catch (error) {
            console.error('Product search error:', error);
            await bot.editMessageText('❌ Something went wrong. Please try again.', {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🛍️ Back to Shop', callback_data: 'shop' }]
                    ]
                }
            });
        }
    }

    // Helper function to handle checkout - UPDATED with download option
    async function handleCheckout(bot, chatId, messageId, username, filters, quantity, userId) {
        try {
            await bot.editMessageText('⏳ Processing your order...', {
                chat_id: chatId,
                message_id: messageId
            });

            const checkoutResult = await shopService.checkout(username, filters, quantity);
            
            if (!checkoutResult.success) {
                await bot.editMessageText(`❌ **Purchase Failed**\n\nError: ${checkoutResult.error}`, {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '💰 Check Wallet', callback_data: 'wallet' }],
                            [{ text: '🛍️ Back to Shop', callback_data: 'shop' }],
                            [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
                        ]
                    }
                });
                return;
            }

            // Store the file info in user state for download option
            sharedState.setUserState(userId, {
                step: 'file_ready',
                fileData: checkoutResult.fileData,
                fileName: checkoutResult.fileName,
                fileSize: checkoutResult.fileSize,
                downloadUrl: checkoutResult.downloadUrl || null // In case backend provides direct URL
            });

            // Format file size for display
            const fileSizeText = checkoutResult.fileSize ? 
                `📊 **Size:** ${(checkoutResult.fileSize / 1024).toFixed(2)} KB` : '';

            // Send success message with download options
            await bot.editMessageText(`✅ **Purchase Successful!**\n\n${checkoutResult.message}\n\n📄 **File:** ${checkoutResult.fileName}\n${fileSizeText}\n\nChoose how you want to receive your file:`, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '📱 Send to Telegram', callback_data: 'send_file_telegram' },
                            { text: '🔗 Download Link', callback_data: 'send_download_link' }
                        ],
                        [
                            { text: '💰 Check Wallet', callback_data: 'wallet' },
                            { text: '🛍️ Shop Again', callback_data: 'shop' }
                        ],
                        [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
                    ]
                }
            });

        } catch (error) {
            console.error('Checkout error:', error);
            await bot.editMessageText('❌ Something went wrong during checkout. Please try again.', {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🛍️ Back to Shop', callback_data: 'shop' }]
                    ]
                }
            });
        }
    }

    async function processDeposit(bot, chatId, messageId, username, amount, cryptoCode) {
        try {
            await bot.editMessageText('⏳ Creating deposit...', {
                chat_id: chatId,
                message_id: messageId
            });

            const depositResult = await paymentService.createDeposit(
                amount,
                cryptoCode,
                username,
                `Deposit via Telegram Bot - $${amount}`
            );

            if (!depositResult.success) {
                await bot.editMessageText(`❌ **Deposit Failed**\n\nError: ${depositResult.error}`, {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    ...keyboards.backToMain
                });
                return;
            }

            const paymentText = `💰 **Deposit Created Successfully**\n\n` +
                `**USD Amount:** $${depositResult.paymentData.price_amount}\n` +
                `**Cryptocurrency:** ${depositResult.paymentData.pay_currency.toUpperCase()}\n` +
                `**Network:** ${depositResult.paymentData.network.toUpperCase()}\n` +
                `**Status:** ${depositResult.status}\n` +
                `**Order ID:** ${depositResult.paymentData.order_id}\n` +
                `**Transaction ID:** ${depositResult.transactionId}\n\n` +
                `📍 **Payment Address:**\n\`${depositResult.paymentData.pay_address}\`\n\n` +
                `💎 **Amount to Send:**\n\`${depositResult.paymentData.pay_amount} ${depositResult.paymentData.pay_currency.toUpperCase()}\`\n\n` +
                `📊 **Amount Received (so far):** ${depositResult.paymentData.amount_received} ${depositResult.paymentData.pay_currency.toUpperCase()}\n\n` +
                `⚠️ **Important:**\n• Send exactly **${depositResult.paymentData.pay_amount} ${depositResult.paymentData.pay_currency.toUpperCase()}** to the address above\n• Your deposit will be credited automatically once confirmed\n• Do not send from an exchange, use a personal wallet`;

            await bot.editMessageText(paymentText, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '💰 Check Wallet', callback_data: 'wallet' }],
                        [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
                    ]
                }
            });

        } catch (error) {
            console.error('Process deposit error:', error);
            await bot.editMessageText('❌ Something went wrong. Please try again.', {
                chat_id: chatId,
                message_id: messageId,
                ...keyboards.backToMain
            });
        }
    }
};