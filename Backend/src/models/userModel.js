const { getRequest } = require('../config/db');

const findUserByPhone = async (phone) => {
    try {
        const request = getRequest();
        request.input('phone', phone);
        const result = await request.query("SELECT * FROM Users WHERE PhoneNumber = @phone");
        return result.recordset[0];
    } catch (error) {
        throw error;
    }
};

const createUser = async (user) => {
    try {
        const request = getRequest();
        request.input('fullName', user.name);
        request.input('email', user.email);
        request.input('phone', user.phone);
        request.input('userType', 'Customer');
        
        const result = await request.query(`
            INSERT INTO Users (FullName, Email, PhoneNumber, UserType)
            OUTPUT INSERTED.UserID
            VALUES (@fullName, @email, @phone, @userType)
        `);
        return result.recordset[0].UserID;
    } catch (error) {
        throw error;
    }
};

const createOTP = async (phone, otp) => {
    try {
        const request = getRequest();
        request.input('phone', phone);
        request.input('otp', otp);
        const expiry = new Date(Date.now() + 10 * 60000); // 10 mins
        request.input('expiry', expiry);

        await request.query(`
            INSERT INTO OTP_Verifications (PhoneNumber, OTPCode, OTPType, ExpiresAt)
            VALUES (@phone, @otp, 'Login', @expiry)
        `);
    } catch (error) {
        throw error;
    }
};

const verifyOTP = async (phone, otp) => {
    try {
        const request = getRequest();
        request.input('phone', phone);
        request.input('otp', otp);
        
        const result = await request.query(`
            SELECT TOP 1 * FROM OTP_Verifications 
            WHERE PhoneNumber = @phone AND OTPCode = @otp AND IsUsed = 0 AND ExpiresAt > GETDATE()
            ORDER BY CreatedAt DESC
        `);
        return result.recordset[0];
    } catch (error) {
        throw error;
    }
};

module.exports = {
    findUserByPhone,
    createUser,
    createOTP,
    verifyOTP
};
