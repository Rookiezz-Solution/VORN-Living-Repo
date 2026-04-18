const crypto = require('crypto');

const base64url = (input) =>
  Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const sign = (payload, secret, expiresInSeconds = 60 * 60 * 12) => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSeconds };
  const headerEncoded = base64url(JSON.stringify(header));
  const payloadEncoded = base64url(JSON.stringify(body));
  const data = `${headerEncoded}.${payloadEncoded}`;
  const signature = crypto
    .createHmac('sha256', secret || 'dev-admin-secret')
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${data}.${signature}`;
};

const verify = (token, secret) => {
  try {
    const [headerEncoded, payloadEncoded, signature] = token.split('.');
    if (!headerEncoded || !payloadEncoded || !signature) return null;
    const data = `${headerEncoded}.${payloadEncoded}`;
    const expected = crypto
      .createHmac('sha256', secret || 'dev-admin-secret')
      .update(data)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    if (expected !== signature) return null;
    const payload = JSON.parse(Buffer.from(payloadEncoded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
};

module.exports = { sign, verify };
