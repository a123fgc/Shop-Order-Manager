const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const { query, withTransaction } = require('../config/db');
const { mapUser, mapCustomer } = require('../utils/mappers');
const { normalizeEmail } = require('../utils/validators');

const EMAIL_RE = /^\S+@\S+\.\S+$/;

// ── Helper: generate JWT ────────────────────────────────────────────────────
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

const userResponse = (user, token) => {
  const userData = mapUser(user);

  return {
    success: true,
    token,
    user: userData,
    data: {
      ...userData,
      token,
    },
  };
};

// ── Controllers ─────────────────────────────────────────────────────────────

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const name =
      typeof req.body.name === 'string' ? req.body.name.trim() : '';

    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    const phone =
      typeof req.body.phone === 'string' ? req.body.phone.trim() : '';

    const address =
      typeof req.body.address === 'string' ? req.body.address.trim() : '';

    // Validate all required fields
    if (!name || !email || !password || !phone || !address) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, password, phone and address',
      });
    }

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please use a valid email address',
      });
    }

    if (typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Password must be a string',
      });
    }

    if (password.length < 12) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 12 characters long',
      });
    }

    if (Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({
        success: false,
        message: 'Password cannot exceed 72 UTF-8 bytes',
      });
    }

    if (!validator.isStrongPassword(password, {
      minLength: 12,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain uppercase, lowercase, number and special character',
      });
    }

    const existing = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existing.rowCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);

    // Create user and customer profile in one transaction
    const { user, customer } = await withTransaction(async (client) => {
      const userResult = await client.query(
        `INSERT INTO users (name, email, password, role)
         VALUES ($1, $2, $3, 'user')
         RETURNING *`,
        [name, email, hashedPassword]
      );

      const createdUser = userResult.rows[0];

      const customerResult = await client.query(
        `INSERT INTO customers
          (user_id, name, email, phone, address)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          createdUser.id,
          createdUser.name,
          createdUser.email,
          phone,
          address,
        ]
      );

      return {
        user: createdUser,
        customer: customerResult.rows[0],
      };
    });

    const token = generateToken(user.id);
    const response = userResponse(user, token);

    return res.status(201).json({
      ...response,
      customer: mapCustomer(customer),
    });

  } catch (error) {
    console.error('Register error:', {
      message: error.message,
      code: error.code,
    });

    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Registration failed due to a server error',
    });
  }
};
// @desc    Login user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const { rows } = await query('SELECT * FROM users WHERE email = $1', [
      email,
    ]);

    const user = rows[0];

    if (user && (await bcrypt.compare(String(password), user.password))) {
      const token = generateToken(user.id);
      return res.json(userResponse(user, token));
    }

    res.status(401).json({
      success: false,
      message: 'Invalid email or password',
    });
  } catch (error) {
    console.error('Login error:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      message: 'Login failed due to a server error'
    });
  }
};

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = mapUser(req.user);

    res.json({ success: true, user, data: user });
  } catch (error) {
    console.error('GetMe error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { register, login, getMe };
