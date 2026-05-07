const { getRequest } = require('../config/db');

const summary = async (req, res) => {
  try {
    const now = new Date();
    const days = parseInt(req.query.days || '30', 10);
    const from = new Date(now.getTime() - days * 24 * 3600 * 1000);
    const r = getRequest();
    r.input('from', from);
    // Pending orders
    const pendingRes = await r.query(`SELECT COUNT(*) AS Cnt FROM Orders WHERE OrderStatus = 'Pending' AND CreatedAt >= @from`);
    // Returns requested
    const reqRes = await r.query(`SELECT COUNT(*) AS Cnt FROM Replacement_Requests WHERE Status = 'Requested' AND RequestedAt >= @from`);
    // OutForDelivery backlog (shipping table)
    const ofdRes = await r.query(`SELECT COUNT(*) AS Cnt FROM Order_Shipping_Details WHERE ShippingStatus = 'OutForDelivery'`);
    // Shipped orders missing tracking (orders joined shipping)
    const missTrackRes = await r.query(`
      SELECT COUNT(*) AS Cnt
      FROM Orders o
      LEFT JOIN Order_Shipping_Details s ON s.OrderID = o.OrderID
      WHERE o.OrderStatus = 'Shipped' AND (s.TrackingNumber IS NULL OR LTRIM(RTRIM(ISNULL(s.TrackingNumber,''))) = '')
    `);
    return res.json({
      pendingOrders: pendingRes.recordset[0]?.Cnt || 0,
      returnsRequested: reqRes.recordset[0]?.Cnt || 0,
      outForDeliveryCount: ofdRes.recordset[0]?.Cnt || 0,
      shippedMissingTracking: missTrackRes.recordset[0]?.Cnt || 0,
    });
  } catch (e) {
    console.error('Admin dashboard summary error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const carriers = async (req, res) => {
  try {
    const r = getRequest();
    const resp = await r.query(`
      DECLARE @sql NVARCHAR(MAX);
      IF EXISTS (
        SELECT 1 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Order_Shipping_Details' AND COLUMN_NAME = 'Carrier'
      )
      BEGIN
        SET @sql = N'SELECT ISNULL(Carrier, ''Unknown'') AS Carrier, COUNT(*) AS Cnt FROM Order_Shipping_Details GROUP BY Carrier ORDER BY Cnt DESC';
      END
      ELSE
      BEGIN
        SET @sql = N'SELECT ''Unknown'' AS Carrier, COUNT(*) AS Cnt FROM Order_Shipping_Details';
      END
      EXEC sp_executesql @sql;
    `);
    const carriers = resp.recordset || (resp.recordsets && resp.recordsets[0]) || [];
    return res.json({ carriers });
  } catch (e) {
    console.error('Admin dashboard carriers error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const topProducts = async (req, res) => {
  try {
    const days = parseInt(req.query.days || '30', 10);
    const now = new Date();
    const from = new Date(now.getTime() - days * 24 * 3600 * 1000);
    const r = getRequest();
    r.input('from', from);
    const resp = await r.query(`
      SELECT TOP 10 
        oi.ProductName,
        SUM(oi.Quantity) AS Qty,
        SUM(oi.TotalPrice) AS Rev
      FROM Order_Items oi
      JOIN Orders o ON o.OrderID = oi.OrderID
      WHERE o.CreatedAt >= @from
      GROUP BY oi.ProductName
      ORDER BY SUM(oi.Quantity) DESC
    `);
    return res.json({ products: resp.recordset });
  } catch (e) {
    console.error('Admin dashboard topProducts error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { summary, carriers, topProducts };
const lowStock = async (req, res) => {
  try {
    const r = getRequest();
    const products = await r.query(`
      SELECT TOP 20 ProductID, ProductName, SKU, StockQuantity, LowStockThreshold
      FROM Products
      WHERE LowStockThreshold IS NOT NULL AND StockQuantity <= LowStockThreshold
      ORDER BY StockQuantity ASC
    `);
    const variants = await r.query(`
      SELECT TOP 20 pv.VariantID, pv.ProductID, p.ProductName, pv.VariantName, pv.VariantSKU, pv.StockQuantity, pv.LowStockThreshold
      FROM Product_Variants pv
      JOIN Products p ON p.ProductID = pv.ProductID
      WHERE pv.LowStockThreshold IS NOT NULL AND pv.StockQuantity <= pv.LowStockThreshold
      ORDER BY pv.StockQuantity ASC
    `);
    return res.json({ products: products.recordset, variants: variants.recordset });
  } catch (e) {
    console.error('Admin dashboard lowStock error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

module.exports.lowStock = lowStock;
