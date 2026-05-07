const productModel = require('../models/productModel');
const { normalizePin, computeEtaDate } = require('../lib/eta');

const getAllProducts = async (req, res) => {
    try {
        // Support both GET (query) and POST (body) for transition, but prefer body as requested
        const params = Object.keys(req.body).length > 0 ? req.body : req.query;
        
        const { category, search, minPrice, maxPrice, sort, page, limit, material, finish } = params;
        
        const result = await productModel.getProducts({
            categorySlug: category,
            search,
            minPrice,
            maxPrice,
            sort,
            material,
            finish,
            page: page || 1,
            limit: limit || 10
        });
        
        res.status(200).json(result);
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

const getProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await productModel.getProductById(id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        res.status(200).json(product);
    } catch (error) {
        console.error("Error fetching product:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

const getAvailability = async (req, res) => {
    try {
        const { id } = req.params;
        const { pincode } = req.query;
        const product = await productModel.getProductById(id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        const inStock = (product.StockQuantity ?? 0) > 0;
        const baseDays = inStock ? 5 : 10;
        const pin = normalizePin(pincode);
        const originPin = normalizePin(process.env.WAREHOUSE_PINCODE || process.env.ORIGIN_PINCODE || '');
        const bufferDaysRaw = parseInt(process.env.ETA_BUFFER_DAYS || '2', 10);
        const bufferDays = Number.isFinite(bufferDaysRaw) ? Math.max(0, Math.min(bufferDaysRaw, 10)) : 2;
        const processingDays = (inStock ? 1 : 3) + bufferDays;
        const etaFromPin = (pin && originPin)
            ? computeEtaDate({ originPincode: originPin, destinationPincode: pin, processingDays })
            : null;
        const productEta = product.ExpectedDeliveryDate ? new Date(product.ExpectedDeliveryDate) : null;
        const estimatedDeliveryDate = etaFromPin
            ? etaFromPin
            : (productEta && !Number.isNaN(productEta.getTime()) ? productEta : (() => {
                const d = new Date();
                d.setDate(d.getDate() + baseDays);
                return d;
            })());
        const deliveryCharge = inStock ? 0 : 15; // placeholder rule; can be made configurable
        res.status(200).json({
            productId: Number(id),
            inStock,
            availableQty: product.StockQuantity ?? 0,
            pincode: pin || null,
            estimatedDeliveryDate: estimatedDeliveryDate.toISOString(),
            deliveryCharge,
            etaMode: etaFromPin ? 'pincode' : (productEta ? 'product' : 'default')
        });
    } catch (error) {
        console.error("Error fetching availability:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = {
    getAllProducts,
    getProduct,
    getAvailability
};
