import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send, Loader, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Contact = () => {
    // Business info placeholders
    // NOTE: Replace these placeholders with real business data later (address, phone, email, hours)
    const BUSINESS_INFO = {
        address: '221 Home Street, Design District, Chennai, Tamil Nadu 600040',
        phone: '+91 98765 43210',
        email: 'support@vornliving.com',
        hours: 'Mon–Sat: 10:00 AM – 7:00 PM'
    };

    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        // Mock submission
        setTimeout(() => {
            setSubmitting(false);
            setSubmitted(true);
            setForm({ name: '', email: '', phone: '', subject: '', message: '' });
        }, 1200);
    };

    return (
        <div className="bg-surface">
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/15 via-background to-surface" />
                <div className="container mx-auto px-4 pt-14 pb-10 relative">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 bg-white/70 border border-border rounded-full px-4 py-2 text-sm text-secondary shadow-sm">
                            <Send className="h-4 w-4 text-primary" />
                            We’re here to help
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-secondary mt-5 leading-tight">
                            Contact Us
                        </h1>
                        <p className="text-gray-600 mt-4 text-lg leading-relaxed">
                            Questions about products, orders, delivery, or returns? Reach out to us—our team will get back within business hours.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 mt-7">
                            <Link
                                to="/shop"
                                className="inline-flex items-center justify-center rf-btn-primary px-6 py-3 transition shadow-lg shadow-primary/25"
                            >
                                Browse Products <ArrowRight className="h-5 w-5 ml-2" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <section className="container mx-auto px-4 py-14">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Contact Info */}
                    <div className="space-y-5">
                        <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                    <MapPin className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="font-semibold text-secondary">Address</div>
                                    <div className="text-gray-600 text-sm mt-1">{BUSINESS_INFO.address}</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                    <Phone className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="font-semibold text-secondary">Phone</div>
                                    <div className="text-gray-600 text-sm mt-1">{BUSINESS_INFO.phone}</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                    <Mail className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="font-semibold text-secondary">Email</div>
                                    <div className="text-gray-600 text-sm mt-1">{BUSINESS_INFO.email}</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                    <Clock className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="font-semibold text-secondary">Business Hours</div>
                                    <div className="text-gray-600 text-sm mt-1">{BUSINESS_INFO.hours}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="lg:col-span-2 bg-section-gradient border border-border rounded-2xl p-8 shadow-sm">
                        <h2 className="text-2xl font-bold text-secondary">Send us a message</h2>
                        <p className="text-gray-600 mt-2">Fill in the form below and we’ll get back to you soon.</p>

                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                            <input
                                type="text"
                                placeholder="Full Name"
                                required
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="border border-border p-3 rounded-xl w-full focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/70 transition"
                            />
                            <input
                                type="email"
                                placeholder="Email Address"
                                required
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="border border-border p-3 rounded-xl w-full focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/70 transition"
                            />
                            <input
                                type="tel"
                                placeholder="Phone Number"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                className="border border-border p-3 rounded-xl w-full focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/70 transition"
                            />
                            <input
                                type="text"
                                placeholder="Subject"
                                value={form.subject}
                                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                                className="border border-border p-3 rounded-xl w-full focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/70 transition"
                            />
                            <textarea
                                placeholder="Your Message"
                                required
                                rows={6}
                                value={form.message}
                                onChange={(e) => setForm({ ...form, message: e.target.value })}
                                className="md:col-span-2 border border-border p-3 rounded-xl w-full focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/70 transition"
                            />
                            <div className="md:col-span-2 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="inline-flex items-center rf-btn-primary px-6 py-3 disabled:opacity-70"
                                >
                                    {submitting ? <Loader className="h-5 w-5 animate-spin" /> : 'Send Message'}
                                </button>
                            </div>
                        </form>

                        {submitted && (
                            <div className="mt-4 text-green-700 bg-green-50 border border-green-200 rounded-xl p-4">
                                Thanks! Your message has been sent. We’ll get back soon.
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Contact;
