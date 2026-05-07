const { getRequest, sql } = require('../config/db');
const { hasColumn } = require('../lib/dbSchema');

const getWishlistByUserId = async (userId) => {
    const request = getRequest();
    request.input('userId', userId);
    const hasDisplayOrder = await hasColumn('Product_Images', 'DisplayOrder');
    const imageTop1Sql = hasDisplayOrder
        ? `(SELECT TOP 1 ImageURL FROM Product_Images WHERE ProductID = p.ProductID ORDER BY ISNULL(DisplayOrder, 0), CreatedAt, ImageID)`
        : `(SELECT TOP 1 ImageURL FROM Product_Images WHERE ProductID = p.ProductID ORDER BY CreatedAt, ImageID)`;
    const result = await request.query(`
        SELECT 
            w.WishlistID,
            w.UserID,
            w.ProductID,
            w.AddedAt,
            p.ProductName,
            p.ProductSlug,
            p.RegularPrice,
            p.SalePrice,
            ${imageTop1Sql} as ImageURL,
            c.CategoryName
        FROM Wishlist w
        JOIN Products p ON w.ProductID = p.ProductID
        JOIN Categories c ON p.CategoryID = c.CategoryID
        WHERE w.UserID = @userId
        ORDER BY w.AddedAt DESC
    `);
    return result.recordset;
};

const addToWishlist = async (userId, productId) => {
    const request = getRequest();
    request.input('userId', userId);
    request.input('productId', productId);
    
    // Check if already exists
    const check = await request.query(`
        SELECT WishlistID FROM Wishlist 
        WHERE UserID = @userId AND ProductID = @productId
    `);

    if (check.recordset.length > 0) {
        return { message: "Product already in wishlist", alreadyExists: true };
    }

    await request.query(`
        INSERT INTO Wishlist (UserID, ProductID, AddedAt)
        VALUES (@userId, @productId, GETDATE())
    `);
    return { message: "Product added to wishlist", success: true };
};

const removeFromWishlist = async (userId, productId) => {
    const request = getRequest();
    request.input('userId', userId);
    request.input('productId', productId);
    
    await request.query(`
        DELETE FROM Wishlist 
        WHERE UserID = @userId AND ProductID = @productId
    `);
    return { message: "Product removed from wishlist", success: true };
};

const checkWishlistStatus = async (userId, productId) => {
    const request = getRequest();
    request.input('userId', userId);
    request.input('productId', productId);
    
    const result = await request.query(`
        SELECT WishlistID FROM Wishlist 
        WHERE UserID = @userId AND ProductID = @productId
    `);
    return result.recordset.length > 0;
};

module.exports = {
    getWishlistByUserId,
    addToWishlist,
    removeFromWishlist,
    checkWishlistStatus
};
