// utils/sharedState.js - Enhanced shared state for user sessions with automatic cleanup
const userStates = {};
const stateTimestamps = {};
const STATE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

function setUserState(userId, state) {
  try {
    if (!userId) {
      console.error("setUserState: userId is required");
      return false;
    }

    userStates[userId] = state;
    stateTimestamps[userId] = Date.now();
    
    console.log(`✅ Set user state for ${userId}:`, state);
    console.log(`📊 Total active states: ${Object.keys(userStates).length}`);
    return true;
  } catch (error) {
    console.error("Error in setUserState:", error);
    return false;
  }
}

function getUserState(userId) {
  try {
    if (!userId) {
      console.error("getUserState: userId is required");
      return null;
    }

    // Check if state is expired
    const timestamp = stateTimestamps[userId];
    if (timestamp && (Date.now() - timestamp) > STATE_TIMEOUT) {
      console.log(`⏰ State expired for user ${userId}, clearing...`);
      clearUserState(userId);
      return null;
    }

    const state = userStates[userId];
    console.log(`🔍 Get user state for ${userId}:`, state);
    return state || null;
  } catch (error) {
    console.error("Error in getUserState:", error);
    return null;
  }
}

function clearUserState(userId) {
  try {
    if (!userId) {
      console.error("clearUserState: userId is required");
      return false;
    }

    delete userStates[userId];
    delete stateTimestamps[userId];
    console.log(`🗑️ Cleared user state for ${userId}`);
    console.log(`📊 Remaining states: ${Object.keys(userStates).length}`);
    return true;
  } catch (error) {
    console.error("Error in clearUserState:", error);
    return false;
  }
}

function getAllStates() {
  try {
    console.log("📋 Getting all states:", userStates);
    return userStates;
  } catch (error) {
    console.error("Error in getAllStates:", error);
    return {};
  }
}

// Update existing state with new data
function updateUserState(userId, updates) {
  try {
    if (!userId) {
      console.error("updateUserState: userId is required");
      return false;
    }

    const currentState = getUserState(userId) || {};
    const newState = { ...currentState, ...updates };
    return setUserState(userId, newState);
  } catch (error) {
    console.error("Error in updateUserState:", error);
    return false;
  }
}

// Check if user has active state
function hasUserState(userId) {
  try {
    if (!userId) return false;
    
    // Check if exists and not expired
    const state = getUserState(userId);
    return state !== null;
  } catch (error) {
    console.error("Error in hasUserState:", error);
    return false;
  }
}

// Get number of active users
function getActiveUserCount() {
  try {
    return Object.keys(userStates).length;
  } catch (error) {
    console.error("Error in getActiveUserCount:", error);
    return 0;
  }
}

// Get state age in minutes
function getStateAge(userId) {
  try {
    const timestamp = stateTimestamps[userId];
    if (!timestamp) return null;
    
    return Math.round((Date.now() - timestamp) / (1000 * 60));
  } catch (error) {
    console.error("Error in getStateAge:", error);
    return null;
  }
}

// Clean up expired states
function cleanupExpiredStates() {
  const now = Date.now();
  let cleaned = 0;
  
  try {
    for (const [userId, timestamp] of Object.entries(stateTimestamps)) {
      if ((now - timestamp) > STATE_TIMEOUT) {
        clearUserState(userId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired user states`);
    }
    
    return cleaned;
  } catch (error) {
    console.error("Error in cleanupExpiredStates:", error);
    return 0;
  }
}

// Force cleanup all states (admin function)
function clearAllStates() {
  try {
    const count = Object.keys(userStates).length;
    Object.keys(userStates).forEach(userId => clearUserState(userId));
    console.log(`🗑️ Cleared all ${count} user states`);
    return count;
  } catch (error) {
    console.error("Error in clearAllStates:", error);
    return 0;
  }
}

// Get detailed statistics
function getStats() {
  try {
    const now = Date.now();
    const ages = Object.values(stateTimestamps).map(timestamp => 
      Math.round((now - timestamp) / (1000 * 60))
    );
    
    return {
      totalStates: Object.keys(userStates).length,
      averageAge: ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0,
      oldestAge: ages.length > 0 ? Math.max(...ages) : 0,
      newestAge: ages.length > 0 ? Math.min(...ages) : 0,
      memoryUsage: process.memoryUsage(),
      stateDetails: Object.keys(userStates).map(userId => ({
        userId,
        step: userStates[userId]?.step,
        age: getStateAge(userId)
      }))
    };
  } catch (error) {
    console.error("Error in getStats:", error);
    return { error: error.message };
  }
}

// Debug function to check module health
function debugModule() {
  console.log("🔧 SharedState Module Debug Info:");
  console.log("- Module loaded successfully");
  console.log("- Stats:", getStats());
  console.log("- Available functions:", Object.keys(module.exports));
}

// Auto cleanup every 10 minutes
const cleanupInterval = setInterval(cleanupExpiredStates, 10 * 60 * 1000);

// Log stats every 15 minutes in development
if (process.env.NODE_ENV !== 'production') {
  setInterval(() => {
    const stats = getStats();
    if (stats.totalStates > 0) {
      console.log('📊 SharedState Stats:', {
        totalStates: stats.totalStates,
        averageAge: stats.averageAge,
        oldestAge: stats.oldestAge
      });
    }
  }, 15 * 60 * 1000);
}

// Graceful cleanup on exit
process.on('SIGINT', () => {
  console.log('🛑 Cleaning up shared states before exit...');
  clearInterval(cleanupInterval);
  clearAllStates();
});

process.on('SIGTERM', () => {
  console.log('🛑 Cleaning up shared states before exit...');
  clearInterval(cleanupInterval);
  clearAllStates();
});

// Test the module on load
console.log("📦 SharedState module loaded successfully");
console.log("🧪 Testing basic functionality...");

// Test basic functionality
const testUserId = "test_123";
console.log("Testing setUserState...");
setUserState(testUserId, { test: true });
console.log("Testing getUserState...");
const testState = getUserState(testUserId);
console.log("Test result:", testState);
console.log("Testing clearUserState...");
clearUserState(testUserId);
console.log("✅ SharedState module tests passed");

module.exports = {
  setUserState,
  getUserState,
  clearUserState,
  getAllStates,
  updateUserState,
  hasUserState,
  getActiveUserCount,
  getStateAge,
  cleanupExpiredStates,
  clearAllStates,
  getStats,
  debugModule,
};

// Log the exported functions for debugging
console.log("📤 Exported functions:", Object.keys(module.exports));