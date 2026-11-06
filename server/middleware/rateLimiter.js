const { rateLimit } = require('express-rate-limit');

// Login protection
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10,

    standardHeaders: 'draft-8',
    legacyHeaders: false,

    message: {
        success: false,
        message: 'Too many login attempts. Please try again after 15 minutes.',
    },

    // Count failed login attempts only
    skipSuccessfulRequests: true,
});

// Registration protection
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 5,

    standardHeaders: 'draft-8',
    legacyHeaders: false,

    message: {
        success: false,
        message: 'Too many registration attempts. Please try again later.',
    },
});

module.exports = {
    loginLimiter,
    registerLimiter,
};