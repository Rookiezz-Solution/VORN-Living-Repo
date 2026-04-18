const crypto = require('crypto');

const store = new Map();

const issue = (email) => {
  const token = crypto.randomBytes(24).toString('hex');
  store.set(token, { email, issuedAt: Date.now() });
  return token;
};

const verify = (token) => {
  if (!token) return null;
  return store.get(token) || null;
};

const revoke = (token) => {
  if (token) store.delete(token);
};

module.exports = { issue, verify, revoke };
