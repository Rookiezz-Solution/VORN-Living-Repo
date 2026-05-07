import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Truck, Headphones, RefreshCw, ArrowRight } from 'lucide-react';

const About = () => {
    const highlights = [
        { title: 'Everyday Utility', description: 'Smart household organizers designed for daily use across every room.', icon: ShieldCheck },
        { title: 'Fast Delivery', description: 'Careful packing and reliable shipping so your space upgrades arrive safely.', icon: Truck },
        { title: 'Support That Cares', description: 'Friendly help for orders, returns, and product guidance whenever you need.', icon: Headphones },
        { title: 'Easy Returns', description: 'Simple replacement/return experience for peace of mind on every purchase.', icon: RefreshCw }
    ];

    const values = [
        { title: 'Precision-First', description: 'Built with the same discipline as industrial components — crafted to perform flawlessly.' },
        { title: 'Built to Last', description: 'Durable materials and refined finishes that stand up to everyday use.' },
        { title: 'Purposeful Design', description: 'Every product is thoughtfully made — not just for looks, but for real life.' }
    ];

    return (
        <div className="bg-surface">
            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-surface" />
                <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
                <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />
                <div className="container mx-auto px-4 pt-14 pb-10 relative">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-secondary leading-tight">Our Story</h1>
                    <p className="text-gray-500 mt-3 text-lg max-w-xl leading-relaxed">
                        From industrial precision to timeless living — the story behind Vorn Living.
                    </p>
                </div>
            </section>

            {/* Founder Section */}
            <section className="container mx-auto px-4 py-14">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    {/* Image */}
                    <div className="flex justify-center lg:justify-start">
                        <div className="relative">
                            <div className="absolute -inset-3 rounded-3xl bg-primary/15 blur-xl" />
                            <img
                                src="/founder.jpg"
                                alt="Aishwarya Muthukumar – Founder, Vorn Living"
                                className="relative w-72 md:w-80 lg:w-96 h-auto object-cover rounded-2xl shadow-xl"
                                loading="lazy"
                            />
                            <div className="absolute -bottom-4 -right-4 bg-secondary text-white rounded-2xl px-5 py-3 shadow-lg">
                                <div className="text-xs text-white/70 uppercase tracking-widest font-medium">Founder</div>
                                <div className="font-bold text-sm mt-0.5">Aishwarya Muthukumar</div>
                            </div>
                        </div>
                    </div>

                    {/* Story */}
                    <div className="space-y-5">
                        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-sm text-primary font-medium">
                            Where Iron Becomes Art
                        </div>
                        <div className="space-y-4 text-gray-600 leading-relaxed text-[15px]">
                            <p>I grew up around manufacturing — around machines, metal, precision, and the discipline of building things that had to perform flawlessly every single day.</p>
                            <p>Coming from a background in precision automotive manufacturing, I developed an early appreciation for quality, functionality, and the importance of details that most people never notice. Over the years, working closely with materials, fabrication, tooling, and product development shaped the way I understood design — not just as something visual, but as something that must be purposeful, durable, and thoughtfully made.</p>
                            <p className="font-semibold text-secondary text-base">Vorn Living was born from that mindset.</p>
                            <p>What started in the world of engineered industrial components gradually evolved into a desire to create products for everyday spaces — products that carry the same level of precision, craftsmanship, and integrity, but in a more refined and contemporary form.</p>
                            <p>At its core, Vorn Living is a reflection of my journey from manufacturing to modern design — bringing industrial precision into timeless living.</p>
                        </div>
                        <div className="pt-2">
                            <div className="font-bold text-secondary text-lg">— Aishwarya Muthukumar</div>
                            <div className="text-sm text-gray-400 mt-0.5">Founder, Vorn Living</div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <Link to="/shop" className="inline-flex items-center justify-center rf-btn-primary px-6 py-3 transition shadow-lg shadow-primary/25">
                                Explore Products <ArrowRight className="h-5 w-5 ml-2" />
                            </Link>
                            <Link to="/contact" className="inline-flex items-center justify-center bg-white border border-border text-secondary font-semibold rounded-xl px-6 py-3 hover:bg-gray-50 transition">
                                Contact Us
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Values */}
            <section className="bg-gradient-to-b from-surface to-background border-y border-border">
                <div className="container mx-auto px-4 py-14">
                    <div className="text-center max-w-2xl mx-auto mb-10">
                        <h2 className="text-3xl font-bold text-secondary">What We Stand For</h2>
                        <p className="text-gray-500 mt-3">The principles that guide everything we make.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {values.map((v, idx) => (
                            <div key={idx} className="rf-card rf-hover-lift p-6">
                                <div className="font-bold text-secondary text-lg">{v.title}</div>
                                <div className="text-gray-600 text-sm mt-2 leading-relaxed">{v.description}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Why Choose Us */}
            <section className="container mx-auto px-4 py-14">
                <div className="text-center max-w-3xl mx-auto mb-10">
                    <h2 className="text-3xl font-bold text-secondary">Why Customers Choose Vorn Living</h2>
                    <p className="text-gray-500 mt-3">Quality products, clean design, safe delivery, and support you can trust.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {highlights.map((h, idx) => (
                        <div key={idx} className="rf-card rf-hover-lift p-6">
                            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                <h.icon className="h-6 w-6" />
                            </div>
                            <div className="font-bold text-secondary mt-4">{h.title}</div>
                            <div className="text-gray-600 text-sm mt-2 leading-relaxed">{h.description}</div>
                        </div>
                    ))}
                </div>
                <div className="mt-12 bg-secondary border border-border rounded-2xl p-8 text-white overflow-hidden relative">
                    <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
                    <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
                    <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                        <div className="max-w-2xl">
                            <h3 className="text-2xl font-extrabold">Ready to upgrade your space?</h3>
                            <p className="text-white/85 mt-2">Discover compact racks, shelves, organizers, and home essentials built for daily life.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                            <Link to="/shop" className="inline-flex items-center justify-center bg-white text-secondary font-semibold rounded-xl px-6 py-3 hover:bg-white/90 transition">
                                Start Shopping <ArrowRight className="h-5 w-5 ml-2" />
                            </Link>
                            <Link to="/contact" className="inline-flex items-center justify-center bg-transparent border border-white/30 text-white font-semibold rounded-xl px-6 py-3 hover:bg-white/10 transition">
                                Need Help?
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default About;
