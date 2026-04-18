const express = require('express');
const crypto = require('crypto');
const { getRazorpay, getKeyId } = require('../config/razorpay');

const router = express.Router();

const isPositiveInt = (n) => Number.isFinite(n) && n > 0 && Math.floor(n) === n;

router.post('/create-order', async (req, res) => {
  try {
    const amount = Number(req.body?.amount);
    if (!isPositiveInt(amount)) {
      return res.status(400).json({ message: 'amount must be a positive integer (paise)' });
    }

    const key_id = getKeyId();
    if (!key_id) return res.status(500).json({ message: 'Razorpay key not configured' });
    if (key_id.includes('DUMMY') || String(process.env.RAZORPAY_KEY_SECRET || '').includes('DUMMY')) {
      return res.status(500).json({ error: 'Razorpay keys are placeholders. Set valid Razorpay test keys in Backend .env.' });
    }

    const receipt = `rcpt_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt
    });

    return res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (e) {
    console.error('Razorpay create-order error:', e);
    const status = e?.statusCode || 500;
    const msg = e?.error?.description || e?.message || 'Server Error';
    return res.status(status).json({ error: msg });
  }
});

router.post('/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification fields' });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    if (!secret) return res.status(500).json({ success: false, message: 'Razorpay secret not configured' });

    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    const a = Buffer.from(expected);
    const b = Buffer.from(String(razorpay_signature));
    const ok = a.length === b.length && crypto.timingSafeEqual(a, b);

    if (!ok) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }
    return res.json({ success: true, payment_id: razorpay_payment_id, order_id: razorpay_order_id });
  } catch (e) {
    console.error('Razorpay verify-payment error:', e);
    return res.status(500).json({ success: false, message: e?.message || 'Server Error' });
  }
});

module.exports = router;
