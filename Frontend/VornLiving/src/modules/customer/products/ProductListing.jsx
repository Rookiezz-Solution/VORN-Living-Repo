import React, { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Filter, ChevronDown, ShoppingCart, Heart, Star, X } from 'lucide-react';
import { getProducts, getCategories, addToCart, addToWishlist, removeFromWishlist, getWishlist } from '../../../services/api';
import { useNotification } from '../../../context/NotificationContext';
import ProductImage from '../../../components/ProductImage';
import { formatINR } from '../../../utils/formatINR';
import PaginationBar from '../../../components/PaginationBar';
import SearchField from '../../../components/SearchField';
import { setSEO } from '../../../utils/seo';

const ProductListing = () => {
    const { showNotification } = useNotification();
    const navigate = useNavigate();
    const { slug: categorySlug } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const searchTerm = searchParams.get('search') || '';
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [material, setMaterial] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('50000');
    const [sortOption, setSortOption] = useState('name');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [debouncedMinPrice, setDebouncedMinPrice] = useState(0);
    const [debouncedMaxPrice, setDebouncedMaxPrice] = useState(50000);
    const [isLoading, setIsLoading] = useState(false);
    const [quickView, setQuickView] = useState(null);
    const [wishlist, setWishlist] = useState(new Set());
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [openSections, setOpenSections] = useState({
        category: true,
        material: true,
        price: true
    });
    
    const [totalCount, setTotalCount] = useState(0);
    const productsPerPage = 10;
    const currentPage = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);

    const handleAddToCart = async (productId) => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const userId = user ? user.UserID : null;
            // No login check needed for guest cart
            await addToCart(userId, productId, 1);
            showNotification("Item added to cart!", 'success');
        } catch (error) {
            console.error("Add to cart failed", error);
            showNotification("Failed to add item to cart.", 'error');
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 350);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        const timer = setTimeout(() => {
            const min = minPrice === '' ? 0 : Number(minPrice);
            const max = maxPrice === '' ? 50000 : Number(maxPrice);
            setDebouncedMinPrice(Number.isFinite(min) ? min : 0);
            setDebouncedMaxPrice(Number.isFinite(max) ? max : 50000);
        }, 250);
        return () => clearTimeout(timer);
    }, [minPrice, maxPrice]);

    useEffect(() => {
        const loadCategories = async () => {
            const categoryData = await getCategories();
            setCategories(categoryData);
        };
        loadCategories();
    }, []);

    useEffect(() => {
        const loadProducts = async () => {
            setIsLoading(true);
            try {
                const response = await getProducts({
                    categorySlug,
                    search: debouncedSearchTerm,
                    minPrice: debouncedMinPrice,
                    maxPrice: debouncedMaxPrice,
                    material,
                    sort: sortOption,
                    page: currentPage,
                    limit: productsPerPage
                });
                
                if (response.products) {
                    setProducts(response.products);
                    setTotalCount(response.totalCount || 0);
                } else {
                    setProducts(Array.isArray(response) ? response : []);
                    setTotalCount(Array.isArray(response) ? response.length : 0);
                }
            } catch (error) {
                console.error("Failed to load products", error);
                setProducts([]);
            }
            setIsLoading(false);
        };
        loadProducts();
    }, [categorySlug, debouncedSearchTerm, debouncedMinPrice, debouncedMaxPrice, material, sortOption, currentPage]);

    const toggleWishlist = async (productId) => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            showNotification("Please login to add to wishlist", 'error');
            navigate('/auth');
            return;
        }
        
        try {
            if (wishlist.has(productId)) {
                await removeFromWishlist(user.UserID, productId);
                setWishlist(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(productId);
                    return newSet;
                });
                showNotification("Removed from wishlist", 'info');
            } else {
                await addToWishlist(user.UserID, productId);
                setWishlist(prev => new Set(prev).add(productId));
                showNotification("Added to wishlist!", 'success');
            }
        } catch (error) {
            console.error(error);
            showNotification("Failed to update wishlist", 'error');
        }
    };

    useEffect(() => {
        const loadWishlist = async () => {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) {
                setWishlist(new Set());
                return;
            }
            try {
                const items = await getWishlist(user.UserID);
                const ids = new Set(items.map(i => i.ProductID));
                setWishlist(ids);
            } catch {
                setWishlist(new Set());
            }
        };
        loadWishlist();
    }, []);

    const totalPages = Math.ceil(totalCount / productsPerPage);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            const next = new URLSearchParams(searchParams);
            if (newPage === 1) next.delete('page');
            else next.set('page', String(newPage));
            setSearchParams(next, { replace: true });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleMinPriceChange = (e) => {
        const raw = e.target.value;
        if (raw === '') {
            setMinPrice('');
            const next = new URLSearchParams(searchParams);
            next.delete('page');
            setSearchParams(next, { replace: true });
            return;
        }
        const maxN = maxPrice === '' ? 50000 : Number(maxPrice);
        const n = Number(raw);
        const value = Math.min(Number.isFinite(n) ? n : 0, (Number.isFinite(maxN) ? maxN : 50000) - 1);
        setMinPrice(String(Math.max(0, value)));
        const next = new URLSearchParams(searchParams);
        next.delete('page');
        setSearchParams(next, { replace: true });
    };

    const handleMaxPriceChange = (e) => {
        const raw = e.target.value;
        if (raw === '') {
            setMaxPrice('');
            const next = new URLSearchParams(searchParams);
            next.delete('page');
            setSearchParams(next, { replace: true });
            return;
        }
        const minN = minPrice === '' ? 0 : Number(minPrice);
        const n = Number(raw);
        const value = Math.max(Number.isFinite(n) ? n : 0, (Number.isFinite(minN) ? minN : 0) + 1);
        setMaxPrice(String(Math.min(50000, value)));
        const next = new URLSearchParams(searchParams);
        next.delete('page');
        setSearchParams(next, { replace: true });
    };

    const selectedCategory = categorySlug
        ? (categories.find(c => c.CategorySlug === categorySlug)?.CategoryName || 'All')
        : 'All';

    useEffect(() => {
        if (!quickView) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previous;
        };
    }, [quickView]);

    useEffect(() => {
        const baseTitle = categorySlug && selectedCategory !== 'All'
            ? `${selectedCategory} | Vorn Living Shop`
            : 'Shop Home Accessories | Vorn Living';
        const title = searchTerm ? `${searchTerm} - ${baseTitle}` : baseTitle;
        const description = categorySlug && selectedCategory !== 'All'
            ? `Buy ${selectedCategory} products from Vorn Living. Premium quality and fast delivery.`
            : 'Explore kitchen, bathroom and living essentials at Vorn Living.';
        setSEO({
            title,
            description,
            canonical: `${window.location.origin}${window.location.pathname}`,
            type: 'website'
        });
    }, [categorySlug, selectedCategory, searchTerm]);

    const toggleSection = (key) => {
        setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="container mx-auto px-4 py-10 animate-fade-in">
            <div className="mb-6">
                <p className="text-sm text-secondary/70">
                    <Link to="/" className="hover:text-primary">Home</Link> <span className="mx-2">/</span>
                    <Link to="/shop" className="hover:text-primary">Shop</Link>
                    {categorySlug ? <><span className="mx-2">/</span><span className="text-secondary font-medium">{selectedCategory}</span></> : null}
                </p>
                <h1 className="text-3xl md:text-4xl font-bold text-secondary mt-2">
                    {categorySlug ? selectedCategory : 'Shop'}
                </h1>
            </div>

            <div className="flex items-center justify-between gap-3 border-b border-border pb-4 mb-6">
                <div className="text-sm text-secondary/80">
                    Showing {products.length > 0 ? (currentPage - 1) * productsPerPage + 1 : 0} - {Math.min(currentPage * productsPerPage, totalCount)} of {totalCount} products
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setMobileFiltersOpen(true)}
                        className="md:hidden inline-flex items-center gap-2 border border-border rounded-full px-4 py-2 bg-white hover:bg-gray-50 transition text-sm"
                    >
                        <Filter className="h-4 w-4" /> Filters
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="text-sm text-secondary/80 hidden sm:block">Sort By:</div>
                        <div className="relative">
                            <select
                                value={sortOption}
                                onChange={(e) => {
                                    setSortOption(e.target.value);
                                    const next = new URLSearchParams(searchParams);
                                    next.delete('page');
                                    setSearchParams(next, { replace: true });
                                }}
                                className="appearance-none bg-white border border-border text-secondary py-2 px-4 pr-10 rounded-full focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/70 transition text-sm"
                            >
                                <option value="newest">Newest</option>
                                <option value="price-low-high">Price: Low to High</option>
                                <option value="price-high-low">Price: High to Low</option>
                                <option value="popularity">Popularity</option>
                                <option value="discount">Biggest Discount</option>
                                <option value="rating">Rating</option>
                                <option value="name">Name</option>
                                <option value="new-arrivals">New Arrivals</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-secondary">
                                <ChevronDown className="h-4 w-4" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8">
                <aside className="hidden md:block">
                    <div className="md:sticky md:top-24 bg-white border border-border rounded-2xl p-5">
                        <div className="flex items-center justify-between">
                            <div className="font-semibold text-secondary">Filters</div>
                            <button
                                type="button"
                                onClick={() => {
                                    const next = new URLSearchParams(searchParams);
                                    next.delete('search');
                                    next.delete('page');
                                    setSearchParams(next, { replace: true });
                                    setMinPrice('');
                                    setMaxPrice('50000');
                                    setMaterial('');
                                    setSortOption('name');
                                }}
                                className="text-sm text-secondary/70 hover:text-primary transition"
                            >
                                Reset
                            </button>
                        </div>

                        <div className="mt-5 border-t border-border pt-4">
                            <button type="button" onClick={() => toggleSection('price')} className="w-full flex items-center justify-between">
                                <div className="text-sm font-semibold text-secondary">Price</div>
                                <ChevronDown className={`h-4 w-4 transition ${openSections.price ? 'rotate-180' : ''}`} />
                            </button>
                            {openSections.price && (
                                <div className="mt-3 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <div className="text-xs text-secondary/70 mb-1">Minimum Price</div>
                                            <input type="number" min="0" placeholder="0" max={(maxPrice === '' ? 50000 : Number(maxPrice)) - 1} value={minPrice} onChange={handleMinPriceChange} className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/70 transition" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-secondary/70 mb-1">Maximum Price</div>
                                            <input type="number" min={(minPrice === '' ? 0 : Number(minPrice)) + 1} max="50000" value={maxPrice} onChange={handleMaxPriceChange} className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/70 transition" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-5 border-t border-border pt-4">
                            <button type="button" onClick={() => toggleSection('category')} className="w-full flex items-center justify-between">
                                <div className="text-sm font-semibold text-secondary">Category</div>
                                <ChevronDown className={`h-4 w-4 transition ${openSections.category ? 'rotate-180' : ''}`} />
                            </button>
                            {openSections.category && (
                                <div className="mt-3 space-y-2 max-h-56 overflow-auto pr-1">
                                    <Link to="/shop" className="flex items-center gap-2 text-sm text-secondary hover:text-primary">
                                        <span className={`h-4 w-4 rounded border border-border flex items-center justify-center ${selectedCategory === 'All' ? 'bg-primary border-primary' : 'bg-white'}`}>
                                            {selectedCategory === 'All' ? <span className="h-2 w-2 bg-white rounded-sm" /> : null}
                                        </span>
                                        All
                                    </Link>
                                    {categories.map(cat => (
                                        <Link key={cat.CategoryID} to={`/category/${cat.CategorySlug}`} className="flex items-center gap-2 text-sm text-secondary hover:text-primary">
                                            <span className={`h-4 w-4 rounded border border-border flex items-center justify-center ${selectedCategory === cat.CategoryName ? 'bg-primary border-primary' : 'bg-white'}`}>
                                                {selectedCategory === cat.CategoryName ? <span className="h-2 w-2 bg-white rounded-sm" /> : null}
                                            </span>
                                            {cat.CategoryName}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* <div className="mt-5 border-t border-border pt-4">
                            <button type="button" onClick={() => toggleSection('material')} className="w-full flex items-center justify-between">
                                <div className="text-sm font-semibold text-secondary">Material</div>
                                <ChevronDown className={`h-4 w-4 transition ${openSections.material ? 'rotate-180' : ''}`} />
                            </button>
                            {openSections.material && (
                                <div className="mt-3 space-y-2">
                                    {['', 'Wood', 'Glass', 'Metal'].map(val => (
                                        <button key={val || 'all'} type="button" onClick={() => setMaterial(val)} className="w-full text-left flex items-center gap-2 text-sm text-secondary hover:text-primary">
                                            <span className={`h-4 w-4 rounded border border-border flex items-center justify-center ${material === val ? 'bg-primary border-primary' : 'bg-white'}`}>
                                                {material === val ? <span className="h-2 w-2 bg-white rounded-sm" /> : null}
                                            </span>
                                            {val || 'All'}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div> */}
                    </div>
                </aside>

                <section>
                    <div className="mb-5">
                        <SearchField
                            value={searchTerm}
                            onChange={(e) => {
                                const next = new URLSearchParams(searchParams);
                                const value = e.target.value;
                                if (value) next.set('search', value);
                                else next.delete('search');
                                next.delete('page');
                                setSearchParams(next, { replace: true });
                            }}
                            placeholder="Search products..."
                            inputWidthClassName="w-full"
                            inputClassName="rounded-2xl py-3"
                        />
                    </div>

                {/* Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 6 }).map((_, idx) => (
                            <div key={idx} className="bg-section-gradient rounded-2xl border border-border shadow-sm overflow-hidden animate-scale-in">
                                <div className="h-64 bg-gray-100 animate-pulse" />
                                <div className="p-5 space-y-3">
                                    <div className="h-4 w-24 bg-gray-100 animate-pulse rounded" />
                                    <div className="h-5 w-4/5 bg-gray-100 animate-pulse rounded" />
                                    <div className="h-5 w-32 bg-gray-100 animate-pulse rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : products.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {products.map((product) => (
                            <div 
                                key={product.ProductID} 
                                data-tilt 
                                className="rounded-2xl border border-border bg-white shadow-sm transition overflow-hidden group rf-hover-lift rf-tilt-3d hover:border-primary/50"
                            >
                                <div className="relative">
                                    <button type="button" className="block w-full text-left" onClick={() => setQuickView(product)}>
                                        <ProductImage
                                            src={product.ImageURL}
                                            alt={product.ProductName}
                                            category={product.CategoryName}
                                            apiOnly={true}
                                            className="w-full aspect-[4/5] object-cover transition duration-500 group-hover:scale-[1.02]"
                                            fallbackText={product.ProductName}
                                        />
                                    </button>
                                    {product.SalePrice && product.SalePrice < product.RegularPrice && (
                                        <span className="absolute top-2 left-2 badge-sale text-xs">
                                            -{Math.round(((product.RegularPrice - product.SalePrice) / product.RegularPrice) * 100)}%
                                        </span>
                                    )}
                                    
                                    <button 
                                        className={`absolute top-2 right-2 p-2 bg-white rounded-full shadow-md transition duration-300 ${
                                            wishlist.has(product.ProductID) ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-red-500'
                                        }`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            toggleWishlist(product.ProductID);
                                        }}
                                    >
                                        <Heart className={`h-4 w-4 ${wishlist.has(product.ProductID) ? 'fill-current' : ''}`} />
                                    </button>
                                    
                                    <div className="absolute inset-0 flex items-end justify-center pointer-events-none">
                                        <button 
                                            type="button" 
                                            onClick={(e) => {
                                                e.preventDefault(); // Prevent navigation
                                                handleAddToCart(product.ProductID);
                                            }}
                                            className="pointer-events-auto mb-3 rf-btn-primary px-4 py-2 rounded-full opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition duration-300 flex items-center gap-2 text-sm"
                                        >
                                            <ShoppingCart className="h-4 w-4" /> Add to Cart
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="p-4">
                                    <div className="text-xs text-secondary/70 mb-1 truncate">
                                        {product.CategoryName}
                                    </div>
                                    <Link to={`/product/${product.ProductID}${searchParams.get('replaceFor') ? `?replaceFor=${encodeURIComponent(searchParams.get('replaceFor'))}` : ''}`} className="block text-sm font-semibold text-secondary hover:text-primary transition line-clamp-2 min-h-[2.5rem]">
                                        {product.ProductName}
                                    </Link>
                                    <div className="flex items-center mt-2 space-x-2">
                                        <div className="flex text-yellow-400">
                                            {[...Array(5)].map((_, i) => (
                                                <Star 
                                                    key={i} 
                                                    className={`h-4 w-4 ${i < Math.round(product.Rating || 0) ? 'fill-current' : 'text-gray-300'}`} 
                                                />
                                            ))}
                                        </div>
                                        <span className="text-xs text-secondary/70">({product.ReviewCount || 0})</span>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-base font-bold text-primary">{formatINR(product.SalePrice || product.RegularPrice)}</span>
                                        {product.SalePrice && product.SalePrice < product.RegularPrice && (
                                            <span className="text-sm text-secondary/60 line-through">
                                                {formatINR(product.RegularPrice)}
                                            </span>
                                        )}
                                        </div>
                                        <Link to={`/product/${product.ProductID}${searchParams.get('replaceFor') ? `?replaceFor=${encodeURIComponent(searchParams.get('replaceFor'))}` : ''}`} className="text-sm font-medium text-secondary hover:text-primary transition">
                                            View
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-2xl border border-border shadow-sm">
                        <p className="text-secondary/70 text-lg">No products found matching your criteria.</p>
                        <button 
                            type="button"
                            onClick={() => {
                                const next = new URLSearchParams(searchParams);
                                next.delete('search');
                                next.delete('page');
                                setSearchParams(next, { replace: true });
                                setMinPrice('');
                                setMaxPrice('50000');
                                setSortOption('name');
                            }}
                            className="mt-4 text-primary hover:underline"
                        >
                            Clear Filters
                        </button>
                    </div>
                )}
                
                {/* Pagination Controls */}
                <PaginationBar
                    page={currentPage}
                    pageSize={productsPerPage}
                    totalCount={totalCount}
                    onPageChange={handlePageChange}
                />

                {quickView && createPortal(
                    <div className="fixed inset-0 z-[2000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setQuickView(null)}>
                        <div className="rf-card w-full max-w-3xl p-5 md:p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="text-lg font-bold text-secondary truncate">{quickView.ProductName}</div>
                                    <div className="text-xs text-secondary/70 mt-1">
                                        {quickView.CategoryName}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="p-2 rounded-xl border border-border hover:border-primary transition"
                                    onClick={() => setQuickView(null)}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="rounded-2xl overflow-hidden border border-border bg-gray-50">
                                    <ProductImage
                                        src={quickView.ImageURL}
                                        alt={quickView.ProductName}
                                        category={quickView.CategoryName}
                                        apiOnly={true}
                                        className="w-full aspect-[4/5] object-cover"
                                        fallbackText={quickView.ProductName}
                                    />
                                </div>
                                <div className="space-y-4">
                                    <div className="text-2xl font-extrabold text-primary">
                                        {formatINR(quickView.SalePrice || quickView.RegularPrice)}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex text-yellow-400">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className={`h-4 w-4 ${i < Math.round(quickView.Rating || 0) ? 'fill-current' : 'text-gray-300'}`}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-xs text-secondary/70">({quickView.ReviewCount || 0})</span>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <button
                                            type="button"
                                            className="rf-btn-primary px-5 py-3"
                                            onClick={() => handleAddToCart(quickView.ProductID)}
                                        >
                                            Add to Cart
                                        </button>
                                        <Link
                                            to={`/product/${quickView.ProductID}${searchParams.get('replaceFor') ? `?replaceFor=${encodeURIComponent(searchParams.get('replaceFor'))}` : ''}`}
                                            className="border border-border px-5 py-3 rounded-xl bg-white hover:bg-gray-50 transition text-center font-semibold text-secondary"
                                            onClick={() => setQuickView(null)}
                                        >
                                            View Details
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {mobileFiltersOpen && (
                    <div className="fixed inset-0 z-50 md:hidden">
                        <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setMobileFiltersOpen(false)} />
                        <div className="absolute right-0 top-0 h-full w-[90%] max-w-sm bg-white shadow-xl p-5 overflow-y-auto">
                            <div className="flex items-center justify-between">
                                <div className="font-semibold text-secondary">Filters</div>
                                <button type="button" onClick={() => setMobileFiltersOpen(false)} className="p-2 rounded-xl border border-border">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="mt-4 space-y-5">
                                <div className="border border-border rounded-2xl p-4">
                                    <div className="text-sm font-semibold text-secondary mb-3">Price</div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <div className="text-xs text-secondary/70 mb-1">Minimum Price</div>
                                            <input type="number" min="0" placeholder="0" max={(maxPrice === '' ? 50000 : Number(maxPrice)) - 1} value={minPrice} onChange={handleMinPriceChange} className="w-full border border-border rounded-xl px-3 py-2 text-sm" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-secondary/70 mb-1">Maximum Price</div>
                                            <input type="number" min={(minPrice === '' ? 0 : Number(minPrice)) + 1} max="50000" value={maxPrice} onChange={handleMaxPriceChange} className="w-full border border-border rounded-xl px-3 py-2 text-sm" />
                                        </div>
                                    </div>
                                </div>
                                <div className="border border-border rounded-2xl p-4">
                                    <div className="text-sm font-semibold text-secondary mb-3">Category</div>
                                    <div className="space-y-2 max-h-56 overflow-auto pr-1">
                                        <Link to="/shop" onClick={() => setMobileFiltersOpen(false)} className="flex items-center gap-2 text-sm text-secondary hover:text-primary">
                                            <span className={`h-4 w-4 rounded border border-border flex items-center justify-center ${selectedCategory === 'All' ? 'bg-primary border-primary' : 'bg-white'}`}>
                                                {selectedCategory === 'All' ? <span className="h-2 w-2 bg-white rounded-sm" /> : null}
                                            </span>
                                            All
                                        </Link>
                                        {categories.map(cat => (
                                            <Link key={cat.CategoryID} to={`/category/${cat.CategorySlug}`} onClick={() => setMobileFiltersOpen(false)} className="flex items-center gap-2 text-sm text-secondary hover:text-primary">
                                                <span className={`h-4 w-4 rounded border border-border flex items-center justify-center ${selectedCategory === cat.CategoryName ? 'bg-primary border-primary' : 'bg-white'}`}>
                                                    {selectedCategory === cat.CategoryName ? <span className="h-2 w-2 bg-white rounded-sm" /> : null}
                                                </span>
                                                {cat.CategoryName}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                                <div className="border border-border rounded-2xl p-4">
                                    <div className="text-sm font-semibold text-secondary mb-3">Material</div>
                                    <div className="space-y-2">
                                        {['', 'Wood', 'Glass', 'Metal'].map(val => (
                                            <button key={val || 'all'} type="button" onClick={() => setMaterial(val)} className="w-full text-left flex items-center gap-2 text-sm text-secondary hover:text-primary">
                                                <span className={`h-4 w-4 rounded border border-border flex items-center justify-center ${material === val ? 'bg-primary border-primary' : 'bg-white'}`}>
                                                    {material === val ? <span className="h-2 w-2 bg-white rounded-sm" /> : null}
                                                </span>
                                                {val || 'All'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                </section>
            </div>
        </div>
    );
};

export default ProductListing;
