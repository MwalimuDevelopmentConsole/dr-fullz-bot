// utils/helpers.js
const fs = require('fs');
const path = require('path');

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Format date
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Validate amount input
function validateAmount(input) {
    const amount = parseFloat(input);
    return !isNaN(amount) && amount > 0 && amount <= 10000;
}

// Escape markdown characters for Telegram
function escapeMarkdown(text) {
    return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

// Log function
function log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level: level.toUpperCase(),
        message,
        data
    };
    
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data || '');
    
    // Write to log file
    const logDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logFile = path.join(logDir, 'bot.log');
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
}

// Parse callback data
function parseCallbackData(callbackData) {
    const parts = callbackData.split('_');
    return {
        action: parts[0],
        value: parts.slice(1).join('_')
    };
}

// Generate pagination info
function getPaginationInfo(totalItems, currentPage, itemsPerPage) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const hasNext = currentPage < totalPages - 1;
    const hasPrev = currentPage > 0;
    
    return {
        totalPages,
        hasNext,
        hasPrev,
        start: currentPage * itemsPerPage,
        end: Math.min((currentPage + 1) * itemsPerPage, totalItems)
    };
}

// Delay function for rate limiting
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Validate Telegram user data
function validateTelegramUser(user) {
    return user && user.id && user.first_name;
}

// Clean old log files (keep last 7 days)
function cleanOldLogs() {
    const logDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logDir)) return;
    
    const files = fs.readdirSync(logDir);
    const now = Date.now();
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    files.forEach(file => {
        const filePath = path.join(logDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < weekAgo) {
            fs.unlinkSync(filePath);
            console.log(`Deleted old log file: ${file}`);
        }
    });
}

module.exports = {
    formatCurrency,
    formatDate,
    validateAmount,
    escapeMarkdown,
    log,
    parseCallbackData,
    getPaginationInfo,
    delay,
    validateTelegramUser,
    cleanOldLogs
};