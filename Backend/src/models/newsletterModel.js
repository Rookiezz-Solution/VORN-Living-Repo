const { getRequest, sql } = require('../config/db');

// Subscribe to newsletter
const subscribe = async (email) => {
    const request = getRequest();
    request.input('email', email);

    // Check if already exists
    const existing = await request.query(`
        SELECT * FROM Newsletter_Subscribers WHERE Email = @email
    `);

    if (existing.recordset.length > 0) {
        // If exists but inactive, reactivate it
        if (!existing.recordset[0].IsActive) {
            await request.query(`
                UPDATE Newsletter_Subscribers 
                SET IsActive = 1, SubscribedAt = GETDATE(), UnsubscribedAt = NULL 
                WHERE Email = @email
            `);
            return { message: "Welcome back! You have been re-subscribed." };
        }
        return { message: "You are already subscribed." };
    }

    // New subscription
    await request.query(`
        INSERT INTO Newsletter_Subscribers (Email, IsActive, SubscribedAt)
        VALUES (@email, 1, GETDATE())
    `);
    
    return { message: "Thank you for subscribing!" };
};

module.exports = {
    subscribe
};