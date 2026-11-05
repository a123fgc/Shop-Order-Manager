
const mongoose = require('mongoose');

// Get models
const getModel = (modelName) => {
  return mongoose.models[modelName] ||
    require('../models/' + modelName);
};

// Dashboard Statistics
const getDashboardStats = async (req, res) => {
  try {
    const Customer = getModel('Customer');
    const Product = getModel('Product');
    const Order = getModel('Order');

    const isAdmin = req.user.role === 'admin';

    // Admin sees all orders; users see only their own orders.
    const orderFilter = isAdmin
      ? {}
      : { user: req.user._id };

    const activeOrderFilter = {
      ...orderFilter,
      status: { $ne: 'cancelled' },
    };

    const [
      totalCustomers,
      totalProducts,
      totalOrders,
      revenueAgg,
      recentOrders,
      ordersByStatus,
      monthlySalesAgg,
    ] = await Promise.all([
      // Total customers
      isAdmin
        ? Customer.countDocuments()
        : Promise.resolve(0),

      // Total products
      Product.countDocuments(),

      // Total orders
      Order.countDocuments(orderFilter),

      // Total revenue (excluding cancelled orders)
      Order.aggregate([
        { $match: activeOrderFilter },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
          },
        },
      ]),

      // Latest 5 orders
      Order.find(orderFilter)
        .populate('customer', 'name email')
        .populate('items.product', 'name price')
        .sort({ createdAt: -1 })
        .limit(5),

      // Orders grouped by status
      Order.aggregate([
        { $match: orderFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),

      // Monthly sales for last 6 months
      (() => {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(
          sixMonthsAgo.getMonth() - 6
        );

        return Order.aggregate([
          {
            $match: {
              ...activeOrderFilter,
              createdAt: { $gte: sixMonthsAgo },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m',
                  date: '$createdAt',
                },
              },
              total: { $sum: '$totalAmount' },
              revenue: { $sum: '$totalAmount' },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]);
      })(),
    ]);

    const totalRevenue =
      revenueAgg.length > 0
        ? revenueAgg[0].totalRevenue
        : 0;

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
    console.error('getDashboardStats error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// Export controller
module.exports = {
  getDashboardStats,
};
