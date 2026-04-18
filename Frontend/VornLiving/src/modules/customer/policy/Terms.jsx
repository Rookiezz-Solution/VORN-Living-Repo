import React from 'react';

const Terms = () => {
  return (
    <div className="container mx-auto px-4 py-10 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-secondary">Terms & Conditions</h1>
        <p className="text-gray-600 mt-2">Please read these terms carefully before using the site.</p>
      </div>

      <div className="bg-white border border-border rounded-2xl p-6 shadow-sm space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-secondary">Orders</h2>
          <ul className="text-gray-600 mt-2 list-disc pl-5 space-y-2">
            <li>Orders are subject to acceptance and availability.</li>
            <li>Cancellations are allowed while status is Pending, Processing, or Packed.</li>
            <li>After shipment, cancellation is not possible; replacements may be requested.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-secondary">Pricing & Payment</h2>
          <p className="text-gray-600 mt-2">
            Prices are displayed in your local currency where applicable. Taxes and shipping are shown during checkout.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-secondary">Returns & Refunds</h2>
          <p className="text-gray-600 mt-2">
            Refunds are not offered. For eligible issues, request a replacement through My Orders.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-secondary">Use of Site</h2>
          <ul className="text-gray-600 mt-2 list-disc pl-5 space-y-2">
            <li>Do not misuse the site or disrupt services.</li>
            <li>Content and designs are protected; do not copy or republish without permission.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-secondary">Contact</h2>
          <p className="text-gray-600 mt-2">
            For questions about these terms, contact support@vornliving.com.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Terms;
