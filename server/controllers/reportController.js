const { query } = require('../config/db');
const { mapOrder } = require('../utils/mappers');
const {
  ORDER_SELECT,
  buildOrderScope,
  addDateRange,
} = require('../utils/orderQueries');
const { isDateString, toNumber } = require('../utils/validators');

function getDateRange(req) {
  return {
    startDate: isDateString(req.query.startDate) ? req.query.startDate : '',
    endDate: isDateString(req.query.endDate) ? req.query.endDate : '',
  };
}

// ── Dashboard Statistics ────────────────────────────────────────────────────
const getDashboardStats = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';

    const orderScope = buildOrderScope(req);
    const activeScope = buildOrderScope(req, { activeOnly: true });
    const monthlyScope = buildOrderScope(req, { activeOnly: true });

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    monthlyScope.params.push(sixMonthsAgo);
    const monthlyWhere = `${monthlyScope.where} AND o.created_at >= $${monthlyScope.params.length}`;

    const [
      customersResult,
      productsResult,
      ordersResult,
      revenueResult,
      recentResult,
      statusResult,
      monthlyResult,
    ] = await Promise.all([
      // Total customers (only shown to admins)
      isAdmin
        ? query('SELECT COUNT(*)::int AS total FROM customers')
        : Promise.resolve({ rows: [{ total: 0 }] }),

      // Total products
      query('SELECT COUNT(*)::int AS total FROM products'),

      // Total orders visible to this user
      query(
        `SELECT COUNT(*)::int AS total FROM orders o ${orderScope.where}`,
        orderScope.params
      ),

      // Total revenue excluding cancelled orders
      query(
        `SELECT COALESCE(SUM(o.total_amount), 0) AS total
         FROM orders o ${activeScope.where}`,
        activeScope.params
      ),

      // Latest 5 orders
      query(
        `${ORDER_SELECT}
         ${orderScope.where}
         ORDER BY o.created_at DESC, o.id DESC
         LIMIT 5`,
        orderScope.params
      ),

      // Orders grouped by status
      query(
        `SELECT o.status AS _id, COUNT(*)::int AS count
         FROM orders o ${orderScope.where}
         GROUP BY o.status
         ORDER BY count DESC`,
        orderScope.params
      ),

      // Monthly sales for the last 6 months
      query(
        `SELECT
           to_char(o.created_at, 'YYYY-MM') AS month,
           COALESCE(SUM(o.total_amount), 0) AS total,
           COUNT(*)::int AS count
         FROM orders o
         ${monthlyWhere}
         GROUP BY 1
         ORDER BY 1 ASC`,
        monthlyScope.params
      ),
    ]);

    const totalRevenue = toNumber(revenueResult.rows[0]?.total);
    const recentOrders = recentResult.rows.map(mapOrder);

    const monthlySales = monthlyResult.rows.map((row) => ({
      month: row.month,
      total: toNumber(row.total),
      revenue: toNumber(row.total),
      count: row.count,
    }));

    const statsData = {
      totalCustomers: customersResult.rows[0]?.total || 0,
      totalProducts: productsResult.rows[0]?.total || 0,
      totalOrders: ordersResult.rows[0]?.total || 0,
      totalRevenue,
      recentOrders,
      ordersByStatus: statusResult.rows,
      monthlySales,
      salesData: monthlySales,
    };

    res.json({
      success: true,
      ...statsData,
      data: statsData,
    });
  } catch (error) {
    console.error('getDashboardStats error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ── Sales Report (daily) ────────────────────────────────────────────────────
const getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(req);

    const scope = addDateRange(
      buildOrderScope(req, { activeOnly: true }),
      startDate,
      endDate
    );

    const result = await query(
      `SELECT
         to_char(o.created_at::date, 'YYYY-MM-DD') AS date,
         COALESCE(SUM(o.total_amount), 0) AS total,
         COUNT(*)::int AS count
       FROM orders o
       ${scope.where}
       GROUP BY o.created_at::date
       ORDER BY o.created_at::date ASC`,
      scope.params
    );

    const sales = result.rows.map((row) => ({
      date: row.date,
      total: toNumber(row.total),
      revenue: toNumber(row.total),
      count: row.count,
    }));

    res.json({
      success: true,
      sales,
      salesData: sales,
    });
  } catch (error) {
    console.error('getSalesReport error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Top Selling Products ────────────────────────────────────────────────────
const getTopProducts = async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(req);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 5));

    const scope = addDateRange(
      buildOrderScope(req, { activeOnly: true }),
      startDate,
      endDate
    );

    scope.params.push(limit);

    const result = await query(
      `SELECT
         p.id AS _id,
         p.name,
         SUM(oi.quantity)::int AS total_sold,
         COALESCE(SUM(oi.quantity * oi.price), 0) AS revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
       ${scope.where}
       GROUP BY p.id, p.name
       ORDER BY total_sold DESC, revenue DESC
       LIMIT $${scope.params.length}`,
      scope.params
    );

    const products = result.rows.map((row) => ({
      _id: row._id,
      name: row.name,
      totalSold: toNumber(row.total_sold),
      revenue: toNumber(row.revenue),
    }));

    res.json({ success: true, products, data: products });
  } catch (error) {
    console.error('getTopProducts error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Top Customers ───────────────────────────────────────────────────────────
const getTopCustomers = async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(req);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 5));

    const scope = addDateRange(
      buildOrderScope(req, { activeOnly: true }),
      startDate,
      endDate
    );

    scope.params.push(limit);

    const result = await query(
      `SELECT
         c.id AS _id,
         c.name,
         COALESCE(SUM(o.total_amount), 0) AS total_spent,
         COUNT(o.id)::int AS order_count
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       ${scope.where}
       GROUP BY c.id, c.name
       ORDER BY total_spent DESC
       LIMIT $${scope.params.length}`,
      scope.params
    );

    const customers = result.rows.map((row) => ({
      _id: row._id,
      name: row.name,
      totalSpent: toNumber(row.total_spent),
      orderCount: row.order_count,
    }));

    res.json({ success: true, customers, data: customers });
  } catch (error) {
    console.error('getTopCustomers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getDashboardStats,
  getSalesReport,
  getTopProducts,
  getTopCustomers,
};
