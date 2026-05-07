export const formatINR = (value) => {
  const num = typeof value === 'string' ? Number(value) : value;
  const amount = Number.isFinite(num) ? num : 0;
  const hasPaise = Math.round(amount * 100) % 100 !== 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: hasPaise ? 2 : 0
  }).format(amount);
};

