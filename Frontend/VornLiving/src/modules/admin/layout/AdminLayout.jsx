import React from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import api from '../../../services/api';
import Toast from '../../../components/Toast';
import { User, ChevronDown } from 'lucide-react';

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = typeof window !== 'undefined' ? localStorage.getItem('adminEmail') : null;

  React.useEffect(() => {
    if (!token) navigate('/admin/login');
  }, [token, navigate]);

  const logout = async () => {
    try {
      await api.post('/admin/auth/logout', {});
    } catch (e) {
      console.error('Logout failed', e);
    }
    localStorage.removeItem('adminEmail');
    navigate('/admin/login');
  };

  const linkClass = (active) =>
    `px-3 py-2 rf-nav-pill rf-focus-ring ${active ? 'bg-primary text-secondary shadow-[0_10px_22px_rgba(191,164,135,0.22)]' : 'bg-white/0 hover:bg-white/10 text-white'}`;
  const [openMenu, setOpenMenu] = React.useState(false);
  const [openCatalog, setOpenCatalog] = React.useState(false);
  const [openOrders, setOpenOrders] = React.useState(false);
  const [openMarketing, setOpenMarketing] = React.useState(false);
  const isActive = (paths) => paths.some(p => location.pathname.startsWith(p));
  const openExclusive = (menu, value) => {
    setOpenCatalog(menu === 'catalog' ? value : false);
    setOpenOrders(menu === 'orders' ? value : false);
    setOpenMarketing(menu === 'marketing' ? value : false);
  };

  return (
    <div className="min-h-screen rf-page text-secondary">
      <Toast />
      <header className="fixed top-0 left-0 right-0 z-50 rf-header bg-black/35 backdrop-blur-2xl border-b border-white/10 shadow-[0_10px_24px_rgba(0,0,0,0.22)] text-white transition-transform duration-300">
        <div className="container mx-auto grid grid-cols-12 items-center gap-4 py-2 px-4">
          <div className="col-span-12 md:col-span-3 flex items-center gap-2">
            <Link to="/admin/dashboard" className="flex items-center">
              <img
                src={encodeURI('/logo/VORN LIVING FINAL LOGO-APR 6.png')}
                alt="Vorn Living"
                className="h-20 md:h-24 w-auto max-w-[300px] object-contain -my-2"
                loading="eager"
                decoding="async"
              />
            </Link>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-primary text-secondary">Admin</span>
          </div>
          <nav className="col-span-12 md:col-span-7 flex flex-wrap items-center gap-3">
            <Link to="/admin/dashboard" className={linkClass(isActive(['/admin/dashboard']))}>Dashboard</Link>
            <div className="relative">
              <button
                className={linkClass(isActive(['/admin/catalog'])) + ' flex items-center gap-1'}
                onClick={() => openExclusive('catalog', !openCatalog)}
              >
                Catalog <ChevronDown className="h-4 w-4" />
              </button>
              {openCatalog && (
                <div
                  className="absolute left-0 mt-3 w-64 bg-black/45 backdrop-blur-2xl text-white shadow-xl rounded-xl overflow-hidden z-50 border border-white/10 rf-soft-pop"
                >
                  <Link to="/admin/catalog/products" onClick={() => openExclusive('catalog', false)} className="block px-4 py-2.5 text-white/90 hover:bg-white/10 hover:text-white transition">Products</Link>
                  <Link to="/admin/catalog/products/new" onClick={() => openExclusive('catalog', false)} className="block px-4 py-2.5 text-white/90 hover:bg-white/10 hover:text-white transition">New Product</Link>
                  <Link to="/admin/catalog/categories" onClick={() => openExclusive('catalog', false)} className="block px-4 py-2.5 text-white/90 hover:bg-white/10 hover:text-white transition">Categories</Link>
                </div>
              )}
            </div>
            <div className="relative">
              <button
                className={linkClass(isActive(['/admin/orders', '/admin/returns'])) + ' flex items-center gap-1'}
                onClick={() => openExclusive('orders', !openOrders)}
              >
                Orders <ChevronDown className="h-4 w-4" />
              </button>
              {openOrders && (
                <div
                  className="absolute left-0 mt-3 w-64 bg-black/45 backdrop-blur-2xl text-white shadow-xl rounded-xl overflow-hidden z-50 border border-white/10 rf-soft-pop"
                >
                  <Link to="/admin/orders" onClick={() => openExclusive('orders', false)} className="block px-4 py-2.5 text-white/90 hover:bg-white/10 hover:text-white transition">Manage Orders</Link>
                  <Link to="/admin/returns" onClick={() => openExclusive('orders', false)} className="block px-4 py-2.5 text-white/90 hover:bg-white/10 hover:text-white transition">Returns</Link>
                </div>
              )}
            </div>
            <div className="relative">
              <button
                className={linkClass(isActive(['/admin/reviews', '/admin/newsletter'])) + ' flex items-center gap-1'}
                onClick={() => openExclusive('marketing', !openMarketing)}
              >
                Marketing <ChevronDown className="h-4 w-4" />
              </button>
              {openMarketing && (
                <div
                  className="absolute left-0 mt-3 w-64 bg-black/45 backdrop-blur-2xl text-white shadow-xl rounded-xl overflow-hidden z-50 border border-white/10 rf-soft-pop"
                >
                  <Link to="/admin/reviews" onClick={() => openExclusive('marketing', false)} className="block px-4 py-2.5 text-white/90 hover:bg-white/10 hover:text-white transition">Reviews</Link>
                  <Link to="/admin/newsletter" onClick={() => openExclusive('marketing', false)} className="block px-4 py-2.5 text-white/90 hover:bg-white/10 hover:text-white transition">Newsletter</Link>
                </div>
              )}
            </div>
            {/* Settings tab removed per request */}
          </nav>
          <div className="col-span-12 md:col-span-2 flex items-center justify-end gap-3 relative">
            <button
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 hover:border-white/30 transition"
              onClick={() => setOpenMenu(v => !v)}
            >
              <User className="h-5 w-5 text-white" />
              <span className="text-sm truncate max-w-[180px]">{localStorage.getItem('adminEmail') || 'Admin'}</span>
            </button>
            {openMenu && (
              <div className="absolute right-0 mt-3 w-64 bg-black/45 backdrop-blur-2xl text-white shadow-xl rounded-xl overflow-hidden z-50 border border-white/10 rf-soft-pop">
                <Link to="/admin/profile" className="block px-4 py-2.5 text-white/90 hover:bg-white/10 hover:text-white transition">Profile</Link>
                <button onClick={logout} className="w-full text-left px-4 py-2.5 text-white/90 hover:bg-white/10 hover:text-white transition">Logout</button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="container mx-auto pt-40 md:pt-32 p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
