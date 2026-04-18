import React from 'react';

const Returns = () => {
  return (
    <div className="container mx-auto px-4 py-10 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-secondary">Returns & Refunds</h1>
        <p className="text-gray-600 mt-2">Our policy for cancellations and replacements.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-secondary">Cancellations</h2>
          <ul className="text-gray-600 mt-3 list-disc pl-5 space-y-2">
            <li>Orders can be cancelled only while status is Pending, Processing, or Packed.</li>
            <li>After shipment, cancellation is not allowed.</li>
            <li>Use My Account → My Orders → Cancel Order to submit a reason.</li>
          </ul>
        </div>

        <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-secondary">Replacements</h2>
          <ul className="text-gray-600 mt-3 list-disc pl-5 space-y-2">
            <li>No refunds are offered; replacements are provided for eligible issues.</li>
            <li>Open order details, click Request Replacement, choose the item, reason category, and add a description.</li>
            <li>Optional image evidence can be uploaded to help speed up resolution.</li>
          </ul>
        </div>

        <div className="bg-white border border-border rounded-2xl p-6 shadow-sm md:col-span-2">
          <h2 className="text-xl font-semibold text-secondary">Processing Timeline</h2>
          <ul className="text-gray-600 mt-3 list-disc pl-5 space-y-2">
            <li>Cancellation requests are applied immediately if eligible; order status updates in tracking.</li>
            <li>Replacement requests move to “ReplacementRequested”; you will be notified once processed and shipped.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Returns;
