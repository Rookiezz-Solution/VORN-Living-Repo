const categoryModel = require('../models/categoryModel');

const getCategories = async (req, res) => {
    try {
        const categories = await categoryModel.getAllCategories();
        res.status(200).json(categories);
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = {
    getCategories
};
