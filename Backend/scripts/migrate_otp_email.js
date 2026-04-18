const { sql, connectDB, getRequest } = require('../src/config/db');
require('dotenv').config();

const run = async () => {
    try {
        await connectDB();
        const request = getRequest();
        
        console.log("Adding Email column to OTP_Verifications...");
        try {
            await request.query(`
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[OTP_Verifications]') AND name = 'Email')
                BEGIN
                    ALTER TABLE OTP_Verifications ADD Email NVARCHAR(255) NULL;
                    PRINT 'Email column added.';
                END
                ELSE
                BEGIN
                    PRINT 'Email column already exists.';
                END
            `);
        } catch (e) {
            console.log("Error adding Email column (might already exist):", e.message);
        }

        console.log("Making PhoneNumber column nullable...");
        try {
            await request.query(`
                ALTER TABLE OTP_Verifications ALTER COLUMN PhoneNumber NVARCHAR(15) NULL;
                PRINT 'PhoneNumber column altered to be NULLable.';
            `);
        } catch (e) {
             console.log("Error altering PhoneNumber column:", e.message);
        }
        
        console.log("Migration complete.");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
};

run();
