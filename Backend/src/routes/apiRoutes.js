const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const categoryController = require('../controllers/categoryController');
const wishlistController = require('../controllers/wishlistController');
const authController = require('../controllers/authController');
const orderController = require('../controllers/orderController');
const cartController = require('../controllers/cartController');
const profileController = require('../controllers/profileController');
const newsletterController = require('../controllers/newsletterController');
const reviewController = require('../controllers/reviewController');
const authenticateUser = require('../middleware/authMiddleware');
const adminAuthController = require('../controllers/adminAuthController');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');
const adminProductController = require('../controllers/adminProductController');
const adminMediaController = require('../controllers/adminMediaController');
const adminVariantController = require('../controllers/adminVariantController');
const adminCategoryController = require('../controllers/adminCategoryController');
const adminOrderController = require('../controllers/adminOrderController');
const adminReturnController = require('../controllers/adminReturnController');
const adminReviewController = require('../controllers/adminReviewController');
const adminNewsletterController = require('../controllers/adminNewsletterController');
const adminDashboardController = require('../controllers/adminDashboardController');

// Product Routes
router.get('/products', productController.getAllProducts);
router.post('/products/filter', productController.getAllProducts); // New POST route for filtering
router.get('/products/:id', productController.getProduct);
router.get('/products/:id/availability', productController.getAvailability);

// Category Routes
router.get('/categories', categoryController.getCategories);

// Reviews (Public)
router.get('/reviews/recent', reviewController.recent);

// Cart Routes
router.get('/cart', cartController.getCart);
router.post('/cart/add', cartController.addToCart);
router.put('/cart/item/:id', cartController.updateCartItem);
router.delete('/cart/item/:id', cartController.removeCartItem);

// Wishlist Routes
router.get('/wishlist', wishlistController.getWishlist);
router.post('/wishlist/add', wishlistController.addToWishlist);
router.delete('/wishlist/remove', wishlistController.removeFromWishlist);
router.get('/wishlist/check', wishlistController.checkWishlistStatus);

// Auth Routes - Email OTP Flow
router.post('/auth/check-user', authController.checkUserExists);
router.post('/auth/send-otp', authController.sendEmailOtp);
router.post('/auth/verify-otp', authController.verifyEmailOtp);
router.post('/auth/register', authController.registerUser);

// Profile Routes (Protected)
router.use('/profile', authenticateUser);
router.get('/profile', profileController.getProfileSummary);
router.put('/profile', profileController.updateProfile);
router.get('/profile/addresses', profileController.getAddresses);
router.post('/profile/addresses', profileController.addAddress);
router.put('/profile/addresses/:id', profileController.updateAddress);
router.delete('/profile/addresses/:id', profileController.deleteAddress);
router.get('/profile/orders', profileController.getOrders);
router.get('/profile/orders/:id', profileController.getOrderDetails);
router.post('/profile/orders/:orderId/items/:orderItemId/review', authenticateUser, profileController.submitReview);
router.post('/profile/orders/:orderId/items/:orderItemId/replace-select', authenticateUser, profileController.selectReplacement);

// Order Routes
router.post('/orders', orderController.placeOrder);
router.post('/orders/:id/cancel', authenticateUser, orderController.cancelOrder);
router.post('/orders/:id/replace', authenticateUser, orderController.requestReplacement);

// Newsletter Route
router.post('/newsletter/subscribe', newsletterController.subscribe);

// Admin Auth Routes
router.post('/admin/auth/login', adminAuthController.login);
router.get('/admin/auth/me', adminAuthController.me);
router.post('/admin/auth/logout', adminAuthController.logout);
router.post('/admin/auth/bootstrap', adminAuthController.bootstrap);

router.post('/admin/products', adminAuthMiddleware, adminProductController.create);
router.put('/admin/products/:id', adminAuthMiddleware, adminProductController.update);
router.get('/admin/products', adminAuthMiddleware, adminProductController.list);
router.get('/admin/products/:id', adminAuthMiddleware, adminProductController.get);
router.delete('/admin/products/:id', adminAuthMiddleware, adminProductController.remove);

router.post('/admin/products/:id/images', adminAuthMiddleware, adminMediaController.addImages);
router.post('/admin/products/:id/videos', adminAuthMiddleware, adminMediaController.addVideos);
router.put('/admin/product-images/:imageId/order', adminAuthMiddleware, adminMediaController.reorderImage);
router.delete('/admin/product-images/:imageId', adminAuthMiddleware, adminMediaController.deleteImage);
router.post('/admin/products/:id/highlights', adminAuthMiddleware, adminMediaController.addHighlights);
router.post('/admin/products/:id/specifications', adminAuthMiddleware, adminMediaController.addSpecifications);
router.post('/admin/products/:id/images/upload', adminAuthMiddleware, adminMediaController.addImageUploads);
router.post('/admin/products/:id/videos/upload', adminAuthMiddleware, adminMediaController.addVideoUploads);
router.post('/admin/products/:id/attributes', adminAuthMiddleware, adminVariantController.addAttributes);
router.post('/admin/products/:id/variants', adminAuthMiddleware, adminVariantController.addVariants);

// Admin Category CRUD
router.get('/admin/categories', adminAuthMiddleware, adminCategoryController.list);
router.get('/admin/categories/:id', adminAuthMiddleware, adminCategoryController.get);
router.post('/admin/categories', adminAuthMiddleware, adminCategoryController.create);
router.put('/admin/categories/:id', adminAuthMiddleware, adminCategoryController.update);
router.delete('/admin/categories/:id', adminAuthMiddleware, adminCategoryController.remove);
router.post('/admin/categories/:id/image/upload', adminAuthMiddleware, adminCategoryController.uploadImage);

// Admin Orders
router.get('/admin/orders', adminAuthMiddleware, adminOrderController.list);
router.get('/admin/orders/:id', adminAuthMiddleware, adminOrderController.get);
router.put('/admin/orders/:id/status', adminAuthMiddleware, adminOrderController.updateStatus);
router.put('/admin/orders/:id/tracking', adminAuthMiddleware, adminOrderController.updateTracking);

// Admin Returns (Replacements)
router.get('/admin/returns', adminAuthMiddleware, adminReturnController.list);
router.get('/admin/returns/:id', adminAuthMiddleware, adminReturnController.get);
router.put('/admin/returns/:id/status', adminAuthMiddleware, adminReturnController.setStatus);

// Admin Reviews
router.get('/admin/reviews', adminAuthMiddleware, adminReviewController.list);
router.get('/admin/reviews/:id', adminAuthMiddleware, adminReviewController.get);
router.delete('/admin/reviews/:id', adminAuthMiddleware, adminReviewController.remove);

// Admin Newsletter
router.get('/admin/newsletter', adminAuthMiddleware, adminNewsletterController.list);
router.put('/admin/newsletter/:id/toggle', adminAuthMiddleware, adminNewsletterController.toggle);
router.delete('/admin/newsletter/:id', adminAuthMiddleware, adminNewsletterController.remove);
router.get('/admin/newsletter/export', adminAuthMiddleware, adminNewsletterController.exportCsv);

// Settings routes removed per request

// Admin Dashboard Summary
router.get('/admin/dashboard/summary', adminAuthMiddleware, adminDashboardController.summary);
router.get('/admin/dashboard/carriers', adminAuthMiddleware, adminDashboardController.carriers);
router.get('/admin/dashboard/top-products', adminAuthMiddleware, adminDashboardController.topProducts);
router.get('/admin/dashboard/low-stock', adminAuthMiddleware, adminDashboardController.lowStock);

module.exports = router;
