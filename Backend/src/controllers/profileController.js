const profileModel = require('../models/profileModel');
const orderModel = require('../models/orderModel');

const getProfileSummary = async (req, res) => {
    try {
        const userId = req.user.UserID; // Assume auth middleware adds user
        const summary = await profileModel.getProfileSummary(userId);
        res.json(summary);
    } catch (error) {
        console.error("Profile Error:", error);
        res.status(500).json({ message: "Failed to fetch profile" });
    }
};

// Submit a product review for a delivered order item
const submitReview = async (req, res) => {
  try {
    const userId = req.user.UserID;
    const orderId = parseInt(req.params.orderId, 10);
    const orderItemId = parseInt(req.params.orderItemId, 10);
    const { rating, title, description, photoBase64 } = req.body || {};
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: 'rating must be 1-5' });
    const r = require('../config/db').getRequest();
    r.input('userId', userId);
    r.input('orderId', orderId);
    r.input('orderItemId', orderItemId);
    const orderRes = await r.query(`SELECT OrderStatus FROM Orders WHERE OrderID = @orderId AND UserID = @userId`);
    if (orderRes.recordset.length === 0) return res.status(404).json({ message: 'Order not found' });
    const status = String(orderRes.recordset[0].OrderStatus || '');
    if (status !== 'Delivered') return res.status(409).json({ message: 'Reviews allowed only after delivery' });
    const itemRes = await r.query(`SELECT ProductID FROM Order_Items WHERE OrderID = @orderId AND OrderItemID = @orderItemId`);
    if (itemRes.recordset.length === 0) return res.status(404).json({ message: 'Order item not found' });
    const productId = itemRes.recordset[0].ProductID;
    const r2 = require('../config/db').getRequest();
    r2.input('orderId', orderId);
    r2.input('orderItemId', orderItemId);
    const alreadyReviewed = await r2.query(`
      SELECT TOP 1 1 AS X
      FROM Order_Status_History
      WHERE OrderID = @orderId
        AND NewStatus = 'Reviewed'
        AND Remarks LIKE CONCAT('Reviewed OrderItemID=', @orderItemId, '%')
    `);
    if (alreadyReviewed.recordset.length > 0) return res.status(409).json({ message: 'You have already reviewed this item' });
    let photoUrl = null;
    if (photoBase64 && typeof photoBase64 === 'string') {
      try {
        const fs = require('fs');
        const path = require('path');
        const dir = path.join(__dirname, '..', '..', 'uploads', 'reviews');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const filename = `review_${orderId}_${orderItemId}_${Date.now()}.png`;
        const filePath = path.join(dir, filename);
        const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, '');
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        photoUrl = `/uploads/reviews/${filename}`;
      } catch (e) {
        console.error('Failed to save review photo:', e);
      }
    }
    const bodyWithPhoto = photoUrl ? `${description || ''}\n\nPhotoURL: ${photoUrl}` : (description || '');
    const r3 = require('../config/db').getRequest();
    r3.input('productId', productId);
    r3.input('userId', userId);
    r3.input('rating', rating);
    r3.input('title', title || null);
    r3.input('body', bodyWithPhoto || null);
    await r3.query(`
      INSERT INTO Product_Reviews (ProductID, UserID, Rating, ReviewTitle, ReviewBody, IsVerifiedPurchase, CreatedAt)
      VALUES (@productId, @userId, @rating, @title, @body, 1, GETDATE())
    `);
    // Mark this order item as reviewed in Order_Status_History to avoid showing prompt again for this specific item
    const r4 = require('../config/db').getRequest();
    r4.input('orderId', orderId);
    r4.input('remarks', `Reviewed OrderItemID=${orderItemId}`);
    await r4.query(`
      INSERT INTO Order_Status_History (OrderID, OldStatus, NewStatus, Remarks, ChangedAt)
      VALUES (@orderId, 'Delivered', 'Reviewed', @remarks, GETDATE())
    `);
    return res.json({ message: 'Review submitted' });
  } catch (error) {
    console.error('Submit Review Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.UserID;
        const updated = await profileModel.updateProfile(userId, req.body);
        res.json({ message: "Profile updated", user: updated });
    } catch (error) {
        console.error("Profile Update Error:", error);
        res.status(500).json({ message: "Failed to update profile" });
    }
};

const getAddresses = async (req, res) => {
    try {
        const userId = req.user.UserID;
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '10', 10);
        const result = await profileModel.getAddresses(userId, page, limit);
        res.json(result);
    } catch (error) {
        console.error("Address Error:", error);
        res.status(500).json({ message: "Failed to fetch addresses" });
    }
};

const addAddress = async (req, res) => {
    try {
        const userId = req.user.UserID;
        const newAddress = await profileModel.addAddress(userId, req.body);
        res.json({ message: "Address added", address: newAddress });
    } catch (error) {
        console.error("Address Add Error:", error);
        res.status(500).json({ message: "Failed to add address" });
    }
};

const updateAddress = async (req, res) => {
    try {
        const userId = req.user.UserID;
        const addressId = req.params.id;
        await profileModel.updateAddress(userId, addressId, req.body);
        res.json({ message: "Address updated" });
    } catch (error) {
        console.error("Address Update Error:", error);
        res.status(500).json({ message: "Failed to update address" });
    }
};

const deleteAddress = async (req, res) => {
    try {
        const userId = req.user.UserID;
        const addressId = req.params.id;
        await profileModel.deleteAddress(userId, addressId);
        res.json({ message: "Address deleted" });
    } catch (error) {
        console.error("Address Delete Error:", error);
        if (error && (error.code === 'ADDRESS_IN_USE' || error.message === 'ADDRESS_IN_USE')) {
            return res.status(409).json({ message: "This address is used in past orders and cannot be deleted." });
        }
        res.status(500).json({ message: "Failed to delete address" });
    }
};

const getOrders = async (req, res) => {
    try {
        const userId = req.user.UserID;
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '10', 10);
        const result = await profileModel.getOrders(userId, page, limit);
        res.json(result);
    } catch (error) {
        console.error("Orders Error:", error);
        res.status(500).json({ message: "Failed to fetch orders" });
    }
};

const getOrderDetails = async (req, res) => {
    try {
        const userId = req.user.UserID;
        const orderId = req.params.id;
        const details = await profileModel.getOrderDetails(userId, orderId);
        if (!details) return res.status(404).json({ message: "Order not found" });
        res.json(details);
    } catch (error) {
        console.error("Order Detail Error:", error);
        res.status(500).json({ message: "Failed to fetch order details" });
    }
};

module.exports = {
    getProfileSummary,
    updateProfile,
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    getOrders,
    getOrderDetails,
    submitReview
};

// Replacement selection (customer chooses a new product for an approved replacement)
module.exports.selectReplacement = async (req, res) => {
    try {
        const userId = req.user.UserID;
        const orderId = parseInt(req.params.orderId, 10);
        const orderItemId = parseInt(req.params.orderItemId, 10);
        const { productId, variantId } = req.body || {};
        const mode = (req.query.mode || 'same').toLowerCase();
        if (!productId) return res.status(400).json({ message: 'productId is required' });
        const result = await orderModel.selectReplacement(userId, orderId, orderItemId, productId, variantId || null, mode);
        return res.json({ message: 'Replacement applied', ...result });
    } catch (error) {
        if (error.code === 'REPLACEMENT_NOT_APPROVED') {
            return res.status(409).json({ message: 'Replacement not approved yet' });
        }
        if (error.code === 'ORDER_NOT_FOUND') {
            return res.status(404).json({ message: 'Order not found' });
        }
        if (error.code === 'ORDER_ITEM_NOT_FOUND') {
            return res.status(404).json({ message: 'Order item not found' });
        }
        if (error.code === 'PRODUCT_NOT_FOUND' || error.code === 'VARIANT_NOT_FOUND') {
            return res.status(404).json({ message: 'Selected product or variant not found' });
        }
        console.error('Select Replacement Error:', error);
        return res.status(500).json({ message: 'Server Error' });
    }
};
