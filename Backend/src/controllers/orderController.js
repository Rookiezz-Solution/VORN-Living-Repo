const orderModel = require("../models/orderModel");
const cartModel = require("../models/cartModel");
const crypto = require("crypto");

const placeOrder = async (req, res) => {
  const {
    items,
    address,
    addressId,
    paymentMethod,
    userId,
    payment,
    guestEmail,
    guestToken,
  } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ message: "Cart is empty" });
  }

  try {
    const pm = String(paymentMethod || "COD").toUpperCase();
    let paymentStatus = "Pending";
    let razorpayMeta = null;

    if (pm === "RAZORPAY" || pm === "ONLINE") {
      const razorpay_order_id = payment?.razorpay_order_id;
      const razorpay_payment_id = payment?.razorpay_payment_id;
      const razorpay_signature = payment?.razorpay_signature;
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res
          .status(400)
          .json({ message: "Missing Razorpay payment fields" });
      }

      const secret = process.env.RAZORPAY_KEY_SECRET || "";
      if (!secret)
        return res
          .status(500)
          .json({ message: "Razorpay secret not configured" });

      const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expected = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");
      const a = Buffer.from(expected);
      const b = Buffer.from(String(razorpay_signature));
      const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
      if (!ok)
        return res.status(400).json({ message: "Payment verification failed" });

      paymentStatus = "Paid";
      razorpayMeta = {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      };
    }

    // 1. Resolve Address (reuse if provided or identical exists)
    let shippingAddressId = addressId;
    if (!shippingAddressId) {
      shippingAddressId = await orderModel.findOrCreateAddress({
        ...address,
        userId,
        email: guestEmail || address.email,
      });
    }

    // 2. Calculate Totals
    const subTotal = items.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0,
    );
    const shippingAmount = subTotal > 100 ? 0 : 15;
    const totalAmount = subTotal + shippingAmount;

    // 3. Create Order
    const orderInfo = await orderModel.createOrder({
      userId: userId || null,
      guestEmail: guestEmail || null,
      shippingAddressId,
      items,
      subTotal,
      shippingAmount,
      totalAmount,
      paymentMethod: pm === "RAZORPAY" || pm === "ONLINE" ? "RAZORPAY" : "COD",
      paymentStatus,
      razorpay: razorpayMeta,
    });

    // 4. Clear Cart
    try {
      const cart = await cartModel.getCartByUserId(userId, guestToken);
      if (cart) {
        await cartModel.clearCart(cart.CartID);
      }
    } catch (cartErr) {
      console.error("Error clearing cart after order:", cartErr);
      // Don't fail the order if cart clearing fails
    }

    res.status(201).json({
      message: "Order placed successfully",
      orderId: orderInfo.orderId,
      orderNumber: orderInfo.orderNumber,
    });
  } catch (error) {
    if (
      error &&
      (error.code === "INVALID_PRODUCT_ID" ||
        error.code === "INVALID_QUANTITY" ||
        error.code === "INVALID_VARIANT_ID")
    ) {
      return res.status(400).json({
        message:
          "Invalid order payload. Please refresh your cart and try again.",
      });
    }
    if (
      error &&
      (error.code === "INSUFFICIENT_STOCK" ||
        error.code === "INSUFFICIENT_VARIANT_STOCK")
    ) {
      return res.status(409).json({
        message:
          "Insufficient stock for one or more items. Please refresh and try again.",
      });
    }
    console.error("Error placing order:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  placeOrder,
};

const cancelOrder = async (req, res) => {
  try {
    const userId = req.body.userId || req.user?.UserID;
    const { id } = req.params;
    const { reason } = req.body;
    const result = await orderModel.cancelOrder(userId, id, reason);
    return res.status(200).json({ message: "Order cancelled", ...result });
  } catch (error) {
    if (error.code === "ORDER_NOT_FOUND") {
      return res.status(404).json({ message: "Order not found" });
    }
    if (error.code === "CANCEL_NOT_ALLOWED") {
      return res
        .status(409)
        .json({ message: "Order cannot be cancelled at this stage" });
    }
    console.error("Cancel Order Error:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

const requestReplacement = async (req, res) => {
  try {
    const userId = req.body.userId || req.user?.UserID;
    const { id } = req.params;
    let { orderItemId, reason, reasonCategory, imageUrl, imageBase64 } =
      req.body;

    // If imageBase64 provided, save to disk and set imageUrl
    if (imageBase64 && typeof imageBase64 === "string") {
      const fs = require("fs");
      const path = require("path");
      const dir = path.join(__dirname, "..", "..", "uploads", "replacements");
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const filename = `evidence_${id}_${Date.now()}.png`;
      const filePath = path.join(dir, filename);
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
      imageUrl = `/uploads/replacements/${filename}`;
    }

    const result = await orderModel.requestReplacement(
      userId,
      id,
      orderItemId,
      { reason, reasonCategory, imageUrl },
    );
    return res
      .status(200)
      .json({ message: "Replacement requested", ...result });
  } catch (error) {
    if (error.code === "ORDER_NOT_FOUND") {
      return res.status(404).json({ message: "Order not found" });
    }
    if (error.code === "ORDER_ITEM_NOT_FOUND") {
      return res.status(404).json({ message: "Order item not found" });
    }
    console.error("Replacement Request Error:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

module.exports.cancelOrder = cancelOrder;
module.exports.requestReplacement = requestReplacement;
