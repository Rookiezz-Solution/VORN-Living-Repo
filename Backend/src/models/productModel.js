const { getRequest } = require('../config/db');
const { hasColumn } = require('../lib/dbSchema');

const getProducts = async (options = {}) => {
    try {
        const request = getRequest();
        const normalized =
            typeof options === 'string'
                ? { categorySlug: options }
                : (options ?? {});

        const categorySlug = normalized.categorySlug ?? null;
        const search = normalized.search ?? null;
        const sort = normalized.sort ?? 'newest';
        const material = normalized.material ?? null;
        const finish = normalized.finish ?? null;
        const page = normalized.page ? parseInt(normalized.page) : 1;
        const limit = normalized.limit ? parseInt(normalized.limit) : 10;
        const offset = (page - 1) * limit;  

        const minPrice =
            normalized.minPrice !== undefined && normalized.minPrice !== null && normalized.minPrice !== ''
                ? Number(normalized.minPrice)
                : null;
        const maxPrice =
            normalized.maxPrice !== undefined && normalized.maxPrice !== null && normalized.maxPrice !== ''
                ? Number(normalized.maxPrice)
                : null;

        const whereClauses = [`p.Status = 'Published'`, `p.Visibility = 'Public'`];

        if (categorySlug) {
            request.input('categorySlug', categorySlug);
            whereClauses.push(`c.CategorySlug = @categorySlug`);
        }
        
        if (search) {
            request.input('search', `%${search}%`);
            whereClauses.push(`p.ProductName LIKE @search`);
        }

        if (Number.isFinite(minPrice)) {
            request.input('minPrice', minPrice);
            whereClauses.push(`COALESCE(p.SalePrice, p.RegularPrice) >= @minPrice`);
        }

        if (Number.isFinite(maxPrice)) {
            request.input('maxPrice', maxPrice);
            whereClauses.push(`COALESCE(p.SalePrice, p.RegularPrice) <= @maxPrice`);
        }

        // ER-based specification filters (Product_Specifications key-value)
        if (material) {
            request.input('material', `%${material}%`);
            whereClauses.push(`EXISTS (SELECT 1 FROM Product_Specifications ps WHERE ps.ProductID = p.ProductID AND ps.SpecKey = 'Material' AND ps.SpecValue LIKE @material)`);
        }
        if (finish) {
            request.input('finish', finish);
            whereClauses.push(`EXISTS (SELECT 1 FROM Product_Specifications ps WHERE ps.ProductID = p.ProductID AND ps.SpecKey = 'Finish' AND ps.SpecValue = @finish)`);
        }

        const sortMap = {
            newest: `p.ProductID DESC`,
            'price-low-high': `EffectivePrice ASC`,
            'price-high-low': `EffectivePrice DESC`,
            rating: `(SELECT AVG(Rating) FROM Product_Reviews WHERE ProductID = p.ProductID) DESC`,
            popularity: `(SELECT COUNT(*) FROM Product_Reviews WHERE ProductID = p.ProductID) DESC`,
            discount: `CASE WHEN p.SalePrice IS NOT NULL AND p.SalePrice < p.RegularPrice THEN (CAST(p.RegularPrice - p.SalePrice AS FLOAT) / NULLIF(p.RegularPrice,0)) ELSE 0 END DESC`,
            'new-arrivals': `ISNULL(p.IsNewArrival, 0) DESC, p.ProductID DESC`,
            name: `p.ProductName ASC`
        };

        const orderBy = sortMap[sort] || sortMap.newest;
        
        // Count query (without pagination)
        const countQuery = `
            SELECT 
                COUNT(*) AS TotalCount
            FROM Products p
            JOIN Categories c ON p.CategoryID = c.CategoryID
            WHERE ${whereClauses.join(' AND ')}
        `;
        const countRes = await request.query(countQuery);
        const totalCount = countRes.recordset[0]?.TotalCount || 0;

        // Paged query
        const hasDisplayOrder = await hasColumn('Product_Images', 'DisplayOrder');
        const imageTop1Sql = hasDisplayOrder
            ? `(SELECT TOP 1 ImageURL FROM Product_Images WHERE ProductID = p.ProductID ORDER BY ISNULL(DisplayOrder, 0), CreatedAt, ImageID)`
            : `(SELECT TOP 1 ImageURL FROM Product_Images WHERE ProductID = p.ProductID ORDER BY CreatedAt, ImageID)`;
        request.input('offset', offset);
        request.input('limit', limit);
        const pageQuery = `
            SELECT 
                p.ProductID,
                p.ProductName,
                p.RegularPrice,
                p.SalePrice,
                COALESCE(p.SalePrice, p.RegularPrice) AS EffectivePrice,
                CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM Product_Variants pv 
                        WHERE pv.ProductID = p.ProductID AND ISNULL(pv.IsActive, 1) = 1
                    )
                    THEN (
                        SELECT ISNULL(SUM(ISNULL(pv.StockQuantity, 0)), 0)
                        FROM Product_Variants pv
                        WHERE pv.ProductID = p.ProductID AND ISNULL(pv.IsActive, 1) = 1
                    )
                    ELSE ISNULL(p.StockQuantity, 0)
                END AS StockQuantity,
                p.ProductSlug, 
                c.CategoryName,
                c.CategorySlug,
                ${imageTop1Sql} as ImageURL,
                (SELECT AVG(Rating) FROM Product_Reviews WHERE ProductID = p.ProductID) as Rating,
                (SELECT COUNT(*) FROM Product_Reviews WHERE ProductID = p.ProductID) as ReviewCount
            FROM Products p
            JOIN Categories c ON p.CategoryID = c.CategoryID
            WHERE ${whereClauses.join(' AND ')}
            ORDER BY ${orderBy}
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `;
        const pageRes = await request.query(pageQuery);
        return {
            products: pageRes.recordset,
            totalCount,
            page,
            limit
        };
    } catch (error) {
        throw error;
    }
};

// Admin listing: no storefront filters; supports search/brand/category, pagination and sort
const getProductsAdmin = async (options = {}) => {
    try {
        const request = getRequest();
        const normalized = options ?? {};
        const categorySlug = normalized.categorySlug ?? null;
        const search = normalized.search ?? null;
        const sort = normalized.sort ?? 'newest';
        const page = normalized.page ? parseInt(normalized.page) : 1;
        const limit = normalized.limit ? parseInt(normalized.limit) : 10;
        const offset = (page - 1) * limit;
        const whereClauses = ['1=1'];
        const minPrice =
            normalized.minPrice !== undefined && normalized.minPrice !== null && normalized.minPrice !== ''
                ? Number(normalized.minPrice)
                : null;
        const maxPrice =
            normalized.maxPrice !== undefined && normalized.maxPrice !== null && normalized.maxPrice !== ''
                ? Number(normalized.maxPrice)
                : null;
        const rating =
            normalized.rating !== undefined && normalized.rating !== null && normalized.rating !== ''
                ? Number(normalized.rating)
                : null;

        if (categorySlug) {
            request.input('categorySlug', categorySlug);
            whereClauses.push(`c.CategorySlug = @categorySlug`);
        }
        if (search) {
            request.input('search', `%${search}%`);
            whereClauses.push(`p.ProductName LIKE @search`);
        }
        if (Number.isFinite(minPrice)) {
            request.input('minPrice', minPrice);
            whereClauses.push(`COALESCE(p.SalePrice, p.RegularPrice) >= @minPrice`);
        }
        if (Number.isFinite(maxPrice)) {
            request.input('maxPrice', maxPrice);
            whereClauses.push(`COALESCE(p.SalePrice, p.RegularPrice) <= @maxPrice`);
        }
        if (Number.isFinite(rating)) {
            request.input('rating', rating);
            whereClauses.push(`ROUND(COALESCE((SELECT AVG(CAST(pr.Rating AS FLOAT)) FROM Product_Reviews pr WHERE pr.ProductID = p.ProductID), 0), 0) = @rating`);
        }

        const sortMap = {
            newest: `p.ProductID DESC`,
            name: `p.ProductName ASC`,
            'price-low-high': `COALESCE(p.SalePrice, p.RegularPrice) ASC`,
            'price-high-low': `COALESCE(p.SalePrice, p.RegularPrice) DESC`
        };
        const orderBy = sortMap[sort] || sortMap.newest;

        // Count
        const countQuery = `
            SELECT COUNT(*) AS TotalCount
            FROM Products p
            JOIN Categories c ON p.CategoryID = c.CategoryID
            WHERE ${whereClauses.join(' AND ')}
        `;
        const countRes = await request.query(countQuery);
        const totalCount = countRes.recordset[0]?.TotalCount || 0;

        // Page
        const hasDisplayOrder = await hasColumn('Product_Images', 'DisplayOrder');
        const imageTop1Sql = hasDisplayOrder
            ? `(SELECT TOP 1 ImageURL FROM Product_Images WHERE ProductID = p.ProductID ORDER BY ISNULL(DisplayOrder, 0), CreatedAt, ImageID)`
            : `(SELECT TOP 1 ImageURL FROM Product_Images WHERE ProductID = p.ProductID ORDER BY CreatedAt, ImageID)`;
        request.input('offset', offset);
        request.input('limit', limit);
        const pageQuery = `
            SELECT 
                p.ProductID,
                p.ProductName,
                p.RegularPrice,
                p.SalePrice,
                COALESCE(p.SalePrice, p.RegularPrice) AS EffectivePrice,
                CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM Product_Variants pv 
                        WHERE pv.ProductID = p.ProductID AND ISNULL(pv.IsActive, 1) = 1
                    )
                    THEN (
                        SELECT ISNULL(SUM(ISNULL(pv.StockQuantity, 0)), 0)
                        FROM Product_Variants pv
                        WHERE pv.ProductID = p.ProductID AND ISNULL(pv.IsActive, 1) = 1
                    )
                    ELSE ISNULL(p.StockQuantity, 0)
                END AS StockQuantity,
                p.ProductSlug, 
                p.Status,
                p.Visibility,
                c.CategoryName,
                c.CategorySlug,
                ${imageTop1Sql} as ImageURL,
                (SELECT AVG(Rating) FROM Product_Reviews WHERE ProductID = p.ProductID) as Rating,
                (SELECT COUNT(*) FROM Product_Reviews WHERE ProductID = p.ProductID) as ReviewCount
            FROM Products p
            JOIN Categories c ON p.CategoryID = c.CategoryID
            WHERE ${whereClauses.join(' AND ')}
            ORDER BY ${orderBy}
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `;
        const pageRes = await request.query(pageQuery);
        return { products: pageRes.recordset, totalCount, page, limit };
    } catch (error) {
        throw error;
    }
};

const getProductById = async (id) => {
    try {
        const request = getRequest();
        request.input('id', id);
        const hasDisplayOrder = await hasColumn('Product_Images', 'DisplayOrder');
        const result = await request.query(`
            SELECT 
                p.*, 
                c.CategoryName
            FROM Products p
            JOIN Categories c ON p.CategoryID = c.CategoryID
            WHERE p.ProductID = @id
        `);
        const product = result.recordset[0];
        if (!product) return null;

        // Images
        const imagesRes = hasDisplayOrder
            ? await request.query(`
                SELECT ImageID, ImageURL, DisplayOrder, CreatedAt
                FROM Product_Images 
                WHERE ProductID = @id 
                ORDER BY ISNULL(DisplayOrder, 0), CreatedAt, ImageID
            `)
            : await request.query(`
                SELECT ImageID, ImageURL, CreatedAt
                FROM Product_Images 
                WHERE ProductID = @id 
                ORDER BY CreatedAt, ImageID
            `);
        const images = imagesRes.recordset.map(r => r.ImageURL);
        const imagesMeta = imagesRes.recordset.map(r => ({
            ImageID: r.ImageID,
            ImageURL: r.ImageURL,
            DisplayOrder: r.DisplayOrder ?? null,
            CreatedAt: r.CreatedAt
        }));

        // Videos (optional)
        const videosRes = await request.query(`
            SELECT VideoURL 
            FROM Product_Videos 
            WHERE ProductID = @id
        `);
        const videos = videosRes.recordset.map(r => r.VideoURL);

        // Highlights (bullet points)
        const highlightsRes = await request.query(`
            SELECT HighlightText 
            FROM Product_Highlights 
            WHERE ProductID = @id 
            ORDER BY DisplayOrder
        `);
        const highlights = highlightsRes.recordset.map(r => r.HighlightText);

        // Specifications (key-value)
        const specsRes = await request.query(`
            SELECT SpecKey, SpecValue 
            FROM Product_Specifications 
            WHERE ProductID = @id 
            ORDER BY SpecKey
        `);
            

        const specifications = specsRes.recordset.filter(r => r.SpecKey !== 'Material');
        // const specifications = specsRes.recordset;

        // Variants with attributes
        const variantsRes = await request.query(`
            SELECT 
                pv.VariantID, pv.ProductID, pv.VariantName, pv.VariantSKU, pv.VariantBarcode,
                pv.RegularPrice, pv.SalePrice, pv.CostPrice, pv.StockQuantity, pv.LowStockThreshold,
                pv.StockStatus, pv.WeightKg, pv.IsDefault, pv.IsActive
            FROM Product_Variants pv
            WHERE pv.ProductID = @id
            ORDER BY pv.VariantID
        `);
        const variants = [];
        for (const v of variantsRes.recordset) {
            request.input('variantId', v.VariantID);
            const attrsRes = await request.query(`
                SELECT va.AttributeName, vv.ValueName
                FROM Variant_Attribute_Mapping m
                JOIN Variant_Attributes va ON m.AttributeID = va.AttributeID
                JOIN Variant_Attribute_Values vv ON m.ValueID = vv.ValueID
                WHERE m.VariantID = @variantId
            `);
            const attrs = {};
            for (const row of attrsRes.recordset) {
                attrs[row.AttributeName] = row.ValueName;
            }
            variants.push({ ...v, Attributes: attrs });
        }

        // Reviews summary and recent reviews
        const reviewsSummaryRes = await request.query(`
            SELECT 
                AVG(CAST(Rating AS FLOAT)) AS AvgRating, 
                COUNT(*) AS ReviewCount
            FROM Product_Reviews 
            WHERE ProductID = @id
        `);
        const distributionRes = await request.query(`
            SELECT Rating, COUNT(*) AS Count
            FROM Product_Reviews 
            WHERE ProductID = @id
            GROUP BY Rating
        `);
        const recentReviewsRes = await request.query(`
            SELECT TOP 10 ReviewID, UserID, Rating, ReviewTitle, ReviewBody, IsVerifiedPurchase, CreatedAt
            FROM Product_Reviews 
            WHERE ProductID = @id
            ORDER BY CreatedAt DESC
        `);

        const reviews = {
            avgRating: reviewsSummaryRes.recordset[0]?.AvgRating || 0,
            reviewCount: reviewsSummaryRes.recordset[0]?.ReviewCount || 0,
            distribution: distributionRes.recordset, // [{ Rating, Count }]
            recent: recentReviewsRes.recordset
        };

        return { 
            ...product, 
            images, 
            imagesMeta,
            videos, 
            highlights, 
            specifications,
            variants,
            reviews 
        };
    } catch (error) {
        throw error;
    }
};

module.exports = {
    getProducts,
    getProductById,
    getProductsAdmin
};
