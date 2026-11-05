const { query } = require('../config/db');
const { mapProduct } = require('../utils/mappers');
const { HttpError, isUuid } = require('../utils/validators');

// @desc    Get all products (with search & pagination)
// @route   GET /api/products
// @access  Private
const getProducts = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      1000,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10)
    );
    const offset = (page - 1) * limit;
    const search = String(req.query.search || '').trim();
    const category = String(req.query.category || '').trim();

    const conditions = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(name ILIKE $${params.length} OR description ILIKE $${params.length} OR category ILIKE $${params.length})`
      );
    }

    if (category) {
      params.push(`%${category}%`);
      conditions.push(`category ILIKE $${params.length}`);
    }

    const where = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM products ${where}`,
      params
    );

    const dataParams = [...params, limit, offset];
    const result = await query(
      `SELECT * FROM products
       ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      dataParams
    );

    const total = countResult.rows[0].total;

    res.json({
      success: true,
      data: result.rows.map(mapProduct),
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('getProducts error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Private
const getProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid product ID' });
    }

    const { rows } = await query('SELECT * FROM products WHERE id = $1', [id]);

    if (!rows[0]) {
      return res
        .status(404)
        .json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, data: mapProduct(rows[0]) });
  } catch (error) {
    console.error('getProduct error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private
const createProduct = async (req, res) => {
  try {
    const name =
      typeof req.body.name === 'string' ? req.body.name.trim() : '';

    if (!name || req.body.price === undefined || req.body.price === null) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name and price',
      });
    }

    const price = Number(req.body.price);
    const stock =
      req.body.stock === undefined || req.body.stock === null
        ? 0
        : Number.parseInt(req.body.stock, 10);

    if (!Number.isFinite(price) || price < 0) {
      throw new HttpError(400, 'Price must be a non-negative number');
    }

    if (!Number.isInteger(stock) || stock < 0) {
      throw new HttpError(400, 'Stock must be a non-negative integer');
    }

    const description = String(req.body.description || '').trim();
    const category = String(req.body.category || 'General').trim() || 'General';

    const { rows } = await query(
      `INSERT INTO products (name, description, price, stock, category)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, description, price, stock, category]
    );

    res.status(201).json({ success: true, data: mapProduct(rows[0]) });
  } catch (error) {
    if (error instanceof HttpError) {
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }

    console.error('createProduct error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid product ID' });
    }

    const fieldMap = {
      name: 'name',
      description: 'description',
      price: 'price',
      stock: 'stock',
      category: 'category',
    };

    const updates = [];
    const params = [];

    for (const [bodyKey, column] of Object.entries(fieldMap)) {
      if (!(bodyKey in req.body)) continue;

      let value = req.body[bodyKey];

      if (column === 'price') {
        value = Number(value);

        if (!Number.isFinite(value) || value < 0) {
          throw new HttpError(400, 'Price must be a non-negative number');
        }
      } else if (column === 'stock') {
        value = Number.parseInt(value, 10);

        if (!Number.isInteger(value) || value < 0) {
          throw new HttpError(400, 'Stock must be a non-negative integer');
        }
      } else if (column === 'name') {
        value = String(value || '').trim();

        if (!value) {
          throw new HttpError(400, 'Product name is required');
        }
      } else {
        value = String(value || '').trim();
      }

      params.push(value);
      updates.push(`${column} = $${params.length}`);
    }

    if (updates.length === 0) {
      const existing = await query('SELECT * FROM products WHERE id = $1', [
        id,
      ]);

      if (!existing.rows[0]) {
        return res
          .status(404)
          .json({ success: false, message: 'Product not found' });
      }

      return res.json({
        success: true,
        data: mapProduct(existing.rows[0]),
      });
    }

    params.push(id);

    const { rows } = await query(
      `UPDATE products
       SET ${updates.join(', ')}
       WHERE id = $${params.length}
       RETURNING *`,
      params
    );

    if (!rows[0]) {
      return res
        .status(404)
        .json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, data: mapProduct(rows[0]) });
  } catch (error) {
    if (error instanceof HttpError) {
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }

    console.error('updateProduct error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid product ID' });
    }

    const { rowCount } = await query(
      'DELETE FROM products WHERE id = $1',
      [id]
    );

    if (rowCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, message: 'Product removed' });
  } catch (error) {
    console.error('deleteProduct error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
