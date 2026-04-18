const { getRequest } = require('../config/db');

const list = async (req, res) => {
  try {
    const search = req.query.search || null; // order number or email
    const status = req.query.status || null; // Requested/Approved/Rejected/Completed
    const sort = req.query.sort || 'oldest';
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const offset = (page - 1) * limit;
    const where = ['1=1'];
    const rc = getRequest();
    if (search) {
      rc.input('search', `%${search}%`);
      where.push(`(o.OrderNumber LIKE @search OR u.Email LIKE @search)`);
    }
    if (status) {
      rc.input('status', status);
      where.push(`r.Status = @status`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const countRes = await rc.query(`
      SELECT COUNT(*) AS TotalCount
      FROM Replacement_Requests r
      JOIN Orders o ON r.OrderID = o.OrderID
      LEFT JOIN Users u ON r.UserID = u.UserID
      ${whereSql}
    `);
    const totalCount = countRes.recordset[0]?.TotalCount || 0;
    const r = getRequest();
    if (search) r.input('search', `%${search}%`);
    if (status) r.input('status', status);
    r.input('offset', offset);
    r.input('limit', limit);
    const pageRes = await r.query(`
      SELECT 
        (CAST(r.OrderID AS VARCHAR(20)) + '-' + CAST(r.OrderItemID AS VARCHAR(20)) + '-' + REPLACE(CONVERT(VARCHAR(19), r.RequestedAt, 126), ':', '')) AS RequestID,
        r.OrderID,
        o.OrderNumber,
        r.OrderItemID,
        r.UserID,
        u.Email AS UserEmail,
        r.ReplacementReason,
        r.ReasonCategory,
        r.ImageEvidenceURL,
        CASE 
          WHEN EXISTS (
            SELECT 1 
            FROM Order_Status_History h 
            WHERE h.OrderID = r.OrderID 
              AND h.NewStatus = 'ReplacementCompleted'
              AND h.ChangedAt >= r.RequestedAt
          ) THEN 'Completed' 
          ELSE r.Status 
        END AS Status,
        r.RequestedAt
      FROM Replacement_Requests r
      JOIN Orders o ON r.OrderID = o.OrderID
      LEFT JOIN Users u ON r.UserID = u.UserID
      ${whereSql}
      ORDER BY ${sort === 'newest' ? 'r.RequestedAt DESC' : 'r.RequestedAt ASC'}
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    return res.json({ requests: pageRes.recordset, totalCount, page, limit });
  } catch (e) {
    console.error('Admin list returns error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const get = async (req, res) => {
  try {
    const r = getRequest();
    const id = String(req.params.id || '');
    let head;
    if (/^\d+$/.test(id)) {
      r.input('rid', parseInt(id, 10));
      head = await r.query(`
        SELECT 
          (CAST(r.OrderID AS VARCHAR(20)) + '-' + CAST(r.OrderItemID AS VARCHAR(20)) + '-' + REPLACE(CONVERT(VARCHAR(19), r.RequestedAt, 126), ':', '')) AS RequestID,
          r.*,
          CASE 
            WHEN EXISTS (
              SELECT 1 
              FROM Order_Status_History h 
              WHERE h.OrderID = r.OrderID 
                AND h.NewStatus = 'ReplacementCompleted'
                AND h.ChangedAt >= r.RequestedAt
            ) THEN 'Completed' 
            ELSE r.Status 
          END AS DisplayStatus,
          o.OrderNumber, 
          u.Email AS UserEmail
        FROM Replacement_Requests r
        JOIN Orders o ON r.OrderID = o.OrderID
        LEFT JOIN Users u ON r.UserID = u.UserID
        WHERE r.ReplacementRequestID = @rid
      `);
    } else {
      const parts = id.split('-');
      if (parts.length < 3) return res.status(400).json({ message: 'Invalid request id' });
      const orderId = parseInt(parts[0], 10);
      const orderItemId = parseInt(parts[1], 10);
      const reqTs = parts.slice(2).join('-'); // in case date contains dashes
      r.input('orderId', orderId);
      r.input('orderItemId', orderItemId);
      r.input('reqTs', reqTs);
      head = await r.query(`
        SELECT 
          (CAST(r.OrderID AS VARCHAR(20)) + '-' + CAST(r.OrderItemID AS VARCHAR(20)) + '-' + REPLACE(CONVERT(VARCHAR(19), r.RequestedAt, 126), ':', '')) AS RequestID,
          r.*,
          CASE 
            WHEN EXISTS (
              SELECT 1 
              FROM Order_Status_History h 
              WHERE h.OrderID = r.OrderID 
                AND h.NewStatus = 'ReplacementCompleted'
                AND h.ChangedAt >= r.RequestedAt
            ) THEN 'Completed' 
            ELSE r.Status 
          END AS DisplayStatus,
          o.OrderNumber, 
          u.Email AS UserEmail
        FROM Replacement_Requests r
        JOIN Orders o ON r.OrderID = o.OrderID
        LEFT JOIN Users u ON r.UserID = u.UserID
        WHERE r.OrderID = @orderId AND r.OrderItemID = @orderItemId
          AND (REPLACE(CONVERT(VARCHAR(19), r.RequestedAt, 126), ':', '') = @reqTs)
      `);
    }
    if (head.recordset.length === 0) return res.status(404).json({ message: 'Return request not found' });
    const reqRow = head.recordset[0];
    const rItems = getRequest();
    rItems.input('orderId', reqRow.OrderID);
    rItems.input('orderItemId', reqRow.OrderItemID);
    const items = await rItems.query(`
      SELECT oi.*
      FROM Order_Items oi
      WHERE oi.OrderID = @orderId AND oi.OrderItemID = @orderItemId
    `);
    return res.json({ request: reqRow, item: items.recordset[0] || null });
  } catch (e) {
    console.error('Admin get return error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const setStatus = async (req, res) => {
  try {
    const { action, remarks } = req.body || {};
    const r = getRequest();
    const id = String(req.params.id || '');
    let head;
    if (/^\d+$/.test(id)) {
      r.input('rid', parseInt(id, 10));
      head = await r.query(`SELECT TOP 1 * FROM Replacement_Requests WHERE ReplacementRequestID = @rid`);
    } else {
      const parts = id.split('-');
      if (parts.length < 3) return res.status(400).json({ message: 'Invalid request id' });
      const orderId = parseInt(parts[0], 10);
      const orderItemId = parseInt(parts[1], 10);
      const reqTs = parts.slice(2).join('-');
      r.input('orderId', orderId);
      r.input('orderItemId', orderItemId);
      r.input('reqTs', reqTs);
      head = await r.query(`
        SELECT TOP 1 * FROM Replacement_Requests 
        WHERE OrderID = @orderId AND OrderItemID = @orderItemId
          AND REPLACE(CONVERT(VARCHAR(19), RequestedAt, 126), ':', '') = @reqTs
      `);
    }
    const reqRow = head.recordset[0];
    const nowStatus = String(reqRow.Status);
    let newStatus = null;
    if (action === 'Approve') {
      if (nowStatus !== 'Requested') return res.status(409).json({ message: 'Only Requested can be approved' });
      newStatus = 'Approved';
    } else if (action === 'Reject') {
      if (nowStatus !== 'Requested') return res.status(409).json({ message: 'Only Requested can be rejected' });
      newStatus = 'Rejected';
    } else if (action === 'Complete') {
      if (!(nowStatus === 'Approved' || nowStatus === 'Rejected')) return res.status(409).json({ message: 'Only Approved or Rejected can be completed' });
      newStatus = 'Completed';
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }
    // Update request status (skip DB update for 'Completed' to respect CK_Replace_Status)
    if (newStatus !== 'Completed') {
      if (reqRow.ReplacementRequestID) {
        const ru = getRequest();
        ru.input('rid', reqRow.ReplacementRequestID);
        ru.input('status', newStatus);
        await ru.query(`UPDATE Replacement_Requests SET Status = @status WHERE ReplacementRequestID = @rid`);
      } else {
        const ru = getRequest();
        ru.input('orderId', reqRow.OrderID);
        ru.input('orderItemId', reqRow.OrderItemID);
        ru.input('requestedAt', reqRow.RequestedAt);
        ru.input('status', newStatus);
        await ru.query(`
          UPDATE Replacement_Requests
          SET Status = @status
          WHERE OrderID = @orderId AND OrderItemID = @orderItemId 
            AND REPLACE(CONVERT(VARCHAR(19), RequestedAt, 126), ':', '') = REPLACE(CONVERT(VARCHAR(19), @requestedAt, 126), ':', '')
        `);
      }
    }
    // Append to order history using mapped replacement status names
    const historyMap = { Approved: 'ReplacementApproved', Rejected: 'ReplacementRejected', Completed: 'ReplacementCompleted' };
    const newHist = historyMap[newStatus] || newStatus;
    const r2 = getRequest();
    r2.input('orderId', reqRow.OrderID);
    const orderStatusRes = await r2.query(`SELECT TOP 1 OrderStatus FROM Orders WHERE OrderID = @orderId`);
    const old = orderStatusRes.recordset[0]?.OrderStatus || 'Pending';
    const r3 = getRequest();
    r3.input('orderId', reqRow.OrderID);
    r3.input('old', old);
    r3.input('new', newHist);
    r3.input('remarks', remarks || null);
    await r3.query(`
      INSERT INTO Order_Status_History (OrderID, OldStatus, NewStatus, Remarks, ChangedAt)
      VALUES (@orderId, @old, @new, @remarks, GETDATE())
    `);
    return res.json({ message: `Return ${action.toLowerCase()}d`, status: newStatus });
  } catch (e) {
    console.error('Admin set return status error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { list, get, setStatus };
