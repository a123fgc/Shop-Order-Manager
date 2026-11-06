const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { mapUser } = require('../utils/mappers');
const { isUuid } = require('../utils/validators');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Check authorization header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no valid token provided',
      });
    }

    const token = authHeader.split(' ')[1];

    // Validate token format
    if (!token || token.split('.').length !== 3) {
      return res.status(401).json({
        success: false,
        message: 'Invalid JWT token format',
      });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!isUuid(decoded.id)) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed',
      });
    }

    // Find user
    const { rows } = await query(
      `SELECT id, name, email, role, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [decoded.id]
    );

    if (!rows[0]) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    req.user = mapUser(rows[0]);

    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);

    return res.status(401).json({
      success: false,
      message: 'Not authorized, token failed',
    });
  }
};
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin permission required.'
      });
    }

    next();
  };
};

module.exports = {
  protect,
  authorize
};


