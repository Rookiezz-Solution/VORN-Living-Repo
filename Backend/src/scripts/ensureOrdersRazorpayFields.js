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
      WHERE t.name = 'Orders'
    `);
    const existing = new Set(cols.recordset.map(x => String(x.ColName)));
    const addIfMissing = async (name, sqlType) => {
      if (existing.has(name)) return;
      console.log(`Adding Orders.${name}...`);
      await new sql.Request(tx).query(`ALTER TABLE Orders ADD ${name} ${sqlType} NULL`);
      existing.add(name);
    };

    await addIfMissing('PaymentMethod', 'VARCHAR(30)');
    await addIfMissing('RazorpayOrderID', 'VARCHAR(100)');
    await addIfMissing('RazorpayPaymentID', 'VARCHAR(100)');
    await addIfMissing('RazorpaySignature', 'VARCHAR(200)');

    await tx.commit();
    console.log('Done.');
  } catch (e) {
    try { await tx.rollback(); } catch (err) { void err; }
    throw e;
  }
};

main().catch((e) => {
  console.error('ensureOrdersRazorpayFields failed:', e);
  process.exitCode = 1;
});

