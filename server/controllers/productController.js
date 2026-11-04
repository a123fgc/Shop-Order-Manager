const mongoose = require('mongoose');

// ── Product Model ───────────────────────────────────────────────────────────
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a product name'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  price: {
    type: Number,
    required: [true, 'Please add a price'],
    min: [0, 'Price cannot be negative'],
  },
  stock: {
    type: Number,
    required: [true, 'Please add stock quantity'],
    min: [0, 'Stock cannot be negative'],
    default: 0,
  },
  category: {
    type: String,
    trim: true,
    default: 'General',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Product = mongoose.model('Product', productSchema);

// ── Controllers ─────────────────────────────────────────────────────────────

// @desc    Get all products (with search & pagination)
// @route   GET /api/products
// @access  Private
const getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.search) {
      const regex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { name: regex },
        { description: regex },
        { category: regex },
      ];
    }
    if (req.query.category) {
      filter.category = new RegExp(req.query.category, 'i');
    }

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      data: products,
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
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: product });
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
    const { name, description, price, stock, category } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ success: false, message: 'Please provide name and price' });
    }

    const product = await Product.create({ name, description, price, stock, category });
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    console.error('createProduct error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    console.error('updateProduct error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, message: 'Product removed' });
  } catch (error) {
    console.error('deleteProduct error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct, Product };
