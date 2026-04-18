const { getRequest } = require('../config/db');
const { hasColumn } = require('../lib/dbSchema');

const getRecentVerifiedReviews = async (limit = 10) => {
  const request = getRequest();
  request.input('limit', limit);

  const hasDisplayOrder = await hasColumn('Product_Images', 'DisplayOrder');
  const imageTop1Sql = hasDisplayOrder
    ? `(SELECT TOP 1 ImageURL FROM Product_Images WHERE ProductID = r.ProductID ORDER BY ISNULL(DisplayOrder, 0), CreatedAt, ImageID)`
    : `(SELECT TOP 1 ImageURL FROM Product_Images WHERE ProductID = r.ProductID ORDER BY CreatedAt, ImageID)`;

  const resp = await request.query(`
    SELECT TOP (@limit)
      r.ReviewID,
      r.ProductID,
      r.Rating,
      r.ReviewTitle,
      r.ReviewBody,
      r.IsVerifiedPurchase,
      r.CreatedAt,
      p.ProductName,
      p.ProductSlug,
      c.CategoryName,
      ${imageTop1Sql} AS ImageURL
    FROM Product_Reviews r
    JOIN Products p ON r.ProductID = p.ProductID
    JOIN Categories c ON p.CategoryID = c.CategoryID
    WHERE r.IsVerifiedPurchase = 1
      AND r.ReviewBody IS NOT NULL
      AND LTRIM(RTRIM(r.ReviewBody)) <> ''
    ORDER BY r.CreatedAt DESC
  `);

  return resp.recordset;
};

module.exports = { getRecentVerifiedReviews };

