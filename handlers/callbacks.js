// handlers/callbacks.js - Complete version with Help & Support system
const keyboards = require("../utils/keyboards");
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

    try {
      switch (data) {
        case "main_menu":
          await bot.editMessageText(
            "🏠 Main Menu\n\nWhat would you like to do?",
            {
              chat_id: chatId,
              message_id: messageId,
              ...keyboards.mainMenu,
            }
          );
          break;

        case "help_support":
          const supportContact =
            process.env.SUPPORT_CONTACT || "https://t.me/petergach";
          const channelLink =
            process.env.CHANNEL_LINK || "https://t.me/channel";

          const helpText = `❓ **Help & Support**\n\n🤖 **Welcome to Dr Fullz!**\n\nOur bot provides secure access to high-quality fullz with cryptocurrency payments.\n\n**Quick Start:**\n• Use /wallet to check your balance\n• Use /deposit to add funds\n• Browse 🛍️ Shop for products\n• Get instant downloads after purchase\n\n**Need Help?**\n• Contact our support team\n• Join our channel for updates\n• Check "How It Works" for details`;

          await bot.editMessageText(helpText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "Markdown",
            ...keyboards.helpMenu,
          });
          break;

        case "how_it_works":
          const howItWorksText = `📖 **How Dr Fullz Works**\n\n**🔸 Step 1: Add Funds**\n• Click 💳 Deposit to add cryptocurrency\n• Choose from Bitcoin, Ethereum, USDT, etc.\n• Funds are credited automatically\n\n**🔸 Step 2: Browse Products**\n• Visit 🛍️ Shop to see categories\n• Filter by year range and US states\n• See available quantities in real-time\n\n**🔸 Step 3: Purchase & Download**\n• Select quantity and confirm purchase\n• Instant download link provided\n• Files are ready immediately\n\n**🔸 Security & Privacy**\n• All payments use secure crypto networks\n• No personal banking information required\n• Anonymous transactions supported\n\n**🔸 Support Available 24/7**\n• Contact support for any issues\n• Join our channel for announcements\n• Fast response times guaranteed\n\n💡 **Pro Tip:** Check your wallet balance before shopping to ensure sufficient funds!`;

          await bot.editMessageText(howItWorksText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "Markdown",
            ...keyboards.backToHelp,
          });
          break;

        case "wallet":
          if (!username) {
            await bot.editMessageText(
              "❌ Please create a Telegram username first!",
              {
                chat_id: chatId,
                message_id: messageId,
                ...keyboards.backToMain,
              }
            );
            break;
          }

          const walletResult = await userService.getUserWallet(username);

          if (!walletResult.success) {
            await bot.editMessageText(
              `❌ Unable to get wallet information.\n\nError: ${walletResult.error}`,
              {
                chat_id: chatId,
                message_id: messageId,
                ...keyboards.backToMain,
              }
            );
            break;
          }

          let transactionText = "";
          if (
            walletResult.transactions &&
            walletResult.transactions.length > 0
          ) {
            transactionText = "\n\n📊 **Recent Transactions:**\n";
            walletResult.transactions.slice(0, 5).forEach((tx, index) => {
              const date = new Date(tx.createdAt).toLocaleDateString();
              const statusEmoji =
                tx.status === "waiting"
                  ? "⏳"
                  : tx.status === "completed"
                  ? "✅"
                  : "❌";
              transactionText += `${index + 1}. ${statusEmoji} ${
                tx.priceAmount
              } ${tx.payCurrency.toUpperCase()} - ${date}\n`;
            });

            if (walletResult.transactions.length > 5) {
              transactionText += `\n... and ${
                walletResult.transactions.length - 5
              } more`;
            }
          } else {
            transactionText = "\n\n📊 No transactions yet";
          }

          const walletText = `💰 **Your Wallet**\n\n💵 **Balance:** ${walletResult.balance}${transactionText}`;

          await bot.editMessageText(walletText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "Markdown",
            ...keyboards.backToMain,
          });
          break;

        case "shop":
          if (!username) {
            await bot.editMessageText(
              "❌ Please create a Telegram username first!",
              {
                chat_id: chatId,
                message_id: messageId,
                ...keyboards.backToMain,
              }
            );
            break;
          }

          await bot.editMessageText("⏳ Loading shop categories...", {
            chat_id: chatId,
            message_id: messageId,
          });

          const categoriesResult = await shopService.getCategories();

          if (!categoriesResult.success) {
            await bot.editMessageText(
              `❌ **Unable to load shop categories**\n\nError: ${categoriesResult.error}`,
              {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: "Markdown",
                ...keyboards.backToMain,
              }
            );
            break;
          }

          const categoriesKeyboard = keyboards.validateAndFixKeyboard(
            keyboards.createCategoriesKeyboard(categoriesResult.categories),
            "CategoriesKeyboard"
          );

          await bot.editMessageText(
            "🛍️ **Shop Categories**\n\nSelect a category (base and price):",
            {
              chat_id: chatId,
              message_id: messageId,
              parse_mode: "Markdown",
              ...categoriesKeyboard,
            }
          );
          break;

        case "deposit":
          if (!username) {
            await bot.editMessageText(
              "❌ Please create a Telegram username first!",
              {
                chat_id: chatId,
                message_id: messageId,
                ...keyboards.backToMain,
              }
            );
            break;
          }

          await bot.editMessageText(
            "⏳ Loading available cryptocurrencies...",
            {
              chat_id: chatId,
              message_id: messageId,
            }
          );

          const currenciesResult = await paymentService.getCurrencies();

          if (!currenciesResult.success) {
            await bot.editMessageText(
              `❌ **Unable to load cryptocurrencies**\n\nError: ${currenciesResult.error}`,
              {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: "Markdown",
                ...keyboards.backToMain,
              }
            );
            break;
          }

          const cryptoKeyboard = keyboards.validateAndFixKeyboard(
            keyboards.createCryptoKeyboard(currenciesResult.currencies),
            "CryptoKeyboard"
          );

          await bot.editMessageText(
            "💳 **Deposit Funds**\n\nSelect cryptocurrency:",
            {
              chat_id: chatId,
              message_id: messageId,
              parse_mode: "Markdown",
              ...cryptoKeyboard,
            }
          );
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

            await bot.editMessageText(
              `💰 **Deposit with ${cryptoCode.toUpperCase()}**\n\nSelect amount:`,
              {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: "Markdown",
                ...amountKeyboard,
              }
            );
          } else if (data.startsWith("amount_")) {
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

            const categoriesResult = await shopService.getCategories();

            if (
              !categoriesResult.success ||
              !categoriesResult.categories[categoryIndex]
            ) {
              await bot.editMessageText(
                "❌ Category not found. Please try again.",
                {
                  chat_id: chatId,
                  message_id: messageId,
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: "🛍️ Back to Shop", callback_data: "shop" }],
                    ],
                  },
                }
              );
              break;
            }

            const selectedCategory = categoriesResult.categories[categoryIndex];
            const baseId = selectedCategory._id;

            console.log("Selected category:", selectedCategory);
            console.log("Base ID:", baseId);

            sharedState.setUserState(query.from.id, {
              step: "selecting_year",
              baseId: baseId,
              categoryIndex: categoryIndex,
            });

            const yearKeyboard = keyboards.createYearRangeKeyboard(baseId);

            await bot.editMessageText(
              `📅 **Year Range Filter**\n\nSelected: ${selectedCategory.base}\n\nSelect a year range or skip to see all products:`,
              {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: "Markdown",
                ...yearKeyboard,
              }
            );
          }
          // Handle year range selection
          else if (data.startsWith("year_range_")) {
            const parts = data.split("_");
            console.log("Year range callback parts:", parts);

            const userState = sharedState.getUserState(query.from.id);
            if (!userState || !userState.baseId) {
              await sendSessionExpiredMessage(bot, chatId, messageId);
              break;
            }

            const baseId = userState.baseId;
            const yearFrom = parts[2];
            const yearTo = parts[3];

            console.log(
              "Year range selected:",
              yearFrom,
              "-",
              yearTo,
              "for base:",
              baseId
            );

            const filters = {
              base: baseId,
              yearFrom: parseInt(yearFrom),
              yearTo: parseInt(yearTo),
            };

            sharedState.setUserState(query.from.id, {
              step: "selecting_state",
              baseId: baseId,
              filters: filters,
            });

            const stateKeyboard = keyboards.createStateFilterKeyboard();

            await bot.editMessageText(
              `🏛️ **State Filter**\n\nSelect a US state or skip to see all products:`,
              {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: "Markdown",
                ...stateKeyboard,
              }
            );
          }
          // Handle skip year filter
          else if (data === "skip_year") {
            const userState = sharedState.getUserState(query.from.id);
            if (!userState || !userState.baseId) {
              await sendSessionExpiredMessage(bot, chatId, messageId);
              break;
            }

            const baseId = userState.baseId;

            console.log("Skipping year filter for base:", baseId);

            const filters = {
              base: baseId,
            };

            sharedState.setUserState(query.from.id, {
              step: "selecting_state",
              baseId: baseId,
              filters: filters,
            });

            const stateKeyboard = keyboards.createStateFilterKeyboard();

            await bot.editMessageText(
              `🏛️ **State Filter**\n\nSelect a US state or skip to see all products:`,
              {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: "Markdown",
                ...stateKeyboard,
              }
            );
          }
          // Handle state selection
          else if (data.startsWith("state_")) {
            const selectedState = data.split("_")[1];
            console.log("State selected:", selectedState);

            const userState = sharedState.getUserState(query.from.id);
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
              query.from.id
            );
          }
          // Handle skip state filter
          else if (data === "skip_state") {
            console.log("Skipping state filter");

            const userState = sharedState.getUserState(query.from.id);
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
              query.from.id
            );
          }
          // Handle checkout confirmation
          else if (
            data.startsWith("confirm_checkout_") ||
            data.startsWith("checkout_")
          ) {
            let quantity;

            if (data.startsWith("confirm_checkout_")) {
              const parts = data.split("_");
              quantity = parseInt(parts[2]);
            } else if (data.startsWith("checkout_")) {
              const parts = data.split("_");
              quantity = parseInt(parts[1]);
            }

            console.log(
              "Checkout confirmation received for quantity:",
              quantity
            );

            const userState = sharedState.getUserState(query.from.id);
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
              query.from.id
            );
          } else {
            console.log("Unknown callback data:", data);
            await bot.answerCallbackQuery(query.id, "Feature coming soon!");
          }
      }

      await bot.answerCallbackQuery(query.id);
    } catch (error) {
      console.error("Callback error:", error);
      await bot.answerCallbackQuery(query.id, "Error occurred");

      await bot.editMessageText("❌ Something went wrong. Please try again.", {
        chat_id: chatId,
        message_id: messageId,
        ...keyboards.mainMenu,
      });
    }
  });

  // Helper function to send session expired message
  async function sendSessionExpiredMessage(bot, chatId, messageId) {
    await bot.editMessageText("❌ Session expired. Please start again.", {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: [[{ text: "🛍️ Back to Shop", callback_data: "shop" }]],
      },
    });
  }

  // Helper function to handle product search
  async function handleProductSearch(
    bot,
    chatId,
    messageId,
    username,
    filters,
    userId
  ) {
    try {
      await bot.editMessageText("⏳ Searching for products...", {
        chat_id: chatId,
        message_id: messageId,
      });

      const productsResult = await shopService.getProducts(username, filters);

      if (!productsResult.success) {
        await bot.editMessageText(
          `❌ **Unable to get products**\n\nError: ${productsResult.error}`,
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🛍️ Back to Shop", callback_data: "shop" }],
              ],
            },
          }
        );
        return;
      }

      if (productsResult.availableQuantity === 0) {
        await bot.editMessageText(
          `📭 **No Products Available**\n\nNo products found with your current filters.`,
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔄 Try Different Category", callback_data: "shop" }],
                [{ text: "🏠 Main Menu", callback_data: "main_menu" }],
              ],
            },
          }
        );
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

      await bot.editMessageText(
        `📦 **Products Found**\n\n**Available Quantity:** ${productsResult.availableQuantity}\n\nPlease type the quantity you want to purchase (1-${productsResult.availableQuantity}):`,
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          ...quantityKeyboard,
        }
      );
    } catch (error) {
      console.error("Product search error:", error);
      await bot.editMessageText("❌ Something went wrong. Please try again.", {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [{ text: "🛍️ Back to Shop", callback_data: "shop" }],
          ],
        },
      });
    }
  }

  // SIMPLIFIED checkout handler - just returns download link
  async function handleCheckout(
    bot,
    chatId,
    messageId,
    username,
    filters,
    quantity,
    userId
  ) {
    try {
      await bot.editMessageText("⏳ Processing your order...", {
        chat_id: chatId,
        message_id: messageId,
      });

      const checkoutResult = await shopService.checkout(
        username,
        filters,
        quantity
      );

      if (!checkoutResult.success) {
        await bot.editMessageText(
          `❌ **Purchase Failed**\n\nError: ${checkoutResult.error}`,
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "💰 Check Wallet", callback_data: "wallet" }],
                [{ text: "🛍️ Back to Shop", callback_data: "shop" }],
                [{ text: "🏠 Main Menu", callback_data: "main_menu" }],
              ],
            },
          }
        );
        return;
      }

      // Clear user state since we're done
      sharedState.clearUserState(userId);

      // Format file size for display
      const fileSizeText = checkoutResult.fileSize
        ? ` (${(checkoutResult.fileSize / 1024).toFixed(2)} KB)`
        : "";

      // Send success message with download link - NO FILE CONVERSION
      const successMessage = `✅ **Purchase Successful!**\n\n${checkoutResult.message}\n\n📄 **File:** ${checkoutResult.fileName}${fileSizeText}\n\n🔗 **[Click here to download your file](${checkoutResult.downloadUrl})**\n\n💡 *Click the download link above to get your file***\n\n💡 *Enure to copy the content of the text file opened and save in your computer!*`;

      await bot.editMessageText(successMessage, {
        chat_id: chatId,
        message_id: messageId,
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
      await bot.editMessageText(
        "❌ Something went wrong during checkout. Please try again.",
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [
              [{ text: "🛍️ Back to Shop", callback_data: "shop" }],
            ],
          },
        }
      );
    }
  }

  async function processDeposit(
    bot,
    chatId,
    messageId,
    username,
    amount,
    cryptoCode
  ) {
    try {
      await bot.editMessageText("⏳ Creating deposit...", {
        chat_id: chatId,
        message_id: messageId,
      });

      const depositResult = await paymentService.createDeposit(
        amount,
        cryptoCode,
        username,
        `Deposit via Telegram Bot - $${amount}`
      );

      if (!depositResult.success) {
        await bot.editMessageText(
          `❌ **Deposit Failed**\n\nError: ${depositResult.error}`,
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "Markdown",
            ...keyboards.backToMain,
          }
        );
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
        `💎 **Amount to Send:**\n\`${
          depositResult.paymentData.pay_amount
        } ${depositResult.paymentData.pay_currency.toUpperCase()}\`\n\n` +
        ` ${depositResult.paymentData.pay_currency.toUpperCase()}\n\n` +
        `⚠️ **Important:**\n• Send exactly **${
          depositResult.paymentData.pay_amount
        } ${depositResult.paymentData.pay_currency.toUpperCase()}** to the address above\n• Your deposit will be credited automatically once confirmed\n• Do not send from an exchange, use a personal wallet`;

      await bot.editMessageText(paymentText, {
        chat_id: chatId,
        message_id: messageId,
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
      await bot.editMessageText("❌ Something went wrong. Please try again.", {
        chat_id: chatId,
        message_id: messageId,
        ...keyboards.backToMain,
      });
    }
  }
};
