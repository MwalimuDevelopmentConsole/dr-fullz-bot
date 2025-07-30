// utils/rateLimiter.js - Rate limiting to prevent API abuse and spam
class RateLimiter {
    constructor() {
        this.userRequests = new Map();
        this.userCallbacks = new Map();
        this.cleanup();
    }

    // Check if user is rate limited for general requests
    isRateLimited(userId, maxRequests = 10, windowMs = 60000) {
        const now = Date.now();
        const userKey = userId.toString();
        
        if (!this.userRequests.has(userKey)) {
            this.userRequests.set(userKey, []);
        }
        
        const requests = this.userRequests.get(userKey);
        
        // Remove old requests outside the window
        const validRequests = requests.filter(time => now - time < windowMs);
        this.userRequests.set(userKey, validRequests);
        
        if (validRequests.length >= maxRequests) {
            console.log(`⚠️ Rate limit exceeded for user ${userId} (${validRequests.length}/${maxRequests})`);
            return true;
        }
        
        // Add current request
        validRequests.push(now);
        return false;
    }

    // Special rate limiting for callback queries (more strict)
    isCallbackRateLimited(userId, maxCallbacks = 20, windowMs = 60000) {
        const now = Date.now();
        const userKey = userId.toString();
        
        if (!this.userCallbacks.has(userKey)) {
            this.userCallbacks.set(userKey, []);
        }
        
        const callbacks = this.userCallbacks.get(userKey);
        
        // Remove old callbacks outside the window
        const validCallbacks = callbacks.filter(time => now - time < windowMs);
        this.userCallbacks.set(userKey, validCallbacks);
        
        if (validCallbacks.length >= maxCallbacks) {
            console.log(`⚠️ Callback rate limit exceeded for user ${userId} (${validCallbacks.length}/${maxCallbacks})`);
            return true;
        }
        
        // Add current callback
        validCallbacks.push(now);
        return false;
    }

    // Check for rapid duplicate requests (spam protection)
    isDuplicateRequest(userId, requestType, minInterval = 1000) {
        const now = Date.now();
        const key = `${userId}_${requestType}`;
        
        const lastRequest = this.userRequests.get(key + '_last');
        
        if (lastRequest && (now - lastRequest) < minInterval) {
            console.log(`⚠️ Duplicate request blocked for user ${userId}, type: ${requestType}`);
            return true;
        }
        
        this.userRequests.set(key + '_last', now);
        return false;
    }

    // Get user's current rate limit status
    getUserStatus(userId) {
        const userKey = userId.toString();
        const now = Date.now();
        const windowMs = 60000; // 1 minute
        
        const requests = this.userRequests.get(userKey) || [];
        const callbacks = this.userCallbacks.get(userKey) || [];
        
        const recentRequests = requests.filter(time => now - time < windowMs);
        const recentCallbacks = callbacks.filter(time => now - time < windowMs);
        
        return {
            requests: recentRequests.length,
            callbacks: recentCallbacks.length,
            lastActivity: Math.max(
                recentRequests[recentRequests.length - 1] || 0,
                recentCallbacks[recentCallbacks.length - 1] || 0
            )
        };
    }

    // Reset rate limits for a user (admin function)
    resetUserLimits(userId) {
        const userKey = userId.toString();
        this.userRequests.delete(userKey);
        this.userCallbacks.delete(userKey);
        console.log(`🔄 Reset rate limits for user ${userId}`);
    }

    // Cleanup old entries
    cleanup() {
        setInterval(() => {
            const now = Date.now();
            const maxAge = 5 * 60 * 1000; // 5 minutes
            let cleaned = 0;
            
            // Clean up user requests
            for (const [userId, requests] of this.userRequests) {
                if (userId.endsWith('_last')) {
                    // Handle last request timestamps
                    if (now - requests > maxAge) {
                        this.userRequests.delete(userId);
                        cleaned++;
                    }
                } else if (Array.isArray(requests)) {
                    // Handle request arrays
                    const validRequests = requests.filter(time => now - time < maxAge);
                    if (validRequests.length === 0) {
                        this.userRequests.delete(userId);
                        cleaned++;
                    } else {
                        this.userRequests.set(userId, validRequests);
                    }
                }
            }
            
            // Clean up callback requests
            for (const [userId, callbacks] of this.userCallbacks) {
                const validCallbacks = callbacks.filter(time => now - time < maxAge);
                if (validCallbacks.length === 0) {
                    this.userCallbacks.delete(userId);
                    cleaned++;
                } else {
                    this.userCallbacks.set(userId, validCallbacks);
                }
            }
            
            if (cleaned > 0) {
                console.log(`🧹 Rate limiter cleaned up ${cleaned} old entries`);
            }
        }, 2 * 60 * 1000); // Clean every 2 minutes
    }

    // Get overall stats
    getStats() {
        const activeUsers = new Set([
            ...this.userRequests.keys(),
            ...this.userCallbacks.keys()
        ].filter(key => !key.endsWith('_last')));

        return {
            activeUsers: activeUsers.size,
            totalRequestEntries: this.userRequests.size,
            totalCallbackEntries: this.userCallbacks.size,
            memoryUsage: process.memoryUsage()
        };
    }

    // Log current activity (for debugging)
    logActivity() {
        const stats = this.getStats();
        console.log('📊 Rate Limiter Stats:', stats);
        
        // Log top active users
        const userActivity = [];
        for (const userId of [...this.userRequests.keys(), ...this.userCallbacks.keys()]) {
            if (!userId.endsWith('_last')) {
                const status = this.getUserStatus(userId);
                if (status.requests > 0 || status.callbacks > 0) {
                    userActivity.push({ userId, ...status });
                }
            }
        }
        
        if (userActivity.length > 0) {
            userActivity.sort((a, b) => (b.requests + b.callbacks) - (a.requests + a.callbacks));
            console.log('👥 Top Active Users:', userActivity.slice(0, 5));
        }
    }
}

// Create singleton instance
const rateLimiter = new RateLimiter();

// Log activity every 10 minutes in development
if (process.env.NODE_ENV !== 'production') {
    setInterval(() => {
        rateLimiter.logActivity();
    }, 10 * 60 * 1000);
}

module.exports = rateLimiter;