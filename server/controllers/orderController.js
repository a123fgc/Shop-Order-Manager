const mongoose = require('mongoose');

// ── Order Model ─────────────────────────────────────────────────────────────
const orderSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Please add a customer'],
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1'],
      },
      price: {
        type: Number,
        required: true,
        min: [0, 'Price cannot be negative'],
      },
    },
  ],
  totalAmount: {
    type: Number,
    required: true,
    default: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'cancelled'],
    default: 'pending',
  },
  notes: {
    type: String,
    trim: true,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Order = mongoose.model('Order', orderSchema);

// We need the Product model for stock management
const getProductModel = () => mongoose.model('Product');

// ── Controllers ─────────────────────────────────────────────────────────────

// @desc    Get all orders (with search, filter & pagination)
// @route   GET /api/orders
// @access  Private
const getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.customer) {
      filter.customer = req.query.customer;
    }

    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .populate('customer', 'name email phone')
      .populate('items.product', 'name price category')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      data: orders,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('getOrders error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email phone address')
      .populate('items.product', 'name price category');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('getOrder error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create order (auto-calc total, decrement stock)
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
  try {
    const { customer, items, status, notes } = req.body;

    if (!customer || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide customer and at least one item' });
    }

    const Product = getProductModel();

    // Build order items with current prices and calculate total
    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product ${item.product} not found` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`,
        });
      }

      const price = item.price !== undefined ? item.price : product.price;
      const lineTotal = price * item.quantity;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price,
      });

      totalAmount += lineTotal;

      // Decrement stock
      product.stock -= item.quantity;
      await product.save();
    }

    const order = await Order.create({
      customer,
      items: orderItems,
      totalAmount,
      status: status || 'pending',
      notes: notes || '',
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email phone')
      .populate('items.product', 'name price category');

    res.status(201).json({ success: true, data: populatedOrder });
  } catch (error) {
    console.error('createOrder error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update order (status, notes)
// @route   PUT /api/orders/:id
// @access  Private
const updateOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const { status, notes } = req.body;

    // If cancelling, restore stock
    if (status === 'cancelled' && order.status !== 'cancelled') {
      const Product = getProductModel();
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
      }
    }

    if (status !== undefined) order.status = status;
    if (notes !== undefined) order.notes = notes;

    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email phone')
      .populate('items.product', 'name price category');

    res.json({ success: true, data: updatedOrder });
  } catch (error) {
    console.error('updateOrder error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Private
const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Restore stock if the order wasn't already cancelled
    if (order.status !== 'cancelled') {
      const Product = getProductModel();
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
      }
    }

    await Order.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Order removed' });
  } catch (error) {
    console.error('deleteOrder error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getOrders, getOrder, createOrder, updateOrder, deleteOrder, Order };
