const { getRequest, sql } = require('../config/db');
const { hasColumn } = require('../lib/dbSchema');

const list = async (req, res) => {
  try {
    const search = req.query.search || null; // matches OrderNumber or User email
    const status = req.query.status || null;
    const dateFrom = req.query.dateFrom || null;
    const dateTo = req.query.dateTo || null;
    const sort = req.query.sort || 'newest';
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const offset = (page - 1) * limit;

    const where = ['1=1'];
    const rc = getRequest();
    if (search) {
      rc.input('search', `%${search}%`);
      where.push(`(o.OrderNumber LIKE @search OR u.Email LIKE @search OR o.GuestEmail LIKE @search)`);
    }
    if (status) {
      rc.input('status', status);
      where.push(`o.OrderStatus = @status`);
    }
    if (dateFrom) {
      rc.input('dateFrom', dateFrom);
      where.push(`o.CreatedAt >= @dateFrom`);
    }
    if (dateTo) {
      rc.input('dateTo', dateTo);
      where.push(`o.CreatedAt <= @dateTo`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const orderBy = sort === 'amount-desc' ? 'o.TotalAmount DESC'
      : sort === 'amount-asc' ? 'o.TotalAmount ASC'
      : sort === 'oldest' ? 'o.CreatedAt ASC'
      : 'o.CreatedAt DESC';

    const countRes = await rc.query(`
      SELECT COUNT(*) AS TotalCount
      FROM Orders o
      LEFT JOIN Users u ON o.UserID = u.UserID
      ${whereSql}
    `);
    const totalCount = countRes.recordset[0]?.TotalCount || 0;

    const r = getRequest();
    if (search) r.input('search', `%${search}%`);
    if (status) r.input('status', status);
    if (dateFrom) r.input('dateFrom', dateFrom);
    if (dateTo) r.input('dateTo', dateTo);
    r.input('offset', offset);
    r.input('limit', limit);
    const pageRes = await r.query(`
      SELECT 
        o.OrderID,
        o.OrderNumber,
        o.UserID,
        COALESCE(u.Email, o.GuestEmail) AS UserEmail,
        o.SubTotal,
        o.ShippingAmount,
        o.TotalAmount,
        o.OrderStatus,
        o.PaymentStatus,
        o.CreatedAt
      FROM Orders o
      LEFT JOIN Users u ON o.UserID = u.UserID
      ${whereSql}
      ORDER BY ${orderBy}
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    return res.json({ orders: pageRes.recordset, totalCount, page, limit });
  } catch (e) {
    console.error('Admin list orders error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const get = async (req, res) => {
  try {
    const id = req.params.id;
    const r = getRequest();
    const orderIdInt = parseInt(id, 10);
    r.input('orderId', sql.Int, orderIdInt);
    const orderRes = await r.query(`
      SELECT o.*, COALESCE(u.Email, o.GuestEmail) AS UserEmail
      FROM Orders o
      LEFT JOIN Users u ON o.UserID = u.UserID
      WHERE o.OrderID = @orderId
    `);
    const order = orderRes.recordset[0];
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const hasDisplayOrder = await hasColumn('Product_Images', 'DisplayOrder');
    const imageTop1Sql = hasDisplayOrder
      ? `(SELECT TOP 1 ImageURL FROM Product_Images WHERE ProductID = oi.ProductID ORDER BY ISNULL(DisplayOrder, 0), CreatedAt, ImageID)`
      : `(SELECT TOP 1 ImageURL FROM Product_Images WHERE ProductID = oi.ProductID ORDER BY CreatedAt, ImageID)`;
    const itemsRes = await r.query(`
      SELECT 
        oi.OrderItemID,
        oi.OrderID,
        oi.ProductID,
        oi.VariantID,
        oi.ProductName,
        oi.VariantName,
        oi.SKU,
        oi.Quantity,
        oi.UnitPrice,
        oi.TotalPrice,
        p.ProductSlug,
        c.CategoryName,
        ${imageTop1Sql} AS ImageURL
      FROM Order_Items oi
      LEFT JOIN Products p ON p.ProductID = oi.ProductID
      LEFT JOIN Categories c ON c.CategoryID = p.CategoryID
      WHERE oi.OrderID = @orderId
    `);
    const shipRes = await r.query(`SELECT * FROM Order_Shipping_Details WHERE OrderID = @orderId`);
    const histRes = await r.query(`
      SELECT HistoryID, OrderID, OldStatus, NewStatus, Remarks, ChangedAt 
      FROM Order_Status_History 
      WHERE OrderID = @orderId 
      ORDER BY ChangedAt ASC
    `);
    return res.json({
      order,
      items: itemsRes.recordset,
      shipping: shipRes.recordset[0] || null,
      statusHistory: histRes.recordset
    });
  } catch (e) {
    console.error('Admin get order error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const updateStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const { status, remarks } = req.body || {};
    if (!status) return res.status(400).json({ message: 'status is required' });
    const allowed = ['Pending','Processing','Packed','Shipped','OutForDelivery','Delivered','Cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Status not allowed by OrderStatus policy. Use the Returns workflow for replacements.' });
    }
    const r = getRequest();
    r.input('orderId', sql.Int, parseInt(id, 10));
    const curRes = await r.query(`SELECT TOP 1 OrderStatus FROM Orders WHERE OrderID = @orderId`);
    if (curRes.recordset.length === 0) return res.status(404).json({ message: 'Order not found' });
    const old = curRes.recordset[0].OrderStatus;
    // Special handling for statuses not permitted by CK_Orders_Status: represent via shipping + history
    if (status === 'OutForDelivery' || status === 'Packed') {
      r.input('shipStatus', 'OutForDelivery');
      const shipState = status === 'Packed' ? 'Packed' : 'OutForDelivery';
      await r.query(`
        MERGE Order_Shipping_Details AS target
        USING (SELECT @orderId AS OrderID) AS src
        ON target.OrderID = src.OrderID
        WHEN MATCHED THEN
          UPDATE SET ShippingStatus = '${shipState}'
        WHEN NOT MATCHED THEN
          INSERT (OrderID, ShippingStatus) VALUES (@orderId, '${shipState}');
      `);
      r.input('remarks', remarks || null);
      await r.query(`
        INSERT INTO Order_Status_History (OrderID, OldStatus, NewStatus, Remarks, ChangedAt)
        VALUES (@orderId, @old, '${shipState}', @remarks, GETDATE())
      `.replace('@old', `'${old}'`));
      return res.json({ message: `${shipState} updated` });
    } else {
      r.input('status', status);
      r.input('remarks', remarks || null);
      await r.query(`
        UPDATE Orders SET OrderStatus = @status WHERE OrderID = @orderId;
        INSERT INTO Order_Status_History (OrderID, OldStatus, NewStatus, Remarks, ChangedAt)
        VALUES (@orderId, @old, @status, @remarks, GETDATE())
      `.replace('@old', `'${old}'`));
      return res.json({ message: 'Status updated' });
    }
  } catch (e) {
    console.error('Admin update order status error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const updateTracking = async (req, res) => {
  try {
    const id = req.params.id;
    const { carrier, trackingNumber, shippedAt } = req.body || {};
    if (!carrier || !trackingNumber) return res.status(400).json({ message: 'carrier and trackingNumber are required' });
    const r = getRequest();
    r.input('orderId', sql.Int, parseInt(id, 10));
    r.input('carrier', carrier);
    r.input('tracking', trackingNumber);
    r.input('shippedAt', shippedAt || new Date());
    await r.query(`
      MERGE Order_Shipping_Details AS target
      USING (SELECT @orderId AS OrderID) AS src
      ON target.OrderID = src.OrderID
      WHEN MATCHED THEN
        UPDATE SET Carrier = @carrier, TrackingNumber = @tracking, ShippedAt = @shippedAt
      WHEN NOT MATCHED THEN
        INSERT (OrderID, Carrier, TrackingNumber, ShippedAt) VALUES (@orderId, @carrier, @tracking, @shippedAt);
    `);
    return res.json({ message: 'Tracking updated' });
  } catch (e) {
    console.error('Admin update tracking error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const remove = async (req, res) => {
  try {
    const id = req.params.id;
    const r = getRequest();
    r.input('orderId', sql.Int, parseInt(id, 10));
    // Delete related records first due to FK constraints
    await r.query(`
      DELETE FROM Order_Items WHERE OrderID = @orderId;
      DELETE FROM Order_Shipping_Details WHERE OrderID = @orderId;
      DELETE FROM Order_Status_History WHERE OrderID = @orderId;
      DELETE FROM Orders WHERE OrderID = @orderId;
    `);
    return res.json({ message: 'Order deleted successfully' });
  } catch (e) {
    console.error('Admin delete order error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { list, get, updateStatus, updateTracking, remove };
