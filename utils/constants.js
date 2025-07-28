// utils/constants.js
module.exports = {
    // Bot settings
    BOT_NAME: 'ShopBot',
    VERSION: '1.0.0',
    
    // Pagination
    PRODUCTS_PER_PAGE: 5,
    ORDERS_PER_PAGE: 10,
    
    // Limits
    MIN_DEPOSIT: 1,
    MAX_DEPOSIT: 10000,
    MAX_SEARCH_LENGTH: 100,
    
    // User states
    USER_STATES: {
        NONE: 'none',
        AWAITING_DEPOSIT: 'awaiting_deposit',
        AWAITING_SEARCH: 'awaiting_search',
        AWAITING_CUSTOM_FILTER: 'awaiting_custom_filter'
    },
    
    // Callback data prefixes
    CALLBACKS: {
        MAIN_MENU: 'main_menu',
        PROFILE: 'profile',
        SHOP: 'shop',
        DEPOSIT: 'deposit',
        PRODUCT: 'product',
        BUY: 'buy',
        CONFIRM_BUY: 'confirm_buy',
        FILTER_YEAR: 'year',
        SEARCH: 'search',
        PAGE: 'page'
    },
    
    // Product filters
    YEAR_RANGES: {
        '2020_2021': { from: 2020, to: 2021 },
        '2022_2023': { from: 2022, to: 2023 },
        '2024_plus': { from: 2024, to: new Date().getFullYear() }
    },
    
    // Messages
    EMOJI: {
        SUCCESS: '✅',
        ERROR: '❌',
        WARNING: '⚠️',
        LOADING: '⏳',
        MONEY: '💰',
        SHOP: '🛍️',
        PROFILE: '👤',
        SEARCH: '🔍',
        BACK: '⬅️',
        NEXT: '➡️'
    }
};