const mongoose = require('mongoose');

// Safe model retrieval with fallback
const getModel = (name) => {
  if (mongoose.models[name]) return mongoose.models[name];
  switch (name) {
    case 'Customer':
      return require('./customerController').Customer;
    case 'Product':
      return require('./productController').Product;
    case 'Order':
      return require('./orderController').Order;
    case 'User':
      return require('./authController').User;
    default:
      return mongoose.model(name);
  }
};

// ── Controllers ─────────────────────────────────────────────────────────────

// @desc    Get dashboard stats
// @route   GET /api/reports/dashboard
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const Customer = getModel('Customer');
    const Product = getModel('Product');
    const Order = getModel('Order');

    const [totalCustomers, totalProducts, totalOrders, revenueAgg] = await Promise.all([
      Customer.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
      ]),
    ]);

    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;

    // Recent orders
    const recentOrders = await Order.find()
      .populate('customer', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    // Orders by status
    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Monthly sales for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlySalesAgg = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
          status: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          total: { $sum: '$totalAmount' },
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const monthlySales = monthlySalesAgg.map((item) => ({
      month: item._id,
      total: item.total,
      revenue: item.revenue,
      count: item.count,
    }));

    const statsData = {
      totalCustomers,
      totalProducts,
      totalOrders,
      totalRevenue,
      recentOrders,
      ordersByStatus,
      monthlySales,
      salesData: monthlySales,
    };

    res.json({
      success: true,
      ...statsData,
      data: statsData,
    });
  } catch (error) {
    console.error('getDashboardStats error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get sales report (orders grouped by date range with totals)
// @route   GET /api/reports/sales?startDate=...&endDate=...&groupBy=day|month
// @access  Private
const getSalesReport = async (req, res) => {
  try {
    const Order = getModel('Order');

    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    const groupBy = req.query.groupBy || 'day';

    let dateFormat;
    if (groupBy === 'month') {
      dateFormat = '%Y-%m';
    } else {
      dateFormat = '%Y-%m-%d';
    }

    const salesDataRaw = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          totalSales: { $sum: '$totalAmount' },
          total: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const salesData = salesDataRaw.map((d) => ({
      date: d._id,
      month: d._id,
      total: d.totalSales,
      totalSales: d.totalSales,
      orderCount: d.orderCount,
    }));

    const totalRevenue = salesData.reduce((sum, d) => sum + d.totalSales, 0);
    const totalOrders = salesData.reduce((sum, d) => sum + d.orderCount, 0);

    const reportData = {
      sales: salesData,
      salesData,
      summary: {
        totalRevenue,
        totalOrders,
        startDate,
        endDate,
      },
    };

    res.json({
      success: true,
      ...reportData,
      data: reportData,
    });
  } catch (error) {
    console.error('getSalesReport error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get top-selling products
// @route   GET /api/reports/top-products?limit=10
// @access  Private
const getTopProducts = async (req, res) => {
  try {
    const Order = getModel('Order');
    const limit = parseInt(req.query.limit, 10) || 10;

    const topProducts = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $project: {
          _id: 1,
          name: '$product.name',
          productName: '$product.name',
          category: '$product.category',
          totalSold: '$totalQuantity',
          totalQuantity: 1,
          totalRevenue: 1,
          orderCount: 1,
        },
      },
    ]);

    res.json({
      success: true,
      products: topProducts,
      data: topProducts,
    });
  } catch (error) {
    console.error('getTopProducts error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get top customers (by order count & spend)
// @route   GET /api/reports/top-customers?limit=10
// @access  Private
const getTopCustomers = async (req, res) => {
  try {
    const Order = getModel('Order');
    const limit = parseInt(req.query.limit, 10) || 10;

    const topCustomers = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$customer',
          totalSpent: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customer',
        },
      },
      { $unwind: '$customer' },
      {
        $project: {
          _id: 1,
          name: '$customer.name',
          customerName: '$customer.name',
          email: '$customer.email',
          phone: '$customer.phone',
          totalSpent: 1,
          orderCount: 1,
        },
      },
    ]);

    res.json({
      success: true,
      customers: topCustomers,
      data: topCustomers,
    });
  } catch (error) {
    console.error('getTopCustomers error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getDashboardStats, getSalesReport, getTopProducts, getTopCustomers };
