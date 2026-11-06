const { query } = require('../config/db');
const { mapCustomer } = require('../utils/mappers');
const {
  HttpError,
  isUuid,
  normalizeEmail,
} = require('../utils/validators');

// @desc    Get all customers (with search & pagination)
// @route   GET /api/customers
// @access  Private
const getCustomers = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      1000,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10)
    );
    const offset = (page - 1) * limit;
    const search = String(req.query.search || '').trim();

    const params = [];
    let where = '';

    if (search) {
      params.push(`%${search}%`);
      where = `WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1`;
    }

    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM customers ${where}`,
      params
    );

    const dataParams = [...params, limit, offset];
    const result = await query(
      `SELECT * FROM customers
       ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      dataParams
    );

    const total = countResult.rows[0].total;

    res.json({
      success: true,
      data: result.rows.map(mapCustomer),
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('getCustomers error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private
const getCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid customer ID' });
    }

    const { rows } = await query('SELECT * FROM customers WHERE id = $1', [
      id,
    ]);

    if (!rows[0]) {
      return res
        .status(404)
        .json({ success: false, message: 'Customer not found' });
    }

    res.json({ success: true, data: mapCustomer(rows[0]) });
  } catch (error) {
    console.error('getCustomer error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create customer
// @route   POST /api/customers
// @access  Private
const createCustomer = async (req, res) => {
  try {
    const name =
      typeof req.body.name === 'string' ? req.body.name.trim() : '';

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a customer name',
      });
    }

    const email = normalizeEmail(req.body.email);
    const phone = String(req.body.phone || '').trim();
    const address = String(req.body.address || '').trim();

    const { rows } = await query(
      `INSERT INTO customers (name, email, phone, address)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, email, phone, address]
    );

    res.status(201).json({ success: true, data: mapCustomer(rows[0]) });
  } catch (error) {
    console.error('createCustomer error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid customer ID' });
    }

    const fieldMap = {
      name: 'name',
      email: 'email',
      phone: 'phone',
      address: 'address',
      // user: 'user_id',
      // user_id: 'user_id',
    };

    const updates = [];
    const params = [];

    for (const [bodyKey, column] of Object.entries(fieldMap)) {
      if (!(bodyKey in req.body)) continue;

      let value = req.body[bodyKey];

      if (column === 'email') {
        value = normalizeEmail(value);
      } else if (column === 'user_id') {
        if (value === null || value === '') {
          value = null;
        } else if (!isUuid(value)) {
          throw new HttpError(400, 'Invalid user ID');
        }
      } else {
        value = value === null || value === undefined ? '' : String(value).trim();
      }

      params.push(value);
      updates.push(`${column} = $${params.length}`);
    }

    if (updates.length === 0) {
      const existing = await query('SELECT * FROM customers WHERE id = $1', [
        id,
      ]);

      if (!existing.rows[0]) {
        return res
          .status(404)
          .json({ success: false, message: 'Customer not found' });
      }

      return res.json({
        success: true,
        data: mapCustomer(existing.rows[0]),
      });
    }

    params.push(id);

    const { rows } = await query(
      `UPDATE customers
       SET ${updates.join(', ')}
       WHERE id = $${params.length}
       RETURNING *`,
      params
    );

    if (!rows[0]) {
      return res
        .status(404)
        .json({ success: false, message: 'Customer not found' });
    }

    res.json({ success: true, data: mapCustomer(rows[0]) });
  } catch (error) {
    if (error instanceof HttpError) {
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }

    console.error('updateCustomer error:', error.message);

    if (error.code === '23503') {
      return res
        .status(400)
        .json({ success: false, message: 'Referenced user does not exist' });
    }

    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid customer ID' });
    }

    const { rowCount } = await query(
      'DELETE FROM customers WHERE id = $1',
      [id]
    );

    if (rowCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Customer not found' });
    }

    res.json({ success: true, message: 'Customer removed' });
  } catch (error) {
    console.error('deleteCustomer error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
