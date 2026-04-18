const { sql, connectDB, getPool } = require('../config/db');

const main = async () => {
  await connectDB();
  const pool = getPool();
  if (!pool || !pool.connected) throw new Error('DB pool is not connected');

  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const r = new sql.Request(tx);
    const cols = await r.query(`
      SELECT c.name AS ColName
      FROM sys.tables t
      INNER JOIN sys.columns c ON c.object_id = t.object_id
      WHERE t.name = 'User_Addresses'
    `);
    const existing = new Set(cols.recordset.map(x => String(x.ColName)));
    if (!existing.has('IsActive')) {
      await new sql.Request(tx).query('ALTER TABLE User_Addresses ADD IsActive BIT NOT NULL CONSTRAINT DF_User_Addresses_IsActive DEFAULT(1)');
    }
    await tx.commit();
    console.log('Done.');
  } catch (e) {
    try { await tx.rollback(); } catch (err) { void err; }
    throw e;
  }
};

main().catch((e) => {
  console.error('ensureUserAddressesIsActive failed:', e);
  process.exitCode = 1;
});

