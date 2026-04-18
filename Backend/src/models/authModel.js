const { getRequest, sql } = require('../config/db');

const getUserByEmail = async (email) => {
    const request = getRequest();
    request.input('email', email);
    const result = await request.query(`
        SELECT * FROM Users WHERE Email = @email
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
    request.input('phoneNumber', userData.phoneNumber || null); // Optional now
    request.input('userType', 'Customer'); // Default type
    request.input('isGuest', 0); // Registered user

    const result = await request.query(`
        INSERT INTO Users (FullName, Email, PhoneNumber, UserType, IsGuest, CreatedAt, UpdatedAt)
        OUTPUT inserted.*
        VALUES (@fullName, @email, @phoneNumber, @userType, @isGuest, GETDATE(), GETDATE())
    `);
    return result.recordset[0];
};

const saveOtp = async (email, otp, type = 'Login') => {
    const request = getRequest();
    request.input('email', email);
    request.input('otpCode', otp);
    request.input('otpType', type);
    // Use SQL Server DATEADD for reliable server-side time calculation
    
    await request.query(`
        INSERT INTO OTP_Verifications (Email, OTPCode, OTPType, ExpiresAt, IsUsed, CreatedAt)
        VALUES (@email, @otpCode, @otpType, DATEADD(minute, 10, GETDATE()), 0, GETDATE())
    `);
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
    getUserById,
    createUser,
    saveOtp,
    getLatestOtp,
    markOtpAsUsed
};
