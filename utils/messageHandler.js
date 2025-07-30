// utils/messageHandler.js - Complete safe message editing with error recovery
const keyboards = require('./keyboards');

class MessageHandler {
    constructor() {
        this.pendingEdits = new Set(); // Track pending edits to prevent duplicates
        this.messageCache = new Map(); // Cache message IDs
    }

    // Safe message editing with fallback to new message
    async safeEditMessage(bot, chatId, messageId, text, options = {}) {
        const editKey = `${chatId}_${messageId}`;
        
        // Prevent duplicate edits
        if (this.pendingEdits.has(editKey)) {
            console.log(`⏳ Edit already pending for ${editKey}, skipping...`);
            return null;
        }

        this.pendingEdits.add(editKey);

        try {
            // Validate message text length
            if (text.length > 4096) {
                text = text.substring(0, 4090) + '...';
            }

            console.log(`📝 Attempting to edit message ${messageId} in chat ${chatId}`);
            
            const result = await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                ...options
            });
            
            console.log(`✅ Successfully edited message ${messageId}`);
            return result;
            
        } catch (error) {
            console.error(`❌ Edit failed for message ${messageId}:`, error.message);
            
            // Handle specific Telegram errors
            if (this.isEditError(error)) {
                console.log(`🔄 Message not found/invalid, sending new message instead...`);
                
                try {
                    // Send new message as fallback
                    const newMessage = await bot.sendMessage(chatId, text, options);
                    console.log(`✅ Sent new message ${newMessage.message_id} as fallback`);
                    
                    // Update cache with new message ID
                    this.messageCache.set(chatId, newMessage.message_id);
                    return newMessage;
                } catch (fallbackError) {
                    console.error(`❌ Fallback message failed:`, fallbackError.message);
                    throw fallbackError;
                }
            } else {
                // Re-throw other errors
                throw error;
            }
        } finally {
            // Remove from pending edits
            this.pendingEdits.delete(editKey);
        }
    }

    // Check if error is related to message editing
    isEditError(error) {
        const errorMessages = [
            'message to edit not found',
            'MESSAGE_ID_INVALID',
            'message is not modified',
            'Bad Request: message to edit not found',
            'message can\'t be edited'
        ];
        
        return errorMessages.some(msg => 
            error.message.toLowerCase().includes(msg.toLowerCase())
        );
    }

    // Safe callback query answering
    async safeAnswerCallback(bot, queryId, text = null) {
        try {
            await bot.answerCallbackQuery(queryId, text || '');
        } catch (error) {
            console.error('❌ Failed to answer callback query:', error.message);
            // Don't throw - this is not critical
        }
    }

    // Safe message sending with retry
    async safeSendMessage(bot, chatId, text, options = {}) {
        try {
            // Validate message text length
            if (text.length > 4096) {
                text = text.substring(0, 4090) + '...';
            }

            const message = await bot.sendMessage(chatId, text, options);
            this.messageCache.set(chatId, message.message_id);
            return message;
        } catch (error) {
            console.error('❌ Failed to send message:', error.message);
            
            // Retry once for temporary errors
            if (error.message.includes('retry after') || error.message.includes('timeout')) {
                console.log('🔄 Retrying message send...');
                await this.sleep(1000);
                
                try {
                    const message = await bot.sendMessage(chatId, text, options);
                    this.messageCache.set(chatId, message.message_id);
                    return message;
                } catch (retryError) {
                    console.error('❌ Retry also failed:', retryError.message);
                    throw retryError;
                }
            }
            
            throw error;
        }
    }

    // Navigate to main menu with safe editing
    async goToMainMenu(bot, chatId, messageId = null) {
        const text = "🏠 Main Menu\n\nWhat would you like to do?";
        
        if (messageId) {
            return await this.safeEditMessage(bot, chatId, messageId, text, {
                parse_mode: 'Markdown',
                ...keyboards.mainMenu
            });
        } else {
            return await this.safeSendMessage(bot, chatId, text, {
                parse_mode: 'Markdown',
                ...keyboards.mainMenu
            });
        }
    }

    // Navigate to shop with safe editing
    async goToShop(bot, chatId, messageId = null) {
        const text = "🛍️ **Shop Categories**\n\nLoading categories...";
        
        if (messageId) {
            return await this.safeEditMessage(bot, chatId, messageId, text, {
                parse_mode: 'Markdown'
            });
        } else {
            return await this.safeSendMessage(bot, chatId, text, {
                parse_mode: 'Markdown'
            });
        }
    }

    // Show error message with safe editing
    async showError(bot, chatId, messageId, errorText, backButton = 'main_menu') {
        const backOptions = {
            'main_menu': keyboards.backToMain,
            'shop': keyboards.backToShop,
            'help': keyboards.backToHelp
        };

        const options = backOptions[backButton] || keyboards.backToMain;
        
        if (messageId) {
            return await this.safeEditMessage(bot, chatId, messageId, errorText, {
                parse_mode: 'Markdown',
                ...options
            });
        } else {
            return await this.safeSendMessage(bot, chatId, errorText, {
                parse_mode: 'Markdown',
                ...options
            });
        }
    }

    // Show loading message
    async showLoading(bot, chatId, messageId, loadingText = "⏳ Loading...") {
        if (messageId) {
            return await this.safeEditMessage(bot, chatId, messageId, loadingText);
        } else {
            return await this.safeSendMessage(bot, chatId, loadingText);
        }
    }

    // Utility function to sleep
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get cached message ID for chat
    getCachedMessageId(chatId) {
        return this.messageCache.get(chatId);
    }

    // Clean up old pending edits and cache
    cleanupPendingEdits() {
        console.log(`🧹 Cleaning up ${this.pendingEdits.size} pending edits`);
        this.pendingEdits.clear();
        
        // Clean up old cache entries (keep last 100)
        if (this.messageCache.size > 100) {
            const entries = Array.from(this.messageCache.entries());
            this.messageCache.clear();
            // Keep only the last 50 entries
            entries.slice(-50).forEach(([key, value]) => {
                this.messageCache.set(key, value);
            });
        }
    }

    // Get debug info
    getDebugInfo() {
        return {
            pendingEdits: this.pendingEdits.size,
            cachedMessages: this.messageCache.size,
            pendingEditsList: Array.from(this.pendingEdits)
        };
    }
}

// Create singleton instance
const messageHandler = new MessageHandler();

// Clean up pending edits every 5 minutes
setInterval(() => {
    messageHandler.cleanupPendingEdits();
}, 5 * 60 * 1000);

// Log debug info every 10 minutes in development
if (process.env.NODE_ENV !== 'production') {
    setInterval(() => {
        console.log('🐛 MessageHandler Debug:', messageHandler.getDebugInfo());
    }, 10 * 60 * 1000);
}

module.exports = messageHandler;