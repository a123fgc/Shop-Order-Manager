// 
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Check authorization header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no valid token provided'
      });
    }

    const token = authHeader.split(' ')[1];

    // Validate token format
    if (!token || token.split('.').length !== 3) {
      return res.status(401).json({
        success: false,
        message: 'Invalid JWT token format'
      });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    const User = mongoose.models.User || mongoose.model('User');

    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    next();

  } catch (error) {
    console.error('Auth middleware error:', error.message);

    return res.status(401).json({
      success: false,
      message: 'Not authorized, token failed'
    });
  }
};

module.exports = { protect };
