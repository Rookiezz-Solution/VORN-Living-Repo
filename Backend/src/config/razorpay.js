const Razorpay = require('razorpay');

let _client = null;

const getRazorpay = () => {
  if (_client) return _client;
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) throw new Error('Razorpay is not configured');
  _client = new Razorpay({ key_id, key_secret });
  return _client;
};

const getKeyId = () => process.env.RAZORPAY_KEY_ID || '';

module.exports = { getRazorpay, getKeyId };
