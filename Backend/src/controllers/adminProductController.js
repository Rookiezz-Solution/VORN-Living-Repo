const { getRequest, sql } = require('../config/db');
const productModel = require('../models/productModel');

const create = async (req, res) => {
  try {
    const p = req.body || {};
    const required = ['ProductName','ProductSlug','CategoryID','RegularPrice','CurrencySetting'];
    for (const k of required) {
      if (p[k] === undefined || p[k] === null || String(p[k]).trim() === '') {
        return res.status(400).json({ message: `Missing required field: ${k}` });
      }
    }
    const r = getRequest();
    const toDate = (val) => {
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    };
    const toInt = (val) => {
      const n = parseInt(val, 10);
      return isNaN(n) ? null : n;
    };
    const toDec = (val) => {
      const n = parseFloat(val);
      return isNaN(n) ? null : n;
    };
    // Strings and flags
    r.input('ProductName', p.ProductName);
    r.input('ProductSlug', p.ProductSlug);
    r.input('ShortDescription', p.ShortDescription);
    r.input('FullDescription', p.FullDescription);
    r.input('ProductType', p.ProductType || 'Simple');
    r.input('CurrencySetting', p.CurrencySetting || 'INR');
    r.input('SKU', p.SKU);
    r.input('Barcode', p.Barcode);
    r.input('CountryOfOrigin', p.CountryOfOrigin || null);
    r.input('SEOTitle', p.SEOTitle || null);
    r.input('MetaDescription', p.MetaDescription || null);
    r.input('CanonicalURL', p.CanonicalURL || null);
    r.input('FocusKeyword', p.FocusKeyword || null);
    const normalizeVisibility = (v) => {
      const s = String(v || '').toLowerCase();
      if (s === 'public') return 'Public';
      if (s === 'hidden') return 'Hidden';
      if (s === 'private') return 'Hidden';
      if (s === 'catalog' || s === 'search') return 'Public';
      return 'Public';
    };
    r.input('Status', p.Status || 'Draft');
    r.input('Visibility', normalizeVisibility(p.Visibility));
    r.input('ReviewModeration', p.ReviewModeration || 'Auto');
    r.input('IsTaxInclusive', p.IsTaxInclusive ? 1 : 0);
    r.input('AllowBackorders', p.AllowBackorders ? 1 : 0);
    r.input('IsFreeShipping', p.IsFreeShipping ? 1 : 0);
    r.input('IsReturnable', p.IsReturnable ? 1 : 0);
    r.input('IsPreOrder', p.IsPreOrder ? 1 : 0);
    r.input('StockStatus', p.StockStatus || 'InStock');
    r.input('IsFeatured', p.IsFeatured ? 1 : 0);
    r.input('IsNewArrival', p.IsNewArrival ? 1 : 0);
    r.input('EnableReviews', p.EnableReviews ? 1 : 0);
    r.input('VerifiedPurchaseOnly', p.VerifiedPurchaseOnly ? 1 : 0);
    r.input('WarrantyPeriod', p.WarrantyPeriod || null);
    r.input('AdminEmail', req.admin?.email || null);
    r.input('AgeRestriction', p.AgeRestriction || null);
    // Typed numeric fields
    r.input('CategoryID', sql.Int, toInt(p.CategoryID));
    r.input('RegularPrice', sql.Decimal(18, 2), toDec(p.RegularPrice));
    r.input('SalePrice', sql.Decimal(18, 2), toDec(p.SalePrice));
    r.input('CostPrice', sql.Decimal(18, 2), toDec(p.CostPrice || 0));
    r.input('StockQuantity', sql.Int, toInt(p.StockQuantity || 0));
    r.input('LowStockThreshold', sql.Int, toInt(p.LowStockThreshold || 0));
    r.input('WeightKg', sql.Decimal(18, 2), toDec(p.WeightKg || 0));
    r.input('LengthCm', sql.Decimal(18, 2), toDec(p.LengthCm || 0));
    r.input('WidthCm', sql.Decimal(18, 2), toDec(p.WidthCm || 0));
    r.input('HeightCm', sql.Decimal(18, 2), toDec(p.HeightCm || 0));
    r.input('ShippingClassID', sql.Int, toInt(p.ShippingClassID));
    r.input('ReturnWindowDays', sql.Int, toInt(p.ReturnWindowDays || 0));
    r.input('TaxClassID', sql.Int, toInt(p.TaxClassID));
    // Typed date fields
    r.input('SaleStartDate', sql.DateTime2, toDate(p.SaleStartDate));
    r.input('SaleEndDate', sql.DateTime2, toDate(p.SaleEndDate));
    r.input('ExpectedDeliveryDate', sql.DateTime2, toDate(p.ExpectedDeliveryDate));
    r.input('PublishDate', sql.DateTime2, toDate(p.PublishDate));
    if (toInt(p.TaxClassID)) {
      const checkTax = await r.query(`
        SELECT CASE WHEN EXISTS (SELECT 1 FROM Tax_Classes WHERE TaxClassID = @TaxClassID) THEN 0 ELSE 1 END AS Missing
      `);
      if (checkTax.recordset[0]?.Missing === 1) {
        return res.status(400).json({ message: 'Invalid TaxClassID: no such tax class' });
      }
    }
    const checkCat = await r.query(`
      SELECT CASE WHEN EXISTS (SELECT 1 FROM Categories WHERE CategoryID = @CategoryID) THEN 0 ELSE 1 END AS Missing
    `);
    if (checkCat.recordset[0]?.Missing === 1) {
      return res.status(400).json({ message: 'Invalid CategoryID: no such category' });
    }
    if (toInt(p.ShippingClassID)) {
      const checkShip = await r.query(`
        SELECT CASE WHEN EXISTS (SELECT 1 FROM Shipping_Classes WHERE ShippingClassID = @ShippingClassID) THEN 0 ELSE 1 END AS Missing
      `);
      if (checkShip.recordset[0]?.Missing === 1) {
        return res.status(400).json({ message: 'Invalid ShippingClassID: no such shipping class' });
      }
    }
    // Resolve AdminID from middleware and as fallback via database
    let adminId = req.admin?.adminId || null;
    if (!adminId) {
      const userRes = await r.query(`SELECT TOP 1 UserID, UserType FROM Users WHERE Email = @AdminEmail`);
      const userId = userRes.recordset[0]?.UserID || null;
      if (!userId) {
        return res.status(400).json({ message: 'Invalid admin email: user not found' });
      }
      const userType = String(userRes.recordset[0]?.UserType || '').toLowerCase();
      if (userType !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: user is not admin' });
      }
      r.input('UserID', sql.Int, userId);
      const adminRes = await r.query(`SELECT TOP 1 AdminID FROM Admin_Users WHERE UserID = @UserID`);
      adminId = adminRes.recordset[0]?.AdminID || null;
      if (!adminId) {
        return res.status(400).json({ message: 'Admin mapping missing: bootstrap admin with a valid role first' });
      }
    }
    r.input('CreatedByAdminID', sql.Int, adminId);
    const q = `
      INSERT INTO Products (
        ProductName, ProductSlug, ShortDescription, FullDescription, ProductType, BrandID, CategoryID,
        RegularPrice, SalePrice, SaleStartDate, SaleEndDate, CurrencySetting, IsTaxInclusive, CostPrice,
        SKU, Barcode, StockQuantity, LowStockThreshold, AllowBackorders, StockStatus,
        WeightKg, LengthCm, WidthCm, HeightCm, ShippingClassID, CountryOfOrigin, IsFreeShipping,
        IsReturnable, ReturnWindowDays, WarrantyPeriod, IsPreOrder, ExpectedDeliveryDate,
        SEOTitle, MetaDescription, CanonicalURL, FocusKeyword, Status, Visibility, PublishDate,
        IsFeatured, IsNewArrival, EnableReviews, VerifiedPurchaseOnly, ReviewModeration,
        TaxClassID, AgeRestriction, CreatedByAdminID, CreatedAt
      )
      OUTPUT INSERTED.ProductID
      VALUES (
        @ProductName, @ProductSlug, @ShortDescription, @FullDescription, @ProductType,
        (CASE WHEN OBJECT_ID('Brands') IS NULL THEN NULL ELSE (SELECT TOP 1 BrandID FROM Brands ORDER BY BrandID) END),
        @CategoryID,
        @RegularPrice, @SalePrice, @SaleStartDate, @SaleEndDate, @CurrencySetting, @IsTaxInclusive, @CostPrice,
        @SKU, @Barcode, @StockQuantity, @LowStockThreshold, @AllowBackorders, @StockStatus,
        @WeightKg, @LengthCm, @WidthCm, @HeightCm, @ShippingClassID, @CountryOfOrigin, @IsFreeShipping,
        @IsReturnable, @ReturnWindowDays, @WarrantyPeriod, @IsPreOrder, @ExpectedDeliveryDate,
        @SEOTitle, @MetaDescription, @CanonicalURL, @FocusKeyword, @Status, @Visibility, @PublishDate,
        @IsFeatured, @IsNewArrival, @EnableReviews, @VerifiedPurchaseOnly, @ReviewModeration,
        @TaxClassID, @AgeRestriction, @CreatedByAdminID, GETDATE()
      )
    `;
    const skuDup = await r.query(`SELECT 1 AS X FROM Products WHERE SKU = @SKU`);
    if (skuDup.recordset.length > 0) {
      return res.status(409).json({ message: 'Duplicate SKU' });
    }
    const slugDup = await r.query(`SELECT 1 AS X FROM Products WHERE ProductSlug = @ProductSlug`);
    if (slugDup.recordset.length > 0) {
      return res.status(409).json({ message: 'Duplicate ProductSlug' });
    }
    const result = await r.query(q);
    const id = result.recordset[0].ProductID;
    const created = await productModel.getProductById(id);
    return res.status(201).json(created);
  } catch (err) {
    console.error('Admin create product error:', err);
    if (err && (err.number === 2627 || err.originalError?.number === 2627)) {
      return res.status(409).json({ message: 'Duplicate key violation' });
    }
    return res.status(500).json({ message: 'Server Error' });
  }
};

const update = async (req, res) => {
  try {
    const id = req.params.id;
    const p = req.body || {};
    const r = getRequest();
    const productId = parseInt(id, 10);
    if (!Number.isFinite(productId)) return res.status(400).json({ message: 'Invalid ProductID' });
    r.input('ProductID', sql.Int, productId);
    const normalizeVisibility = (v) => {
      const s = String(v || '').toLowerCase();
      if (s === 'public') return 'Public';
      if (s === 'hidden') return 'Hidden';
      if (s === 'private') return 'Hidden';
      if (s === 'catalog' || s === 'search') return 'Public';
      return undefined;
    };
    const toInt = (val) => {
      if (val === undefined || val === null || val === '') return null;
      const n = parseInt(val, 10);
      return Number.isFinite(n) ? n : null;
    };
    const toDec = (val) => {
      if (val === undefined || val === null || val === '') return null;
      const n = parseFloat(val);
      return Number.isFinite(n) ? n : null;
    };
    const toDate = (val) => {
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    };
    const has = (k) => Object.prototype.hasOwnProperty.call(p, k);
    const strOrNull = (val) => {
      if (val === undefined || val === null) return null;
      const s = String(val).trim();
      return s === '' ? null : s;
    };
    const boolOrNull = (val) => (val === undefined ? null : (val ? 1 : 0));
    const vis = has('Visibility') ? normalizeVisibility(p.Visibility) : undefined;

    r.input('ProductName', has('ProductName') ? strOrNull(p.ProductName) : null);
    r.input('ProductSlug', has('ProductSlug') ? strOrNull(p.ProductSlug) : null);
    r.input('ShortDescription', has('ShortDescription') ? strOrNull(p.ShortDescription) : null);
    r.input('FullDescription', has('FullDescription') ? strOrNull(p.FullDescription) : null);
    r.input('ProductType', has('ProductType') ? strOrNull(p.ProductType) : null);
    r.input('CurrencySetting', has('CurrencySetting') ? strOrNull(p.CurrencySetting) : null);
    r.input('StockStatus', has('StockStatus') ? strOrNull(p.StockStatus) : null);
    r.input('SKU', has('SKU') ? strOrNull(p.SKU) : null);
    r.input('Barcode', has('Barcode') ? strOrNull(p.Barcode) : null);
    r.input('CountryOfOrigin', has('CountryOfOrigin') ? strOrNull(p.CountryOfOrigin) : null);
    r.input('WarrantyPeriod', has('WarrantyPeriod') ? strOrNull(p.WarrantyPeriod) : null);
    r.input('SEOTitle', has('SEOTitle') ? strOrNull(p.SEOTitle) : null);
    r.input('MetaDescription', has('MetaDescription') ? strOrNull(p.MetaDescription) : null);
    r.input('CanonicalURL', has('CanonicalURL') ? strOrNull(p.CanonicalURL) : null);
    r.input('FocusKeyword', has('FocusKeyword') ? strOrNull(p.FocusKeyword) : null);

    r.input('CategoryID', sql.Int, has('CategoryID') ? toInt(p.CategoryID) : null);
    r.input('TaxClassID', sql.Int, has('TaxClassID') ? toInt(p.TaxClassID) : null);
    r.input('ShippingClassID', sql.Int, has('ShippingClassID') ? toInt(p.ShippingClassID) : null);
    r.input('ReturnWindowDays', sql.Int, has('ReturnWindowDays') ? toInt(p.ReturnWindowDays) : null);
    r.input('AgeRestriction', sql.Int, has('AgeRestriction') ? toInt(p.AgeRestriction) : null);

    r.input('RegularPrice', sql.Decimal(18, 2), has('RegularPrice') ? toDec(p.RegularPrice) : null);
    r.input('SalePrice', sql.Decimal(18, 2), has('SalePrice') ? toDec(p.SalePrice) : null);
    r.input('CostPrice', sql.Decimal(18, 2), has('CostPrice') ? toDec(p.CostPrice) : null);
    r.input('WeightKg', sql.Decimal(18, 2), has('WeightKg') ? toDec(p.WeightKg) : null);
    r.input('LengthCm', sql.Decimal(18, 2), has('LengthCm') ? toDec(p.LengthCm) : null);
    r.input('WidthCm', sql.Decimal(18, 2), has('WidthCm') ? toDec(p.WidthCm) : null);
    r.input('HeightCm', sql.Decimal(18, 2), has('HeightCm') ? toDec(p.HeightCm) : null);

    r.input('SaleStartDate', sql.DateTime2, has('SaleStartDate') ? toDate(p.SaleStartDate) : null);
    r.input('SaleEndDate', sql.DateTime2, has('SaleEndDate') ? toDate(p.SaleEndDate) : null);
    r.input('ExpectedDeliveryDate', sql.DateTime2, has('ExpectedDeliveryDate') ? toDate(p.ExpectedDeliveryDate) : null);
    r.input('PublishDate', sql.DateTime2, has('PublishDate') ? toDate(p.PublishDate) : null);

    r.input('IsTaxInclusive', sql.Bit, has('IsTaxInclusive') ? boolOrNull(p.IsTaxInclusive) : null);
    r.input('AllowBackorders', sql.Bit, has('AllowBackorders') ? boolOrNull(p.AllowBackorders) : null);
    r.input('IsFreeShipping', sql.Bit, has('IsFreeShipping') ? boolOrNull(p.IsFreeShipping) : null);
    r.input('IsReturnable', sql.Bit, has('IsReturnable') ? boolOrNull(p.IsReturnable) : null);
    r.input('IsPreOrder', sql.Bit, has('IsPreOrder') ? boolOrNull(p.IsPreOrder) : null);
    r.input('IsFeatured', sql.Bit, has('IsFeatured') ? boolOrNull(p.IsFeatured) : null);
    r.input('IsNewArrival', sql.Bit, has('IsNewArrival') ? boolOrNull(p.IsNewArrival) : null);
    r.input('EnableReviews', sql.Bit, has('EnableReviews') ? boolOrNull(p.EnableReviews) : null);
    r.input('VerifiedPurchaseOnly', sql.Bit, has('VerifiedPurchaseOnly') ? boolOrNull(p.VerifiedPurchaseOnly) : null);

    r.input('ReviewModeration', has('ReviewModeration') ? strOrNull(p.ReviewModeration) : null);
    r.input('Status', has('Status') ? strOrNull(p.Status) : null);
    r.input('LowStockThreshold', sql.Int, has('LowStockThreshold') ? toInt(p.LowStockThreshold) : null);
    r.input('Visibility', vis !== undefined ? vis : null);
    let stockQuantityParam = null;
    const newStock = has('StockQuantity') ? toInt(p.StockQuantity) : null;
    if (newStock !== null) {
      const chk = await r.query(`
        SELECT TOP 1 VariantID
        FROM Product_Variants
        WHERE ProductID = @ProductID AND ISNULL(IsActive, 1) = 1
      `);
      const hasVariants = chk.recordset.length > 0;

      if (hasVariants) {
        r.input('newStock', sql.Int, newStock);
        const aggRes = await r.query(`
          SELECT ISNULL(SUM(ISNULL(StockQuantity, 0)), 0) AS CurrentSum
          FROM Product_Variants
          WHERE ProductID = @ProductID AND ISNULL(IsActive, 1) = 1
        `);
        const currentSum = parseInt(aggRes.recordset[0]?.CurrentSum || 0, 10);
        const delta = newStock - currentSum;
        r.input('delta', sql.Int, delta);
        const targetRes = await r.query(`
          SELECT TOP 1 VariantID
          FROM Product_Variants
          WHERE ProductID = @ProductID AND ISNULL(IsActive, 1) = 1
          ORDER BY ISNULL(IsDefault, 0) DESC, VariantID ASC
        `);
        const targetVariantId = targetRes.recordset[0]?.VariantID;
        if (targetVariantId) {
          r.input('targetVariantId', sql.Int, targetVariantId);
          await r.query(`
            UPDATE Product_Variants
            SET
              StockQuantity = CASE
                WHEN (ISNULL(StockQuantity, 0) + @delta) < 0 THEN 0
                ELSE (ISNULL(StockQuantity, 0) + @delta)
              END,
              StockStatus = CASE
                WHEN (ISNULL(StockQuantity, 0) + @delta) <= 0 THEN 'OutOfStock'
                ELSE 'InStock'
              END,
              UpdatedAt = GETDATE()
            WHERE ProductID = @ProductID AND VariantID = @targetVariantId
          `);
        }

        await r.query(`
          UPDATE Products
          SET
            StockQuantity = (
              SELECT ISNULL(SUM(ISNULL(pv.StockQuantity, 0)), 0)
              FROM Product_Variants pv
              WHERE pv.ProductID = Products.ProductID AND ISNULL(pv.IsActive, 1) = 1
            ),
            StockStatus = CASE WHEN (
              SELECT ISNULL(SUM(ISNULL(pv.StockQuantity, 0)), 0)
              FROM Product_Variants pv
              WHERE pv.ProductID = Products.ProductID AND ISNULL(pv.IsActive, 1) = 1
            ) <= 0 THEN 'OutOfStock' ELSE 'InStock' END,
            UpdatedAt = GETDATE()
          WHERE ProductID = @ProductID
        `);
        stockQuantityParam = null;
      } else {
        stockQuantityParam = newStock;
      }
    }
    r.input('StockQuantity', sql.Int, stockQuantityParam);

    const newCategoryId = has('CategoryID') ? toInt(p.CategoryID) : null;
    if (newCategoryId !== null) {
      const checkCat = await r.query(`SELECT CASE WHEN EXISTS (SELECT 1 FROM Categories WHERE CategoryID = @CategoryID) THEN 0 ELSE 1 END AS Missing`);
      if (checkCat.recordset[0]?.Missing === 1) return res.status(400).json({ message: 'Invalid CategoryID: no such category' });
    }
    const newTaxClassId = has('TaxClassID') ? toInt(p.TaxClassID) : null;
    if (newTaxClassId !== null) {
      const checkTax = await r.query(`SELECT CASE WHEN EXISTS (SELECT 1 FROM Tax_Classes WHERE TaxClassID = @TaxClassID) THEN 0 ELSE 1 END AS Missing`);
      if (checkTax.recordset[0]?.Missing === 1) return res.status(400).json({ message: 'Invalid TaxClassID: no such tax class' });
    }
    const newShipId = has('ShippingClassID') ? toInt(p.ShippingClassID) : null;
    if (newShipId !== null) {
      const checkShip = await r.query(`SELECT CASE WHEN EXISTS (SELECT 1 FROM Shipping_Classes WHERE ShippingClassID = @ShippingClassID) THEN 0 ELSE 1 END AS Missing`);
      if (checkShip.recordset[0]?.Missing === 1) return res.status(400).json({ message: 'Invalid ShippingClassID: no such shipping class' });
    }
    const newSku = has('SKU') ? strOrNull(p.SKU) : null;
    if (newSku) {
      const skuDup = await r.query(`SELECT 1 AS X FROM Products WHERE SKU = @SKU AND ProductID <> @ProductID`);
      if (skuDup.recordset.length > 0) return res.status(409).json({ message: 'Duplicate SKU' });
    }
    const newSlug = has('ProductSlug') ? strOrNull(p.ProductSlug) : null;
    if (newSlug) {
      const slugDup = await r.query(`SELECT 1 AS X FROM Products WHERE ProductSlug = @ProductSlug AND ProductID <> @ProductID`);
      if (slugDup.recordset.length > 0) return res.status(409).json({ message: 'Duplicate ProductSlug' });
    }

    const q = `
      UPDATE Products SET
        ProductName = ISNULL(@ProductName, ProductName),
        ProductSlug = ISNULL(@ProductSlug, ProductSlug),
        ShortDescription = ISNULL(@ShortDescription, ShortDescription),
        FullDescription = ISNULL(@FullDescription, FullDescription),
        CategoryID = ISNULL(@CategoryID, CategoryID),
        ProductType = ISNULL(@ProductType, ProductType),
        RegularPrice = ISNULL(@RegularPrice, RegularPrice),
        SalePrice = ISNULL(@SalePrice, SalePrice),
        SaleStartDate = ISNULL(@SaleStartDate, SaleStartDate),
        SaleEndDate = ISNULL(@SaleEndDate, SaleEndDate),
        CurrencySetting = ISNULL(@CurrencySetting, CurrencySetting),
        IsTaxInclusive = ISNULL(@IsTaxInclusive, IsTaxInclusive),
        CostPrice = ISNULL(@CostPrice, CostPrice),
        SKU = ISNULL(@SKU, SKU),
        Barcode = ISNULL(@Barcode, Barcode),
        Status = ISNULL(@Status, Status),
        Visibility = ISNULL(@Visibility, Visibility),
        StockQuantity = ISNULL(@StockQuantity, StockQuantity),
        LowStockThreshold = ISNULL(@LowStockThreshold, LowStockThreshold),
        AllowBackorders = ISNULL(@AllowBackorders, AllowBackorders),
        StockStatus = ISNULL(@StockStatus, StockStatus),
        WeightKg = ISNULL(@WeightKg, WeightKg),
        LengthCm = ISNULL(@LengthCm, LengthCm),
        WidthCm = ISNULL(@WidthCm, WidthCm),
        HeightCm = ISNULL(@HeightCm, HeightCm),
        ShippingClassID = ISNULL(@ShippingClassID, ShippingClassID),
        CountryOfOrigin = ISNULL(@CountryOfOrigin, CountryOfOrigin),
        IsFreeShipping = ISNULL(@IsFreeShipping, IsFreeShipping),
        IsReturnable = ISNULL(@IsReturnable, IsReturnable),
        ReturnWindowDays = ISNULL(@ReturnWindowDays, ReturnWindowDays),
        WarrantyPeriod = ISNULL(@WarrantyPeriod, WarrantyPeriod),
        IsPreOrder = ISNULL(@IsPreOrder, IsPreOrder),
        ExpectedDeliveryDate = ISNULL(@ExpectedDeliveryDate, ExpectedDeliveryDate),
        SEOTitle = ISNULL(@SEOTitle, SEOTitle),
        MetaDescription = ISNULL(@MetaDescription, MetaDescription),
        CanonicalURL = ISNULL(@CanonicalURL, CanonicalURL),
        FocusKeyword = ISNULL(@FocusKeyword, FocusKeyword),
        PublishDate = ISNULL(@PublishDate, PublishDate),
        IsFeatured = ISNULL(@IsFeatured, IsFeatured),
        IsNewArrival = ISNULL(@IsNewArrival, IsNewArrival),
        EnableReviews = ISNULL(@EnableReviews, EnableReviews),
        VerifiedPurchaseOnly = ISNULL(@VerifiedPurchaseOnly, VerifiedPurchaseOnly),
        ReviewModeration = ISNULL(@ReviewModeration, ReviewModeration),
        TaxClassID = ISNULL(@TaxClassID, TaxClassID),
        AgeRestriction = ISNULL(@AgeRestriction, AgeRestriction),
        UpdatedAt = GETDATE()
      WHERE ProductID = @ProductID
    `;
    await r.query(q);
    const updated = await productModel.getProductById(id);
    return res.json(updated);
  } catch (err) {
    console.error('Admin update product error:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const list = async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const toNumberOrNull = (v) => {
      if (v === undefined || v === null || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const toIntOrNull = (v) => {
      if (v === undefined || v === null || v === '') return null;
      const n = Number(v);
      if (!Number.isFinite(n)) return null;
      const i = Math.trunc(n);
      return Number.isFinite(i) ? i : null;
    };
    let minPrice = toNumberOrNull(req.query.minPrice);
    let maxPrice = toNumberOrNull(req.query.maxPrice);
    if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
      const t = minPrice;
      minPrice = maxPrice;
      maxPrice = t;
    }
    const rating = toIntOrNull(req.query.rating);
    const data = await productModel.getProductsAdmin({
      page,
      limit,
      categorySlug: req.query.category,
      search: req.query.search,
      sort: req.query.sort,
      minPrice,
      maxPrice,
      rating,
      material: req.query.material,
      finish: req.query.finish
    });
    return res.json(data);
  } catch (err) {
    console.error('Admin list products error:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const get = async (req, res) => {
  try {
    const id = req.params.id;
    const p = await productModel.getProductById(id);
    if (!p) return res.status(404).json({ message: 'Not found' });
    return res.json(p);
  } catch (err) {
    console.error('Admin get product error:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const remove = async (req, res) => {
  try {
    const id = req.params.id;
    const r = getRequest();
    r.input('ProductID', id);
    // Hard delete: remove dependent references first to satisfy FK constraints
    await r.query(`DELETE FROM Cart_Items WHERE ProductID = @ProductID`);
    await r.query(`DELETE FROM Order_Items WHERE ProductID = @ProductID`);
    await r.query(`DELETE FROM Wishlist WHERE ProductID = @ProductID`);
    // Clean up dependent records first
    await r.query(`DELETE FROM Variant_Attribute_Mapping WHERE VariantID IN (SELECT VariantID FROM Product_Variants WHERE ProductID = @ProductID)`);
    await r.query(`DELETE FROM Product_Variants WHERE ProductID = @ProductID`);
    await r.query(`DELETE FROM Product_Videos WHERE ProductID = @ProductID`);
    await r.query(`DELETE FROM Product_Images WHERE ProductID = @ProductID`);
    await r.query(`DELETE FROM Product_Highlights WHERE ProductID = @ProductID`);
    await r.query(`DELETE FROM Product_Specifications WHERE ProductID = @ProductID`);
    await r.query(`DELETE FROM Product_Reviews WHERE ProductID = @ProductID`);
    const result = await r.query(`DELETE FROM Products WHERE ProductID = @ProductID`);
    return res.json({ deleted: result.rowsAffected?.[0] || 0 });
  } catch (err) {
    console.error('Admin delete product error:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { create, update, list, get, remove };
