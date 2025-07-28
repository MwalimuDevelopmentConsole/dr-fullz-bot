// services/shopService.js - Updated for JSON response with file download
const axios = require('axios');
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

// Get shop categories (bases)
async function getCategories() {
    try {
        const response = await axios({
            method: 'GET',
            url: `${API_BASE_URL}/base`,
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        return {
            success: true,
            categories: response.data.bases // Pass the entire response data
        };

    } catch (error) {
        console.error('ShopService - getCategories error:', error.response?.data || error.message);

        return {
            success: false,
            error: error.response?.data?.message || 'Failed to get categories',
            statusCode: error.response?.status,
            categories: []
        };
    }
}

// Get products with filters
async function getProducts(username, filters = {}) {
    try {
        // Build the query parameters based on expected backend filters
        const queryParams = { username };

        // Add all possible filters
        if (filters.base) queryParams.base = filters.base;
        if (filters.city) queryParams.city = filters.city;
        if (filters.country) queryParams.country = filters.country;
        if (filters.zip) queryParams.zip = filters.zip;
        if (filters.state) queryParams.state = filters.state;
        if (filters.cs) queryParams.cs = filters.cs;
        if (filters.name) queryParams.name = filters.name;
        queryParams.isBot = 'yes';

        // Handle date range (year range converted to date range)
        if (filters.yearFrom && filters.yearTo) {
            queryParams.dob = filters.yearFrom.toString();
            queryParams.dobMax = filters.yearTo.toString();
        }
        const response = await axios({
            method: 'GET',
            url: `${API_BASE_URL}/ssn`,
            params: queryParams,
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        return {
            success: true,
            availableQuantity: response.data.count || response.data.count || 0,
            products: response.data.products || response.data.data || []
        };

    } catch (error) {
        console.error('ShopService - getProducts error:', error.response?.data || error.message);

        return {
            success: false,
            error: error.response?.data?.message || 'Failed to get products',
            statusCode: error.response?.status,
            availableQuantity: 0,
            products: []
        };
    }
}

// Checkout products - Updated for JSON response + file download
async function checkout(username, filters, quantity) {
    try {
        // Build the request body with all filters and quantity
        const requestBody = {
            username,
            quantity
        };

        // Add all filters to the request body
        if (filters.base) requestBody.base = filters.base;
        if (filters.city) requestBody.city = filters.city;
        if (filters.country) requestBody.country = filters.country;
        if (filters.zip) requestBody.zip = filters.zip;
        if (filters.state) requestBody.state = filters.state;
        if (filters.cs) requestBody.cs = filters.cs;
        if (filters.name) requestBody.name = filters.name;

        // Handle date range for checkout
        if (filters.yearFrom && filters.yearTo) {
            requestBody.dob = filters.yearFrom.toString();
            requestBody.dobMax = filters.yearTo.toString();
        }

        console.log('Checkout request body:', requestBody);

        // Step 1: Make checkout request to get file info
        const checkoutResponse = await axios({
            method: 'POST',
            url: `${API_BASE_URL}/ssn/checkout`,
            data: requestBody,
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });

        console.log('Checkout response:', checkoutResponse.data);

        const { message, filename, path, size } = checkoutResponse.data;

        if (!filename || !path) {
            throw new Error('Invalid response: missing filename or path');
        }

        // Step 2: Download the actual file from the provided path
        const fileUrl = `${API_BASE_URL.replace('/api', '')}${path}`; // Remove /api and add the path
        console.log('Downloading file from:', fileUrl);
        console.log('Expected file size:', size, 'bytes');

        const fileResponse = await axios({
            method: 'GET',
            url: fileUrl,
            responseType: 'arraybuffer', // Get file as binary data
            timeout: 10000,
            headers: {
                'Accept': '*/*'
            }
        });

        console.log('File downloaded successfully. Expected size:', size, 'bytes, Actual size:', fileResponse.data.byteLength, 'bytes');

        // Verify file size matches expected size
        if (size && fileResponse.data.byteLength !== size) {
            console.warn('File size mismatch! Expected:', size, 'Got:', fileResponse.data.byteLength);
        }

        // Convert file data to base64 for Telegram
        const fileData = Buffer.from(fileResponse.data).toString('base64');

        return {
            success: true,
            fileData: fileData,
            fileName: filename,
            fileSize: size,
            message: message || `✅ Purchase completed successfully!\n\n📦 Quantity: ${quantity}\n📄 File: ${filename}\n📊 Size: ${(size / 1024).toFixed(2)} KB`
        };

    } catch (error) {
        console.error('ShopService - checkout error:', error.response?.data || error.message);

        // Handle different types of errors
        let errorMessage = 'Checkout failed';

        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            errorMessage = 'Unable to connect to server';
        } else if (error.response?.status === 404) {
            errorMessage = 'File not found or checkout endpoint not available';
        } else if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
        } else if (error.response?.data) {
            errorMessage = typeof error.response.data === 'string' ? error.response.data : 'Server error';
        } else if (error.message) {
            errorMessage = error.message;
        }

        return {
            success: false,
            error: errorMessage,
            statusCode: error.response?.status
        };
    }
}

module.exports = {
    getCategories,
    getProducts,
    checkout
};