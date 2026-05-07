import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin, Loader } from 'lucide-react';
import FurnitureStrip from './FurnitureStrip';
import { subscribeNewsletter } from '../services/api';
import { useNotification } from '../context/NotificationContext';

const Footer = () => {
    const { showNotification } = useNotification();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubscribe = async (e) => {
        e.preventDefault();
        if (!email || !email.includes('@')) {
            showNotification("Please enter a valid email address", 'error');
            return;
        }

        setLoading(true);
        try {
            const response = await subscribeNewsletter(email);
            showNotification(response.message, 'success');
            setEmail('');
        } catch (error) {
            showNotification(error.message || "Failed to subscribe", 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <footer className="relative overflow-hidden bg-secondary text-white pt-12 pb-8 rf-fade-in">
            <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

            <div className="container mx-auto px-4">
                <div className="border border-white/15 bg-white/10 backdrop-blur rounded-2xl p-6 md:p-8 mb-10 rf-hover-lift rf-shine">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="max-w-2xl">
                            <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight">Get design inspiration in your inbox</h3>
                            <p className="text-white/75 mt-2">New launches, offers, and curated picks. No spam.</p>
                        </div>
                        <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                            <input
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full sm:w-80 border border-white/20 rounded-full px-4 py-3 bg-white/10 text-white placeholder:text-white/60 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary/60 transition"
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                data-ripple
                                className="bg-primary text-secondary font-semibold rounded-full px-6 py-3 transition flex items-center justify-center disabled:opacity-70 min-w-[140px] shadow-[0_10px_24px_rgba(191,164,135,0.26)] hover:shadow-[0_14px_30px_rgba(191,164,135,0.34)] hover:-translate-y-0.5 motion-safe:transform-gpu"
                            >
                                {loading ? <Loader className="h-5 w-5 animate-spin" /> : 'Subscribe'}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <img
                                    src="/logo/vorn-logo.svg"
                                    alt="Vorn Living"
                                    className="h-14 w-auto object-contain"
                                    loading="lazy"
                                    decoding="async"
                                />
                            </div>
                        <p className="text-white/75">
                            Elevate your home with our exclusive collection of modern furniture and decor.
                        </p>
                        <div className="flex items-center gap-3">
                            <a href="#" className="h-10 w-10 rounded-xl border border-white/15 bg-white/10 flex items-center justify-center hover:border-primary/50 hover:bg-white/15 transition rf-hover-lift rf-shine" aria-label="Facebook">
                                <Facebook className="h-5 w-5" />
                            </a>
                            <a href="#" className="h-10 w-10 rounded-xl border border-white/15 bg-white/10 flex items-center justify-center hover:border-primary/50 hover:bg-white/15 transition rf-hover-lift rf-shine" aria-label="Instagram">
                                <Instagram className="h-5 w-5" />
                            </a>
                            <a href="#" className="h-10 w-10 rounded-xl border border-white/15 bg-white/10 flex items-center justify-center hover:border-primary/50 hover:bg-white/15 transition rf-hover-lift rf-shine" aria-label="Twitter">
                                <Twitter className="h-5 w-5" />
                            </a>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-lg font-semibold mb-4">Customer Service</h4>
                        <ul className="space-y-2 text-white/75">
                            <li><Link to="/contact" className="link-underline hover:text-white">Contact Us</Link></li>
                            <li><Link to="/returns" className="link-underline hover:text-white">Returns & Refunds</Link></li>
                            <li><Link to="/tracking" className="link-underline hover:text-white">Order Tracking</Link></li>
                            <li><Link to="/faq" className="link-underline hover:text-white">FAQ</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-lg font-semibold mb-4">Company</h4>
                        <ul className="space-y-2 text-white/75">
                            <li><Link to="/about" className="link-underline hover:text-white">About Us</Link></li>
                            <li><Link to="/privacy" className="link-underline hover:text-white">Privacy Policy</Link></li>
                            <li><Link to="/terms" className="link-underline hover:text-white">Terms & Conditions</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-lg font-semibold mb-4">Contact Us</h4>
                        <ul className="space-y-3 text-white/75">
                            <li className="flex items-start gap-3">
                                <MapPin className="h-5 w-5 mt-0.5 text-primary" />
                                <span>A-10 B -8 church street Mogappair East Chennai - 600037</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Phone className="h-5 w-5 text-primary" />
                                <span>+91 98848 02620</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Mail className="h-5 w-5 text-primary" />
                                <span>vornliving@gmail.com</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="mt-10">
                <FurnitureStrip />
            </div>

            <div className="border-t border-white/15 mt-10 pt-6">
                <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-white/70">
                    <p>&copy; {new Date().getFullYear()} VornLiving. All rights reserved.</p>
                    <p className="md:text-center">Designed and Developed with ❤️ by Rookiezz Solution</p>
                    <div className="flex items-center gap-5">
                        <Link to="/privacy" className="link-underline hover:text-white">Privacy</Link>
                        <Link to="/terms" className="link-underline hover:text-white">Terms</Link>
                        <Link to="/contact" className="link-underline hover:text-white">Support</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
