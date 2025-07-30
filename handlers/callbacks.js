// handlers/callbacks.js - Complete version with safe message editing and error recovery
const keyboards = require("../utils/keyboards");
const messageHandler = require("../utils/messageHandler");
const rateLimiter = require("../utils/rateLimiter");
const userService = require("../services/userService");
const paymentService = require("../services/paymentService");
const shopService = require("../services/shopService");
const sharedState = require("../utils/sharedState");

module.exports = (bot) => {
  bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data;
    const username = query.from.username;
    const userId = query.from.id;

    // Rate limiting check
    if (rateLimiter.isCallbackRateLimited(userId, 20, 60000)) {
      await messageHandler.safeAnswerCallback(bot, query.id, "⚠️ Please slow down and try again in a minute");
      return;
    }

    // Prevent duplicate processing of the same callback
    const callbackKey = `${userId}_${data}_${messageId}`;
    if (messageHandler.pendingEdits.has(callbackKey)) {
      console.log(`⏳ Callback already processing: ${callbackKey}`);
      await messageHandler.safeAnswerCallback(bot, query.id);
      return;
    }

    messageHandler.pendingEdits.add(callbackKey);

    try {
      // Answer callback query first to prevent timeout
      await messageHandler.safeAnswerCallback(bot, query.id);

      switch (data) {
        case "main_menu":
          await messageHandler.goToMainMenu(bot, chatId, messageId);
          break;

        case "help_support":
          const supportContact = process.env.SUPPORT_CONTACT || "https://t.me/petergach";
          const channelLink = process.env.CHANNEL_LINK || "https://t.me/channel";

          const helpText = `❓ **Help & Support**\n\n🤖 **Welcome to Dr Fullz!**\n\nOur bot provides secure access to high-quality fullz with cryptocurrency payments.\n\n**Quick Start:**\n• Use /wallet to check your balance\n• Use /deposit to add funds\n• Browse 🛍️ Shop for products\n• Get instant downloads after purchase\n\n**Need Help?**\n• Contact our support team\n• Join our channel for updates\n• Check "How It Works" for details`;

          await messageHandler.safeEditMessage(bot, chatId, messageId, helpText, {
            parse_mode: "Markdown",
            ...keyboards.helpMenu,
          });
          break;

        case "how_it_works":
          const howItWorksText = `📖 **How Dr Fullz Works**\n\n**🔸 Step 1: Add Funds**\n• Click 💳 Deposit to add cryptocurrency\n• Choose from Bitcoin, Ethereum, USDT, etc.\n• Funds are credited automatically\n\n**🔸 Step 2: Browse Products**\n• Visit 🛍️ Shop to see categories\n• Filter by year range and US states\n• See available quantities in real-time\n\n**🔸 Step 3: Purchase & Download**\n• Select quantity and confirm purchase\n• Instant download link provided\n• Files are ready immediately\n\n**🔸 Security & Privacy**\n• All payments use secure crypto networks\n• No personal banking information required\n• Anonymous transactions supported\n\n**🔸 Support Available 24/7**\n• Contact support for any issues\n• Join our channel for announcements\n• Fast response times guaranteed\n\n💡 **Pro Tip:** Check your wallet balance before shopping to ensure sufficient funds!`;

          await messageHandler.safeEditMessage(bot, chatId, messageId, howItWorksText, {
            parse_mode: "Markdown",
            ...keyboards.backToHelp,
          });
          break;

        case "wallet":
          if (!username) {
            await messageHandler.showError(
              bot, chatId, messageId,
              "❌ Please create a Telegram username first!"
            );
            break;
          }

          await messageHandler.showLoading(bot, chatId, messageId, "⏳ Loading wallet...");

          try {
            const walletResult = await userService.getUserWallet(username);

            if (!walletResult.success) {
              await messageHandler.showError(
                bot, chatId, messageId,
                `❌ Unable to get wallet information.\n\nError: ${walletResult.error}`
              );
              break;
            }

            let transactionText = "";
            if (walletResult.transactions && walletResult.transactions.length > 0) {
              transactionText = "\n\n📊 **Recent Transactions:**\n";
              walletResult.transactions.slice(0, 5).forEach((tx, index) => {
                const date = new Date(tx.createdAt).toLocaleDateString();
                const statusEmoji = tx.status === "waiting" ? "⏳" : tx.status === "completed" ? "✅" : "❌";
                transactionText += `${index + 1}. ${statusEmoji} ${tx.priceAmount} ${tx.payCurrency.toUpperCase()} - ${date}\n`;
              });

              if (walletResult.transactions.length > 5) {
                transactionText += `\n... and ${walletResult.transactions.length - 5} more`;
              }
            } else {
              transactionText = "\n\n📊 No transactions yet";
            }

            const walletText = `💰 **Your Wallet**\n\n💵 **Balance:** ${walletResult.balance}${transactionText}`;

            await messageHandler.safeEditMessage(bot, chatId, messageId, walletText, {
              parse_mode: "Markdown",
              ...keyboards.backToMain,
            });
          } catch (error) {
            console.error("Wallet error:", error);
            await messageHandler.showError(
              bot, chatId, messageId,
              "❌ Something went wrong loading your wallet. Please try again."
            );
          }
          break;

        case "shop":
          if (!username) {
            await messageHandler.showError(
              bot, chatId, messageId,
              "❌ Please create a Telegram username first!"
            );
            break;
          }

          await messageHandler.showLoading(bot, chatId, messageId, "⏳ Loading shop categories...");

          try {
            const categoriesResult = await shopService.getCategories();

            if (!categoriesResult.success) {
              await messageHandler.showError(
                bot, chatId, messageId,
                `❌ **Unable to load shop categories**\n\nError: ${categoriesResult.error}`,
                'main_menu'
              );
              break;
            }

            const categoriesKeyboard = keyboards.validateAndFixKeyboard(
              keyboards.createCategoriesKeyboard(categoriesResult.categories),
              "CategoriesKeyboard"
            );

            await messageHandler.safeEditMessage(bot, chatId, messageId,
              "🛍️ **Shop Categories**\n\nSelect a category (base and price):", {
              parse_mode: "Markdown",
              ...categoriesKeyboard,
            });
          } catch (error) {
            console.error("Shop error:", error);
            await messageHandler.showError(
              bot, chatId, messageId,
              "❌ Something went wrong loading the shop. Please try again.",
              'main_menu'
            );
          }
          break;

        case "deposit":
          if (!username) {
            await messageHandler.showError(
              bot, chatId, messageId,
              "❌ Please create a Telegram username first!"
            );
            break;
          }

          await messageHandler.showLoading(bot, chatId, messageId, "⏳ Loading available cryptocurrencies...");

          try {
            const currenciesResult = await paymentService.getCurrencies();

            if (!currenciesResult.success) {
              await messageHandler.showError(
                bot, chatId, messageId,
                `❌ **Unable to load cryptocurrencies**\n\nError: ${currenciesResult.error}`,
                'main_menu'
              );
              break;
            }

            const cryptoKeyboard = keyboards.validateAndFixKeyboard(
              keyboards.createCryptoKeyboard(currenciesResult.currencies),
              "CryptoKeyboard"
            );

            await messageHandler.safeEditMessage(bot, chatId, messageId,
              "💳 **Deposit Funds**\n\nSelect cryptocurrency:", {
              parse_mode: "Markdown",
              ...cryptoKeyboard,
            });
          } catch (error) {
            console.error("Deposit error:", error);
            await messageHandler.showError(
              bot, chatId, messageId,
              "❌ Something went wrong loading deposit options. Please try again.",
              'main_menu'
            );
          }
          break;

        default:
          console.log("Processing callback data:", data);

          if (data.startsWith("crypto_")) {
            const cryptoCode = data.split("_")[1];
            console.log("Crypto selected:", cryptoCode);

            const amountKeyboard = keyboards.validateAndFixKeyboard(
              keyboards.createAmountKeyboard(cryptoCode),
              "AmountKeyboard"
            );

            await messageHandler.safeEditMessage(bot, chatId, messageId,
              `💰 **Deposit with ${cryptoCode.toUpperCase()}**\n\nSelect amount:`, {
              parse_mode: "Markdown",
              ...amountKeyboard,
            });
          } 
          
          else if (data.startsWith("amount_")) {
            const parts = data.split("_");
            const cryptoCode = parts[1];
            const amount = parts[2];

            console.log("Amount selected:", amount, "for crypto:", cryptoCode);

            await processDeposit(
              bot,
              chatId,
              messageId,
              username,
              amount,
              cryptoCode
            );
          }
          
          // Handle category selection
          else if (data.startsWith("category_")) {
            const categoryIndex = parseInt(data.split("_")[1]);
            console.log("Category index selected:", categoryIndex);

            try {
              const categoriesResult = await shopService.getCategories();

              if (!categoriesResult.success || !categoriesResult.categories[categoryIndex]) {
                await messageHandler.safeEditMessage(bot, chatId, messageId,
                  "❌ Category not found. Please try again.", {
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: "🛍️ Back to Shop", callback_data: "shop" }],
                    ],
                  },
                });
                break;
              }

              const selectedCategory = categoriesResult.categories[categoryIndex];
              const baseId = selectedCategory._id;

              console.log("Selected category:", selectedCategory);
              console.log("Base ID:", baseId);

              sharedState.setUserState(userId, {
                step: "selecting_year",
                baseId: baseId,
                categoryIndex: categoryIndex,
              });

              const yearKeyboard = keyboards.createYearRangeKeyboard(baseId);

              await messageHandler.safeEditMessage(bot, chatId, messageId,
                `📅 **Year Range Filter**\n\nSelected: ${selectedCategory.base}\n\nSelect a year range or skip to see all products:`, {
                parse_mode: "Markdown",
                ...yearKeyboard,
              });
            } catch (error) {
              console.error("Category selection error:", error);
              await messageHandler.showError(
                bot, chatId, messageId,
                "❌ Something went wrong. Please try again.",
                'shop'
              );
            }
          }
          
          // Handle year range selection
          else if (data.startsWith("year_range_")) {
            const parts = data.split("_");
            console.log("Year range callback parts:", parts);

            const userState = sharedState.getUserState(userId);
            if (!userState || !userState.baseId) {
              await sendSessionExpiredMessage(bot, chatId, messageId);
              break;
            }

            const baseId = userState.baseId;
            const yearFrom = parts[2];
            const yearTo = parts[3];

            console.log("Year range selected:", yearFrom, "-", yearTo, "for base:", baseId);

            const filters = {
              base: baseId,
              yearFrom: parseInt(yearFrom),
              yearTo: parseInt(yearTo),
            };

            sharedState.setUserState(userId, {
              step: "selecting_state",
              baseId: baseId,
              filters: filters,
            });

            const stateKeyboard = keyboards.createStateFilterKeyboard();

            await messageHandler.safeEditMessage(bot, chatId, messageId,
              `🏛️ **State Filter**\n\nSelect a US state or skip to see all products:`, {
              parse_mode: "Markdown",
              ...stateKeyboard,
            });
          }
          
          // Handle skip year filter
          else if (data === "skip_year") {
            const userState = sharedState.getUserState(userId);
            if (!userState || !userState.baseId) {
              await sendSessionExpiredMessage(bot, chatId, messageId);
              break;
            }

            const baseId = userState.baseId;
            console.log("Skipping year filter for base:", baseId);

            const filters = { base: baseId };

            sharedState.setUserState(userId, {
              step: "selecting_state",
              baseId: baseId,
              filters: filters,
            });

            const stateKeyboard = keyboards.createStateFilterKeyboard();

            await messageHandler.safeEditMessage(bot, chatId, messageId,
              `🏛️ **State Filter**\n\nSelect a US state or skip to see all products:`, {
              parse_mode: "Markdown",
              ...stateKeyboard,
            });
          }
          
          // Handle state selection
          else if (data.startsWith("state_")) {
            const selectedState = data.split("_")[1];
            console.log("State selected:", selectedState);

            const userState = sharedState.getUserState(userId);
            if (!userState || !userState.filters) {
              await sendSessionExpiredMessage(bot, chatId, messageId);
              break;
            }

            const filters = {
              ...userState.filters,
              state: selectedState,
            };

            console.log("Final filters with state:", filters);
            await handleProductSearch(
              bot,
              chatId,
              messageId,
              username,
              filters,
              userId
            );
          }
          
          // Handle skip state filter
          else if (data === "skip_state") {
            console.log("Skipping state filter");

            const userState = sharedState.getUserState(userId);
            if (!userState || !userState.filters) {
              await sendSessionExpiredMessage(bot, chatId, messageId);
              break;
            }

            const filters = userState.filters;
            console.log("Final filters without state:", filters);
            await handleProductSearch(
              bot,
              chatId,
              messageId,
              username,
              filters,
              userId
            );
          }
          
          // Handle checkout confirmation
          else if (data.startsWith("confirm_checkout_") || data.startsWith("checkout_")) {
            let quantity;

            if (data.startsWith("confirm_checkout_")) {
              const parts = data.split("_");
              quantity = parseInt(parts[2]);
            } else if (data.startsWith("checkout_")) {
              const parts = data.split("_");
              quantity = parseInt(parts[1]);
            }

            console.log("Checkout confirmation received for quantity:", quantity);

            const userState = sharedState.getUserState(userId);
            if (!userState || !userState.filters) {
              await sendSessionExpiredMessage(bot, chatId, messageId);
              break;
            }

            const filters = userState.filters;
            console.log("Checkout confirmed:", quantity, filters);

            await handleCheckout(
              bot,
              chatId,
              messageId,
              username,
              filters,
              quantity,
              userId
            );
          } 
          
          else {
            console.log("Unknown callback data:", data);
            await messageHandler.safeAnswerCallback(bot, query.id, "Feature coming soon!");
          }
      }

    } catch (error) {
      console.error("Callback error:", error);
      
      // Try to show error message, fallback to main menu
      try {
        await messageHandler.showError(
          bot, chatId, messageId,
          "❌ Something went wrong. Please try again."
        );
      } catch (fallbackError) {
        console.error("Fallback error:", fallbackError);
        // Last resort - send new message
        try {
          await messageHandler.safeSendMessage(bot, chatId, 
            "❌ Something went wrong. Please use /start to restart.", {
            ...keyboards.mainMenu
          });
        } catch (finalError) {
          console.error("Final fallback failed:", finalError);
        }
      }
    } finally {
      // Always remove from pending, even if error occurred
      messageHandler.pendingEdits.delete(callbackKey);
    }
  });

  // Helper function to send session expired message
  async function sendSessionExpiredMessage(bot, chatId, messageId) {
    await messageHandler.safeEditMessage(bot, chatId, messageId,
      "❌ Session expired. Please start again.", {
      reply_markup: {
        inline_keyboard: [[{ text: "🛍️ Back to Shop", callback_data: "shop" }]],
      },
    });
  }

  // Helper function to handle product search
  async function handleProductSearch(bot, chatId, messageId, username, filters, userId) {
    try {
      await messageHandler.showLoading(bot, chatId, messageId, "⏳ Searching for products...");

      const productsResult = await shopService.getProducts(username, filters);

      if (!productsResult.success) {
        await messageHandler.safeEditMessage(bot, chatId, messageId,
          `❌ **Unable to get products**\n\nError: ${productsResult.error}`, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🛍️ Back to Shop", callback_data: "shop" }],
            ],
          },
        });
        return;
      }

      if (productsResult.availableQuantity === 0) {
        await messageHandler.safeEditMessage(bot, chatId, messageId,
          `📭 **No Products Available**\n\nNo products found with your current filters.`, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔄 Try Different Category", callback_data: "shop" }],
              [{ text: "🏠 Main Menu", callback_data: "main_menu" }],
            ],
          },
        });
        return;
      }

      sharedState.setUserState(userId, {
        step: "entering_quantity",
        filters: filters,
        availableQuantity: productsResult.availableQuantity,
      });

      const quantityKeyboard = keyboards.createQuantityKeyboard(
        productsResult.availableQuantity,
        filters
      );

      await messageHandler.safeEditMessage(bot, chatId, messageId,
        `📦 **Products Found**\n\n**Available Quantity:** ${productsResult.availableQuantity}\n\nPlease type the quantity you want to purchase (1-${productsResult.availableQuantity}):`, {
        parse_mode: "Markdown",
        ...quantityKeyboard,
      });
    } catch (error) {
      console.error("Product search error:", error);
      await messageHandler.safeEditMessage(bot, chatId, messageId,
        "❌ Something went wrong. Please try again.", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🛍️ Back to Shop", callback_data: "shop" }],
          ],
        },
      });
    }
  }

  // SIMPLIFIED checkout handler
  async function handleCheckout(bot, chatId, messageId, username, filters, quantity, userId) {
    try {
      await messageHandler.showLoading(bot, chatId, messageId, "⏳ Processing your order...");

      const checkoutResult = await shopService.checkout(username, filters, quantity);

      if (!checkoutResult.success) {
        await messageHandler.safeEditMessage(bot, chatId, messageId,
          `❌ **Purchase Failed**\n\nError: ${checkoutResult.error}`, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "💰 Check Wallet", callback_data: "wallet" }],
              [{ text: "🛍️ Back to Shop", callback_data: "shop" }],
              [{ text: "🏠 Main Menu", callback_data: "main_menu" }],
            ],
          },
        });
        return;
      }

      // Clear user state since we're done
      sharedState.clearUserState(userId);

      // Format file size for display
      const fileSizeText = checkoutResult.fileSize
        ? ` (${(checkoutResult.fileSize / 1024).toFixed(2)} KB)`
        : "";

      // Send success message with download link
      const successMessage = `✅ **Purchase Successful!**\n\n${checkoutResult.message}\n\n📄 **File:** ${checkoutResult.fileName}${fileSizeText}\n\n🔗 **[Click here to download your file](${checkoutResult.downloadUrl})**\n\n💡 *Click the download link above to get your file*\n\n💡 *Ensure to copy the content of the text file opened and save in your computer!*`;

      await messageHandler.safeEditMessage(bot, chatId, messageId, successMessage, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "💰 Check Wallet", callback_data: "wallet" }],
            [{ text: "🛍️ Shop Again", callback_data: "shop" }],
            [{ text: "🏠 Main Menu", callback_data: "main_menu" }],
          ],
        },
        disable_web_page_preview: true,
      });
    } catch (error) {
      console.error("Checkout error:", error);
      await messageHandler.safeEditMessage(bot, chatId, messageId,
        "❌ Something went wrong during checkout. Please try again.", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🛍️ Back to Shop", callback_data: "shop" }],
          ],
        },
      });
    }
  }

  async function processDeposit(bot, chatId, messageId, username, amount, cryptoCode) {
    try {
      await messageHandler.showLoading(bot, chatId, messageId, "⏳ Creating deposit...");

      const depositResult = await paymentService.createDeposit(
        amount,
        cryptoCode,
        username,
        `Deposit via Telegram Bot - $${amount}`
      );

      if (!depositResult.success) {
        await messageHandler.safeEditMessage(bot, chatId, messageId,
          `❌ **Deposit Failed**\n\nError: ${depositResult.error}`, {
          parse_mode: "Markdown",
          ...keyboards.backToMain,
        });
        return;
      }

      const paymentText =
        `💰 **Deposit Created Successfully**\n\n` +
        `**USD Amount:** $${depositResult.paymentData.price_amount}\n` +
        `**Cryptocurrency:** ${depositResult.paymentData.pay_currency.toUpperCase()}\n` +
        `**Network:** ${depositResult.paymentData.network.toUpperCase()}\n` +
        `**Status:** ${depositResult.status}\n` +
        `**Order ID:** ${depositResult.paymentData.order_id}\n` +
        `**Transaction ID:** ${depositResult.transactionId}\n\n` +
        `📍 **Payment Address:**\n\`${depositResult.paymentData.pay_address}\`\n\n` +
        `💎 **Amount to Send:**\n\`${depositResult.paymentData.pay_amount} ${depositResult.paymentData.pay_currency.toUpperCase()}\`\n\n` +
        `⚠️ **Important:**\n• Send exactly **${depositResult.paymentData.pay_amount} ${depositResult.paymentData.pay_currency.toUpperCase()}** to the address above\n• Your deposit will be credited automatically once confirmed\n• Do not send from an exchange, use a personal wallet`;

      await messageHandler.safeEditMessage(bot, chatId, messageId, paymentText, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "💰 Check Wallet", callback_data: "wallet" }],
            [{ text: "🏠 Main Menu", callback_data: "main_menu" }],
          ],
        },
      });
    } catch (error) {
      console.error("Process deposit error:", error);
      await messageHandler.safeEditMessage(bot, chatId, messageId,
        "❌ Something went wrong. Please try again.", {
        ...keyboards.backToMain,
      });
    }
  }
};