const { getRequest } = require('../config/db');

module.exports = async (req, res, next) => {
  try {
    const email = req.headers['x-admin-email'];
    if (!email) return res.status(401).json({ message: 'Unauthorized: admin email missing' });
    const r = getRequest();
    r.input('email', email);
    // Resolve user and ensure admin type (lightweight check)
    const userRes = await r.query(`SELECT TOP 1 UserID, UserType FROM Users WHERE Email = @email`);
    const user = userRes.recordset[0];
    if (!user) return res.status(401).json({ message: 'Unauthorized: user not found' });
    if (String(user.UserType || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: user is not admin' });
    }
    req.admin = { email, userId: user.UserID };
    next();
  } catch (e) {
    console.error('Admin auth middleware error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};
