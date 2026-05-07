const { getRequest } = require("../config/db");

const getProducts = async (req, res) => {
    const request = getRequest();
    try {
        const result = await request.query("SELECT * FROM Products");
        res.json(result.recordset);
    } catch (error) {
        console.error("DB Query Failed:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = {
    getProducts
};
