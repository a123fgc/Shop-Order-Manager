// const express = require('express');
// const router = express.Router();
// const {
//   getDashboardStats,
//   getSalesReport,
//   getTopProducts,
//   getTopCustomers,
// } = require('../controllers/reportController');
// const { protect } = require('../middleware/authMiddleware');

// router.use(protect);

// router.get('/dashboard', getDashboardStats);
// router.get('/sales', getSalesReport);
// router.get('/top-products', getTopProducts);
// router.get('/top-customers', getTopCustomers);

// module.exports = router;

const express = require('express');
const router = express.Router();

const {
  getDashboardStats,
} = require('../controllers/reportController');

const { protect } = require('../middleware/authMiddleware');

// Protect all report routes
router.use(protect);

// Dashboard route
router.get('/dashboard', getDashboardStats);

module.exports = router;
