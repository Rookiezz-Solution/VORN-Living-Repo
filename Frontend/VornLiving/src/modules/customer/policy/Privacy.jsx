import React from 'react';

const Privacy = () => {
  return (
    <div className="container mx-auto px-4 py-10 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-secondary">Privacy Policy</h1>
        <p className="text-gray-600 mt-2">How we collect, use, and protect your information.</p>
      </div>

      <div className="bg-white border border-border rounded-2xl p-6 shadow-sm space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-secondary">Information We Collect</h2>
          <p className="text-gray-600 mt-2">
            We collect information you provide during account creation, checkout, and support interactions,
            including name, contact details, addresses, and order history.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-secondary">Use of Information</h2>
          <ul className="text-gray-600 mt-2 list-disc pl-5 space-y-2">
            <li>Process orders, shipping, cancellations, and replacements.</li>
            <li>Provide order tracking and account-related features.</li>
            <li>Improve site performance and user experience.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-secondary">Data Sharing</h2>
          <p className="text-gray-600 mt-2">
            We share limited information with courier and payment providers strictly for order fulfillment.
            We do not sell your personal data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-secondary">Security</h2>
          <p className="text-gray-600 mt-2">
            We implement technical and organizational measures to keep your data secure. Please keep your
            account credentials confidential and log out from shared devices.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-secondary">Contact</h2>
          <p className="text-gray-600 mt-2">
            For privacy questions, contact vornliving@gmail.com or visit the Contact page.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Privacy;
