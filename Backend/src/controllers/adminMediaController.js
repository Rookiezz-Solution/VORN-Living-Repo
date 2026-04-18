const { getRequest } = require('../config/db');

let _hasProductImagesDisplayOrder = null;
const hasProductImagesDisplayOrder = async () => {
  if (_hasProductImagesDisplayOrder !== null) return _hasProductImagesDisplayOrder;
  const r = getRequest();
  const resp = await r.query(`
    SELECT 1 AS X
    FROM sys.tables t
    INNER JOIN sys.columns c ON c.object_id = t.object_id
    WHERE t.name = 'Product_Images' AND c.name = 'DisplayOrder'
  `);
  _hasProductImagesDisplayOrder = resp.recordset.length > 0;
  return _hasProductImagesDisplayOrder;
};

const addImages = async (req, res) => {
  try {
    const productId = req.params.id;
    const urls = Array.isArray(req.body.images) ? req.body.images : [];
    let order = parseInt(req.body.startOrder || '1', 10);
    const hasOrder = await hasProductImagesDisplayOrder();
    if (urls.length) {
      if (hasOrder) {
        const shiftReq = getRequest();
        shiftReq.input('ProductID', productId);
        shiftReq.input('StartOrder', order);
        shiftReq.input('ShiftBy', urls.length);
        await shiftReq.query(`
          UPDATE Product_Images
          SET DisplayOrder = ISNULL(DisplayOrder, 0) + @ShiftBy
          WHERE ProductID = @ProductID AND ISNULL(DisplayOrder, 0) >= @StartOrder
        `);
      }
    }
    for (const url of urls) {
      const reqDb = getRequest();
      reqDb.input('ProductID', productId);
      reqDb.input('ImageURL', url);
      if (hasOrder) {
        reqDb.input('DisplayOrder', order++);
        await reqDb.query(`
          IF EXISTS (SELECT 1 FROM Product_Images WHERE ProductID = @ProductID AND ImageURL = @ImageURL)
          BEGIN
            UPDATE Product_Images
            SET DisplayOrder = @DisplayOrder
            WHERE ProductID = @ProductID AND ImageURL = @ImageURL
          END
          ELSE
          BEGIN
            INSERT INTO Product_Images (ProductID, ImageURL, DisplayOrder, CreatedAt)
            VALUES (@ProductID, @ImageURL, @DisplayOrder, GETDATE())
          END
        `);
      } else {
        await reqDb.query(`
          IF NOT EXISTS (SELECT 1 FROM Product_Images WHERE ProductID = @ProductID AND ImageURL = @ImageURL)
          BEGIN
            INSERT INTO Product_Images (ProductID, ImageURL, CreatedAt)
            VALUES (@ProductID, @ImageURL, GETDATE())
          END
        `);
      }
    }
    return res.status(201).json({ added: urls.length });
  } catch (err) {
    console.error('Admin add images error:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const addVideos = async (req, res) => {
  try {
    const productId = req.params.id;
    const urls = Array.isArray(req.body.videos) ? req.body.videos : [];
    for (const url of urls) {
      const reqDb = getRequest();
      reqDb.input('ProductID', productId);
      reqDb.input('VideoURL', url);
      await reqDb.query(`
        IF NOT EXISTS (SELECT 1 FROM Product_Videos WHERE ProductID = @ProductID AND VideoURL = @VideoURL)
        BEGIN
          INSERT INTO Product_Videos (ProductID, VideoURL, CreatedAt)
          VALUES (@ProductID, @VideoURL, GETDATE())
        END
      `);
    }
    return res.status(201).json({ added: urls.length });
  } catch (err) {
    console.error('Admin add videos error:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const addImageUploads = async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const productId = req.params.id;
    if (!productId) return res.status(400).json({ message: 'ProductID required' });
    const items = Array.isArray(req.body.imagesBase64) ? req.body.imagesBase64 : (req.body.imageBase64 ? [req.body.imageBase64] : []);
    if (!items.length) return res.status(400).json({ message: 'No images provided' });
    const dir = path.join(__dirname, '..', '..', 'uploads', 'products', String(productId), 'images');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    let added = 0;
    let order = parseInt(req.body.startOrder || '1', 10);
    const hasOrder = await hasProductImagesDisplayOrder();
    if (items.length) {
      if (hasOrder) {
        const shiftReq = getRequest();
        shiftReq.input('ProductID', productId);
        shiftReq.input('StartOrder', order);
        shiftReq.input('ShiftBy', items.length);
        await shiftReq.query(`
          UPDATE Product_Images
          SET DisplayOrder = ISNULL(DisplayOrder, 0) + @ShiftBy
          WHERE ProductID = @ProductID AND ISNULL(DisplayOrder, 0) >= @StartOrder
        `);
      }
    }
    for (const b64 of items) {
      const match = /^data:image\/(\w+);base64,/.exec(b64) || [];
      const ext = match[1] || 'png';
      const filename = `img_${Date.now()}_${Math.floor(Math.random()*10000)}.${ext}`;
      const filePath = path.join(dir, filename);
      const base64Data = b64.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
      const url = `/uploads/products/${productId}/images/${filename}`;
      const reqDb = getRequest();
      reqDb.input('ProductID', productId);
      reqDb.input('ImageURL', url);
      if (hasOrder) {
        reqDb.input('DisplayOrder', order++);
        await reqDb.query(`INSERT INTO Product_Images (ProductID, ImageURL, DisplayOrder, CreatedAt) VALUES (@ProductID, @ImageURL, @DisplayOrder, GETDATE())`);
      } else {
        await reqDb.query(`INSERT INTO Product_Images (ProductID, ImageURL, CreatedAt) VALUES (@ProductID, @ImageURL, GETDATE())`);
      }
      added++;
    }
    return res.status(201).json({ added });
  } catch (err) {
    console.error('Admin add image uploads error:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const addVideoUploads = async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const productId = req.params.id;
    if (!productId) return res.status(400).json({ message: 'ProductID required' });
    const items = Array.isArray(req.body.videosBase64) ? req.body.videosBase64 : (req.body.videoBase64 ? [req.body.videoBase64] : []);
    if (!items.length) return res.status(400).json({ message: 'No videos provided' });
    const dir = path.join(__dirname, '..', '..', 'uploads', 'products', String(productId), 'videos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    let added = 0;
    for (const b64 of items) {
      const match = /^data:video\/(\w+);base64,/.exec(b64) || [];
      const ext = match[1] || 'mp4';
      const filename = `vid_${Date.now()}_${Math.floor(Math.random()*10000)}.${ext}`;
      const filePath = path.join(dir, filename);
      const base64Data = b64.replace(/^data:video\/\w+;base64,/, '');
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
      const url = `/uploads/products/${productId}/videos/${filename}`;
      const reqDb = getRequest();
      reqDb.input('ProductID', productId);
      reqDb.input('VideoURL', url);
      await reqDb.query(`INSERT INTO Product_Videos (ProductID, VideoURL, CreatedAt) VALUES (@ProductID, @VideoURL, GETDATE())`);
      added++;
    }
    return res.status(201).json({ added });
  } catch (err) {
    console.error('Admin add video uploads error:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const reorderImage = async (req, res) => {
  try {
    const hasOrder = await hasProductImagesDisplayOrder();
    if (!hasOrder) return res.json({ updated: 0 });
    const imageId = req.params.imageId;
    const order = req.body.displayOrder;
    const r = getRequest();
    r.input('ImageID', imageId);
    r.input('DisplayOrder', order);
    try {
      await r.query(`UPDATE Product_Images SET DisplayOrder = @DisplayOrder WHERE ImageID = @ImageID`);
    } catch (e) {
      const msg = String(e?.originalError?.info?.message || e?.message || '');
      if (msg.includes("Invalid column name 'DisplayOrder'")) {
        _hasProductImagesDisplayOrder = false;
        return res.json({ updated: 0 });
      }
      throw e;
    }
    return res.json({ updated: 1 });
  } catch (err) {
    console.error('Admin reorder image error:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const deleteImage = async (req, res) => {
  try {
    const imageId = req.params.imageId;
    const r0 = getRequest();
    r0.input('ImageID', imageId);
    const found = await r0.query(`SELECT TOP 1 ProductID FROM Product_Images WHERE ImageID = @ImageID`);
    const productId = found.recordset[0]?.ProductID;
    const r = getRequest();
    r.input('ImageID', imageId);
    await r.query(`DELETE FROM Product_Images WHERE ImageID = @ImageID`);
    if (productId) {
      const hasOrder = await hasProductImagesDisplayOrder();
      if (hasOrder) {
        const rn = getRequest();
        rn.input('ProductID', productId);
        try {
          await rn.query(`
            ;WITH c AS (
              SELECT ImageID, ROW_NUMBER() OVER (ORDER BY ISNULL(DisplayOrder, 0), CreatedAt, ImageID) AS rn
              FROM Product_Images
              WHERE ProductID = @ProductID
            )
            UPDATE c SET DisplayOrder = rn
          `);
        } catch (e) {
          const msg = String(e?.originalError?.info?.message || e?.message || '');
          if (msg.includes("Invalid column name 'DisplayOrder'")) {
            _hasProductImagesDisplayOrder = false;
          } else {
            throw e;
          }
        }
      }
    }
    return res.json({ deleted: 1 });
  } catch (err) {
    console.error('Admin delete image error:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const addHighlights = async (req, res) => {
  try {
    const productId = req.params.id;
    const items = Array.isArray(req.body.highlights) ? req.body.highlights : [];
    const replace = req.body.replace === true;
    if (replace) {
      const delReq = getRequest();
      delReq.input('ProductID', productId);
      await delReq.query(`DELETE FROM Product_Highlights WHERE ProductID = @ProductID`);
    }
    let order = 1;
    for (const text of items.map(t => String(t || '').trim()).filter(Boolean)) {
      const reqDb = getRequest();
      reqDb.input('ProductID', productId);
      reqDb.input('HighlightText', text);
      reqDb.input('DisplayOrder', order++);
      await reqDb.query(`INSERT INTO Product_Highlights (ProductID, HighlightText, DisplayOrder) VALUES (@ProductID, @HighlightText, @DisplayOrder)`);
    }
    return res.status(201).json({ added: items.length });
  } catch (err) {
    console.error('Admin add highlights error:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const addSpecifications = async (req, res) => {
  try {
    const productId = req.params.id;
    const items = Array.isArray(req.body.specifications) ? req.body.specifications : [];
    const replace = req.body.replace === true;
    if (replace) {
      const delReq = getRequest();
      delReq.input('ProductID', productId);
      await delReq.query(`DELETE FROM Product_Specifications WHERE ProductID = @ProductID`);
    }
    let order = 1;
    for (const s of items.filter(x => x && x.SpecKey && x.SpecValue)) {
      const reqDb = getRequest();
      reqDb.input('ProductID', productId);
      reqDb.input('SpecKey', s.SpecKey);
      reqDb.input('SpecValue', s.SpecValue);
      reqDb.input('DisplayOrder', order++);
      await reqDb.query(`INSERT INTO Product_Specifications (ProductID, SpecKey, SpecValue, DisplayOrder) VALUES (@ProductID, @SpecKey, @SpecValue, @DisplayOrder)`);
    }
    return res.status(201).json({ added: items.length });
  } catch (err) {
    console.error('Admin add specifications error:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { addImages, addVideos, reorderImage, deleteImage, addHighlights, addSpecifications, addImageUploads, addVideoUploads };
