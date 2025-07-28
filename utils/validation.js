// utils/validation.js
const constants = require('./constants');

// Validate deposit amount
function validateDepositAmount(amount) {
    const num = parseFloat(amount);
    
    if (isNaN(num)) {
        return { valid: false, error: 'Please enter a valid number' };
    }
    
    if (num < constants.MIN_DEPOSIT) {
        return { valid: false, error: `Minimum deposit is $${constants.MIN_DEPOSIT}` };
    }
    
    if (num > constants.MAX_DEPOSIT) {
        return { valid: false, error: `Maximum deposit is $${constants.MAX_DEPOSIT}` };
    }
    
    return { valid: true, amount: num };
}

// Validate search query
function validateSearchQuery(query) {
    if (!query || query.trim().length === 0) {
        return { valid: false, error: 'Search query cannot be empty' };
    }
    
    if (query.length > constants.MAX_SEARCH_LENGTH) {
        return { valid: false, error: `Search query too long (max ${constants.MAX_SEARCH_LENGTH} characters)` };
    }
    
    // Remove special characters that might cause issues
    const cleaned = query.replace(/[<>]/g, '').trim();
    
    return { valid: true, query: cleaned };
}

// Validate callback data
function validateCallbackData(data) {
    if (!data || typeof data !== 'string') {
        return { valid: false, error: 'Invalid callback data' };
    }
    
    const parts = data.split('_');
    if (parts.length === 0) {
        return { valid: false, error: 'Empty callback data' };
    }
    
    return { valid: true, action: parts[0], params: parts.slice(1) };
}

// Validate user ID
function validateUserId(userId) {
    return userId && typeof userId === 'number' && userId > 0;
}

// Validate product ID
function validateProductId(productId) {
    const id = parseInt(productId);
    return !isNaN(id) && id > 0;
}

module.exports = {
    validateDepositAmount,
    validateSearchQuery,
    validateCallbackData,
    validateUserId,
    validateProductId
};