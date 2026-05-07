const { getRequest, sql } = require('../config/db');
const { hasColumn } = require('../lib/dbSchema');

// Get Profile Dashboard Summary
const getProfileSummary = async (userId) => {
    const request = getRequest();
    request.input('userId', userId);
    
    // User Details
    const userResult = await request.query(`SELECT * FROM Users WHERE UserID = @userId`);
    const user = userResult.recordset[0];

    // Counts
    const ordersCountResult = await request.query(`SELECT COUNT(*) AS Count FROM Orders WHERE UserID = @userId`);
    const wishlistCountResult = await request.query(`SELECT COUNT(*) AS Count FROM Wishlist WHERE UserID = @userId`);
    const addressCountResult = await request.query(`SELECT COUNT(*) AS Count FROM User_Addresses WHERE UserID = @userId`);
    
    // Pending Orders (Assuming 'Pending' or 'Processing' status)
    const pendingOrdersResult = await request.query(`SELECT COUNT(*) AS Count FROM Orders WHERE UserID = @userId AND OrderStatus IN ('Pending', 'Processing')`);

    return {
        user,
        counts: {
            orders: ordersCountResult.recordset[0].Count,
            pendingOrders: pendingOrdersResult.recordset[0].Count,
            wishlist: wishlistCountResult.recordset[0].Count,
            addresses: addressCountResult.recordset[0].Count
        }
    };
};

// Update Profile Info
const updateProfile = async (userId, data) => {
    const request = getRequest();
    request.input('userId', userId);
    request.input('fullName', data.fullName);
    request.input('email', data.email);
    request.input('phoneNumber', data.phoneNumber);
    // ProfileImageURL not handled for now as file upload is separate logic, but can be added if URL is passed
    
    await request.query(`
        UPDATE Users 
        SET FullName = @fullName, Email = @email, PhoneNumber = @phoneNumber, UpdatedAt = GETDATE()
        WHERE UserID = @userId
    `);
    
    const updatedUser = await request.query(`SELECT * FROM Users WHERE UserID = @userId`);
    return updatedUser.recordset[0];
};

// Get User Addresses (paginated)
const getAddresses = async (userId, page = 1, limit = 10) => {
    const request = getRequest();
    request.input('userId', userId);
    request.input('offset', (page - 1) * limit);
    request.input('limit', limit);
    const hasIsActive = await hasColumn('User_Addresses', 'IsActive');
    const activeWhere = hasIsActive ? `AND ISNULL(ua.IsActive, 1) = 1` : '';
    const result = await request.query(`
        SELECT 
            COUNT(*) OVER() as TotalCount,
            ua.*
        FROM User_Addresses ua
        WHERE ua.UserID = @userId
          ${activeWhere}
        ORDER BY ua.IsDefault DESC, ua.AddressID DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    return {
        items: result.recordset.map(r => {
            const { TotalCount, ...rest } = r;
            return rest;
        }),
        totalCount: result.recordset.length > 0 ? result.recordset[0].TotalCount : 0,
        page,
        limit
    };
};

// Add Address
const addAddress = async (userId, address) => {
    const request = getRequest();
    request.input('userId', userId);
    request.input('addressLabel', address.addressLabel || 'Home');
    request.input('fullName', address.fullName);
    request.input('phoneNumber', address.phoneNumber);
    request.input('addressLine1', address.streetAddress1);
    request.input('addressLine2', address.streetAddress2 || null);
    request.input('city', address.city);
    request.input('state', address.state);
    request.input('pinCode', address.postalCode);
    request.input('country', address.country || 'India');
    request.input('isDefault', address.isDefault ? 1 : 0);

    // If setting as default, unset others first
    if (address.isDefault) {
        await request.query(`UPDATE User_Addresses SET IsDefault = 0 WHERE UserID = @userId`);
    }

    const result = await request.query(`
        INSERT INTO User_Addresses (UserID, AddressLabel, FullName, PhoneNumber, AddressLine1, AddressLine2, City, State, PinCode, Country, IsDefault)
        OUTPUT INSERTED.*
        VALUES (@userId, @addressLabel, @fullName, @phoneNumber, @addressLine1, @addressLine2, @city, @state, @pinCode, @country, @isDefault)
    `);
    return result.recordset[0];
};

// Update Address
const updateAddress = async (userId, addressId, address) => {
    const request = getRequest();
    request.input('userId', userId);
    request.input('addressId', addressId);
    request.input('addressLabel', address.addressLabel);
    request.input('fullName', address.fullName);
    request.input('phoneNumber', address.phoneNumber);
    request.input('addressLine1', address.streetAddress1);
    request.input('addressLine2', address.streetAddress2 || null);
    request.input('city', address.city);
    request.input('state', address.state);
    request.input('pinCode', address.postalCode);
    request.input('country', address.country);
    request.input('isDefault', address.isDefault ? 1 : 0);

    if (address.isDefault) {
        await request.query(`UPDATE User_Addresses SET IsDefault = 0 WHERE UserID = @userId`);
    }

    await request.query(`
        UPDATE User_Addresses 
        SET AddressLabel = @addressLabel, FullName = @fullName, PhoneNumber = @phoneNumber, 
            AddressLine1 = @addressLine1, AddressLine2 = @addressLine2, 
            City = @city, State = @state, PinCode = @pinCode, Country = @country, IsDefault = @isDefault
        WHERE AddressID = @addressId AND UserID = @userId
    `);
    
    return { success: true };
};

// Delete Address
const deleteAddress = async (userId, addressId) => {
    const request = getRequest();
    request.input('userId', userId);
    request.input('addressId', addressId);
    const hasIsActive = await hasColumn('User_Addresses', 'IsActive');
    if (hasIsActive) {
        await request.query(`
            UPDATE User_Addresses
            SET IsActive = 0, IsDefault = 0
            WHERE AddressID = @addressId AND UserID = @userId
        `);
        return;
    }
    const inUseResult = await request.query(`
        SELECT COUNT(*) AS Cnt FROM Orders WHERE ShippingAddressID = @addressId AND UserID = @userId
    `);
    const inUse = inUseResult.recordset[0]?.Cnt || 0;
    if (inUse > 0) {
        const err = new Error('ADDRESS_IN_USE');
        err.code = 'ADDRESS_IN_USE';
        throw err;
    }
    await request.query(`DELETE FROM User_Addresses WHERE AddressID = @addressId AND UserID = @userId`);
};

// Get User Orders (paginated)
const getOrders = async (userId, page = 1, limit = 10) => {
    const request = getRequest();
    request.input('userId', userId);
    
    // Also get user's email to fetch unclaimed guest orders
    const userRes = await request.query(`SELECT Email FROM Users WHERE UserID = @userId`);
    const userEmail = userRes.recordset[0]?.Email;
    request.input('email', userEmail || '');

    request.input('offset', (page - 1) * limit);
    request.input('limit', limit);
    
    // Query includes both claimed orders (by UserID) and unclaimed guest orders (by Email)
    const result = await request.query(`
        SELECT 
            COUNT(*) OVER() as TotalCount,
            o.*
        FROM Orders o
        WHERE o.UserID = @userId OR (o.GuestEmail = @email AND o.UserID IS NULL)
        ORDER BY o.CreatedAt DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    return {
        items: result.recordset.map(r => {
            const { TotalCount, ...rest } = r;
            return rest;
        }),
        totalCount: result.recordset.length > 0 ? result.recordset[0].TotalCount : 0,
        page,
        limit
    };
};

// Get Order Details
const getOrderDetails = async (userId, orderId) => {
    const request = getRequest();
    request.input('userId', userId);
    request.input('orderId', orderId);

    // Get user's email to verify guest order ownership if not yet claimed
    const userRes = await request.query(`SELECT Email FROM Users WHERE UserID = @userId`);
    const userEmail = userRes.recordset[0]?.Email;
    request.input('email', userEmail || '');

    const orderResult = await request.query(`
        SELECT * FROM Orders 
        WHERE OrderID = @orderId AND (UserID = @userId OR (GuestEmail = @email AND UserID IS NULL))
    `);
    const order = orderResult.recordset[0];

    if (!order) return null;

    const hasDisplayOrder = await hasColumn('Product_Images', 'DisplayOrder');
    const imageTop1Sql = hasDisplayOrder
        ? `(SELECT TOP 1 ImageURL FROM Product_Images WHERE ProductID = oi.ProductID ORDER BY ISNULL(DisplayOrder, 0), CreatedAt, ImageID)`
        : `(SELECT TOP 1 ImageURL FROM Product_Images WHERE ProductID = oi.ProductID ORDER BY CreatedAt, ImageID)`;
    const itemsResult = await request.query(`
        SELECT 
          oi.*,
          c.CategoryName,
          ${imageTop1Sql} AS ImageURL
        FROM Order_Items oi
        LEFT JOIN Products p ON p.ProductID = oi.ProductID
        LEFT JOIN Categories c ON c.CategoryID = p.CategoryID
        WHERE oi.OrderID = @orderId
    `);
    let items = itemsResult.recordset;
    // Fetch approved replacement eligibility per item
    const repRes = await request.query(`
        SELECT r.OrderItemID, r.RequestedAt
        FROM Replacement_Requests r
        WHERE r.OrderID = @orderId AND r.Status = 'Approved'
        AND NOT EXISTS (
            SELECT 1 FROM Order_Status_History h
            WHERE h.OrderID = r.OrderID AND h.NewStatus = 'ReplacementCompleted' AND h.ChangedAt >= r.RequestedAt
        )
    `);
    const elig = new Set(repRes.recordset.map(r => r.OrderItemID));
    items = items.map(it => ({ ...it, ReplaceAllowed: elig.has(it.OrderItemID) }));

    const shippingResult = await request.query(`SELECT * FROM Order_Shipping_Details WHERE OrderID = @orderId`);
    const shipping = shippingResult.recordset[0];

    const statusResult = await request.query(`
        SELECT HistoryID, OrderID, OldStatus, NewStatus, Remarks, ChangedAt 
        FROM Order_Status_History 
        WHERE OrderID = @orderId 
        ORDER BY ChangedAt ASC
    `);
    const statusHistory = statusResult.recordset;

    // Review eligibility: delivered + no existing review by this user for the product
    const isDelivered = String(order.OrderStatus || '') === 'Delivered';
    for (const it of items) {
      if (!isDelivered) {
        it.ReviewAllowed = false;
        continue;
      }
      const r = getRequest();
      r.input('orderId', orderId);
      r.input('orderItemId', it.OrderItemID);
      const reviewed = await r.query(`
        SELECT TOP 1 HistoryID FROM Order_Status_History 
        WHERE OrderID = @orderId AND NewStatus = 'Reviewed'
          AND Remarks LIKE '%OrderItemID=' + CAST(@orderItemId AS VARCHAR(20)) + '%'
      `);
      it.ReviewAllowed = reviewed.recordset.length === 0;
    }

    return { ...order, items, shipping, statusHistory };
};

module.exports = {
    getProfileSummary,
    updateProfile,
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    getOrders,
    getOrderDetails
};
