const { getRequest } = require('../config/db');
const { hasColumn } = require('../lib/dbSchema');

const list = async (req, res) => {
  try {
    const search = req.query.search || null; // product name or user email
    const sort = req.query.sort || 'oldest';
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const offset = (page - 1) * limit;
    const where = ['1=1'];
    const rc = getRequest();
    if (search) {
      rc.input('search', `%${search}%`);
      where.push(`(p.ProductName LIKE @search OR u.Email LIKE @search)`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const countRes = await rc.query(`
      SELECT COUNT(*) AS TotalCount
      FROM Product_Reviews r
      JOIN Products p ON r.ProductID = p.ProductID
      LEFT JOIN Users u ON r.UserID = u.UserID
      ${whereSql}
    `);
    const totalCount = countRes.recordset[0]?.TotalCount || 0;
    const hasDisplayOrder = await hasColumn('Product_Images', 'DisplayOrder');
    const imageTop1Sql = hasDisplayOrder
      ? `(SELECT TOP 1 ImageURL FROM Product_Images WHERE ProductID = r.ProductID ORDER BY ISNULL(DisplayOrder, 0), CreatedAt, ImageID)`
      : `(SELECT TOP 1 ImageURL FROM Product_Images WHERE ProductID = r.ProductID ORDER BY CreatedAt, ImageID)`;
    const r = getRequest();
    if (search) r.input('search', `%${search}%`);
    r.input('offset', offset);
    r.input('limit', limit);
    const pageRes = await r.query(`
      SELECT 
        r.ReviewID, r.ProductID, r.UserID, r.Rating, r.ReviewTitle, r.ReviewBody, r.IsVerifiedPurchase, r.CreatedAt,
        p.ProductName,
        ${imageTop1Sql} AS ImageURL,
        u.Email AS UserEmail
      FROM Product_Reviews r
      JOIN Products p ON r.ProductID = p.ProductID
      LEFT JOIN Users u ON r.UserID = u.UserID
      ${whereSql}
      ORDER BY ${sort === 'newest' ? 'r.CreatedAt DESC' : 'r.CreatedAt ASC'}
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    return res.json({ reviews: pageRes.recordset, totalCount, page, limit });
  } catch (e) {
    console.error('Admin reviews list error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const get = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const r = getRequest();
    r.input('id', id);
    const resp = await r.query(`
      SELECT r.*, p.ProductName, u.Email AS UserEmail
      FROM Product_Reviews r
      JOIN Products p ON r.ProductID = p.ProductID
      LEFT JOIN Users u ON r.UserID = u.UserID
      WHERE r.ReviewID = @id
    `);
    if (resp.recordset.length === 0) return res.status(404).json({ message: 'Review not found' });
    return res.json(resp.recordset[0]);
  } catch (e) {
    console.error('Admin get review error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const r = getRequest();
    r.input('id', id);
    await r.query(`DELETE FROM Product_Reviews WHERE ReviewID = @id`);
    return res.json({ message: 'Review deleted' });
  } catch (e) {
    console.error('Admin delete review error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { list, get, remove };
