const { getRequest, sql } = require('../config/db');
const { hasColumn } = require('../lib/dbSchema');

const getCartByUserId = async (userId, guestToken) => {
    const request = getRequest();
    request.input('userId', userId || null);
    request.input('guestToken', guestToken || null);

    let query = `SELECT * FROM Cart WHERE `;
    if (userId) {
        query += `UserID = @userId`;
    } else if (guestToken) {
        query += `GuestSessionToken = @guestToken`;
    } else {
        return null;
    }
    
    try {
        const result = await request.query(query);
        return result.recordset[0];
    } catch (err) {
        console.error("DB Error in getCartByUserId:", err);
        return null;
    }
};

const createCart = async (userId, guestToken) => {
    const request = getRequest();
    request.input('userId', userId || null);
    request.input('guestToken', guestToken || null);
    
    try {
        const result = await request.query(`
            INSERT INTO Cart (UserID, GuestSessionToken, CreatedAt, UpdatedAt)
            OUTPUT inserted.*
            VALUES (@userId, @guestToken, GETDATE(), GETDATE())
        `);
        return result.recordset[0];
    } catch (err) {
        console.error("DB Error in createCart:", err);
        throw err;
    }
};

const getCartItems = async (cartId) => {
    const request = getRequest();
    request.input('cartId', cartId);
    const hasDisplayOrder = await hasColumn('Product_Images', 'DisplayOrder');
    const imageTop1Sql = hasDisplayOrder
        ? `(SELECT TOP 1 ImageURL FROM Product_Images WHERE ProductID = p.ProductID ORDER BY ISNULL(DisplayOrder, 0), CreatedAt, ImageID)`
        : `(SELECT TOP 1 ImageURL FROM Product_Images WHERE ProductID = p.ProductID ORDER BY CreatedAt, ImageID)`;
    const result = await request.query(`
        SELECT 
            ci.CartItemID,
            ci.CartID,
            ci.ProductID,
            ci.VariantID,
            ci.Quantity,
            ci.UnitPrice,
            ci.TotalPrice,
            p.ProductName,
            p.ProductSlug,
            ${imageTop1Sql} as ImageURL,
            c.CategoryName,
            pv.VariantName,
            pv.VariantSKU
        FROM Cart_Items ci
        JOIN Products p ON ci.ProductID = p.ProductID
        JOIN Categories c ON p.CategoryID = c.CategoryID
        LEFT JOIN Product_Variants pv ON ci.VariantID = pv.VariantID
        WHERE ci.CartID = @cartId
    `);
    return result.recordset;
};

const addItemToCart = async (cartId, productId, variantId, quantity, unitPrice) => {
    const request = getRequest();
    request.input('cartId', cartId);
    request.input('productId', productId);
    request.input('variantId', variantId || null);
    request.input('quantity', quantity);
    request.input('unitPrice', unitPrice);

    // Check if item exists
    const checkResult = await request.query(`
        SELECT CartItemID, Quantity FROM Cart_Items 
        WHERE CartID = @cartId AND ProductID = @productId
          AND ( ( @variantId IS NULL AND VariantID IS NULL ) OR VariantID = @variantId )
    `);

    if (checkResult.recordset.length > 0) {
        // Update existing
        const existingItem = checkResult.recordset[0];
        const newQuantity = existingItem.Quantity + quantity;
        const newTotalPrice = newQuantity * unitPrice;
        
        request.input('cartItemID', existingItem.CartItemID);
        request.input('newQuantity', newQuantity);
        request.input('newTotalPrice', newTotalPrice);

        await request.query(`
            UPDATE Cart_Items 
            SET Quantity = @newQuantity, TotalPrice = @newTotalPrice 
            WHERE CartItemID = @cartItemID
        `);
    } else {
        // Insert new
        const totalPrice = quantity * unitPrice;
        request.input('totalPrice', totalPrice);
        await request.query(`
            INSERT INTO Cart_Items (CartID, ProductID, VariantID, Quantity, UnitPrice, TotalPrice, AddedAt)
            VALUES (@cartId, @productId, @variantId, @quantity, @unitPrice, @totalPrice, GETDATE())
        `);
    }
};

const updateCartItemQuantity = async (cartItemId, quantity) => {
    const request = getRequest();
    request.input('cartItemId', cartItemId);
    request.input('quantity', quantity);
    
    // Get unit price to update total price
    const itemResult = await request.query(`SELECT UnitPrice FROM Cart_Items WHERE CartItemID = @cartItemId`);
    if (itemResult.recordset.length === 0) return;
    
    const unitPrice = itemResult.recordset[0].UnitPrice;
    const totalPrice = quantity * unitPrice;
    request.input('totalPrice', totalPrice);

    await request.query(`
        UPDATE Cart_Items 
        SET Quantity = @quantity, TotalPrice = @totalPrice
        WHERE CartItemID = @cartItemId
    `);
};

const removeItemFromCart = async (cartItemId) => {
    const request = getRequest();
    request.input('cartItemId', cartItemId);
    await request.query(`DELETE FROM Cart_Items WHERE CartItemID = @cartItemId`);
};

const updateCartTotals = async (cartId) => {
    const request = getRequest();
    request.input('cartId', cartId);
    
    await request.query(`
        UPDATE Cart
        SET 
            SubTotal = (SELECT ISNULL(SUM(TotalPrice), 0) FROM Cart_Items WHERE CartID = @cartId),
            TotalAmount = (SELECT ISNULL(SUM(TotalPrice), 0) FROM Cart_Items WHERE CartID = @cartId) + ShippingAmount + TaxAmount - DiscountAmount,
            UpdatedAt = GETDATE()
        WHERE CartID = @cartId
    `);
};

module.exports = {
    getCartByUserId,
    createCart,
    getCartItems,
    addItemToCart,
    updateCartItemQuantity,
    removeItemFromCart,
    updateCartTotals
};
