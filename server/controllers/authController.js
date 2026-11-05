const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, withTransaction } = require('../config/db');
const { mapUser, mapCustomer } = require('../utils/mappers');
const { normalizeEmail } = require('../utils/validators');

const EMAIL_RE = /^\S+@\S+\.\S+$/;

// ── Helper: generate JWT ────────────────────────────────────────────────────
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
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

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email and password',
      });
    }

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please use a valid email address',
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [
      email,
    ]);

    if (existing.rowCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);

    const { user, customer } = await withTransaction(async (client) => {
      const userResult = await client.query(
        `INSERT INTO users (name, email, password, role)
         VALUES ($1, $2, $3, 'user')
         RETURNING *`,
        [name, email, hashedPassword]
      );

      const createdUser = userResult.rows[0];

      // Automatically create a customer profile for this user
      const customerResult = await client.query(
        `INSERT INTO customers (user_id, name, email)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [createdUser.id, createdUser.name, createdUser.email]
      );

      return { user: createdUser, customer: customerResult.rows[0] };
    });

    const token = generateToken(user.id);
    const response = userResponse(user, token);

    res.status(201).json({
      ...response,
      customer: mapCustomer(customer),
    });
  } catch (error) {
    console.error('Register error:', error.message);

    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
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
    console.error('Login error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
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
