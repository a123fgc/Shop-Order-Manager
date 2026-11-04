const mongoose = require('mongoose');

// ── Customer Model ──────────────────────────────────────────────────────────
const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a customer name'],
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: '',
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  address: {
    type: String,
    trim: true,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Customer = mongoose.model('Customer', customerSchema);

// ── Controllers ─────────────────────────────────────────────────────────────

// @desc    Get all customers (with search & pagination)
// @route   GET /api/customers
// @access  Private
const getCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.search) {
      const regex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
      ];
    }

    const total = await Customer.countDocuments(filter);
    const customers = await Customer.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      data: customers,
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
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, data: customer });
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
    const { name, email, phone, address } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Please provide a customer name' });
    }

    const customer = await Customer.create({ name, email, phone, address });
    res.status(201).json({ success: true, data: customer });
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
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.json({ success: true, data: customer });
  } catch (error) {
    console.error('updateCustomer error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private
const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.json({ success: true, message: 'Customer removed' });
  } catch (error) {
    console.error('deleteCustomer error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer, Customer };
