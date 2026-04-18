const productModel = require('../models/productModel');

const getBrands = async (req, res) => {
    try {
        const brands = await productModel.getBrands();
        res.status(200).json(brands);
    } catch (error) {
        console.error("Error fetching brands:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = {
    getBrands
};