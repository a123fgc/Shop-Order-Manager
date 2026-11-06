const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
// const { protect } = require('../middleware/authMiddleware');

// router.use(protect);
const {
  protect,
  authorize
} = require('../middleware/authMiddleware');

router.get('/', protect, authorize('admin'), getProducts);
router.post('/', protect, authorize('admin'), createProduct);
router.put('/:id', protect, authorize('admin'), updateProduct);
router.delete('/:id', protect, authorize('admin'), deleteProduct);

// router.route('/').get(getProducts).post(createProduct);
// router.route('/:id').get(getProduct).put(updateProduct).delete(deleteProduct);

module.exports = router;
