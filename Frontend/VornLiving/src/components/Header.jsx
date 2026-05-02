import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, User, Search, Menu, X, ChevronDown, Moon, Sun } from 'lucide-react';
import { getCategories, getCart } from '../services/api';

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const headerRef = useRef(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [categories, setCategories] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [cartCount, setCartCount] = useState(0);
    const [headerHeight, setHeaderHeight] = useState(0);
    const [isHeaderHidden, setIsHeaderHidden] = useState(false);
    const isMenuOpenRef = useRef(false);
    const isCategoryOpenRef = useRef(false);
    const isHeaderHiddenRef = useRef(false);
    const lastScrollYRef = useRef(0);
    const rafRef = useRef(0);
    const downAccumRef = useRef(0);
    const upAccumRef = useRef(0);
    const lastToggleAtRef = useRef(0);
    const [isDark, setIsDark] = useState(() => {
        const stored = localStorage.getItem('theme');
        if (stored === 'dark') return true;
        if (stored === 'light') return false;
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark;
    });

    const [user, setUser] = useState(null);
    const isHome = location.pathname === '/';

    useEffect(() => {
        isMenuOpenRef.current = isMenuOpen;
    }, [isMenuOpen]);

    useEffect(() => {
        isCategoryOpenRef.current = isCategoryOpen;
    }, [isCategoryOpen]);

    useEffect(() => {
        const el = headerRef.current;
        if (!el) return;

        const update = () => {
            const next = Math.round(el.offsetHeight || el.getBoundingClientRect().height || 0);
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
        const root = document.documentElement;
        root.style.setProperty('--customer-header-height', `${headerHeight || 0}px`);
        return () => {
            root.style.removeProperty('--customer-header-height');
        };
    }, [headerHeight]);

    useEffect(() => {
        isHeaderHiddenRef.current = isHeaderHidden;
    }, [isHeaderHidden]);

    useEffect(() => {
        lastScrollYRef.current = window.scrollY || 0;

        const process = () => {
            rafRef.current = 0;

            const y = window.scrollY || 0;
            const delta = y - lastScrollYRef.current;
            lastScrollYRef.current = y;

            if (Math.abs(delta) < 2) return;

            if (y < 24) {
                downAccumRef.current = 0;
                upAccumRef.current = 0;
                if (isHeaderHiddenRef.current) {
                    isHeaderHiddenRef.current = false;
                    setIsHeaderHidden(false);
                }
                return;
            }

            if (delta > 0) {
                downAccumRef.current += delta;
                upAccumRef.current = 0;
            } else if (delta < 0) {
                upAccumRef.current += -delta;
                downAccumRef.current = 0;
            }

            const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

            if (downAccumRef.current > 140) {
                downAccumRef.current = 0;
                if (!isMenuOpenRef.current && !isCategoryOpenRef.current) {
                    if (!isHeaderHiddenRef.current && (now - lastToggleAtRef.current) > 240) {
                        lastToggleAtRef.current = now;
                        isHeaderHiddenRef.current = true;
                        setIsHeaderHidden(true);
                    }
                }
                return;
            }

            if (upAccumRef.current > 90) {
                upAccumRef.current = 0;
                if (isHeaderHiddenRef.current && (now - lastToggleAtRef.current) > 200) {
                    lastToggleAtRef.current = now;
                    isHeaderHiddenRef.current = false;
                    setIsHeaderHidden(false);
                }
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
    }, []);

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

    useEffect(() => {
        const sync = () => {
            const stored = localStorage.getItem('theme');
            if (stored === 'dark') setIsDark(true);
            else if (stored === 'light') setIsDark(false);
        };

        const onStorage = (e) => {
            if (e.key === 'theme') sync();
        };

        window.addEventListener('themeUpdated', sync);
        window.addEventListener('storage', onStorage);
        return () => {
            window.removeEventListener('themeUpdated', sync);
            window.removeEventListener('storage', onStorage);
        };
    }, []);

    const handleSearchSubmit = () => {
        const q = searchQuery.trim();
        if (!q) {
            navigate('/shop');
            return;
        }
        navigate(`/shop?search=${encodeURIComponent(q)}`);
    };

    const toggleTheme = () => {
        setIsDark((prev) => {
            const next = !prev;
            localStorage.setItem('theme', next ? 'dark' : 'light');
            window.dispatchEvent(new Event('themeUpdated'));
            return next;
        });
    };

    const headerTextClass = 'text-white';
    const hoverPillClass = 'hover:bg-white/10';
    const iconBtnClass = `${hoverPillClass} text-white`;
    const pillBtnClass = `${hoverPillClass} text-white`;
    const navItemClass = `rounded-full px-3 py-2 ${hoverPillClass} transition`;
    const headerSurfaceClass = 'bg-black/35 backdrop-blur-2xl border-b border-white/10 shadow-[0_10px_24px_rgba(0,0,0,0.22)]';

    return (
        <>
            <div style={{ height: isHome ? 0 : headerHeight }} />
            <header
                ref={headerRef}
                className={[
                    'fixed top-0 left-0 right-0 z-50 rf-header',
                    'transition-transform duration-300 ease-out will-change-transform transform-gpu',
                    isHeaderHidden ? '-translate-y-full' : 'translate-y-0',
                ].join(' ')}
            >
                <div className={[headerSurfaceClass, headerTextClass].join(' ')}>
                   

                    <div className="container mx-auto py-4 flex justify-between items-center relative">
                        <Link to="/" className="flex items-center">
                            <div className="rounded-2xl p-2 bg-white/85 ring-1 ring-white/15 shadow-sm">
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
                                className={[
                                    'w-full border rounded-full py-2.5 px-4 pl-11 shadow-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition',
                                    'border-white/15 bg-white/10 text-white placeholder:text-white/60'
                                ].join(' ')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSearchSubmit();
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleSearchSubmit}
                                className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition text-white/70 hover:text-white"
                            >
                                <Search className="h-5 w-5" />
                            </button>
                        </div>

                        <div className={['flex items-center space-x-3', headerTextClass].join(' ')}>
                            {user ? (
                                <Link to="/profile" className={['flex items-center space-x-2 rounded-full px-3 py-2 transition', pillBtnClass].join(' ')}>
                                    <User className="h-6 w-6" />
                                    <span className="hidden lg:inline">{user.FullName ? user.FullName.split(' ')[0] : 'Profile'}</span>
                                </Link>
                            ) : (
                                <Link to="/auth" className={['flex items-center space-x-2 rounded-full px-3 py-2 transition', pillBtnClass].join(' ')}>
                                    <User className="h-6 w-6" />
                                    <span className="hidden lg:inline">Login</span>
                                </Link>
                            )}
                            <Link to="/wishlist" className={['relative rf-icon-btn', iconBtnClass].join(' ')}>
                                <Heart className="h-6 w-6" />
                            </Link>
                            <Link to="/cart" className={['relative rf-icon-btn', iconBtnClass].join(' ')}>
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
                                className={['rf-icon-btn', iconBtnClass].join(' ')}
                                aria-label={isDark ? 'Dark mode' : 'Light mode'}
                                title={isDark ? 'Dark mode' : 'Light mode'}
                            >
                                {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                            </button>

                            <button
                                className={['md:hidden rf-icon-btn', iconBtnClass].join(' ')}
                                onClick={() => {
                                    isHeaderHiddenRef.current = false;
                                    setIsHeaderHidden(false);
                                    setIsMenuOpen(!isMenuOpen);
                                }}
                            >
                                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                            </button>
                        </div>
                    </div>

                    <nav className={['hidden md:block border-t border-white/10', headerTextClass].join(' ')}>
                        <div className="container mx-auto flex gap-8 py-3 font-medium items-center">
                            <Link to="/" className={navItemClass}>Home</Link>
                            <Link to="/shop" className={navItemClass}>Shop</Link>

                            <div
                                className="relative group"
                                onMouseLeave={() => setIsCategoryOpen(false)}
                            >
                                <button
                                    className={['flex items-center focus:outline-none', navItemClass].join(' ')}
                                    onMouseEnter={() => {
                                        isHeaderHiddenRef.current = false;
                                        setIsHeaderHidden(false);
                                        setIsCategoryOpen(true);
                                    }}
                                    onClick={() => {
                                        isHeaderHiddenRef.current = false;
                                        setIsHeaderHidden(false);
                                        setIsCategoryOpen(!isCategoryOpen);
                                    }}
                                >
                                    Categories <ChevronDown className="h-4 w-4 ml-1" />
                                </button>

                                <div
                                    className="absolute left-0 mt-3 w-64 bg-black/45 backdrop-blur-2xl text-white shadow-xl rounded-xl overflow-hidden z-50 transition-all duration-300 origin-top transform scale-y-0 group-hover:scale-y-100 max-h-60 overflow-y-auto border border-white/10"
                                >
                                    {categories.map((category) => (
                                        <Link
                                            key={category.CategoryID}
                                            to={`/category/${category.CategorySlug}`}
                                            className="block px-4 py-2.5 text-white/90 hover:bg-white/10 hover:text-white transition"
                                        >
                                            {category.CategoryName}
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            <Link to="/contact" className={navItemClass}>Contact</Link>
                        </div>
                    </nav>

                    {isMenuOpen && (
                        <div className="md:hidden bg-black/55 backdrop-blur-2xl border-t border-white/10 p-4 absolute w-full shadow-lg z-50 text-white">
                            <div className="flex flex-col space-y-4">
                                <Link to="/" className="rounded-full px-3 py-2 hover:bg-black/10 transition" onClick={() => setIsMenuOpen(false)}>Home</Link>
                                <Link to="/shop" className="rounded-full px-3 py-2 hover:bg-black/10 transition" onClick={() => setIsMenuOpen(false)}>Shop</Link>

                                <div>
                                    <button
                                        onClick={() => {
                                            isHeaderHiddenRef.current = false;
                                            setIsHeaderHidden(false);
                                            setIsCategoryOpen(!isCategoryOpen);
                                        }}
                                        className="flex items-center justify-between w-full rounded-full px-3 py-2 hover:bg-white/10 transition"
                                    >
                                        Categories <ChevronDown className={`h-4 w-4 ml-1 transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isCategoryOpen && (
                                        <div className="pl-4 mt-2 space-y-2 border-l-2 border-primary ml-2 max-h-60 overflow-y-auto">
                                            {categories.map((category) => (
                                                <Link
                                                    key={category.CategoryID}
                                                    to={`/category/${category.CategorySlug}`}
                                                    className="block text-sm text-white/90 hover:bg-white/10 rounded-lg px-2 py-1 transition"
                                                    onClick={() => setIsMenuOpen(false)}
                                                >
                                                    {category.CategoryName}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <Link to="/contact" className="rounded-full px-3 py-2 hover:bg-white/10 transition" onClick={() => setIsMenuOpen(false)}>Contact</Link>
                            </div>
                        </div>
                    )}
                </div>
            </header>
        </>
    );
};

export default Header;
