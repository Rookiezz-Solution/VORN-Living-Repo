const express = require("express");
const router = express.Router();

const {getProducts} = require("../contoller/productsService");

router.get("/products", getProducts);

module.exports = router;