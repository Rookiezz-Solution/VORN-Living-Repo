import React from 'react';

const FAQ = () => {
  const faqs = [
    {
      q: 'How do I track my order?',
      a: 'Use the Track Order link in the footer or go to My Account → Order Tracking. You can also click Track Order on the checkout confirmation screen.'
    },
    {
      q: 'Can I cancel my order?',
      a: 'You can cancel while the order is Pending, Processing, or Packed. Once shipped, cancellation is not allowed.'
    },
    {
      q: 'Do you offer refunds?',
      a: 'This store does not process refunds. If there is an issue, you may request a replacement for specific items.'
    },
    {
      q: 'How do I request a replacement?',
      a: 'Open the order details, click Request Replacement, select the item, describe the issue, and optionally upload an image.'
    },
    {
      q: 'Why can’t I delete an address?',
      a: 'Addresses used in past orders cannot be deleted to preserve history. You can edit them or add a new one instead.'
    },
    {
      q: 'Which address fields are required?',
      a: 'Full name, phone number, street address, city, state, pin code, and country are required to place an order.'
    },
    {
      q: 'Is my cart cleared after placing an order?',
      a: 'Only the ordered product(s) are removed from your cart. Other items remain.'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-10 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-secondary">Frequently Asked Questions</h1>
        <p className="text-gray-600 mt-2">Answers to common questions about orders, replacements, and tracking.</p>
      </div>
      <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
        <div className="space-y-6">
          {faqs.map((item, i) => (
            <div key={i} className="border-b last:border-b-0 pb-6 last:pb-0">
              <h3 className="font-semibold text-secondary text-lg">{item.q}</h3>
              <p className="text-gray-600 mt-2">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FAQ;
