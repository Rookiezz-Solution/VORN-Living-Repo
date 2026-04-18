const { sql, connectDB, getPool } = require('../config/db');

const main = async () => {
  await connectDB();
  const pool = getPool();
  if (!pool || !pool.connected) throw new Error('DB pool is not connected');

  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const r = new sql.Request(tx);
    const exists = await r.query(`
      SELECT 1 AS X
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Product_Images' AND COLUMN_NAME = 'DisplayOrder'
    `);

    if (exists.recordset.length === 0) {
      console.log('Adding Product_Images.DisplayOrder...');
      await new sql.Request(tx).query(`ALTER TABLE Product_Images ADD DisplayOrder INT NULL`);
      console.log('Backfilling DisplayOrder per product...');
      await new sql.Request(tx).query(`
        ;WITH c AS (
          SELECT
            ImageID,
            ROW_NUMBER() OVER (
              PARTITION BY ProductID
              ORDER BY ISNULL(CreatedAt, GETDATE()), ImageID
            ) AS rn
          FROM Product_Images
        )
        UPDATE c SET DisplayOrder = rn
      `);
    } else {
      console.log('Product_Images.DisplayOrder already exists. No changes made.');
    }

    await tx.commit();
    console.log('Done.');
  } catch (e) {
    try { await tx.rollback(); } catch (err) { void err; }
    throw e;
  }
};

main().catch((e) => {
  console.error('ensureProductImagesDisplayOrder failed:', e);
  process.exitCode = 1;
});

