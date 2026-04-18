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
    where.push('ISNULL(IsActive, 1) = 1');
    if (search) {
      rCount.input('search', `%${search}%`);
      where.push(`CategoryName LIKE @search`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const orderBy = sort === 'name-asc' ? 'CategoryName ASC'
      : sort === 'name-desc' ? 'CategoryName DESC'
      : 'CategoryID DESC';
    // Count
    const countRes = await rCount.query(`SELECT COUNT(*) AS TotalCount FROM Categories ${whereSql}`);
    const totalCount = countRes.recordset[0]?.TotalCount || 0;
    // Page
    const r = getRequest();
    if (search) r.input('search', `%${search}%`);
    r.input('offset', offset);
    r.input('limit', limit);
    const pageRes = await r.query(`
      SELECT CategoryID, CategoryName, CategorySlug, ISNULL(ImageURL, '') AS ImageURL
      FROM Categories
      ${whereSql}
      ORDER BY ${orderBy}
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    return res.json({ categories: pageRes.recordset, totalCount, page, limit });
  } catch (e) {
    console.error('Admin categories list error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const get = async (req, res) => {
  try {
    const r = getRequest();
    r.input('CategoryID', req.params.id);
    const result = await r.query(`
      SELECT TOP 1 CategoryID, CategoryName, CategorySlug, ISNULL(ImageURL, '') AS ImageURL
      FROM Categories WHERE CategoryID = @CategoryID
    `);
    if (result.recordset.length === 0) return res.status(404).json({ message: 'Category not found' });
    return res.json(result.recordset[0]);
  } catch (e) {
    console.error('Admin get category error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const create = async (req, res) => {
  try {
    const { CategoryName, ImageURL } = req.body || {};
    if (!CategoryName || String(CategoryName).trim() === '') {
      return res.status(400).json({ message: 'CategoryName is required' });
    }
    const r = getRequest();
    const trimmed = CategoryName.trim();
    r.input('CategoryName', trimmed);
    const dup = await r.query(`SELECT 1 AS X FROM Categories WHERE CategoryName = @CategoryName`);
    if (dup.recordset.length > 0) {
      return res.status(409).json({ message: 'Duplicate CategoryName' });
    }
    // Slug
    const slugBase = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'category';
    let slug = slugBase; let i = 1;
    while (true) {
      const cr = getRequest();
      cr.input('CategorySlug', slug);
      const exists = await cr.query(`SELECT 1 AS X FROM Categories WHERE CategorySlug = @CategorySlug`);
      if (exists.recordset.length === 0) break;
      slug = `${slugBase}-${i++}`;
    }
    r.input('CategorySlug', slug);
    if (ImageURL) r.input('ImageURL', ImageURL);
    const result = await r.query(`
      INSERT INTO Categories (CategoryName, CategorySlug, ImageURL, IsActive, CreatedAt)
      OUTPUT INSERTED.CategoryID, INSERTED.CategoryName, INSERTED.CategorySlug, ISNULL(INSERTED.ImageURL, '') AS ImageURL
      VALUES (@CategoryName, @CategorySlug, ${ImageURL ? '@ImageURL' : 'NULL'}, 1, GETDATE())
    `);
    return res.status(201).json(result.recordset[0]);
  } catch (e) {
    console.error('Admin create category error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const update = async (req, res) => {
  try {
    const { CategoryName, ImageURL } = req.body || {};
    const r = getRequest();
    r.input('CategoryID', req.params.id);
    if (CategoryName) {
      r.input('CategoryName', CategoryName.trim());
      const dup = await r.query(`
        SELECT 1 AS X FROM Categories WHERE CategoryName = @CategoryName AND CategoryID <> @CategoryID
      `);
      if (dup.recordset.length > 0) return res.status(409).json({ message: 'Duplicate CategoryName' });
    }
    if (ImageURL !== undefined) r.input('ImageURL', ImageURL);
    const result = await r.query(`
      UPDATE Categories SET
        CategoryName = COALESCE(@CategoryName, CategoryName),
        ImageURL = ${ImageURL !== undefined ? 'COALESCE(@ImageURL, ImageURL)' : 'ImageURL'}
      WHERE CategoryID = @CategoryID;
      SELECT TOP 1 CategoryID, CategoryName, CategorySlug, ISNULL(ImageURL, '') AS ImageURL FROM Categories WHERE CategoryID = @CategoryID;
    `);
    if (result.recordset.length === 0) return res.status(404).json({ message: 'Category not found' });
    return res.json(result.recordset[0]);
  } catch (e) {
    console.error('Admin update category error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const remove = async (req, res) => {
  try {
    const r = getRequest();
    r.input('CategoryID', req.params.id);
    const ref = await r.query(`SELECT TOP 1 1 AS X FROM Products WHERE CategoryID = @CategoryID`);
    if (ref.recordset.length > 0) return res.status(409).json({ message: 'Category is referenced by products' });
    const result = await r.query(`DELETE FROM Categories WHERE CategoryID = @CategoryID`);
    return res.json({ deleted: result.rowsAffected?.[0] || 0 });
  } catch (e) {
    console.error('Admin delete category error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const uploadImage = async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const id = req.params.id;
    const imageBase64 = req.body?.imageBase64;
    if (!id) return res.status(400).json({ message: 'CategoryID required' });
    if (!imageBase64) return res.status(400).json({ message: 'imageBase64 required' });
    const dir = path.join(__dirname, '..', '..', 'uploads', 'categories', String(id));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const match = /^data:image\/(\w+);base64,/.exec(imageBase64) || [];
    const ext = match[1] || 'png';
    const filename = `img_${Date.now()}_${Math.floor(Math.random()*10000)}.${ext}`;
    const filePath = path.join(dir, filename);
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    const url = `/uploads/categories/${id}/${filename}`;
    const r = getRequest();
    r.input('CategoryID', id);
    r.input('ImageURL', url);
    await r.query(`UPDATE Categories SET ImageURL = @ImageURL WHERE CategoryID = @CategoryID`);
    return res.status(201).json({ url });
  } catch (e) {
    console.error('Admin upload category image error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { list, get, create, update, remove, uploadImage };
