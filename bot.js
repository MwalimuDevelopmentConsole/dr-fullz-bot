// bot.js - Enhanced structured version with safe error handling
require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

// Simple config check
if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN missing in .env file!");
  process.exit(1);
}

console.log("🚀 Starting Fullducks Bot...");

// Initialize bot with enhanced polling options
const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: {
    interval: 300, // Check for updates every 300ms
    autoStart: true, // Start polling automatically
    params: {
      timeout: 10, // Long polling timeout
    },
  },
});

// Global bot error handlers
bot.on("polling_error", (error) => {
  console.error("❌ Polling error:", error.message);

  // Don't crash on common polling errors
  if (
    error.message.includes("ETELEGRAM") ||
    error.message.includes("ECONNRESET") ||
    error.message.includes("timeout")
  ) {
    console.log("⚠️ Network error, continuing...");
    return;
  }

  // Auto-restart polling after critical errors
  console.log("🔄 Restarting polling in 5 seconds...");
  setTimeout(() => {
    try {
      console.log("🔄 Attempting to restart polling...");
      bot.startPolling();
    } catch (restartError) {
      console.error("❌ Failed to restart polling:", restartError.message);
    }
  }, 5000);
});

bot.on("error", (error) => {
  console.error("❌ Bot error:", error.message);

  // Log error but don't crash
  if (!error.message.includes("ETELEGRAM")) {
    console.error("Stack trace:", error.stack);
  }
});

// Enhanced request handling with timeout
const originalRequest = bot._request;
bot._request = function (path, options) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error("Request timeout after 30 seconds")),
      30000,
    );
  });

  return Promise.race([
    originalRequest.call(this, path, options),
    timeoutPromise,
  ]).catch((error) => {
    console.error(`❌ Request failed for ${path}:`, error.message);
    throw error;
  });
};

// Test bot connection
bot
  .getMe()
  .then((botInfo) => {
    console.log("✅ Bot connected successfully!");
    console.log(`🤖 Bot Name: ${botInfo.first_name}`);
    console.log(`👤 Username: @${botInfo.username}`);
    console.log(`🆔 Bot ID: ${botInfo.id}`);
  })
  .catch((error) => {
    console.error("❌ Failed to connect to Telegram:", error.message);
    process.exit(1);
  });

// Import handlers (enhanced versions)
try {
  console.log("📦 Loading command handlers...");
  require("./handlers/commands")(bot);

  console.log("📦 Loading message handlers...");
  require("./handlers/messages")(bot);

  console.log("📦 Loading callback handlers...");
  require("./handlers/callbacks")(bot);

  console.log("✅ All handlers loaded successfully!");
} catch (error) {
  console.error("❌ Failed to load handlers:", error.message);
  process.exit(1);
}

// Graceful shutdown handling
function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);

  try {
    // Stop polling
    console.log("⏹️ Stopping bot polling...");
    bot.stopPolling();

    // Clean up resources
    console.log("🧹 Cleaning up resources...");
    const messageHandler = require("./utils/messageHandler");
    const sharedState = require("./utils/sharedState");

    messageHandler.cleanupPendingEdits();
    sharedState.clearAllStates();

    console.log("✅ Cleanup completed");
    console.log("👋 Bot shutdown complete");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error.message);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on("SIGINT", () => gracefulShutdown("SIGINT")); // Ctrl+C
process.on("SIGTERM", () => gracefulShutdown("SIGTERM")); // Kill command
process.on("SIGQUIT", () => gracefulShutdown("SIGQUIT")); // Quit signal

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught exception:", error.message);
  console.error("Stack trace:", error.stack);

  // Don't exit immediately, log and continue
  console.log("⚠️ Bot continuing despite uncaught exception...");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled rejection at:", promise);
  console.error("Reason:", reason);

  // Don't exit immediately, log and continue
  console.log("⚠️ Bot continuing despite unhandled rejection...");
});

// Periodic health check and cleanup (every 10 minutes)
setInterval(
  () => {
    try {
      const messageHandler = require("./utils/messageHandler");
      const sharedState = require("./utils/sharedState");
      const rateLimiter = require("./utils/rateLimiter");

      // Get stats
      const stats = sharedState.getStats();
      const debugInfo = messageHandler.getDebugInfo();

      console.log("💓 Health Check:", {
        activeUsers: stats.totalStates,
        pendingEdits: debugInfo.pendingEdits,
        memoryUsage: `${Math.round(stats.memoryUsage.heapUsed / 1024 / 1024)}MB`,
        uptime: `${Math.round(process.uptime() / 60)}min`,
      });

      // Cleanup old data
      messageHandler.cleanupPendingEdits();
      sharedState.cleanupExpiredStates();
    } catch (error) {
      console.error("❌ Health check error:", error.message);
    }
  },
  10 * 60 * 1000,
); // Every 10 minutes

// Log startup completion
console.log("🎉 Fullducks Bot is fully operational!");
console.log("📱 Send /start to get started");
console.log("❓ Send /help for assistance");
console.log("💰 Send /wallet to check balance");
console.log("💳 Send /deposit to add funds");

// Export bot for testing purposes
module.exports = bot;
