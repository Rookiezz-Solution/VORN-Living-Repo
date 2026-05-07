const normalizePin = (pincode) => {
  const s = String(pincode || '').trim();
  return /^\d{6}$/.test(s) ? s : null;
};

const firstDigit = (pin) => parseInt(String(pin || '')[0], 10);

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const addDaysUtc = (date, days) => {
  const d = new Date(date);
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  out.setUTCDate(out.getUTCDate() + days);
  return out;
};

const computeTransitDays = (originPin, destPin) => {
  const o = firstDigit(originPin);
  const d = firstDigit(destPin);
  if (!Number.isFinite(o) || !Number.isFinite(d)) return null;
  const diff = Math.abs(o - d);
  return clamp(2 + diff, 2, 8);
};

const computeEtaDate = ({ originPincode, destinationPincode, processingDays }) => {
  const origin = normalizePin(originPincode);
  const dest = normalizePin(destinationPincode);
  if (!origin || !dest) return null;
  const transit = computeTransitDays(origin, dest);
  if (!transit) return null;
  const proc = clamp(Number(processingDays || 0), 0, 14);
  return addDaysUtc(new Date(), proc + transit);
};

module.exports = { normalizePin, computeEtaDate };

