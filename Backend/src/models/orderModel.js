const { connectDB, sql, getRequest } = require('../config/db');
const { hasColumn } = require('../lib/dbSchema');

const createOrder = async (orderData) => {
    const pool = await connectDB();
    const transaction = new sql.Transaction(pool);
    const orderNumber = `ORD-${Date.now()}`;

    try {
        await transaction.begin();

        // 1. Insert Order Header
        const headerReq = transaction.request();
        headerReq.input('userId', orderData.userId || null); // Can be null for Guest
        headerReq.input('shippingAddressId', orderData.shippingAddressId);
        headerReq.input('subTotal', orderData.subTotal);
        headerReq.input('shippingAmount', orderData.shippingAmount);
        headerReq.input('totalAmount', orderData.totalAmount);
        headerReq.input('orderNumber', orderNumber);
        headerReq.input('paymentStatus', orderData.paymentStatus || 'Pending');

        const [hasPaymentMethod, hasRzpOrder, hasRzpPayment, hasRzpSig, hasGuestEmail, hasIsGuestOrder] = await Promise.all([
            hasColumn('Orders', 'PaymentMethod'),
            hasColumn('Orders', 'RazorpayOrderID'),
            hasColumn('Orders', 'RazorpayPaymentID'),
            hasColumn('Orders', 'RazorpaySignature'),
            hasColumn('Orders', 'GuestEmail'),
            hasColumn('Orders', 'IsGuestOrder')
        ]);
        const extraCols = [];
        const extraVals = [];
        if (hasPaymentMethod) {
            headerReq.input('paymentMethod', orderData.paymentMethod || null);
            extraCols.push('PaymentMethod');
            extraVals.push('@paymentMethod');
        }
        if (hasGuestEmail) {
            headerReq.input('guestEmail', orderData.guestEmail || null);
            extraCols.push('GuestEmail');
            extraVals.push('@guestEmail');
        }
        if (hasIsGuestOrder) {
            headerReq.input('isGuestOrder', orderData.userId ? 0 : 1);
            extraCols.push('IsGuestOrder');
            extraVals.push('@isGuestOrder');
        }
        if (hasRzpOrder) {
            headerReq.input('rzpOrder', orderData.razorpay?.razorpay_order_id || null);
            extraCols.push('RazorpayOrderID');
            extraVals.push('@rzpOrder');
        }
        if (hasRzpPayment) {
            headerReq.input('rzpPayment', orderData.razorpay?.razorpay_payment_id || null);
            extraCols.push('RazorpayPaymentID');
            extraVals.push('@rzpPayment');
        }
        if (hasRzpSig) {
            headerReq.input('rzpSig', orderData.razorpay?.razorpay_signature || null);
            extraCols.push('RazorpaySignature');
            extraVals.push('@rzpSig');
        }
        const extraColsSql = extraCols.length ? `, ${extraCols.join(', ')}` : '';
        const extraValsSql = extraVals.length ? `, ${extraVals.join(', ')}` : '';

        const orderResult = await headerReq.query(`
            INSERT INTO Orders (OrderNumber, UserID, ShippingAddressID, SubTotal, ShippingAmount, TotalAmount, OrderStatus, PaymentStatus${extraColsSql})
            OUTPUT INSERTED.OrderID
            VALUES (@orderNumber, @userId, @shippingAddressId, @subTotal, @shippingAmount, @totalAmount, 'Pending', @paymentStatus${extraValsSql})
        `); 

        const orderId = orderResult.recordset[0].OrderID;
        // 2. Decrement stock + insert Order Items atomically
        for (const item of orderData.items) {
            const parsedProductId = parseInt(item.productId, 10);
            const parsedVariantId = item.variantId ? parseInt(item.variantId, 10) : null;
            const qty = parseInt(item.quantity, 10);
            const unitPrice = Number(item.price || 0);

            if (!Number.isFinite(parsedProductId)) {
                const err = new Error('INVALID_PRODUCT_ID');
                err.code = 'INVALID_PRODUCT_ID';
                throw err;
            }
            if (item.variantId && !Number.isFinite(parsedVariantId)) {
                const err = new Error('INVALID_VARIANT_ID');
                err.code = 'INVALID_VARIANT_ID';
                throw err;
            }
            if (!Number.isFinite(qty) || qty < 1) {
                const err = new Error('INVALID_QUANTITY');
                err.code = 'INVALID_QUANTITY';
                throw err;
            }

            let sku = item.sku || 'N/A';
            let variantName = item.variantName || null;
            let effectiveVariantId = parsedVariantId;

            if (!effectiveVariantId) {
                const pickReq = transaction.request();
                pickReq.input('productId', sql.Int, parsedProductId);
                const pick = await pickReq.query(`
                    SELECT TOP 1 VariantID, VariantName, VariantSKU
                    FROM Product_Variants
                    WHERE ProductID = @productId AND ISNULL(IsActive, 1) = 1
                    ORDER BY ISNULL(IsDefault, 0) DESC, VariantID ASC
                `);
                if (pick.recordset[0]) {
                    effectiveVariantId = pick.recordset[0].VariantID;
                    variantName = variantName || pick.recordset[0].VariantName || null;
                    if (!sku || sku === 'N/A') sku = pick.recordset[0].VariantSKU || sku;
                }
            }

            if (effectiveVariantId) {
                const metaReq = transaction.request();
                metaReq.input('productId', sql.Int, parsedProductId);
                metaReq.input('variantId', sql.Int, effectiveVariantId);
                const meta = await metaReq.query(`
                    SELECT TOP 1 VariantName, VariantSKU
                    FROM Product_Variants
                    WHERE ProductID = @productId AND VariantID = @variantId
                `);
                if (meta.recordset[0]) {
                    variantName = variantName || meta.recordset[0].VariantName || null;
                    if (!sku || sku === 'N/A') sku = meta.recordset[0].VariantSKU || sku;
                }

                const varReq = transaction.request();
                varReq.input('productId', sql.Int, parsedProductId);
                varReq.input('variantId', sql.Int, effectiveVariantId);
                varReq.input('qty', sql.Int, qty);
                const vRes = await varReq.query(`
                    UPDATE Product_Variants
                    SET 
                        StockQuantity = CASE 
                            WHEN (ISNULL(StockQuantity, 0) - @qty) < 0 THEN 0
                            ELSE (ISNULL(StockQuantity, 0) - @qty)
                        END,
                        StockStatus = CASE 
                            WHEN (ISNULL(StockQuantity, 0) - @qty) <= 0 THEN 'OutOfStock'
                            ELSE 'InStock'
                        END,
                        UpdatedAt = GETDATE()
                    WHERE ProductID = @productId AND VariantID = @variantId
                `);
                if ((vRes.rowsAffected?.[0] || 0) === 0) {
                    const err = new Error('INVALID_VARIANT_ID');
                    err.code = 'INVALID_VARIANT_ID';
                    throw err;
                }

                const syncReq = transaction.request();
                syncReq.input('productId', sql.Int, parsedProductId);
                await syncReq.query(`
                    UPDATE Products
                    SET 
                        StockQuantity = (
                            SELECT ISNULL(SUM(ISNULL(StockQuantity, 0)), 0)
                            FROM Product_Variants
                            WHERE ProductID = @productId
                        ),
                        StockStatus = CASE WHEN (
                            SELECT ISNULL(SUM(ISNULL(StockQuantity, 0)), 0)
                            FROM Product_Variants
                            WHERE ProductID = @productId
                        ) <= 0 THEN 'OutOfStock' ELSE 'InStock' END,
                        UpdatedAt = GETDATE()
                    WHERE ProductID = @productId
                `);
            }

            if (!effectiveVariantId) {
                const stockReq = transaction.request();
                stockReq.input('productId', sql.Int, parsedProductId);
                stockReq.input('qty', sql.Int, qty);
                const pRes = await stockReq.query(`
                    UPDATE Products
                    SET 
                        StockQuantity = CASE 
                            WHEN (ISNULL(StockQuantity, 0) - @qty) < 0 THEN 0
                            ELSE (ISNULL(StockQuantity, 0) - @qty)
                        END,
                        StockStatus = CASE 
                            WHEN (ISNULL(StockQuantity, 0) - @qty) <= 0 THEN 'OutOfStock'
                            ELSE 'InStock'
                        END,
                        UpdatedAt = GETDATE()
                    WHERE ProductID = @productId
                `);
                if ((pRes.rowsAffected?.[0] || 0) === 0) {
                    const err = new Error('INVALID_PRODUCT_ID');
                    err.code = 'INVALID_PRODUCT_ID';
                    throw err;
                }
            }

            const itemReq = transaction.request();
            itemReq.input('orderId', orderId);
            itemReq.input('productId', parsedProductId);
            itemReq.input('productName', item.name);
            itemReq.input('sku', sku);
            itemReq.input('variantId', effectiveVariantId || null);
            itemReq.input('variantName', variantName);
            itemReq.input('quantity', qty);
            itemReq.input('unitPrice', unitPrice);
            itemReq.input('totalPrice', unitPrice * qty);
            await itemReq.query(`
                INSERT INTO Order_Items (OrderID, ProductID, VariantID, ProductName, VariantName, SKU, Quantity, UnitPrice, TotalPrice)
                VALUES (@orderId, @productId, @variantId, @productName, @variantName, @sku, @quantity, @unitPrice, @totalPrice)
            `);
        }

        // 3. Remove ordered items from user's cart (if logged in)
        if (orderData.userId) {
            const cartReq = transaction.request();
            cartReq.input('userId', orderData.userId);
            const cartResult = await cartReq.query(`SELECT CartID FROM Cart WHERE UserID = @userId`);
            const cartId = cartResult.recordset[0]?.CartID;
            if (cartId) {
                for (const item of orderData.items) {
                    const delReq = transaction.request();
                    delReq.input('cartId', cartId);
                    delReq.input('productId', item.productId);
                    await delReq.query(`DELETE FROM Cart_Items WHERE CartID = @cartId AND ProductID = @productId`);
                }
                const updReq = transaction.request();
                updReq.input('cartId', cartId);
                await updReq.query(`
                    UPDATE Cart
                    SET 
                        SubTotal = (SELECT ISNULL(SUM(TotalPrice), 0) FROM Cart_Items WHERE CartID = @cartId),
                        TotalAmount = (SELECT ISNULL(SUM(TotalPrice), 0) FROM Cart_Items WHERE CartID = @cartId) + ShippingAmount + TaxAmount - DiscountAmount,
                        UpdatedAt = GETDATE()
                    WHERE CartID = @cartId
                `);
            }
        }

        await transaction.commit();
        return { orderId, orderNumber };
    } catch (error) {
        try {
            if (transaction._aborted !== true) {
                await transaction.rollback();
            }
        } catch {}
        throw error;
    }
};

const findOrCreateAddress = async (address) => {
    try {
        const request = getRequest();
        request.input('userId', address.userId || null); // Can be null
        request.input('email', address.email || null);
        request.input('fullName', address.name);
        request.input('phoneNumber', address.phone || null);
        request.input('addressLine1', address.street);
        request.input('city', address.city);
        request.input('state', address.state);
        request.input('pinCode', address.pincode);
        request.input('country', address.country);

        const [hasPhone, hasEmail] = await Promise.all([
            hasColumn('User_Addresses', 'PhoneNumber'),
            hasColumn('User_Addresses', 'Email')
        ]);
        const phoneCriteria = hasPhone ? 'AND (PhoneNumber = @phoneNumber OR (@phoneNumber IS NULL AND PhoneNumber IS NULL))' : '';
        const emailCriteria = hasEmail ? 'AND (Email = @email OR (@email IS NULL AND Email IS NULL))' : '';

        const existing = await request.query(`
            SELECT TOP 1 AddressID 
            FROM User_Addresses 
            WHERE 
                (@userId IS NULL OR UserID = @userId) AND
                FullName = @fullName AND
                AddressLine1 = @addressLine1 AND
                City = @city AND
                State = @state AND
                PinCode = @pinCode AND
                Country = @country
                ${phoneCriteria}
                ${emailCriteria}
        `);
        if (existing.recordset.length > 0) {
            return existing.recordset[0].AddressID;
        }

        const cols = ['UserID', 'FullName', 'AddressLine1', 'City', 'State', 'PinCode', 'Country'];
        const vals = ['@userId', '@fullName', '@addressLine1', '@city', '@state', '@pinCode', '@country'];

        if (hasPhone) {
            cols.push('PhoneNumber');
            vals.push('@phoneNumber');
        }
        if (hasEmail) {
            cols.push('Email');
            vals.push('@email');
        }

        const result = await request.query(`
            INSERT INTO User_Addresses (${cols.join(', ')})
            OUTPUT INSERTED.AddressID
            VALUES (${vals.join(', ')})
        `);
        return result.recordset[0].AddressID;
    } catch (error) {
        throw error;
    }
};

 

const cancelOrder = async (userId, orderId, reason) => {
    const request = getRequest();
    request.input('userId', userId);
    request.input('orderId', sql.Int, parseInt(orderId, 10));
    request.input('reason', reason || 'User cancelled');

    const orderRes = await request.query(`SELECT OrderStatus FROM Orders WHERE OrderID = @orderId AND UserID = @userId`);
    if (orderRes.recordset.length === 0) {
        const err = new Error('ORDER_NOT_FOUND');
        err.code = 'ORDER_NOT_FOUND';
        throw err;
    }
    const current = orderRes.recordset[0].OrderStatus;
    const allowed = ['Pending', 'Processing', 'Packed'];
    if (!allowed.includes(current)) {
        const err = new Error('CANCEL_NOT_ALLOWED');
        err.code = 'CANCEL_NOT_ALLOWED';
        throw err;
    }

    await request.query(`
        UPDATE Orders 
        SET OrderStatus = 'Cancelled', CancelledAt = GETDATE(), CancelReason = @reason
        WHERE OrderID = @orderId AND UserID = @userId
    `);

    await request.query(`
        INSERT INTO Order_Status_History (OrderID, OldStatus, NewStatus, Remarks, ChangedAt)
        VALUES (@orderId, '${current}', 'Cancelled', @reason, GETDATE())
    `);

    return { success: true };
};

const requestReplacement = async (userId, orderId, orderItemId, data) => {
    const request = getRequest();
    request.input('userId', userId);
    request.input('orderId', sql.Int, parseInt(orderId, 10));
    request.input('orderItemId', orderItemId);
    request.input('reason', data.reason || 'Replacement requested');
    const rawCat = (data.reasonCategory || '').toString().trim().toLowerCase();
    let category = 'Other';
    if (rawCat.includes('damag')) category = 'Damaged';
    else if (rawCat.includes('defect')) category = 'Defective';
    else if (rawCat.includes('wrong')) category = 'WrongItem';
    else if (rawCat.includes('missing')) category = 'MissingParts';
    else if (rawCat.includes('describe')) category = 'NotAsDescribed';
    else if (rawCat === 'other') category = 'Other';
    request.input('category', category);
    request.input('imageUrl', data.imageUrl || null);

    const orderRes = await request.query(`SELECT OrderID, OrderStatus FROM Orders WHERE OrderID = @orderId AND UserID = @userId`);
    if (orderRes.recordset.length === 0) {
        const err = new Error('ORDER_NOT_FOUND');
        err.code = 'ORDER_NOT_FOUND';
        throw err;
    }
    const itemRes = await request.query(`SELECT OrderItemID FROM Order_Items WHERE OrderID = @orderId AND OrderItemID = @orderItemId`);
    if (itemRes.recordset.length === 0) {
        const err = new Error('ORDER_ITEM_NOT_FOUND');
        err.code = 'ORDER_ITEM_NOT_FOUND';
        throw err;
    }

    await request.query(`
        INSERT INTO Replacement_Requests (OrderID, OrderItemID, UserID, ReplacementReason, ReasonCategory, ImageEvidenceURL, Status, RequestedAt)
        VALUES (@orderId, @orderItemId, @userId, @reason, @category, @imageUrl, 'Requested', GETDATE())
    `);

    await request.query(`
        INSERT INTO Order_Status_History (OrderID, OldStatus, NewStatus, Remarks, ChangedAt)
        VALUES (@orderId, '${orderRes.recordset[0].OrderStatus}', 'ReplacementRequested', @reason, GETDATE())
    `);

    return { success: true };
};

const selectReplacement = async (userId, orderId, orderItemId, newProductId, newVariantId /* mode is ignored */) => {
    const r = getRequest();
    r.input('userId', userId);
    r.input('orderId', sql.Int, parseInt(orderId, 10));
    r.input('orderItemId', orderItemId);
    r.input('newProductId', newProductId);
    r.input('newVariantId', newVariantId || null);
    // Validate ownership
    const orderRes = await r.query(`SELECT OrderID, UserID, ShippingAddressID, ShippingAmount, OrderStatus FROM Orders WHERE OrderID = @orderId AND UserID = @userId`);
    if (orderRes.recordset.length === 0) {
        const err = new Error('ORDER_NOT_FOUND');
        err.code = 'ORDER_NOT_FOUND';
        throw err;
    }
    // Validate approved replacement exists and not completed yet
    const chk = await r.query(`
        SELECT TOP 1 r.RequestedAt
        FROM Replacement_Requests r
        WHERE r.OrderID = @orderId AND r.OrderItemID = @orderItemId AND r.Status = 'Approved'
        AND NOT EXISTS (
            SELECT 1 FROM Order_Status_History h
            WHERE h.OrderID = r.OrderID AND h.NewStatus = 'ReplacementCompleted' AND h.ChangedAt >= r.RequestedAt
        )
        ORDER BY r.RequestedAt DESC
    `);
    if (chk.recordset.length === 0) {
        const err = new Error('REPLACEMENT_NOT_APPROVED');
        err.code = 'REPLACEMENT_NOT_APPROVED';
        throw err;
    }
    // Fetch product/variant details and price
    const pRes = await r.query(`
        SELECT p.ProductID, p.ProductName, p.SKU, p.RegularPrice, p.SalePrice
        FROM Products p WHERE p.ProductID = @newProductId
    `);
    if (pRes.recordset.length === 0) {
        const err = new Error('PRODUCT_NOT_FOUND');
        err.code = 'PRODUCT_NOT_FOUND';
        throw err;
    }
    const prod = pRes.recordset[0];
    let variant = null;
    if (newVariantId) {
        const vRes = await r.query(`
            SELECT VariantID, VariantName, VariantSKU, RegularPrice, SalePrice
            FROM Product_Variants WHERE VariantID = @newVariantId AND ProductID = @newProductId
        `);
        if (vRes.recordset.length === 0) {
            const err = new Error('VARIANT_NOT_FOUND');
            err.code = 'VARIANT_NOT_FOUND';
            throw err;
        }
        variant = vRes.recordset[0];
    }
    const unitPrice = (variant?.SalePrice ?? variant?.RegularPrice) ?? (prod.SalePrice ?? prod.RegularPrice) ?? 0;
    // Get existing item quantity
    const iRes = await r.query(`
        SELECT Quantity FROM Order_Items WHERE OrderID = @orderId AND OrderItemID = @orderItemId
    `);
    if (iRes.recordset.length === 0) {
        const err = new Error('ORDER_ITEM_NOT_FOUND');
        err.code = 'ORDER_ITEM_NOT_FOUND';
        throw err;
    }
    const qty = iRes.recordset[0].Quantity || 1;
    const totalPrice = Number(unitPrice) * Number(qty);
    r.input('qty', qty);
    r.input('unitPrice', unitPrice);
    r.input('totalPrice', totalPrice);
    r.input('productName', prod.ProductName);
    r.input('sku', variant?.VariantSKU || prod.SKU || 'N/A');
    r.input('variantName', variant?.VariantName || null);
    // Always replace within the same order
    await r.query(`
        UPDATE Order_Items
        SET ProductID = @newProductId, VariantID = @newVariantId, ProductName = @productName,
            VariantName = @variantName, SKU = @sku, UnitPrice = @unitPrice, TotalPrice = @totalPrice
        WHERE OrderID = @orderId AND OrderItemID = @orderItemId
    `);
    // Recompute order totals
    await r.query(`
        UPDATE Orders
        SET SubTotal = (SELECT ISNULL(SUM(TotalPrice), 0) FROM Order_Items WHERE OrderID = @orderId),
            TotalAmount = (SELECT ISNULL(SUM(TotalPrice), 0) FROM Order_Items WHERE OrderID = @orderId) + ShippingAmount
        WHERE OrderID = @orderId
    `);
    // Append history: ReplacementCompleted
    await r.query(`
        INSERT INTO Order_Status_History (OrderID, OldStatus, NewStatus, Remarks, ChangedAt)
        VALUES (@orderId, 'Processing', 'ReplacementCompleted', CONCAT('Replaced item #', @orderItemId, ' with product ', @newProductId), GETDATE())
    `);
    return { success: true };
};

const claimGuestOrders = async (userId, email) => {
    const request = getRequest();
    request.input('userId', userId);
    request.input('email', email);
    
    // Update Orders table to link guest orders to the new user ID
    // We only update if UserID is currently null
    await request.query(`
        UPDATE Orders
        SET UserID = @userId
        WHERE GuestEmail = @email AND UserID IS NULL
    `);
    
    // Also update User_Addresses table if we want to link guest addresses
    // Note: Guest addresses might not have UserID set either
    await request.query(`
        UPDATE User_Addresses
        SET UserID = @userId
        WHERE Email = @email AND UserID IS NULL
    `);
    
    return { success: true };
};

module.exports = {
    createOrder,
    findOrCreateAddress,
    cancelOrder,
    requestReplacement,
    selectReplacement,
    claimGuestOrders
};
