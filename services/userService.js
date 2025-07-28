// services/userService.js
const axios = require('axios');
const API_BASE_URL = process.env.API_BASE_URL;

// POST users/get-user - Send username in body, expect user object back
async function getUser(username) {
    try {
        const response = await axios({
            method: 'POST',
            url: `${API_BASE_URL}/users/bot-user`,
            data: { username },
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
            
            

        return {
            success: true,
            user: response.data.user
        };

    } catch (error) {
        console.error('UserService - getUser error:', error.response?.data || error.message);
        
        return {
            success: false,
            error: error.response?.data?.message || 'Failed to get user',
            statusCode: error.response?.status
        };
    }
}

// GET payments/user/:username - Get user wallet with balance and transactions
async function getUserWallet(username) {
    try {
        const response = await axios({
            method: 'GET',
            url: `${API_BASE_URL}/payments/user/${username}`,
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        console.log(response.data.data.transactions)

        return {
            success: true,
            balance: response.data.data.balance,
            transactions: response.data.data.transactions || []
        };

    } catch (error) {
        console.error('UserService - getUserWallet error:', error.response?.data || error.message);
        
        return {
            success: false,
            error: error.response?.data?.message || 'Failed to get user wallet',
            statusCode: error.response?.status,
            balance: 0,
            transactions: []
        };
    }
}

module.exports = {
    getUser,
    getUserWallet
};