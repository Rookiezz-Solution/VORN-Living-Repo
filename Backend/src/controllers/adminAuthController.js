const authModel = require('../models/authModel');
const { getRequest } = require('../config/db');
const adminJwt = require('../lib/adminJwt');

const isAdminEmail = async (email) => {
  const req = getRequest();
  req.input('email', email);
  const result = await req.query(`SELECT top 1 * FROM Users WHERE Email = @email`);
  const user = result.recordset[0];
  if (!user) return false;
  const userType = String(user.UserType || '').toLowerCase();
  return userType === 'admin'
};

const login = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }
    const ok = await isAdminEmail(email);
    if (!ok) {
      return res.status(403).json({ message: 'Unauthorized: not an admin email' });
    }
    // verify OTP using existing table
    const record = await authModel.getLatestOtp(email, 'login');
    if (!record || record.OTPCode !== otp) {
      return res.status(401).json({ message: 'Invalid or expired OTP' });
    }
    return res.json({ message: 'Admin verified', user: { email } });
  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const me = async (req, res) => {
  try {
    const email = req.headers['x-admin-email'];
    if (!email) return res.status(401).json({ message: 'Unauthorized' });
    return res.json({ email });
  } catch (err) {
    console.error('Admin me error:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const logout = async (req, res) => {
  try {
    return res.json({ message: 'Logged out' });
  } catch (err) {
    console.error('Admin logout error:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const bootstrap = async (req, res) => {
  try {
    const { email, phoneNumber, fullName, role = 'Admin' } = req.body || {};
    if (!email || !phoneNumber) {
      return res.status(400).json({ message: 'email and phoneNumber are required' });
    }
    const r = getRequest();
    r.input('email', email);
    r.input('phone', phoneNumber);
    r.input('name', fullName || email);
    r.input('role', role);
    // Ensure user exists
    let userRes = await r.query(`SELECT TOP 1 UserID, UserType FROM Users WHERE Email = @email`);
    let userId = userRes.recordset[0]?.UserID;
    if (!userId) {
      // Create user with required fields
      const createUser = await r.query(`
        INSERT INTO Users (FullName, Email, PhoneNumber, UserType, IsActive, CreatedAt)
        OUTPUT INSERTED.UserID
        VALUES (@name, @email, @phone, 'Admin', 1, GETDATE())
      `);
      userId = createUser.recordset[0].UserID;
    } else if (String(userRes.recordset[0].UserType || '').toLowerCase() !== 'admin') {
      await r.query(`UPDATE Users SET UserType = 'Admin', UpdatedAt = GETDATE() WHERE UserID = ${userId}`);
    }
    // Ensure admin mapping exists
    r.input('userId', userId);
    const adminCheck = await r.query(`SELECT TOP 1 AdminID FROM Admin_Users WHERE UserID = @userId`);
    if (!adminCheck.recordset[0]) {
      await r.query(`
        INSERT INTO Admin_Users (UserID, AdminRole, Permissions, IsActive, CreatedAt)
        VALUES (@userId, @role, NULL, 1, GETDATE())
      `);
    }
    return res.status(200).json({ message: 'Bootstrap OK', UserID: userId });
  } catch (err) {
    console.error('Admin bootstrap error:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { login, me, logout, bootstrap };
