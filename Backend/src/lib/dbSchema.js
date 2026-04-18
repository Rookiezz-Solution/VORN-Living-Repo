const { getRequest } = require('../config/db');

const cache = new Map();

const hasColumn = async (tableName, columnName) => {
  const key = `${tableName}.${columnName}`.toLowerCase();
  if (cache.has(key)) return cache.get(key);
  const r = getRequest();
  r.input('table', tableName);
  r.input('col', columnName);
  const resp = await r.query(`
    SELECT 1 AS X
    FROM sys.tables t
    INNER JOIN sys.columns c ON c.object_id = t.object_id
    WHERE t.name = @table AND c.name = @col
  `);
  const ok = resp.recordset.length > 0;
  cache.set(key, ok);
  return ok;
};

module.exports = { hasColumn };

