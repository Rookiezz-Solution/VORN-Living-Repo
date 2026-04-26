import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, User, Search, Menu, X, ChevronDown, Moon, Sun } from 'lucide-react';
import { getCategories, getCart } from '../services/api';

const Header = () => {
    const navigate = useNavigate();
    const headerRef = useRef(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [categories, setCategories] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [cartCount, setCartCount] = useState(0);
    const [headerHeight, setHeaderHeight] = useState(0);
    const [isHeaderHidden, setIsHeaderHidden] = useState(false);
    const lastScrollYRef = useRef(0);
    const rafRef = useRef(0);
    const downAccumRef = useRef(0);
    const upAccumRef = useRef(0);
    const [isDark, setIsDark] = useState(() => {
        const stored = localStorage.getItem('theme');
        if (stored === 'dark') return true;
        if (stored === 'light') return false;
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark;
    });

    const [user, setUser] = useState(null);

    useEffect(() => {
        const el = headerRef.current;
        if (!el) return;

        const update = () => {
            const next = Math.ceil(el.getBoundingClientRect().height || 0);
            setHeaderHeight(prev => (prev !== next ? next : prev));
        };

        update();

        let ro;
        if (typeof window !== 'undefined' && window.ResizeObserver) {
            const ResizeObserverCtor = window.ResizeObserver;
            ro = new ResizeObserverCtor(() => update());
            ro.observe(el);
        } else {
            window.addEventListener('resize', update);
        }

        return () => {
            if (ro) ro.disconnect();
            window.removeEventListener('resize', update);
        };
    }, []);

    useEffect(() => {
        lastScrollYRef.current = window.scrollY || 0;

        const process = () => {
            rafRef.current = 0;

            const y = window.scrollY || 0;
            const delta = y - lastScrollYRef.current;
            lastScrollYRef.current = y;

            if (y < 24) {
                downAccumRef.current = 0;
                upAccumRef.current = 0;
                setIsHeaderHidden(false);
                return;
            }

            if (delta > 0) {
                downAccumRef.current += delta;
                upAccumRef.current = 0;
            } else if (delta < 0) {
                upAccumRef.current += -delta;
                downAccumRef.current = 0;
            }

            if (downAccumRef.current > 80) {
                downAccumRef.current = 0;
                if (!isMenuOpen && !isCategoryOpen) setIsHeaderHidden(true);
                return;
            }

            if (upAccumRef.current > 40) {
                upAccumRef.current = 0;
                setIsHeaderHidden(false);
            }
        };

        const onScroll = () => {
            if (rafRef.current) return;
            rafRef.current = window.requestAnimationFrame(process);
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', onScroll);
            if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
            rafRef.current = 0;
        };
    }, [isMenuOpen, isCategoryOpen]);

    useEffect(() => {
        const checkUser = () => {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            } else {
                setUser(null);
            }
        };
        
        checkUser();
        window.addEventListener('userUpdated', checkUser);
        return () => window.removeEventListener('userUpdated', checkUser);
    }, []);

    useEffect(() => {
        const fetchCategories = async () => {
            const data = await getCategories();
            setCategories(data);
        };
        fetchCategories();
    }, []);

    useEffect(() => {
        const updateCartCount = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                const userId = user ? user.UserID : null;
                // Fetch cart for logged in user OR guest (getCart handles guest token internally)
                const cart = await getCart(userId);
                const count = cart.items ? cart.items.reduce((acc, item) => acc + item.quantity, 0) : 0;
                setCartCount(count);
            } catch (error) {
                console.error("Failed to update cart count", error);
                setCartCount(0);
            }
        };

        updateCartCount();

        // Listen for custom event 'cartUpdated'
        const handleCartUpdate = () => {
            updateCartCount();
        };

        window.addEventListener('cartUpdated', handleCartUpdate);

        return () => {
            window.removeEventListener('cartUpdated', handleCartUpdate);
        };
    }, []);

    const applyTheme = (nextIsDark) => {
        const root = document.documentElement;
        if (nextIsDark) {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    useEffect(() => {
        applyTheme(isDark);
    }, [isDark]);

    const handleSearchSubmit = () => {
        const q = searchQuery.trim();
        if (!q) {
            navigate('/shop');
            return;
        }
        navigate(`/shop?search=${encodeURIComponent(q)}`);
    };

    const toggleTheme = () => {
        setIsDark(prev => !prev);
    };

    const headerBgClass = isDark
        ? 'bg-gradient-to-b from-surface-2/95 via-surface/90 to-surface-2/85 backdrop-blur-lg'
        : 'bg-gradient-to-b from-secondary/90 via-secondary/80 to-secondary/70 backdrop-blur-lg';

    return (
        <>
            <div style={{ height: isHeaderHidden ? 0 : headerHeight }} />
            <header
                ref={headerRef}
                className={[
                    'text-white border-b border-border shadow-sm',
                    'fixed top-0 left-0 right-0 z-50',
                    'transition-transform duration-300 will-change-transform',
                    isHeaderHidden ? '-translate-y-full' : 'translate-y-0',
                ].join(' ')}
            >
                <div className={headerBgClass}>
                    <div className="bg-primary/95 text-secondary py-2 text-sm">
                        <div className="container mx-auto flex justify-between items-center">
                            <p className="truncate pr-4">Free shipping on all orders over ₹100!</p>
                            <div className="flex space-x-4">
                                <Link to="/contact" className="link-underline">Contact Us</Link>
                                <Link to="/about" className="link-underline">About</Link>
                            </div>
                        </div>
                    </div>

                    <div className="container mx-auto py-4 flex justify-between items-center relative">
                        <Link to="/" className="flex items-center">
                            <div className="bg-white rounded-2xl p-2 shadow-md ring-1 ring-black/10">
                                <img
                                    src={encodeURI('/logo/VORN LIVING FINAL LOGO-APR 6.png')}
                                    alt="Vorn Living"
                                    className="h-14 md:h-16 w-auto max-w-[260px] sm:max-w-[360px] md:max-w-[420px] object-contain"
                                    loading="eager"
                                    decoding="async"
                                />
                            </div>
                        </Link>

                        <div className="hidden md:flex flex-1 mx-8 relative rounded-full">
                            <input
                                type="text"
                                placeholder="Search products..."
                                className="w-full border border-border rounded-full py-2.5 px-4 pl-11 bg-white shadow-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition text-secondary placeholder:text-secondary/70"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSearchSubmit();
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleSearchSubmit}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary/70 h-5 w-5 hover:text-primary transition"
                            >
                                <Search className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex items-center space-x-3 text-white">
                            {user ? (
                                <Link to="/profile" className="flex items-center space-x-2 hover:text-white rounded-full px-3 py-2 hover:bg-white/10 transition">
                                    <User className="h-6 w-6" />
                                    <span className="hidden lg:inline">{user.FullName ? user.FullName.split(' ')[0] : 'Profile'}</span>
                                </Link>
                            ) : (
                                <Link to="/auth" className="flex items-center space-x-2 hover:text-white rounded-full px-3 py-2 hover:bg-white/10 transition">
                                    <User className="h-6 w-6" />
                                    <span className="hidden lg:inline">Login</span>
                                </Link>
                            )}
                            <Link to="/wishlist" className="relative rf-icon-btn hover:bg-white/10 text-white">
                                <Heart className="h-6 w-6" />
                            </Link>
                            <Link to="/cart" className="relative rf-icon-btn hover:bg-white/10 text-white">
                                <ShoppingCart className="h-6 w-6" />
                                {cartCount > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-primary text-secondary text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                                        {cartCount}
                                    </span>
                                )}
                            </Link>
                            <button
                                type="button"
                                onClick={toggleTheme}
                                className="rf-icon-btn hover:bg-white/10 text-white"
                                aria-label={isDark ? 'Dark mode' : 'Light mode'}
                                title={isDark ? 'Dark mode' : 'Light mode'}
                            >
                                {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                            </button>

                            <button
                                className="md:hidden rf-icon-btn hover:bg-white/10 text-white"
                                onClick={() => {
                                    setIsHeaderHidden(false);
                                    setIsMenuOpen(!isMenuOpen);
                                }}
                            >
                                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                            </button>
                        </div>
                    </div>

                    <nav className="hidden md:block text-white border-t border-border/40">
                        <div className="container mx-auto flex gap-8 py-3 font-medium items-center">
                            <Link to="/" className="hover:text-primary transition link-underline">Home</Link>
                            <Link to="/shop" className="hover:text-primary transition link-underline">Shop</Link>

                            <div className="relative group">
                                <button
                                    className="flex items-center hover:text-primary transition focus:outline-none"
                                    onMouseEnter={() => {
                                        setIsHeaderHidden(false);
                                        setIsCategoryOpen(true);
                                    }}
                                    onClick={() => {
                                        setIsHeaderHidden(false);
                                        setIsCategoryOpen(!isCategoryOpen);
                                    }}
                                >
                                    Categories <ChevronDown className="h-4 w-4 ml-1" />
                                </button>

                                <div
                                    className="absolute left-0 mt-3 w-64 bg-white text-secondary shadow-xl rounded-xl overflow-hidden z-50 transition-all duration-300 origin-top transform scale-y-0 group-hover:scale-y-100 max-h-60 overflow-y-auto border border-border"
                                >
                                    {categories.map((category) => (
                                        <Link
                                            key={category.CategoryID}
                                            to={`/category/${category.CategorySlug}`}
                                            className="block px-4 py-2.5 hover:bg-surface hover:text-primary transition"
                                        >
                                            {category.CategoryName}
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            <Link to="/contact" className="hover:text-primary transition link-underline">Contact</Link>
                        </div>
                    </nav>

                    {isMenuOpen && (
                        <div className="md:hidden bg-white border-t border-border p-4 absolute w-full shadow-lg z-50 text-secondary">
                            <div className="flex flex-col space-y-4">
                                <Link to="/" className="text-secondary hover:text-primary" onClick={() => setIsMenuOpen(false)}>Home</Link>
                                <Link to="/shop" className="text-secondary hover:text-primary" onClick={() => setIsMenuOpen(false)}>Shop</Link>

                                <div>
                                    <button
                                        onClick={() => {
                                            setIsHeaderHidden(false);
                                            setIsCategoryOpen(!isCategoryOpen);
                                        }}
                                        className="flex items-center justify-between w-full text-secondary hover:text-primary"
                                    >
                                        Categories <ChevronDown className={`h-4 w-4 ml-1 transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isCategoryOpen && (
                                        <div className="pl-4 mt-2 space-y-2 border-l-2 border-primary ml-2 max-h-60 overflow-y-auto">
                                            {categories.map((category) => (
                                                <Link
                                                    key={category.CategoryID}
                                                    to={`/category/${category.CategorySlug}`}
                                                    className="block text-sm text-gray-600 hover:text-primary"
                                                    onClick={() => setIsMenuOpen(false)}
                                                >
                                                    {category.CategoryName}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <Link to="/contact" className="text-secondary hover:text-primary" onClick={() => setIsMenuOpen(false)}>Contact</Link>
                            </div>
                        </div>
                    )}
                </div>
            </header>
        </>
    );
};

export default Header;
