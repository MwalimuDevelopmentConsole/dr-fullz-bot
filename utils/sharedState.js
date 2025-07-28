// utils/sharedState.js - Shared state for user sessions
const userStates = {};

function setUserState(userId, state) {
    userStates[userId] = state;
    console.log(`Set user state for ${userId}:`, state);
    console.log('All user states:', userStates);
}

function getUserState(userId) {
    const state = userStates[userId];
    console.log(`Get user state for ${userId}:`, state);
    return state;
}

function clearUserState(userId) {
    delete userStates[userId];
    console.log(`Cleared user state for ${userId}`);
}

function getAllStates() {
    return userStates;
}

module.exports = {
    setUserState,
    getUserState,
    clearUserState,
    getAllStates
};