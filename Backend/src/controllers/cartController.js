const cartModel = require('../models/cartModel');
const productModel = require('../models/productModel');

const getCart = async (req, res) => {
    try {
        const { userId, guestToken } = req.query;
        if (!userId && !guestToken) {
            // Instead of error, return empty cart if no identifiers
            return res.status(200).json({ cartId: null, items: [], totals: { subTotal: 0, total: 0 } });
        }

        let cart = await cartModel.getCartByUserId(userId, guestToken);
        if (!cart) {
            // If no cart exists, return empty structure
            return res.status(200).json({ cartId: null, items: [], totals: { subTotal: 0, total: 0 } });
        }
        
        const items = await cartModel.getCartItems(cart.CartID);
        
        // Calculate derived totals (or rely on DB stored totals if updated)
        const response = {
            cartId: cart.CartID,
            items: items.map(item => ({
                id: item.CartItemID,
                productId: item.ProductID,
                name: item.ProductName,
                slug: item.ProductSlug,
                image: item.ImageURL,
                category: item.CategoryName,
                variantId: item.VariantID || null,
                variantName: item.VariantName || null,
                variantSku: item.VariantSKU || null,
                price: item.UnitPrice,
                quantity: item.Quantity,
                total: item.TotalPrice
            })),
            totals: {
                subTotal: cart.SubTotal,
                shipping: cart.ShippingAmount,
                tax: cart.TaxAmount,
                discount: cart.DiscountAmount,
                total: cart.TotalAmount
            }
        };

        res.status(200).json(response);
    } catch (error) {
        console.error("Error fetching cart:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

const addToCart = async (req, res) => {
    try {
        const { userId, guestToken, productId, variantId, quantity } = req.body;
        
        if ((!userId && !guestToken) || !productId || !quantity) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // 1. Get or Create Cart
        let cart = await cartModel.getCartByUserId(userId, guestToken);
        if (!cart) {
            cart = await cartModel.createCart(userId, guestToken);
        }

        // 2. Get Product/Variant Price (Real-time price check)
        const product = await productModel.getProductById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        let price = product.SalePrice || product.RegularPrice;
        if (variantId) {
            const v = (product.variants || []).find(x => String(x.VariantID) === String(variantId));
            if (v) {
                price = v.SalePrice || v.RegularPrice || price;
            }
        }

        // 3. Add Item
        await cartModel.addItemToCart(cart.CartID, productId, variantId || null, quantity, price);

        // 4. Update Cart Totals
        await cartModel.updateCartTotals(cart.CartID);

        res.status(200).json({ message: "Item added to cart" });
    } catch (error) {
        console.error("Error adding to cart:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

const updateCartItem = async (req, res) => {
    try {
        const { id } = req.params; // CartItemID
        const { quantity, cartId } = req.body;

        if (!quantity || quantity < 1) {
            return res.status(400).json({ message: "Invalid quantity" });
        }

        await cartModel.updateCartItemQuantity(id, quantity);
        
        if (cartId) {
            await cartModel.updateCartTotals(cartId);
        }

        res.status(200).json({ message: "Cart updated" });
    } catch (error) {
        console.error("Error updating cart item:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

const removeCartItem = async (req, res) => {
    try {
        const { id } = req.params; // CartItemID
        const { cartId } = req.query; // Pass cartId to update totals

        await cartModel.removeItemFromCart(id);
        
        if (cartId) {
            await cartModel.updateCartTotals(cartId);
        }

        res.status(200).json({ message: "Item removed" });
    } catch (error) {
        console.error("Error removing item:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    removeCartItem
};
