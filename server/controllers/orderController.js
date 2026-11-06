const { query, withTransaction } = require('../config/db');
const { mapOrder } = require('../utils/mappers');
const { ORDER_SELECT } = require('../utils/orderQueries');
const {
  HttpError,
  isUuid,
  roundMoney,
} = require('../utils/validators');

const VALID_STATUSES = ['pending', 'processing', 'completed', 'cancelled'];

async function fetchOrderById(id) {
  const { rows } = await query(`${ORDER_SELECT} WHERE o.id = $1`, [id]);
  return mapOrder(rows[0]);
}

async function resolveCustomer(client, req, isAdmin) {
  if (isAdmin) {
    if (req.body.customer) {
      if (!isUuid(req.body.customer)) {
        throw new HttpError(400, 'Invalid customer ID');
      }

      const result = await client.query(
        'SELECT * FROM customers WHERE id = $1',
        [req.body.customer]
      );

      return result.rows[0] || null;
    }

    const result = await client.query(
      `SELECT *
       FROM customers
       WHERE user_id = $1 OR (email <> '' AND email = $2)
       ORDER BY (user_id = $1) DESC, created_at ASC
       LIMIT 1`,
      [req.user._id, req.user.email || '']
    );

    return result.rows[0] || null;
  }

  let result = await client.query(
    'SELECT * FROM customers WHERE user_id = $1 LIMIT 1',
    [req.user._id]
  );
  let customer = result.rows[0];

  // If the customer profile is not linked, find it by the user's email.
  if (!customer && req.user.email) {
    result = await client.query(
      'SELECT * FROM customers WHERE email = $1 ORDER BY created_at ASC LIMIT 1',
      [req.user.email]
    );
    customer = result.rows[0];

    if (customer && !customer.user_id) {
      await client.query('UPDATE customers SET user_id = $1 WHERE id = $2', [
        req.user._id,
        customer.id,
      ]);
      customer.user_id = req.user._id;
    }
  }

  // If no profile exists at all, create one for the logged-in user.
  if (!customer) {
    result = await client.query(
      `INSERT INTO customers (user_id, name, email, phone, address)
       VALUES ($1, $2, $3, '', '')
       RETURNING *`,
      [req.user._id, req.user.name || 'Customer', req.user.email || '']
    );
    customer = result.rows[0];
  }

  return customer;
}

// ==========================================
// 1. GET ALL ORDERS
// ==========================================
const getOrders = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';

    if (isAdmin && req.query.customer && !isUuid(req.query.customer)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID',
      });
    }

    const conditions = [];
    const params = [];

    // Normal users can only see their own orders.
    if (!isAdmin) {
      params.push(req.user._id);
      conditions.push(`o.user_id = $${params.length}`);
    }

    // Admin can filter by customer.
    if (isAdmin && req.query.customer) {
      params.push(req.query.customer);
      conditions.push(`o.customer_id = $${params.length}`);
    }

    // Optional status filter.
    if (req.query.status) {
      params.push(req.query.status);
      conditions.push(`o.status = $${params.length}`);
    }

    const where = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    const [countResult, ordersResult] = await Promise.all([
      query(
        `SELECT COUNT(*)::int AS total FROM orders o ${where}`,
        params
      ),
      query(
        `${ORDER_SELECT}
         ${where}
         ORDER BY o.created_at DESC, o.id DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      ),
    ]);

    const total = countResult.rows[0].total;
    const orders = ordersResult.rows.map(mapOrder);

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
      message: error.message || 'Failed to fetch orders Please try again later.',
    });
  }
};

// ==========================================
// 2. GET SINGLE ORDER
// ==========================================
const getOrder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID',
      });
    }

    const { rows } = await query(`${ORDER_SELECT} WHERE o.id = $1`, [id]);
    const orderRow = rows[0];

    if (!orderRow) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Normal users can only access their own orders.
    if (
      req.user.role !== 'admin' &&
      orderRow.user_id !== req.user._id
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this order',
      });
    }

    return res.status(200).json({
      success: true,
      data: mapOrder(orderRow),
    });
  } catch (error) {
    console.error('getOrder error:', error);


    return res.status(500).json({
      success: false,
      message: 'Failed to fetch order. Please try again later.',
    });
  }
};

// ==========================================
// 3. CREATE ORDER
// ==========================================
const createOrder = async (req, res) => {
  try {
    const { items } = req.body;
    const isAdmin = req.user.role === 'admin';

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one product',
      });
    }

    // Validate and combine duplicate products.
    const productQuantities = new Map();

    for (const item of items) {
      const quantity = Number(item.quantity);

      if (
        !item.product ||
        !isUuid(item.product) ||
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product or quantity',
        });
      }

      productQuantities.set(
        item.product,
        (productQuantities.get(item.product) || 0) + quantity
      );
    }

    const status = isAdmin ? req.body.status || 'pending' : 'pending';
    const notes = isAdmin ? req.body.notes || '' : '';

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status',
      });
    }

    const orderId = await withTransaction(async (client) => {
      const customer = await resolveCustomer(client, req, isAdmin);

      if (!customer) {
        throw new HttpError(
          400,
          isAdmin
            ? 'Please select a customer for this order'
            : 'Customer not found'
        );
      }

      const orderItems = [];
      let totalAmount = 0;

      for (const [productId, quantity] of productQuantities.entries()) {
        // Lock the row while we validate and reduce stock.
        const productResult = await client.query(
          'SELECT * FROM products WHERE id = $1 FOR UPDATE',
          [productId]
        );
        const product = productResult.rows[0];

        if (!product) {
          throw new HttpError(404, `Product not found: ${productId}`);
        }

        if (product.stock < quantity) {
          throw new HttpError(
            400,
            `Insufficient stock for ${product.name}`
          );
        }

        const price = Number(product.price);

        if (!Number.isFinite(price) || price < 0) {
          throw new HttpError(400, `Invalid price for ${product.name}`);
        }

        const stockResult = await client.query(
          `UPDATE products
           SET stock = stock - $1
           WHERE id = $2 AND stock >= $1
           RETURNING id`,
          [quantity, productId]
        );

        if (stockResult.rowCount !== 1) {
          throw new HttpError(
            409,
            'Stock changed while creating order. Please try again.'
          );
        }

        orderItems.push({
          productId,
          quantity,
          price,
        });

        totalAmount += price * quantity;
      }

      const orderResult = await client.query(
        `INSERT INTO orders (user_id, customer_id, total_amount, status, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          req.user._id,
          customer.id,
          roundMoney(totalAmount),
          status,
          notes,
        ]
      );

      const createdOrderId = orderResult.rows[0].id;

      for (const item of orderItems) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, price)
           VALUES ($1, $2, $3, $4)`,
          [createdOrderId, item.productId, item.quantity, item.price]
        );
      }

      return createdOrderId;
    });

    const populatedOrder = await fetchOrderById(orderId);

    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: populatedOrder,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error('createOrder error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Something went wrong. Please try again later',
    });
  }
};

// ==========================================
// 4. UPDATE ORDER
// ==========================================
const updateOrder = async (req, res) => {
  try {
    // Only admin can update orders.
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin can update orders',
      });
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    if (!isUuid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID',
      });
    }

    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status',
      });
    }

    await withTransaction(async (client) => {
      const orderResult = await client.query(
        'SELECT * FROM orders WHERE id = $1 FOR UPDATE',
        [id]
      );
      const order = orderResult.rows[0];

      if (!order) {
        throw new HttpError(404, 'Order not found');
      }

      if (status !== undefined && status !== order.status) {
        // Restore stock when an order is cancelled.
        if (status === 'cancelled' && order.status !== 'cancelled') {
          await client.query(
            `UPDATE products p
             SET stock = p.stock + oi.quantity
             FROM order_items oi
             WHERE oi.order_id = $1 AND p.id = oi.product_id`,
            [id]
          );
        }

        // Deduct stock again if a cancelled order is reopened.
        if (status !== 'cancelled' && order.status === 'cancelled') {
          const itemsResult = await client.query(
            'SELECT * FROM order_items WHERE order_id = $1',
            [id]
          );

          for (const item of itemsResult.rows) {
            if (!item.product_id) continue;

            const stockResult = await client.query(
              `UPDATE products
               SET stock = stock - $1
               WHERE id = $2 AND stock >= $1
               RETURNING id`,
              [item.quantity, item.product_id]
            );

            if (stockResult.rowCount !== 1) {
              throw new HttpError(
                400,
                'Insufficient stock to reopen this order'
              );
            }
          }
        }
      }

      const updates = [];
      const params = [];

      if (status !== undefined) {
        params.push(status);
        updates.push(`status = $${params.length}`);
      }

      if (notes !== undefined) {
        params.push(notes);
        updates.push(`notes = $${params.length}`);
      }

      if (updates.length > 0) {
        params.push(id);
        await client.query(
          `UPDATE orders
           SET ${updates.join(', ')}, updated_at = NOW()
           WHERE id = $${params.length}`,
          params
        );
      }
    });

    const updatedOrder = await fetchOrderById(id);

    return res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: updatedOrder,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error('updateOrder error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update order. Please try again later.',
    });
  }
};

// ==========================================
// 5. DELETE ORDER
// ==========================================
const deleteOrder = async (req, res) => {
  try {
    // Only admin can delete orders.
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin can delete orders',
      });
    }

    const { id } = req.params;

    if (!isUuid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID',
      });
    }

    await withTransaction(async (client) => {
      const orderResult = await client.query(
        'SELECT * FROM orders WHERE id = $1 FOR UPDATE',
        [id]
      );
      const order = orderResult.rows[0];

      if (!order) {
        throw new HttpError(404, 'Order not found');
      }

      // Restore stock if the order was not already cancelled.
      if (order.status !== 'cancelled') {
        await client.query(
          `UPDATE products p
           SET stock = p.stock + oi.quantity
           FROM order_items oi
           WHERE oi.order_id = $1 AND p.id = oi.product_id`,
          [id]
        );
      }

      await client.query('DELETE FROM orders WHERE id = $1', [id]);
    });

    return res.status(200).json({
      success: true,
      message: 'Order deleted successfully',
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error('deleteOrder error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete order',
    });
  }
};

module.exports = {
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
};
