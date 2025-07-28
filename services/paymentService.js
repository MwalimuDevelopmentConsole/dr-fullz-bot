// services/paymentService.js
const axios = require('axios');
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

// Get available cryptocurrencies
async function getCurrencies() {
    try {
        const response = await axios({
            method: 'GET',
            url: `${API_BASE_URL}/payments/currencies`,
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        

        return {
            success: true,
            currencies: response.data.currencies || response.data
        };

    } catch (error) {
        console.error('PaymentService - getCurrencies error:', error.response?.data || error.message);
        
        return {
            success: false,
            error: error.response?.data?.message || 'Failed to get currencies',
            statusCode: error.response?.status,
            currencies: []
        };
    }
}

// Create deposit - expects amount, cryptoCurrency, username, description
async function createDeposit(amount, cryptoCurrency, username, description = 'Bot deposit') {
    try {
        const response = await axios({
            method: 'POST',
            url: `${API_BASE_URL}/payments/create`,
            data: {
                amount,
                cryptoCurrency,
                username,
                description
            },
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        return {
            success: true,
            paymentData: response.data.data.paymentData,
            transactionId: response.data.data.transactionId,
            status: response.data.data.status
        };

    } catch (error) {
        console.error('PaymentService - createDeposit error:', error.response?.data || error.message);
        
        return {
            success: false,
            error: error.response?.data?.message || 'Failed to create deposit',
            statusCode: error.response?.status
        };
    }
}

module.exports = {
    getCurrencies,
    createDeposit
};