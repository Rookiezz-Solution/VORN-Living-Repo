const { connectDB, sql } = require('../config/db');

const addAttributes = async (req, res) => {
  try {
    const productId = req.params.id;
    const attrs = Array.isArray(req.body.attributes) ? req.body.attributes : [];
    if (!productId) return res.status(400).json({ message: 'ProductID required' });
    if (!attrs.length) return res.status(400).json({ message: 'No attributes provided' });
    const pool = await connectDB();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      for (const a of attrs) {
        const name = String(a?.Name || '').trim();
        const values = Array.isArray(a?.Values) ? a.Values : [];
        if (!name) continue;

        const attrReq = transaction.request();
        attrReq.input('AttributeName', sql.NVarChar, name);
        const attrRes = await attrReq.query(`SELECT TOP 1 AttributeID FROM Variant_Attributes WHERE AttributeName = @AttributeName`);
        let attributeId = attrRes.recordset[0]?.AttributeID;
        if (!attributeId) {
          const createReq = transaction.request();
          createReq.input('AttributeName', sql.NVarChar, name);
          const created = await createReq.query(`
            INSERT INTO Variant_Attributes (AttributeName, AttributeType, IsActive, CreatedAt)
            OUTPUT INSERTED.AttributeID
            VALUES (@AttributeName, 'Select', 1, GETDATE())
          `);
          attributeId = created.recordset[0].AttributeID;
        }

        for (const rawVal of values) {
          const valueName = String(rawVal || '').trim();
          if (!valueName) continue;
          const valReq = transaction.request();
          valReq.input('AttributeID', sql.Int, attributeId);
          valReq.input('ValueName', sql.NVarChar, valueName);
          const valRes = await valReq.query(`
            SELECT TOP 1 ValueID
            FROM Variant_Attribute_Values
            WHERE AttributeID = @AttributeID AND ValueName = @ValueName
          `);
          if (!valRes.recordset[0]) {
            const insReq = transaction.request();
            insReq.input('AttributeID', sql.Int, attributeId);
            insReq.input('ValueName', sql.NVarChar, valueName);
            await insReq.query(`
              INSERT INTO Variant_Attribute_Values (AttributeID, ValueName, ColorHex, DisplayOrder)
              VALUES (@AttributeID, @ValueName, NULL, 0)
            `);
          }
        }
      }
      await transaction.commit();
    } catch (e) {
      try { await transaction.rollback(); } catch {}
      throw e;
    }
    return res.status(201).json({ added: attrs.length });
  } catch (err) {
    console.error('Admin add attributes error:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const addVariants = async (req, res) => {
  try {
    const productId = req.params.id;
    const vars = Array.isArray(req.body.variants) ? req.body.variants : [];
    if (!productId) return res.status(400).json({ message: 'ProductID required' });
    if (!vars.length) return res.status(400).json({ message: 'No variants provided' });
    const pool = await connectDB();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const parsedProductId = parseInt(productId, 10);
      if (!Number.isFinite(parsedProductId)) return res.status(400).json({ message: 'Invalid ProductID' });

      for (const v of vars) {
        const attrsObj = v?.Attributes || {};
        const variantName =
          Object.entries(attrsObj).map(([k, val]) => `${k}: ${val}`).join(' | ') ||
          (v?.SKU ? String(v.SKU) : 'Variant');

        const insReq = transaction.request();
        insReq.input('ProductID', sql.Int, parsedProductId);
        insReq.input('VariantName', sql.NVarChar, variantName);
        insReq.input('VariantSKU', sql.NVarChar, v?.SKU || null);
        insReq.input('VariantBarcode', sql.NVarChar, v?.Barcode || null);
        insReq.input('RegularPrice', v?.RegularPrice ?? null);
        insReq.input('SalePrice', v?.SalePrice ?? null);
        insReq.input('CostPrice', v?.CostPrice ?? null);
        insReq.input('StockQuantity', sql.Int, parseInt(v?.StockQuantity || 0, 10));
        insReq.input('LowStockThreshold', sql.Int, parseInt(v?.LowStockThreshold || 5, 10));
        insReq.input('StockStatus', sql.NVarChar, v?.StockStatus || 'InStock');

        const createdVar = await insReq.query(`
          INSERT INTO Product_Variants (
            ProductID, VariantName, VariantSKU, VariantBarcode, RegularPrice, SalePrice, CostPrice,
            StockQuantity, LowStockThreshold, StockStatus, IsDefault, IsActive, CreatedAt
          )
          OUTPUT INSERTED.VariantID
          VALUES (@ProductID, @VariantName, @VariantSKU, @VariantBarcode, @RegularPrice, @SalePrice, @CostPrice,
            @StockQuantity, @LowStockThreshold, @StockStatus, 0, 1, GETDATE())
        `);
        const variantId = createdVar.recordset[0].VariantID;

        for (const [rawAttrName, rawValueName] of Object.entries(attrsObj)) {
          const attrName = String(rawAttrName || '').trim();
          const valueName = String(rawValueName || '').trim();
          if (!attrName || !valueName) continue;

          const attrReq = transaction.request();
          attrReq.input('AttributeName', sql.NVarChar, attrName);
          const attrRes = await attrReq.query(`
            SELECT TOP 1 AttributeID
            FROM Variant_Attributes
            WHERE AttributeName = @AttributeName
          `);
          let attributeId = attrRes.recordset[0]?.AttributeID;
          if (!attributeId) {
            const createAttrReq = transaction.request();
            createAttrReq.input('AttributeName', sql.NVarChar, attrName);
            const createdAttr = await createAttrReq.query(`
              INSERT INTO Variant_Attributes (AttributeName, AttributeType, IsActive, CreatedAt)
              OUTPUT INSERTED.AttributeID
              VALUES (@AttributeName, 'Select', 1, GETDATE())
            `);
            attributeId = createdAttr.recordset[0].AttributeID;
          }

          const valReq = transaction.request();
          valReq.input('AttributeID', sql.Int, attributeId);
          valReq.input('ValueName', sql.NVarChar, valueName);
          const valRes = await valReq.query(`
            SELECT TOP 1 ValueID
            FROM Variant_Attribute_Values
            WHERE AttributeID = @AttributeID AND ValueName = @ValueName
          `);
          let valueId = valRes.recordset[0]?.ValueID;
          if (!valueId) {
            const createValReq = transaction.request();
            createValReq.input('AttributeID', sql.Int, attributeId);
            createValReq.input('ValueName', sql.NVarChar, valueName);
            const createdVal = await createValReq.query(`
              INSERT INTO Variant_Attribute_Values (AttributeID, ValueName, ColorHex, DisplayOrder)
              OUTPUT INSERTED.ValueID
              VALUES (@AttributeID, @ValueName, NULL, 0)
            `);
            valueId = createdVal.recordset[0].ValueID;
          }

          const mapReq = transaction.request();
          mapReq.input('VariantID', sql.Int, variantId);
          mapReq.input('AttributeID', sql.Int, attributeId);
          mapReq.input('ValueID', sql.Int, valueId);
          await mapReq.query(`
            IF NOT EXISTS (
              SELECT 1 FROM Variant_Attribute_Mapping
              WHERE VariantID = @VariantID AND AttributeID = @AttributeID AND ValueID = @ValueID
            )
            BEGIN
              INSERT INTO Variant_Attribute_Mapping (VariantID, AttributeID, ValueID)
              VALUES (@VariantID, @AttributeID, @ValueID)
            END
          `);
        }
      }

      await transaction.commit();
    } catch (e) {
      try { await transaction.rollback(); } catch {}
      throw e;
    }
    return res.status(201).json({ added: vars.length });
  } catch (err) {
    console.error('Admin add variants error:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { addAttributes, addVariants };
