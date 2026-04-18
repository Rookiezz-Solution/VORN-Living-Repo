import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Star,
  ChevronLeft,
  ChevronRight,
  Truck,
  ShieldCheck,
  RefreshCw,
  Headphones
} from "lucide-react";
import { getCategories, getProducts, getRecentReviews } from "../../../services/api";
import ProductImage from "../../../components/ProductImage";
import { formatINR } from "../../../utils/formatINR";
import { setSEO } from '../../../utils/seo';

const HERO_IMAGES = [
  "/heroSectionImg/LaptopStand.jpeg",
  "/heroSectionImg/lapwithStand.jpeg",
  "/heroSectionImg/tissueholder.jpeg",
  "/heroSectionImg/toothBrushholder.jpeg",
];

const Home = () => {

  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [topRatedProducts, setTopRatedProducts] = useState([]);
  const [recentReviews, setRecentReviews] = useState([]);
  const categoryContainerRef = useRef(null);
  const reviewContainerRef = useRef(null);
  const pauseUntilRef = useRef(0);
  const hoverPausedRef = useRef(false);

  const heroImages = HERO_IMAGES;

  useEffect(() => {
    const loadData = async () => {
      const [categoryData, trendingRes, topRatedRes, reviewsRes] = await Promise.all([
        getCategories(),
        getProducts({ sort: "newest", page: 1, limit: 8 }),
        getProducts({ sort: "rating", page: 1, limit: 4 }),
        getRecentReviews(12)
      ]);

      setCategories(categoryData);
      const trending = Array.isArray(trendingRes) ? trendingRes : (trendingRes?.products ?? []);
      const topRated = Array.isArray(topRatedRes) ? topRatedRes : (topRatedRes?.products ?? []);
      setFeaturedProducts(trending.slice(0, 8));
      setTopRatedProducts(topRated.slice(0, 4));
      setRecentReviews((reviewsRes?.reviews || []).slice(0, 12));
    };

    loadData();
  }, []);

  useEffect(() => {
    setSEO({
      title: 'Vorn Living | Premium Home Accessories',
      description: 'Shop premium home accessories for kitchen, bathroom and living. Discover curated essentials, offers and fast delivery.',
      canonical: `${window.location.origin}/`,
      type: 'website'
    });
  }, []);

  useEffect(() => {
    const el = categoryContainerRef.current;
    const canLoop = categories.length > 4;
    if (!el || !canLoop) return;

    const getScrollAmount = () => {
      const firstCard = el.querySelector(':scope > a');
      const gap = 16;
      return firstCard
        ? Math.round(firstCard.getBoundingClientRect().width + gap)
        : Math.round(el.clientWidth * 0.85);
    };

    const wrap = () => {
      const halfWidth = el.scrollWidth / 2;
      if (!halfWidth || halfWidth <= 0) return;
      while (el.scrollLeft < 0) el.scrollLeft += halfWidth;
      while (el.scrollLeft >= halfWidth) el.scrollLeft -= halfWidth;
    };

    const tick = () => {
      if (!categoryContainerRef.current) return;
      if (hoverPausedRef.current) return;
      if (Date.now() < pauseUntilRef.current) return;
      if (el.scrollWidth <= el.clientWidth + 8) return;

      const amount = getScrollAmount();
      el.scrollBy({ left: -amount, behavior: 'smooth' });
      window.setTimeout(() => {
        if (!categoryContainerRef.current) return;
        wrap();
      }, 650);
    };

    const interval = window.setInterval(tick, 3500);
    return () => window.clearInterval(interval);
  }, [categories.length]);

  // Carousel auto change
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (heroImages.length ? (prev + 1) % heroImages.length : 0));
    }, 5000);

    return () => clearInterval(interval);
  }, [heroImages.length]);

  useEffect(() => {
    const elements = document.querySelectorAll('[data-reveal]');
    const io = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { root: null, threshold: 0.12 }
    );
    elements.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [categories.length, featuredProducts.length, topRatedProducts.length]);

  const scrollCategories = (direction) => {
    const canLoop = categories.length > 4;
    if (categoryContainerRef.current) {
      const el = categoryContainerRef.current;
      const firstCard = el.querySelector(':scope > a');
      const gap = 16;
      const scrollAmount = firstCard
        ? Math.round(firstCard.getBoundingClientRect().width + gap)
        : Math.round(el.clientWidth * 0.85);
      el.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      if (canLoop) {
        pauseUntilRef.current = Date.now() + 2000;
        window.setTimeout(() => {
          if (!categoryContainerRef.current) return;
          const halfWidth = el.scrollWidth / 2;
          if (!halfWidth || halfWidth <= 0) return;
          while (el.scrollLeft < 0) el.scrollLeft += halfWidth;
          while (el.scrollLeft >= halfWidth) el.scrollLeft -= halfWidth;
        }, 650);
      }
    }
  };

  const scrollReviews = (direction) => {
    if (!reviewContainerRef.current) return;
    const scrollAmount = 380;
    reviewContainerRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const bannerIndex = heroImages.length ? currentBannerIndex % heroImages.length : 0;

  return (
    <div className="space-y-12 pb-16">

      {/* HERO SECTION */}
      <section className="relative h-[560px] w-full overflow-hidden">

        {heroImages.map((img, index) => (
          <img
            key={index}
            src={encodeURI(img)}
            alt=""
            className={`absolute inset-0 w-full h-full object-cover object-bottom bg-white transition-opacity duration-1000 ${
              index === bannerIndex ? "opacity-100" : "opacity-0"
            }`}
            loading={index === 0 ? "eager" : "lazy"}
            decoding="async"
          />
        ))}

        {/* Overlay */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10" />
          <div className="absolute inset-0 bg-hero-gradient opacity-90" />
          <div className="container mx-auto h-full flex items-center relative">
            <div className="max-w-xl text-white px-4">
              <p className="inline-flex items-center rounded-full px-4 py-2 text-sm tracking-wide rf-glass-pill">
                Premium Home Accessories
              </p>

              <h1
                className="mt-6 text-4xl md:text-6xl font-bold leading-tight"
                style={{ textShadow: "0 2px 14px rgba(0,0,0,0.60)" }}
              >
                Upgrade Your Living Space
              </h1>

              <p
                className="mt-5 text-base md:text-lg text-white/90 leading-relaxed"
                style={{ textShadow: "0 1px 10px rgba(0,0,0,0.55)" }}
              >
                Curated essentials for Kitchen, Bathroom and Living. Crafted to look premium and last longer.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  to="/shop"
                  className="inline-flex items-center justify-center bg-primary text-secondary px-8 py-3 rounded-full font-semibold hover:brightness-[0.98] transition"
                >
                  Shop Now <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <a
                  href="#home-categories"
                  className="inline-flex items-center justify-center px-8 py-3 rounded-full font-semibold transition rf-glass-pill rf-hero-cta"
                >
                  Explore Categories
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Slider Dots */}
        <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 flex gap-3">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentBannerIndex(index)}
              className={`w-3 h-3 rounded-full ${
                index === bannerIndex
                  ? "bg-white scale-125"
                  : "bg-white/50"
              }`}
            />
          ))}
        </div>
      </section>

      {/* USP STRIP */}
      <section className="container mx-auto px-4">
        <div data-reveal className="reveal-up grid grid-cols-2 lg:grid-cols-4 gap-4 rf-card p-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-secondary">Fast Delivery</p>
              <p className="text-sm text-gray-500">Quick dispatch across cities</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-secondary">Secure Payments</p>
              <p className="text-sm text-gray-500">Trusted checkout flow</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-secondary">Easy Returns</p>
              <p className="text-sm text-gray-500">Simple replacement policy</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-secondary">Support</p>
              <p className="text-sm text-gray-500">Help when you need it</p>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section id="home-categories" className="container mx-auto px-4 relative">
        <div data-reveal className="reveal-up flex items-end justify-between gap-6 mb-6">
          <div>
            <h2 className="text-3xl font-bold text-secondary">Shop by Category</h2>
            <p className="text-gray-500 mt-2">Discover collections for every corner of your home.</p>
          </div>
          <Link to="/shop" className="hidden sm:inline-flex items-center text-secondary hover:text-primary transition font-medium">
            View All <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>

        <div
          className="relative"
          onMouseEnter={() => { hoverPausedRef.current = true; }}
          onMouseLeave={() => { hoverPausedRef.current = false; }}
        >
          <button
            type="button"
            onClick={() => scrollCategories("left")}
            className="hidden md:inline-flex absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-white/90 dark:bg-gray-800 p-2 rounded-full shadow-lg hover:bg-white dark:hover:bg-gray-700 transition border border-border dark:border-gray-700"
            aria-label="Scroll categories left"
          >
            <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-200" />
          </button>

          <div
            ref={categoryContainerRef}
            className="flex gap-4 overflow-x-auto pb-4 scroll-smooth no-scrollbar"
          >
            {(categories.length > 4 ? [...categories, ...categories] : categories).map((category, idx) => (
              <Link
                key={`${category.CategoryID}-${idx < categories.length ? 'a' : 'b'}`}
                to={`/category/${category.CategorySlug}`}
                data-reveal
                className={`reveal-scale group relative overflow-hidden rounded-2xl shadow-sm border border-border min-w-[260px] md:min-w-[320px] flex-shrink-0 bg-surface transition rf-hover-lift hover:border-primary/60 ${['reveal-delay-0','reveal-delay-100','reveal-delay-200','reveal-delay-300','reveal-delay-400','reveal-delay-500'][idx % 6]}`}
              >
                <img
                  src={category.ImageURL || "/placeholder.png"}
                  alt={category.CategoryName}
                  className="w-full h-64 object-cover group-hover:scale-105 transition duration-500"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"></div>

                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="text-xl font-semibold">{category.CategoryName}</h3>

                  <span className="text-sm flex items-center mt-1">
                    Browse <ArrowRight className="ml-1 h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scrollCategories("right")}
            className="hidden md:inline-flex absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-white/90 dark:bg-gray-800 p-2 rounded-full shadow-lg hover:bg-white dark:hover:bg-gray-700 transition border border-border dark:border-gray-700"
            aria-label="Scroll categories right"
          >
            <ChevronRight className="w-6 h-6 text-gray-700 dark:text-gray-200" />
          </button>
        </div>
      </section>

      {/* TRENDING PRODUCTS */}
      <section className="container mx-auto px-4">
        <div data-reveal className="reveal-up rf-card py-10 px-6 md:px-10">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold text-secondary">Trending Now</h2>
            <p className="text-gray-500 mt-2">
              Handpicked exclusive items just for you.
            </p>
          </div>

          <Link to="/shop" className="flex items-center font-medium text-secondary hover:text-primary transition">
            View All <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <div key={product.ProductID} data-reveal className="reveal-scale group rf-card p-4 rf-hover-lift hover:border-primary/60 transition">
              <div className="relative overflow-hidden rounded-xl border border-border bg-gray-50">
                <ProductImage
                  src={product.ImageURL}
                  alt={product.ProductName}
                  category={product.CategoryName}
                  apiOnly={true}
                  className="w-full h-64 object-cover group-hover:scale-[1.03] transition duration-500"
                  fallbackText={product.ProductName}
                />

                {product.SalePrice && product.SalePrice < product.RegularPrice && (
                  <span className="absolute top-2 left-2 badge-sale text-xs">
                    -{Math.round(((product.RegularPrice - product.SalePrice) / product.RegularPrice) * 100)}%
                  </span>
                )}
              </div>

              <div className="mt-3 text-xs text-gray-400">{product.CategoryName}</div>
              <h3 className="mt-1 text-base font-semibold text-secondary leading-snug min-h-[44px]">
                <Link to={`/product/${product.ProductID}`} className="hover:text-primary transition">
                  {product.ProductName}
                </Link>
              </h3>

              <div className="flex items-center mt-2">
                <span className="font-bold text-lg text-primary">
                  {formatINR(product.SalePrice || product.RegularPrice)}
                </span>
                {product.SalePrice && product.SalePrice < product.RegularPrice && (
                   <span className="text-sm text-gray-400 line-through ml-2">
                     {formatINR(product.RegularPrice)}
                   </span>
                )}
              </div>

              <div className="flex mt-3 items-center justify-between">
                <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.round(product.Rating || 0)
                        ? "text-yellow-400 fill-current"
                        : "text-gray-300"
                    }`}
                  />
                ))}
                </div>
                <span className="text-xs text-gray-500">{product.ReviewCount || 0} reviews</span>
              </div>
            </div>
          ))}
        </div>
        </div>
      </section>

      {/* TOP RATED */}
      {topRatedProducts.length > 0 && (
        <section className="container mx-auto px-4">
          <div className="flex items-end justify-between gap-6 mb-6">
            <div>
              <h2 className="text-3xl font-bold text-secondary">Top Rated</h2>
              <p className="text-gray-500 mt-2">Products customers love the most.</p>
            </div>
            <Link to="/shop" className="hidden sm:inline-flex items-center text-secondary hover:text-primary transition font-medium">
              Explore <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {topRatedProducts.map((product) => (
              <Link
                key={product.ProductID}
                to={`/product/${product.ProductID}`}
                data-reveal
                data-tilt
                className="reveal-left group rf-card flex gap-5 p-5 shadow-sm transition rf-hover-lift hover:border-primary/60"
              >
                <div className="h-28 w-28 rounded-xl overflow-hidden bg-gray-50 border border-border flex-shrink-0">
                  <ProductImage
                    src={product.ImageURL}
                    alt={product.ProductName}
                    category={product.CategoryName}
                    apiOnly={true}
                    className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                    fallbackText={product.ProductName}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-gray-400 mb-1">{product.CategoryName}</div>
                  <div className="font-semibold text-secondary group-hover:text-primary transition truncate">
                    {product.ProductName}
                  </div>
                  <div className="flex items-center mt-2 gap-3">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.round(product.Rating || 0)
                              ? "text-yellow-400 fill-current"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">({product.ReviewCount || 0})</span>
                  </div>
                  <div className="mt-3 font-bold text-primary">
                    {formatINR(product.SalePrice || product.RegularPrice)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CUSTOMER REVIEWS */}
      <section className="container mx-auto px-4">
        <div data-reveal className="reveal-up rf-card py-10 px-6 md:px-10">
          <div className="flex items-end justify-between gap-6 mb-6">
            <div>
              <h2 className="text-3xl font-bold text-secondary">Customer Reviews</h2>
              <p className="text-gray-500 mt-2">Real feedback from verified purchases.</p>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollReviews("left")}
                className="p-2 rounded-full border border-border bg-white hover:border-primary transition"
                aria-label="Scroll reviews left"
              >
                <ChevronLeft className="h-5 w-5 text-secondary" />
              </button>
              <button
                type="button"
                onClick={() => scrollReviews("right")}
                className="p-2 rounded-full border border-border bg-white hover:border-primary transition"
                aria-label="Scroll reviews right"
              >
                <ChevronRight className="h-5 w-5 text-secondary" />
              </button>
            </div>
          </div>

          {recentReviews.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              No reviews yet. Purchase a product and share your experience.
            </div>
          ) : (
            <div className="relative">
              <div
                ref={reviewContainerRef}
                className="flex gap-4 overflow-x-auto pb-2 scroll-smooth no-scrollbar"
              >
                {recentReviews.map((r) => (
                  <div
                    key={r.ReviewID}
                    data-reveal
                    className="reveal-scale rf-card p-5 min-w-[300px] md:min-w-[360px] flex-shrink-0 border border-border bg-white"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl border border-border overflow-hidden bg-gray-50 flex-shrink-0">
                        <ProductImage
                          src={r.ImageURL}
                          alt={r.ProductName}
                          category={r.CategoryName}
                          apiOnly={true}
                          fallbackSrc="/Living/image1.jpeg"
                          showFallbackBrand={false}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <Link
                          to={`/product/${r.ProductID}`}
                          className="font-semibold text-secondary hover:text-primary transition truncate block"
                        >
                          {r.ProductName}
                        </Link>
                        <div className="text-xs text-gray-500 truncate">{r.CategoryName}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < Math.round(r.Rating || 0)
                                ? "text-yellow-400 fill-current"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="text-[11px] text-primary/80 bg-primary/10 px-2 py-1 rounded-full border border-primary/20">
                        Verified
                      </div>
                    </div>

                    {r.ReviewTitle ? (
                      <div className="mt-3 font-semibold text-secondary line-clamp-1">
                        {r.ReviewTitle}
                      </div>
                    ) : null}
                    <div className="mt-2 text-sm text-gray-600 leading-relaxed line-clamp-4">
                      {r.ReviewBody}
                    </div>
                  </div>
                ))}
              </div>
              <div className="sm:hidden mt-4 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => scrollReviews("left")}
                  className="p-2 rounded-full border border-border bg-white hover:border-primary transition"
                  aria-label="Scroll reviews left"
                >
                  <ChevronLeft className="h-5 w-5 text-secondary" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollReviews("right")}
                  className="p-2 rounded-full border border-border bg-white hover:border-primary transition"
                  aria-label="Scroll reviews right"
                >
                  <ChevronRight className="h-5 w-5 text-secondary" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

    </div>
  );
};

export default Home;
