const { getRequest } = require('../config/db');

const list = async (req, res) => {
  try {
    const search = req.query.search || null;
    const status = req.query.status || null; // 'active' | 'inactive' | null
    const sort = req.query.sort || 'oldest';
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const offset = (page - 1) * limit;
    const where = ['1=1'];
    const rc = getRequest();
    if (search) {
      rc.input('search', `%${search}%`);
      where.push('ns.Email LIKE @search');
    }
    if (status === 'active') {
      where.push('ns.IsActive = 1');
    } else if (status === 'inactive') {
      where.push('ns.IsActive = 0');
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const countRes = await rc.query(`
      SELECT COUNT(*) AS TotalCount
      FROM Newsletter_Subscribers ns
      ${whereSql}
    `);
    const totalCount = countRes.recordset[0]?.TotalCount || 0;
    const r = getRequest();
    if (search) r.input('search', `%${search}%`);
    r.input('offset', offset);
    r.input('limit', limit);
    const pageRes = await r.query(`
      SELECT ns.SubscriberID, ns.Email, ns.IsActive, ns.SubscribedAt, ns.UnsubscribedAt
      FROM Newsletter_Subscribers ns
      ${whereSql}
      ORDER BY ${sort === 'newest' ? 'ns.SubscribedAt DESC' : 'ns.SubscribedAt ASC'}
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    return res.json({ subscribers: pageRes.recordset, totalCount, page, limit });
  } catch (e) {
    console.error('Admin newsletter list error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const toggle = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { active } = req.body || {};
    const r = getRequest();
    r.input('id', id);
    if (active) {
      await r.query(`
        UPDATE Newsletter_Subscribers 
        SET IsActive = 1, UnsubscribedAt = NULL 
        WHERE SubscriberID = @id
      `);
    } else {
      await r.query(`
        UPDATE Newsletter_Subscribers 
        SET IsActive = 0, UnsubscribedAt = GETDATE() 
        WHERE SubscriberID = @id
      `);
    }
    return res.json({ message: active ? 'Subscriber activated' : 'Subscriber deactivated' });
  } catch (e) {
    console.error('Admin newsletter toggle error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const r = getRequest();
    r.input('id', id);
    await r.query(`DELETE FROM Newsletter_Subscribers WHERE SubscriberID = @id`);
    return res.json({ message: 'Subscriber removed' });
  } catch (e) {
    console.error('Admin newsletter delete error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const exportCsv = async (req, res) => {
  try {
    const search = req.query.search || null;
    const status = req.query.status || null;
    const where = ['1=1'];
    const r = getRequest();
    if (search) {
      r.input('search', `%${search}%`);
      where.push('ns.Email LIKE @search');
    }
    if (status === 'active') {
      where.push('ns.IsActive = 1');
    } else if (status === 'inactive') {
      where.push('ns.IsActive = 0');
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const resp = await r.query(`
      SELECT ns.Email, ns.IsActive, ns.SubscribedAt, ns.UnsubscribedAt
      FROM Newsletter_Subscribers ns
      ${whereSql}
      ORDER BY ns.SubscribedAt DESC
    `);
    const rows = resp.recordset || [];
    const header = ['Email','Status','SubscribedAt','UnsubscribedAt'].join(',');
    const lines = rows.map(rw => {
      const statusText = rw.IsActive ? 'Active' : 'Inactive';
      const sub = rw.SubscribedAt ? new Date(rw.SubscribedAt).toISOString() : '';
      const unsub = rw.UnsubscribedAt ? new Date(rw.UnsubscribedAt).toISOString() : '';
      return [rw.Email, statusText, sub, unsub].map(v => `"${String(v).replace(/"/g,'""')}"`).join(',');
    });
    const csv = [header, ...lines].join('\n');
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', 'attachment; filename="subscribers.csv"');
    return res.send(csv);
  } catch (e) {
    console.error('Admin newsletter export error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { list, toggle, remove, exportCsv };
