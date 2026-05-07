const { connectDB, getRequest } = require('./src/config/db');

async function migrate() {
    try {
        await connectDB();
        const request = getRequest();
        
        console.log("Altering User_Addresses table...");
        
        // 1. Make UserID nullable
        await request.query(`ALTER TABLE User_Addresses ALTER COLUMN UserID INT NULL`);
        console.log("UserID made nullable.");

        // 2. Add Email column if it doesn't exist
        await request.query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[User_Addresses]') AND name = 'Email')
            BEGIN
                ALTER TABLE User_Addresses ADD Email NVARCHAR(255) NULL;
                PRINT 'Email column added.';
            END
        `);
        console.log("Email column check complete.");
        
        // 3. Make PhoneNumber nullable
        await request.query(`ALTER TABLE User_Addresses ALTER COLUMN PhoneNumber NVARCHAR(20) NULL`);
        console.log("PhoneNumber made nullable.");

        // 4. Make UserID nullable in Orders
        console.log("Altering Orders table...");
        await request.query(`ALTER TABLE Orders ALTER COLUMN UserID INT NULL`);
        console.log("UserID in Orders made nullable.");

        console.log("Migration complete.");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
