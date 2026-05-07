const { connectDB, getRequest } = require('./src/config/db');

async function checkOrdersCols() {
    try {
        await connectDB();
        const request = getRequest();
        const result = await request.query(`
            SELECT COLUMN_NAME, COLUMN_DEFAULT, IS_NULLABLE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Orders'
        `);
        console.log(JSON.stringify(result.recordset, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkOrdersCols();
