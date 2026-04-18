const { getRequest } = require('../config/db');

const list = async (req, res) => {
  try {
    const search = req.query.search || null;
    const sort = req.query.sort || 'newest';
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const offset = (page - 1) * limit;
    const where = [];
    const rCount = getRequest();
    if (search) {
      rCount.input('search', `%${search}%`);
      where.push(`BrandName LIKE @search`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const orderBy = sort === 'name-asc' ? 'BrandName ASC'
      : sort === 'name-desc' ? 'BrandName DESC'
      : 'BrandID DESC';
    // Count
    const countRes = await rCount.query(`SELECT COUNT(*) AS TotalCount FROM Brands ${whereSql}`);
    const totalCount = countRes.recordset[0]?.TotalCount || 0;
    // Page
    const r = getRequest();
    if (search) r.input('search', `%${search}%`);
    r.input('offset', offset);
    r.input('limit', limit);
    const pageRes = await r.query(`
      SELECT BrandID, BrandName, ISNULL(LogoURL, '') AS LogoURL
      FROM Brands
      ${whereSql}
      ORDER BY ${orderBy}
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    return res.json({ brands: pageRes.recordset, totalCount, page, limit });
  } catch (e) {
    console.error('Admin brands list error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const get = async (req, res) => {
  try {
    const r = getRequest();
    r.input('BrandID', req.params.id);
    const result = await r.query(`
      SELECT TOP 1 BrandID, BrandName, ISNULL(LogoURL, '') AS LogoURL
      FROM Brands WHERE BrandID = @BrandID
    `);
    if (result.recordset.length === 0) return res.status(404).json({ message: 'Brand not found' });
    return res.json(result.recordset[0]);
  } catch (e) {
    console.error('Admin get brand error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const create = async (req, res) => {
  try {
    const { BrandName, LogoURL } = req.body || {};
    if (!BrandName || String(BrandName).trim() === '') {
      return res.status(400).json({ message: 'BrandName is required' });
    }
    const r = getRequest();
    const trimmedName = BrandName.trim();
    r.input('BrandName', trimmedName);
    const dup = await r.query(`SELECT 1 AS X FROM Brands WHERE BrandName = @BrandName`);
    if (dup.recordset.length > 0) {
      return res.status(409).json({ message: 'Duplicate BrandName' });
    }
    // Generate unique slug for BrandSlug (not null)
    const slugBase = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'brand';
    let slug = slugBase;
    let i = 1;
    // ensure unique BrandSlug
    // Use a fresh request for each check to avoid param reuse conflicts
    // Attempt up to a reasonable number of times
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const checkReq = getRequest();
      checkReq.input('BrandSlug', slug);
      const exists = await checkReq.query(`SELECT 1 AS X FROM Brands WHERE BrandSlug = @BrandSlug`);
      if (exists.recordset.length === 0) break;
      slug = `${slugBase}-${i++}`;
    }
    r.input('BrandSlug', slug);
    if (LogoURL) r.input('LogoURL', LogoURL);
    const result = await r.query(`
      INSERT INTO Brands (BrandName, BrandSlug, LogoURL, CreatedAt)
      OUTPUT INSERTED.BrandID, INSERTED.BrandName, INSERTED.BrandSlug, ISNULL(INSERTED.LogoURL, '') AS LogoURL
      VALUES (@BrandName, @BrandSlug, ${LogoURL ? '@LogoURL' : 'NULL'}, GETDATE())
    `);
    return res.status(201).json(result.recordset[0]);
  } catch (e) {
    console.error('Admin create brand error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const update = async (req, res) => {
  try {
    const { BrandName, LogoURL } = req.body || {};
    const r = getRequest();
    r.input('BrandID', req.params.id);
    if (BrandName) {
      r.input('BrandName', BrandName.trim());
      const dup = await r.query(`
        SELECT 1 AS X FROM Brands WHERE BrandName = @BrandName AND BrandID <> @BrandID
      `);
      if (dup.recordset.length > 0) {
        return res.status(409).json({ message: 'Duplicate BrandName' });
      }
    }
    if (LogoURL !== undefined) r.input('LogoURL', LogoURL);
    const result = await r.query(`
      UPDATE Brands SET
        BrandName = COALESCE(@BrandName, BrandName),
        LogoURL = ${LogoURL !== undefined ? 'COALESCE(@LogoURL, LogoURL)' : 'LogoURL'}
      WHERE BrandID = @BrandID;
      SELECT TOP 1 BrandID, BrandName, ISNULL(LogoURL, '') AS LogoURL FROM Brands WHERE BrandID = @BrandID;
    `);
    if (result.recordset.length === 0) return res.status(404).json({ message: 'Brand not found' });
    return res.json(result.recordset[0]);
  } catch (e) {
    console.error('Admin update brand error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const remove = async (req, res) => {
  try {
    const r = getRequest();
    r.input('BrandID', req.params.id);
    // Prevent delete if used by products
    const ref = await r.query(`SELECT TOP 1 1 AS X FROM Products WHERE BrandID = @BrandID`);
    if (ref.recordset.length > 0) {
      return res.status(409).json({ message: 'Brand is referenced by products' });
    }
    const result = await r.query(`DELETE FROM Brands WHERE BrandID = @BrandID`);
    return res.json({ deleted: result.rowsAffected?.[0] || 0 });
  } catch (e) {
    console.error('Admin delete brand error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const uploadLogo = async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const brandId = req.params.id;
    const imageBase64 = req.body?.imageBase64;
    if (!brandId) return res.status(400).json({ message: 'BrandID required' });
    if (!imageBase64) return res.status(400).json({ message: 'imageBase64 required' });
    const dir = path.join(__dirname, '..', '..', 'uploads', 'brands', String(brandId));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const match = /^data:image\/(\w+);base64,/.exec(imageBase64) || [];
    const ext = match[1] || 'png';
    const filename = `logo_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;
    const filePath = path.join(dir, filename);
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    const url = `/uploads/brands/${brandId}/${filename}`;
    const r = getRequest();
    r.input('BrandID', brandId);
    r.input('LogoURL', url);
    await r.query(`UPDATE Brands SET LogoURL = @LogoURL WHERE BrandID = @BrandID`);
    return res.status(201).json({ url });
  } catch (e) {
    console.error('Admin upload brand logo error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { list, get, create, update, remove, uploadLogo };
