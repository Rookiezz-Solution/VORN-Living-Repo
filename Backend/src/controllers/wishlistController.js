const wishlistModel = require('../models/wishlistModel');

const getWishlist = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        const items = await wishlistModel.getWishlistByUserId(userId);
        res.status(200).json(items);
    } catch (error) {
        console.error("Error fetching wishlist:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

const addToWishlist = async (req, res) => {
    try {
        const { userId, productId } = req.body;
        
        if (!userId || !productId) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const result = await wishlistModel.addToWishlist(userId, productId);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error adding to wishlist:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

const removeFromWishlist = async (req, res) => {
    try {
        const { userId, productId } = req.query;
        
        if (!userId || !productId) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const result = await wishlistModel.removeFromWishlist(userId, productId);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error removing from wishlist:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

const checkWishlistStatus = async (req, res) => {
    try {
        const { userId, productId } = req.query;
        
        if (!userId || !productId) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const exists = await wishlistModel.checkWishlistStatus(userId, productId);
        res.status(200).json({ exists });
    } catch (error) {
        console.error("Error checking wishlist status:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = {
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    checkWishlistStatus
};
