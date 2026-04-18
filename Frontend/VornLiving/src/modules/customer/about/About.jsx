import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Truck, Headphones, RefreshCw, Star, ArrowRight } from 'lucide-react';

const About = () => {
    const highlights = [
        {
            title: 'Everyday Utility',
            description: 'Smart household organizers designed for daily use across every room.',
            icon: ShieldCheck
        },
        {
            title: 'Fast Delivery',
            description: 'Careful packing and reliable shipping so your space upgrades arrive safely.',
            icon: Truck
        },
        {
            title: 'Support That Cares',
            description: 'Friendly help for orders, returns, and product guidance whenever you need.',
            icon: Headphones
        },
        {
            title: 'Easy Returns',
            description: 'Simple replacement/return experience for peace of mind on every purchase.',
            icon: RefreshCw
        }
    ];

    const categories = [
        {
            title: 'Bathroom Essentials',
            subtitle: 'Bathroom racks, shelves, organizers',
            image: '/Bathroom/bathroom shelf.png'
        },
        {
            title: 'Kitchen Organizers',
            subtitle: 'Bottle racks, spice holders, storage',
            image: '/Kitchen/Bottle rack.png'
        },
        {
            title: 'Living Room & Decor',
            subtitle: 'Book shelves, wall shelves, stands',
            image: '/Living/Book Shelf.png'
        },
        {
            title: 'Work & Study',
            subtitle: 'Laptop stands and compact solutions',
            image: '/Living/Laptop stand.png'
        }
    ];

    const values = [
        {
            title: 'Design-First',
            description: 'Clean looks that match modern interiors and small spaces.'
        },
        {
            title: 'Built to Last',
            description: 'Practical build quality and finishes suited for everyday use.'
        },
        {
            title: 'Value Pricing',
            description: 'Affordable upgrades that make your home feel premium.'
        }
    ];

    return (
        <div className="bg-surface">
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/15 via-background to-surface" />
                <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
                <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />

                <div className="container mx-auto px-4 pt-14 pb-10 relative">
                    <div className="max-w-4xl">
                        <div className="inline-flex items-center gap-2 bg-white/70 border border-border rounded-full px-4 py-2 text-sm text-secondary shadow-sm">
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            Crafted for modern homes • Loved by everyday shoppers
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-secondary mt-5 leading-tight">
                            About VornLiving
                        </h1>
                        <p className="text-gray-600 mt-4 text-lg leading-relaxed">
                            VornLiving is a household furniture and utility brand focused on practical, space-smart products—like bathroom racks,
                            shelves, kitchen organizers, laptop stands, and more. We combine clean design with daily durability so your home looks
                            organized and feels effortless.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 mt-7">
                            <Link
                                to="/shop"
                                className="inline-flex items-center justify-center rf-btn-primary px-6 py-3 transition shadow-lg shadow-primary/25"
                            >
                                Explore Products <ArrowRight className="h-5 w-5 ml-2" />
                            </Link>
                            <Link
                                to="/contact"
                                className="inline-flex items-center justify-center bg-white border border-border text-secondary font-semibold rounded-xl px-6 py-3 hover:bg-gray-50 transition"
                            >
                                Contact Us
                            </Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
                        <div className="bg-white/80 border border-border rounded-2xl p-6 shadow-sm">
                            <div className="text-sm text-gray-500">What we sell</div>
                            <div className="text-xl font-bold text-secondary mt-1">Utility + Decor</div>
                            <div className="text-gray-600 mt-2">Compact racks, shelves, organizers, stands, and more.</div>
                        </div>
                        <div className="bg-white/80 border border-border rounded-2xl p-6 shadow-sm">
                            <div className="text-sm text-gray-500">Who it’s for</div>
                            <div className="text-xl font-bold text-secondary mt-1">Every Home</div>
                            <div className="text-gray-600 mt-2">Small spaces, families, rentals, and anyone who loves tidy living.</div>
                        </div>
                        <div className="bg-white/80 border border-border rounded-2xl p-6 shadow-sm">
                            <div className="text-sm text-gray-500">Our promise</div>
                            <div className="text-xl font-bold text-secondary mt-1">Quality + Support</div>
                            <div className="text-gray-600 mt-2">Thoughtful products backed by responsive customer service.</div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="container mx-auto px-4 py-14">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
                    <div className="bg-section-gradient border border-border rounded-2xl p-8 shadow-sm">
                        <h2 className="text-3xl font-bold text-secondary">Our Story</h2>
                        <p className="text-gray-600 mt-4 leading-relaxed">
                            We started with a simple idea: most homes don’t need bigger furniture—they need smarter solutions. From bathroom racks that
                            reduce clutter to kitchen organizers that save time, we design products that make everyday routines smoother.
                        </p>
                        <p className="text-gray-600 mt-4 leading-relaxed">
                            VornLiving focuses on functional materials, neat finishes, and designs that blend into modern interiors—so your home stays
                            beautiful and organized.
                        </p>
                    </div>

                    <div className="bg-white border border-border rounded-2xl p-8 shadow-sm">
                        <h3 className="text-2xl font-bold text-secondary">What we stand for</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                            {values.map((v, idx) => (
                                <div key={idx} className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                                    <div className="font-bold text-secondary">{v.title}</div>
                                    <div className="text-gray-600 text-sm mt-2 leading-relaxed">{v.description}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-gradient-to-b from-surface to-background border-y border-border">
                <div className="container mx-auto px-4 py-14">
                    <div className="flex items-end justify-between gap-6 flex-wrap">
                        <div>
                            <h2 className="text-3xl font-bold text-secondary">Products for every corner</h2>
                            <p className="text-gray-600 mt-2">Bathroom racks, kitchen storage, shelves, stands, and compact home essentials.</p>
                        </div>
                        <Link to="/shop" className="text-primary font-semibold hover:underline inline-flex items-center">
                            Shop All <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
                        {categories.map((c, idx) => (
                            <div key={idx} className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition">
                                <div className="h-40 bg-gray-50">
                                    <img src={c.image} alt={c.title} className="h-full w-full object-cover" />
                                </div>
                                <div className="p-5">
                                    <div className="font-bold text-secondary">{c.title}</div>
                                    <div className="text-sm text-gray-600 mt-1">{c.subtitle}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="container mx-auto px-4 py-14">
                <div className="text-center max-w-3xl mx-auto">
                    <h2 className="text-3xl font-bold text-secondary">Why customers choose VornLiving</h2>
                    <p className="text-gray-600 mt-3">
                        We keep it simple: quality products, clean design, safe delivery, and support you can trust.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
                    {highlights.map((h, idx) => (
                        <div key={idx} className="bg-white border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition">
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
                            <p className="text-white/85 mt-2">
                                Discover compact racks, shelves, organizers, and home essentials built for daily life.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                            <Link
                                to="/shop"
                                className="inline-flex items-center justify-center bg-white text-secondary font-semibold rounded-xl px-6 py-3 hover:bg-white/90 transition"
                            >
                                Start Shopping <ArrowRight className="h-5 w-5 ml-2" />
                            </Link>
                            <Link
                                to="/contact"
                                className="inline-flex items-center justify-center bg-transparent border border-white/30 text-white font-semibold rounded-xl px-6 py-3 hover:bg-white/10 transition"
                            >
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
