const { connectDB, getRequest } = require('./src/config/db');

async function migrate() {
    try {
        await connectDB();
        const request = getRequest();
        
        console.log("Starting Migration V2...");

        // 1. Ensure Orders has GuestEmail
        console.log("Checking Orders table for GuestEmail...");
        await request.query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Orders]') AND name = 'GuestEmail')
            BEGIN
                ALTER TABLE Orders ADD GuestEmail NVARCHAR(255) NULL;
                PRINT 'GuestEmail column added to Orders.';
            END
        `);

        // 2. Ensure Orders has IsGuestOrder (just in case)
        await request.query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Orders]') AND name = 'IsGuestOrder')
            BEGIN
                ALTER TABLE Orders ADD IsGuestOrder BIT NOT NULL DEFAULT 0;
                PRINT 'IsGuestOrder column added to Orders.';
            END
        `);

        // 3. Ensure User_Addresses has Email
        console.log("Checking User_Addresses table for Email...");
        await request.query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[User_Addresses]') AND name = 'Email')
            BEGIN
                ALTER TABLE User_Addresses ADD Email NVARCHAR(255) NULL;
                PRINT 'Email column added to User_Addresses.';
            END
        `);

        // 4. Ensure Orders UserID is nullable
        await request.query(`ALTER TABLE Orders ALTER COLUMN UserID INT NULL`);
        console.log("Orders.UserID made nullable.");

        // 5. Ensure User_Addresses UserID is nullable
        await request.query(`ALTER TABLE User_Addresses ALTER COLUMN UserID INT NULL`);
        console.log("User_Addresses.UserID made nullable.");

        // 6. Ensure Payment/Razorpay columns exist in Orders
        console.log("Checking Orders for payment columns...");
        const paymentCols = ['PaymentMethod', 'RazorpayOrderID', 'RazorpayPaymentID', 'RazorpaySignature'];
        for (const col of paymentCols) {
            await request.query(`
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Orders]') AND name = '${col}')
                BEGIN
                    ALTER TABLE Orders ADD ${col} NVARCHAR(MAX) NULL;
                    PRINT '${col} column added to Orders.';
                END
            `);
        }

        console.log("Migration V2 complete.");
        process.exit(0);
    } catch (err) {
        console.error("Migration V2 failed:", err);
        process.exit(1);
    }
}

migrate();
