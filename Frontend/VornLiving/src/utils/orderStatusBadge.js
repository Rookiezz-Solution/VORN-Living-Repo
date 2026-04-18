export const orderStatusBadgeClass = (status) => {
  const v = String(status || '').toLowerCase();
  if (v === 'delivered' || v === 'completed') return 'bg-green-100 text-green-800 border-green-200';
  if (v === 'cancelled' || v === 'canceled' || v === 'rejected' || v === 'failed') return 'bg-red-100 text-red-800 border-red-200';
  if (v === 'pending' || v === 'requested') return 'bg-amber-100 text-amber-800 border-amber-200';
  if (v === 'processing' || v === 'approved') return 'bg-blue-100 text-blue-800 border-blue-200';
  if (v === 'packed') return 'bg-indigo-100 text-indigo-800 border-indigo-200';
  if (v === 'shipped') return 'bg-sky-100 text-sky-800 border-sky-200';
  if (v === 'outfordelivery') return 'bg-purple-100 text-purple-800 border-purple-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
};

