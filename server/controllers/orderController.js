
const mongoose = require('mongoose');

// ==========================================
// 1. ORDER SCHEMA
// ==========================================

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
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
          min: 1,
        },

        price: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'cancelled'],
      default: 'pending',
    },

    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent model recompilation errors
const Order =
  mongoose.models.Order || mongoose.model('Order', orderSchema);


// ==========================================
// 2. MODEL HELPERS
// ==========================================

const getProductModel = () => {
  return mongoose.model('Product');
};

const getCustomerModel = () => {
  return mongoose.models.Customer ||
    require('./customerController').Customer;
};


// ==========================================
// 3. GET ALL ORDERS
// ==========================================

const getOrders = async (req, res) => {
  try {
    const filter = {};

    const isAdmin = req.user.role === 'admin';

    // Normal users can only see their own orders
    if (!isAdmin) {
      filter.user = req.user._id;
    }

    // Admin can filter by customer
    if (isAdmin && req.query.customer) {
      if (!mongoose.Types.ObjectId.isValid(req.query.customer)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid customer ID',
        });
      }

      filter.customer = req.query.customer;
    }

    // Optional status filter
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Pagination
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(req.query.limit) || 10)
    );

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('customer', 'name email phone')
        .populate('user', 'name email')
        .populate('items.product', 'name price category')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      Order.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: orders.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: orders,
    });

  } catch (error) {
    console.error('getOrders error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch orders',
    });
  }
};


// ==========================================
// 4. GET SINGLE ORDER
// ==========================================

const getOrder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID',
      });
    }

    const order = await Order.findById(id)
      .populate('customer', 'name email phone')
      .populate('user', 'name email')
      .populate('items.product', 'name price category');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Normal users can only access their own orders
    if (
      req.user.role !== 'admin' &&
      order.user._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this order',
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
    });

  } catch (error) {
    console.error('getOrder error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch order',
    });
  }
};


// ==========================================
// 5. CREATE ORDER
// ==========================================

const createOrder = async (req, res) => {
  const updatedStock = [];
  let orderCreated = false;

  try {
    const { items } = req.body;

    const isAdmin = req.user.role === 'admin';

    const Product = getProductModel();
    const Customer = getCustomerModel();

    // Validate items
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one product',
      });
    }

    // --------------------------------------
    // Find customer profile
    // --------------------------------------

    let customer;

    if (isAdmin) {
      // Admin selects a customer
      if (req.body.customer) {
        if (!mongoose.Types.ObjectId.isValid(req.body.customer)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid customer ID',
          });
        }

        customer = await Customer.findById(req.body.customer);
      } else {
        // If admin did not select a customer, check if admin has their own profile
        customer = await Customer.findOne({ user: req.user._id });
        if (!customer && req.user.email) {
          customer = await Customer.findOne({ email: req.user.email });
        }
        if (!customer) {
          return res.status(400).json({
            success: false,
            message: 'Please select a customer for this order',
          });
        }
      }
    } else {
      // Normal user gets their own customer profile
      customer = await Customer.findOne({
        user: req.user._id,
      });

      // If customer is not linked, find by logged-in user's email
      if (!customer && req.user.email) {
        customer = await Customer.findOne({
          email: req.user.email,
        });

        // Automatically link existing customer with user
        if (customer && !customer.user) {
          customer.user = req.user._id;
          await customer.save();
        }
      }

      // If customer still does not exist, automatically create profile for logged-in user
      if (!customer) {
        customer = await Customer.create({
          user: req.user._id,
          name: req.user.name || 'Customer',
          email: req.user.email || '',
          phone: '',
          address: '',
        });
      }
    }

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    // --------------------------------------
    // Validate products and quantities
    // --------------------------------------

    const productQuantities = {};

    for (const item of items) {
      const quantity = Number(item.quantity);

      if (
        !item.product ||
        !mongoose.Types.ObjectId.isValid(item.product) ||
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product or quantity',
        });
      }

      const productId = item.product.toString();

      // Combine duplicate products
      productQuantities[productId] =
        (productQuantities[productId] || 0) + quantity;
    }

    // --------------------------------------
    // Check products and calculate total
    // --------------------------------------

    const orderItems = [];
    let totalAmount = 0;

    for (const [productId, quantity] of Object.entries(productQuantities)) {
      const product = await Product.findById(productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${productId}`,
        });
      }

      if (
        typeof product.stock !== 'number' ||
        product.stock < quantity
      ) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}`,
        });
      }

      if (
        typeof product.price !== 'number' ||
        product.price < 0
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid price for ${product.name}`,
        });
      }

      orderItems.push({
        product: product._id,
        quantity,
        price: product.price,
      });

      totalAmount += product.price * quantity;
    }

    // --------------------------------------
    // Reduce stock safely
    // --------------------------------------

    for (const item of orderItems) {
      const result = await Product.updateOne(
        {
          _id: item.product,
          stock: { $gte: item.quantity },
        },
        {
          $inc: {
            stock: -item.quantity,
          },
        }
      );

      if (result.modifiedCount !== 1) {
        throw new Error(
          'Stock changed while creating order. Please try again.'
        );
      }

      updatedStock.push(item);
    }

    // --------------------------------------
    // Create order
    // --------------------------------------

    const order = await Order.create({
      user: req.user._id,
      customer: customer._id,
      items: orderItems,
      totalAmount,

      // Only admin can set status and notes
      status: isAdmin
        ? (req.body.status || 'pending')
        : 'pending',

      notes: isAdmin
        ? (req.body.notes || '')
        : '',
    });

    orderCreated = true;

    // --------------------------------------
    // Return populated order
    // --------------------------------------

    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email phone')
      .populate('user', 'name email')
      .populate('items.product', 'name price category');

    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: populatedOrder,
    });

  } catch (error) {
    console.error('createOrder error:', error);

    // Restore stock only if order was not saved
    if (!orderCreated) {
      const Product = getProductModel();

      for (const item of updatedStock) {
        try {
          await Product.updateOne(
            { _id: item.product },
            {
              $inc: {
                stock: item.quantity,
              },
            }
          );
        } catch (rollbackError) {
          console.error('Stock rollback error:', rollbackError);
        }
      }
    }

    return res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};


// ==========================================
// 6. UPDATE ORDER
// ==========================================

const updateOrder = async (req, res) => {
  try {
    // Only admin can update orders
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin can update orders',
      });
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID',
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const validStatuses = [
      'pending',
      'processing',
      'completed',
      'cancelled',
    ];

    if (
      status !== undefined &&
      !validStatuses.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status',
      });
    }

    const Product = getProductModel();

    // Restore stock when order is cancelled
    if (
      status === 'cancelled' &&
      order.status !== 'cancelled'
    ) {
      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.product },
          {
            $inc: {
              stock: item.quantity,
            },
          }
        );
      }
    }

    // Deduct stock again if cancelled order is reopened
    if (
      status &&
      status !== 'cancelled' &&
      order.status === 'cancelled'
    ) {
      const deductedItems = [];

      try {
        for (const item of order.items) {
          const result = await Product.updateOne(
            {
              _id: item.product,
              stock: { $gte: item.quantity },
            },
            {
              $inc: {
                stock: -item.quantity,
              },
            }
          );

          if (result.modifiedCount !== 1) {
            throw new Error(
              'Insufficient stock to reopen this order'
            );
          }

          deductedItems.push(item);
        }
      } catch (error) {
        // Restore any stock already deducted in this operation
        for (const item of deductedItems) {
          await Product.updateOne(
            { _id: item.product },
            {
              $inc: {
                stock: item.quantity,
              },
            }
          );
        }

        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
    }

    if (status !== undefined) {
      order.status = status;
    }

    if (notes !== undefined) {
      order.notes = notes;
    }

    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email phone')
      .populate('user', 'name email')
      .populate('items.product', 'name price category');

    return res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: updatedOrder,
    });

  } catch (error) {
    console.error('updateOrder error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update order',
    });
  }
};


// ==========================================
// 7. DELETE ORDER
// ==========================================

const deleteOrder = async (req, res) => {
  try {
    // Only admin can delete orders
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin can delete orders',
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID',
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Restore stock if order was not already cancelled
    if (order.status !== 'cancelled') {
      const Product = getProductModel();

      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.product },
          {
            $inc: {
              stock: item.quantity,
            },
          }
        );
      }
    }

    await Order.deleteOne({ _id: id });

    return res.status(200).json({
      success: true,
      message: 'Order deleted successfully',
    });

  } catch (error) {
    console.error('deleteOrder error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete order',
    });
  }
};


// ==========================================
// 8. EXPORT CONTROLLERS
// ==========================================

module.exports = {
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
  Order,
};
