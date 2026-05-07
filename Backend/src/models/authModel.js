const { getRequest, sql } = require('../config/db');
const { hasColumn } = require('../lib/dbSchema');

const getUserByEmail = async (email) => {
    const request = getRequest();
    request.input('email', email);
    const result = await request.query(`
        SELECT * FROM Users WHERE Email = @email
    `);
    return result.recordset[0];
};

const getUserByPhone = async (phone) => {
    const request = getRequest();
    request.input('phone', phone);
    const result = await request.query(`
        SELECT * FROM Users WHERE PhoneNumber = @phone
    `);
    return result.recordset[0];
};

const getUserById = async (userId) => {
    const request = getRequest();
    request.input('userId', userId);
    const result = await request.query(`
        SELECT * FROM Users WHERE UserID = @userId
    `);
    return result.recordset[0];
};

const createUser = async (userData) => {
    const request = getRequest();
    request.input('fullName', userData.fullName);
    request.input('email', userData.email);

    const [hasPhoneNumber, hasUserType, hasIsGuest, hasCreatedAt, hasUpdatedAt] = await Promise.all([
        hasColumn('Users', 'PhoneNumber'),
        hasColumn('Users', 'UserType'),
        hasColumn('Users', 'IsGuest'),
        hasColumn('Users', 'CreatedAt'),
        hasColumn('Users', 'UpdatedAt')
    ]);

    const cols = ['FullName', 'Email'];
    const vals = ['@fullName', '@email'];

    if (hasPhoneNumber) {
        request.input('phoneNumber', userData.phoneNumber || null);
        cols.push('PhoneNumber');
        vals.push('@phoneNumber');
    }
    if (hasUserType) {
        request.input('userType', 'Customer');
        cols.push('UserType');
        vals.push('@userType');
    }
    if (hasIsGuest) {
        request.input('isGuest', 0);
        cols.push('IsGuest');
        vals.push('@isGuest');
    }
    if (hasCreatedAt) {
        cols.push('CreatedAt');
        vals.push('GETDATE()');
    }
    if (hasUpdatedAt) {
        cols.push('UpdatedAt');
        vals.push('GETDATE()');
    }

    const result = await request.query(`
        INSERT INTO Users (${cols.join(', ')})
        OUTPUT inserted.*
        VALUES (${vals.join(', ')})
    `);
    return result.recordset[0];
};

const saveOtp = async (email, otp, type = 'Login', ttlMinutes = 10) => {
    const request = getRequest();
    request.input('email', email);
    request.input('otpCode', otp);
    request.input('otpType', type);
    request.input('ttlMinutes', sql.Int, Number(ttlMinutes) || 10);
    // Use SQL Server DATEADD for reliable server-side time calculation
    
    await request.query(`
        INSERT INTO OTP_Verifications (Email, OTPCode, OTPType, ExpiresAt, IsUsed, CreatedAt)
        VALUES (@email, @otpCode, @otpType, DATEADD(minute, @ttlMinutes, GETDATE()), 0, GETDATE())
    `);
};

const savePhoneOtp = async (phoneNumber, otp, type = 'checkout', ttlMinutes = 5) => {
    const request = getRequest();
    request.input('phone', phoneNumber);
    request.input('otpCode', otp);
    request.input('otpType', type);
    request.input('ttlMinutes', sql.Int, Number(ttlMinutes) || 5);

    await request.query(`
        INSERT INTO OTP_Verifications (PhoneNumber, OTPCode, OTPType, ExpiresAt, IsUsed, CreatedAt)
        VALUES (@phone, @otpCode, @otpType, DATEADD(minute, @ttlMinutes, GETDATE()), 0, GETDATE())
    `);
};

const getLatestPhoneOtp = async (phoneNumber, type) => {
    const request = getRequest();
    request.input('phone', phoneNumber);
    request.input('otpType', type);

    const result = await request.query(`
        SELECT TOP 1 * FROM OTP_Verifications
        WHERE PhoneNumber = @phone AND OTPType = @otpType AND IsUsed = 0
        ORDER BY CreatedAt DESC
    `);
    return result.recordset[0];
};

const getLatestOtp = async (email, type) => {
    const request = getRequest();
    request.input('email', email);
    request.input('otpType', type);

    const result = await request.query(`
        SELECT TOP 1 * FROM OTP_Verifications 
        WHERE Email = @email AND OTPType = @otpType AND IsUsed = 0 AND ExpiresAt > GETDATE()
        ORDER BY CreatedAt DESC
    `);
    return result.recordset[0];
};

const markOtpAsUsed = async (otpId) => {
    const request = getRequest();
    request.input('otpId', otpId);
    await request.query(`UPDATE OTP_Verifications SET IsUsed = 1 WHERE OTPID = @otpId`);
};

module.exports = {
    getUserByEmail,
    getUserByPhone,
    getUserById,
    createUser,
    saveOtp,
    savePhoneOtp,
    getLatestPhoneOtp,
    getLatestOtp,
    markOtpAsUsed
};
