const { connectDB, getRequest } = require('./src/config/db');

async function checkImages() {
    try {
        await connectDB();
        const request = getRequest();
        const result = await request.query(`
            SELECT TOP 10 * FROM Product_Images
        `);
        console.log("Product Images:");
        console.log(JSON.stringify(result.recordset, null, 2));

        const catResult = await request.query(`
            SELECT TOP 10 CategoryName, ImageURL FROM Categories
        `);
        console.log("Categories:");
        console.log(JSON.stringify(catResult.recordset, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkImages();
