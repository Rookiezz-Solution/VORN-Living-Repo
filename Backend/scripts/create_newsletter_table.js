const { sql, connectDB, getRequest } = require('../src/config/db');
require('dotenv').config();

const run = async () => {
    try {
        await connectDB();
        const request = getRequest();
        
        console.log("Checking for Newsletter_Subscribers table...");
        
        const checkTable = await request.query(`
            SELECT * FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = 'dbo' 
            AND TABLE_NAME = 'Newsletter_Subscribers'
        `);

        if (checkTable.recordset.length === 0) {
            console.log("Creating Newsletter_Subscribers table...");
            await request.query(`
                CREATE TABLE Newsletter_Subscribers (
                    SubscriberID INT IDENTITY(1,1) PRIMARY KEY,
                    Email NVARCHAR(255) UNIQUE NOT NULL,
                    IsActive BIT DEFAULT 1,
                    SubscribedAt DATETIME2 DEFAULT GETDATE(),
                    UnsubscribedAt DATETIME2 NULL
                )
            `);
            console.log("Table created successfully.");
        } else {
            console.log("Newsletter_Subscribers table already exists.");
        }
        
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
};

run();