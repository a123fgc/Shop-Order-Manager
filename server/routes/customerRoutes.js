const express = require('express');
const router = express.Router();
const {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// router.route('/').get(getCustomers).post(createCustomer);
// router.route('/:id').get(getCustomer).put(updateCustomer).delete(deleteCustomer);
router.get('/', protect, authorize('admin'), getCustomers);
router.post('/', protect, authorize('admin'), createCustomer);
router.put('/:id', protect, authorize('admin'), updateCustomer);
router.delete('/:id', protect, authorize('admin'), deleteCustomer);
module.exports = router;
