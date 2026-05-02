import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';

// Context
import { NotificationProvider } from './context/NotificationContext';

// Layouts
import CustomerLayout from './modules/customer/layout/CustomerLayout';

// Pages
import Home from './modules/customer/home/Home';
import ProductListing from './modules/customer/products/ProductListing';
import ProductDetails from './modules/customer/products/ProductDetails';
import Cart from './modules/customer/cart/CartPage';
import Wishlist from './modules/customer/wishlist/Wishlist';
import Checkout from './modules/customer/checkout/Checkout';
import OrderSuccess from './modules/customer/checkout/OrderSuccess';
import Auth from './modules/customer/auth/Auth';
import Profile from './modules/customer/profile/Profile';
import About from './modules/customer/about/About';
import ScrollToTop from './components/ScrollToTop';
import Contact from './modules/customer/contact/Contact';
import GlobalLoader from './components/GlobalLoader';
import OrderTracking from './modules/customer/orders/OrderTracking';
import FAQ from './modules/customer/faq/FAQ';
import Returns from './modules/customer/returns/Returns';
import Privacy from './modules/customer/policy/Privacy';
import Terms from './modules/customer/policy/Terms';
import RevealObserver from './components/RevealObserver';
import InteractiveFX from './components/InteractiveFX';
import AdminLogin from './modules/admin/auth/AdminLogin';
import AdminDashboard from './modules/admin/dashboard/AdminDashboard';
import AdminLayout from './modules/admin/layout/AdminLayout';
import AdminProductsList from './modules/admin/catalog/AdminProductsList';
import AdminProductNew from './modules/admin/catalog/AdminProductNew';
import AdminCategories from './modules/admin/catalog/AdminCategories';
import AdminOrders from './modules/admin/orders/AdminOrders';
import AdminReturns from './modules/admin/orders/AdminReturns';
import AdminReviews from './modules/admin/marketing/AdminReviews';
import AdminNewsletter from './modules/admin/marketing/AdminNewsletter';
import AdminOrderDetails from './modules/admin/orders/AdminOrderDetails';
import AdminReturnDetails from './modules/admin/orders/AdminReturnDetails';
import AdminReviewDetails from './modules/admin/marketing/AdminReviewDetails';
import AdminProfile from './modules/admin/profile/AdminProfile';

export const ThemeSync = () => {
  useEffect(() => {
    const root = document.documentElement;

    const apply = (value) => {
      const v = String(value || '').toLowerCase();
      if (v === 'dark') root.classList.add('dark');
      else root.classList.remove('dark');
    };

    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') {
      apply(stored);
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const next = prefersDark ? 'dark' : 'light';
      localStorage.setItem('theme', next);
      apply(next);
    }

    const onThemeUpdated = () => apply(localStorage.getItem('theme'));
    const onStorage = (e) => {
      if (e.key === 'theme') apply(e.newValue);
    };

    window.addEventListener('themeUpdated', onThemeUpdated);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('themeUpdated', onThemeUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return null;
};

createRoot(document.getElementById('root')).render(
    <BrowserRouter>
      <NotificationProvider>
        <ThemeSync />
        <ScrollToTop />
        <GlobalLoader />
        <RevealObserver />
        <InteractiveFX />
        <Routes>
          {/* Customer Routes */}
          <Route path="/" element={<CustomerLayout />}>
            <Route index element={<Home />} />
            <Route path="shop" element={<ProductListing />} />
            <Route path="category/:slug" element={<ProductListing />} />
            <Route path="product/:id" element={<ProductDetails />} />
            <Route path="cart" element={<Cart />} />
            <Route path="wishlist" element={<Wishlist />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="order-success" element={<OrderSuccess />} />
            <Route path="auth" element={<Auth />} />
            <Route path="profile" element={<Profile />} />
            <Route path="order/:id/track" element={<OrderTracking />} />
            <Route path="tracking" element={<OrderTracking />} />
            <Route path="faq" element={<FAQ />} />
            <Route path="returns" element={<Returns />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="terms" element={<Terms />} />
            
            {/* Static Pages Placeholders */}
            <Route path="contact" element={<Contact />} />
            <Route path="about" element={<About />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="profile" element={<AdminProfile />} />
            <Route path="catalog/products" element={<AdminProductsList />} />
            <Route path="catalog/products/:id" element={<AdminProductNew />} />
            <Route path="catalog/products/new" element={<AdminProductNew />} />
            <Route path="catalog/categories" element={<AdminCategories />} />
            {/* More admin routes will be nested here */}
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:id" element={<AdminOrderDetails />} />
            <Route path="returns" element={<AdminReturns />} />
            <Route path="returns/:id" element={<AdminReturnDetails />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="reviews/:id" element={<AdminReviewDetails />} />
            <Route path="newsletter" element={<AdminNewsletter />} />
          </Route>
        </Routes>
      </NotificationProvider>
    </BrowserRouter>
);
