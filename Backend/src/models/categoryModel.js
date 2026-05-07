const { getRequest } = require('../config/db');

const getAllCategories = async () => {
    try {
        const request = getRequest();
        const result = await request.query('SELECT * FROM Categories WHERE ISNULL(IsActive, 1) = 1 ORDER BY ISNULL(DisplayOrder, 0), CategoryID');
        return result.recordset;
    } catch (error) {
        throw error;
    }
};

module.exports = {
    getAllCategories
};
