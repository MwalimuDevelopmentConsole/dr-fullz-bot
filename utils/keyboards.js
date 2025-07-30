// utils/keyboards.js - Updated with Help/Support button

// Add at the top after the requires
function validateAndFixKeyboard(keyboard, keyboardName = 'Unknown') {
    console.log(`\n=== Validating ${keyboardName} ===`);
    
    if (keyboard.reply_markup && keyboard.reply_markup.inline_keyboard) {
        keyboard.reply_markup.inline_keyboard.forEach((row, rowIndex) => {
            row.forEach((button, buttonIndex) => {
                const callbackData = button.callback_data;
                const length = Buffer.byteLength(callbackData, 'utf8');
                
                console.log(`Row ${rowIndex}, Button ${buttonIndex}: "${button.text}"`);
                console.log(`  Callback: "${callbackData}" (${length} bytes)`);
                
                if (length > 64) {
                    console.error(`  ❌ TOO LONG! Exceeds 64 bytes by ${length - 64} bytes`);
                    // Truncate the callback data
                    button.callback_data = callbackData.substring(0, 60) + '_trunc';
                    console.log(`  🔧 Fixed to: "${button.callback_data}"`);
                } else {
                    console.log(`  ✅ OK`);
                }
            });
        });
    }
    
    return keyboard;
}

// Updated main menu with Help button
const mainMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '💰 Wallet', callback_data: 'wallet' }],
            [{ text: '🛍️ Shop', callback_data: 'shop' }],
            [{ text: '💳 Deposit', callback_data: 'deposit' }],
            [{ text: '❓ Help & Support', callback_data: 'help_support' }]
        ]
    }
};

// Help menu with support options
const helpMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '📖 How It Works', callback_data: 'how_it_works' }],
            [{ text: '💬 Contact Support', url: process.env.SUPPORT_CONTACT || 'https://t.me/petergach' }],
            [{ text: '📢 Join Channel', url: process.env.CHANNEL_LINK || 'https://t.me/channel' }],
            [{ text: '⬅️ Back to Main', callback_data: 'main_menu' }]
        ]
    }
};

const shopMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '📱 All Products', callback_data: 'products_all' }],
            [{ text: '📅 Filter by Year', callback_data: 'filter_year' }],
            [{ text: '⬅️ Back to Main', callback_data: 'main_menu' }]
        ]
    }
};

const depositMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '$10', callback_data: 'deposit_amount_10' }],
            [{ text: '$25', callback_data: 'deposit_amount_25' }],
            [{ text: '$50', callback_data: 'deposit_amount_50' }],
            [{ text: '$100', callback_data: 'deposit_amount_100' }],
            [{ text: '💳 Custom Amount', callback_data: 'deposit_custom' }],
            [{ text: '⬅️ Back to Main', callback_data: 'main_menu' }]
        ]
    }
};

// Create dynamic categories keyboard - FIXED VERSION
function createCategoriesKeyboard(categories) {
    console.log('Creating categories keyboard with:', categories);
    
    if (!categories || categories.length === 0) {
        return {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '❌ No categories available', callback_data: 'no_action' }],
                    [{ text: '⬅️ Back to Main', callback_data: 'main_menu' }]
                ]
            }
        };
    }

    const keyboard = categories.map((category, index) => {
        // Use index instead of MongoDB _id to avoid long callback data
        const callbackData = `category_${index}`;
        console.log(`Category ${index}: ${category.base} - Callback: ${callbackData} (${Buffer.byteLength(callbackData, 'utf8')} bytes)`);
        
        return [
            { text: `${category.base} - ${category.price}`, callback_data: callbackData }
        ];
    });

    keyboard.push([{ text: '⬅️ Back to Main', callback_data: 'main_menu' }]);

    return {
        reply_markup: {
            inline_keyboard: keyboard
        }
    };
}

// Create state filter keyboard with USA states abbreviations
function createStateFilterKeyboard() {
    const states = [
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
        'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
        'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
        'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
    ];

    // Create keyboard in rows of 5
    const keyboard = [];
    for (let i = 0; i < states.length; i += 5) {
        const row = states.slice(i, i + 5).map(state => ({
            text: state,
            callback_data: `state_${state}`
        }));
        keyboard.push(row);
    }

    // Add skip and back options
    keyboard.push([{ text: '⏭️ Skip State Filter', callback_data: 'skip_state' }]);
    keyboard.push([{ text: '⬅️ Back to Shop', callback_data: 'shop' }]);

    return {
        reply_markup: {
            inline_keyboard: keyboard
        }
    };
}

function createYearRangeKeyboard(baseId) {
    const yearRanges = [];
    
    // Create ranges from 1965-2011 with 5-year gaps
    for (let year = 1965; year <= 2011; year += 5) {
        const endYear = Math.min(year + 4, 2011);
        yearRanges.push({
            text: `${year}-${endYear}`,
            callback_data: `year_range_${year}_${endYear}` // Remove baseId from callback
        });
    }

    // Create keyboard in rows of 2
    const keyboard = [];
    for (let i = 0; i < yearRanges.length; i += 2) {
        const row = [yearRanges[i]];
        if (yearRanges[i + 1]) {
            row.push(yearRanges[i + 1]);
        }
        keyboard.push(row);
    }

    // Add skip and back options
    keyboard.push([{ text: '⏭️ Skip Year Filter', callback_data: `skip_year` }]); // Remove baseId
    keyboard.push([{ text: '⬅️ Back to Categories', callback_data: 'shop' }]);

    return {
        reply_markup: {
            inline_keyboard: keyboard
        }
    };
}

// Create quantity input keyboard
function createQuantityKeyboard(availableQuantity, filters) {    
    return {
        reply_markup: {
            inline_keyboard: [
                [{ text: `📦 Available: ${availableQuantity}`, callback_data: 'no_action' }],
                [{ text: '⬅️ Back to Shop', callback_data: 'shop' }]
            ]
        }
    };
}

// Create checkout confirmation keyboard - FIXED AND DEBUGGED VERSION
function createCheckoutKeyboard(filters, quantity) {
    const callbackData = `confirm_checkout_${quantity}`;
    const length = Buffer.byteLength(callbackData, 'utf8');
    
    console.log('\n=== Creating Checkout Keyboard ===');
    console.log('Quantity:', quantity);
    console.log('Callback data:', callbackData);
    console.log('Callback length:', length, 'bytes');
    
    if (length > 64) {
        console.error('❌ Checkout callback data too long!');
        // Fallback to shorter version
        const shortCallback = `checkout_${quantity}`;
        console.log('Using shorter callback:', shortCallback);
        
        return {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Confirm Purchase', callback_data: shortCallback },
                        { text: '❌ Cancel', callback_data: 'shop' }
                    ]
                ]
            }
        };
    }
    
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '✅ Confirm Purchase', callback_data: callbackData },
                    { text: '❌ Cancel', callback_data: 'shop' }
                ]
            ]
        }
    };
}

function createCryptoKeyboard(currencies) {
    console.log('Creating crypto keyboard with:', currencies);
    
    // Handle your specific API response format
    let currencyArray = [];
    
    if (currencies && currencies.data && currencies.data.selectedCurrencies) {
        currencyArray = currencies.data.selectedCurrencies;
    } else if (currencies && Array.isArray(currencies)) {
        currencyArray = currencies;
    } else if (currencies && currencies.selectedCurrencies) {
        currencyArray = currencies.selectedCurrencies;
    }
    
    console.log('Extracted currency array:', currencyArray);
    
    if (!currencyArray || currencyArray.length === 0) {
        return {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '❌ No currencies available', callback_data: 'no_action' }],
                    [{ text: '⬅️ Back to Main', callback_data: 'main_menu' }]
                ]
            }
        };
    }

    const keyboard = currencyArray.map(currency => {
        // Handle different currency formats
        let displayText, callbackData;
        
        if (typeof currency === 'string') {
            // Your API returns strings like 'LTC', 'SOL', 'BTC', 'USDTTRC20'
            displayText = currency.toUpperCase();
            
            // Shorten the callback data to avoid length issues
            let shortCode = currency.toLowerCase();
            if (shortCode === 'usdttrc20') {
                shortCode = 'usdt_trc20'; // Shorter version
                displayText = 'USDT (TRC20)';
            }
            callbackData = `crypto_${shortCode}`;
            
        } else if (currency.code || currency.symbol) {
            // Fallback for object format
            const code = currency.code || currency.symbol;
            const name = currency.name || code;
            displayText = `${code.toUpperCase()} - ${name}`;
            callbackData = `crypto_${code.toLowerCase()}`;
        } else {
            // Last resort fallback
            displayText = String(currency).toUpperCase();
            callbackData = `crypto_${String(currency).toLowerCase()}`;
        }
        
        // Validate callback data length
        const length = Buffer.byteLength(callbackData, 'utf8');
        console.log(`Crypto button: ${displayText} -> ${callbackData} (${length} bytes)`);
        
        if (length > 64) {
            console.error(`Warning: Callback data too long: ${callbackData}`);
            // Truncate if too long
            callbackData = callbackData.substring(0, 60);
        }
        
        return [{ text: displayText, callback_data: callbackData }];
    });

    keyboard.push([{ text: '⬅️ Back to Main', callback_data: 'main_menu' }]);

    console.log('Generated keyboard:', keyboard);

    return {
        reply_markup: {
            inline_keyboard: keyboard
        }
    };
}

// Create amount keyboard for selected crypto
function createAmountKeyboard(cryptoCode) {
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '$20', callback_data: `amount_${cryptoCode}_20` },
                    { text: '$30', callback_data: `amount_${cryptoCode}_30` },
                    { text: '$40', callback_data: `amount_${cryptoCode}_40` }
                ],
                [
                    { text: '$50', callback_data: `amount_${cryptoCode}_50` },
                    { text: '$60', callback_data: `amount_${cryptoCode}_60` },
                    { text: '$70', callback_data: `amount_${cryptoCode}_70` }
                ],
                [
                    { text: '$80', callback_data: `amount_${cryptoCode}_80` },
                    { text: '$90', callback_data: `amount_${cryptoCode}_90` },
                    { text: '$100', callback_data: `amount_${cryptoCode}_100` }
                ],
                [
                    { text: '$150', callback_data: `amount_${cryptoCode}_150` },
                    { text: '$200', callback_data: `amount_${cryptoCode}_200` },
                    { text: '$300', callback_data: `amount_${cryptoCode}_300` }
                ],
                [
                    { text: '$400', callback_data: `amount_${cryptoCode}_400` },
                    { text: '$500', callback_data: `amount_${cryptoCode}_500` }
                ],
                [
                    // { text: '💰 Custom Amount', callback_data: 'deposit_custom_with_crypto' },
                    { text: '⬅️ Back to Crypto', callback_data: 'deposit' }
                ]
            ]
        }
    };
}

const yearFilter = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '2023', callback_data: 'year_2023' }],
            [{ text: '2024', callback_data: 'year_2024' }],
            [{ text: '2025', callback_data: 'year_2025' }],
            [{ text: '⬅️ Back to Shop', callback_data: 'shop' }]
        ]
    }
};

const backToMain = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '⬅️ Back to Main', callback_data: 'main_menu' }]
        ]
    }
};

const backToShop = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '⬅️ Back to Shop', callback_data: 'shop' }]
        ]
    }
};

const backToHelp = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '⬅️ Back to Help', callback_data: 'help_support' }]
        ]
    }
};

// Create product list from API data
function createProductList(products) {
    if (!products || products.length === 0) {
        return {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '❌ No products found', callback_data: 'no_action' }],
                    [{ text: '⬅️ Back to Shop', callback_data: 'shop' }]
                ]
            }
        };
    }

    const keyboard = products.slice(0, 10).map(product => [
        { text: `${product.name} - $${product.price}`, callback_data: `product_${product.id}` }
    ]);

    keyboard.push([{ text: '⬅️ Back to Shop', callback_data: 'shop' }]);

    return {
        reply_markup: {
            inline_keyboard: keyboard
        }
    };
}

module.exports = {
    mainMenu,
    helpMenu,
    shopMenu,
    depositMenu,
    yearFilter,
    backToMain,
    backToShop,
    backToHelp,
    createProductList,
    createCryptoKeyboard,
    createAmountKeyboard,
    createCategoriesKeyboard,
    createYearRangeKeyboard,
    createStateFilterKeyboard,
    createQuantityKeyboard,
    createCheckoutKeyboard,
    validateAndFixKeyboard  // Export the validation function
};