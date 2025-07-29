// utils/sharedState.js - Improved shared state for user sessions with better error handling
const userStates = {};

function setUserState(userId, state) {
  try {
    if (!userId) {
      console.error("setUserState: userId is required");
      return false;
    }

    userStates[userId] = state;
    console.log(`✅ Set user state for ${userId}:`, state);
    console.log("📊 All user states:", Object.keys(userStates));
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
    console.log(`🗑️ Cleared user state for ${userId}`);
    console.log("📊 Remaining states:", Object.keys(userStates));
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

// Additional utility functions for better debugging
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

function hasUserState(userId) {
  try {
    return userId && userStates.hasOwnProperty(userId);
  } catch (error) {
    console.error("Error in hasUserState:", error);
    return false;
  }
}

function getActiveUserCount() {
  try {
    return Object.keys(userStates).length;
  } catch (error) {
    console.error("Error in getActiveUserCount:", error);
    return 0;
  }
}

// Debug function to check module health
function debugModule() {
  console.log("🔧 SharedState Module Debug Info:");
  console.log("- Module loaded successfully");
  console.log("- Active users:", getActiveUserCount());
  console.log("- All states:", userStates);
  console.log("- Available functions:", Object.keys(module.exports));
}

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
  debugModule,
};

// Log the exported functions for debugging
console.log("📤 Exported functions:", Object.keys(module.exports));
