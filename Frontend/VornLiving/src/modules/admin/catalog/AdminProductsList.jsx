import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminListProducts, adminDeleteProduct, getCategories } from '../../../services/api';
import { Pencil, Trash2, Filter as FilterIcon, X, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import SelectDrop from '../../../components/SelectDrop';
import { formatINR } from '../../../utils/formatINR';
import PaginationBar from '../../../components/PaginationBar';
import SearchField from '../../../components/SearchField';

const AdminProductsList = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({ products: [], totalCount: 0, page: 1, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const defaultFilters = React.useMemo(() => ({
    search: '',
    category: '',
    sort: 'name',
    minPrice: '',
    maxPrice: '',
    rating: ''
  }), []);

  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  const [draftFilters, setDraftFilters] = useState(defaultFilters);
  const [categories, setCategories] = useState([]);
  const [showFilter, setShowFilter] = useState(false);
  const [sortState, setSortState] = useState({ column: 'name', direction: 'asc' });
  const [confirm, setConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const cats = await getCategories();
        setCategories(cats || []);
      } catch (e) {
        console.error('Failed to load filters', e);
      }
    };
    loadMeta();
  }, []);

  const loadProducts = React.useCallback(async ({ nextPage, nextFilters } = {}) => {
    const parsed = typeof nextPage === 'number' ? nextPage : parseInt(String(nextPage ?? ''), 10);
    const effectivePage = Number.isFinite(parsed) ? parsed : 1;
    const effectiveFilters = nextFilters || appliedFilters;
    setLoading(true);
    setMessage('');
    try {
      const res = await adminListProducts({
        page: effectivePage,
        limit,
        search: effectiveFilters.search,
        category: effectiveFilters.category,
        sort: effectiveFilters.sort,
        minPrice: effectiveFilters.minPrice,
        maxPrice: effectiveFilters.maxPrice,
        rating: effectiveFilters.rating
      });
      const products = Array.isArray(res)
        ? res
        : (res.products || res.items || []);
      const totalCount = Array.isArray(res)
        ? res.length
        : (res.totalCount ?? res.TotalCount ?? products.length);
      setData({
        ...(Array.isArray(res) ? {} : res),
        products,
        totalCount,
        page: Array.isArray(res) ? effectivePage : (res.page ?? effectivePage),
        limit: Array.isArray(res) ? limit : (res.limit ?? limit)
      });
    } catch (e) {
      setMessage(e.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, limit]);

  const clearFilters = () => {
    setDraftFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setPage(1);
  };

  useEffect(() => {
    loadProducts({ nextPage: page });
  }, [loadProducts, page, limit]);

  const toggleColumnSort = (col) => {
    setSortState((prev) => {
      if (prev.column !== col) return { column: col, direction: 'asc' };
      return { column: col, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  const sortedProducts = React.useMemo(() => {
    const arr = [...(data.products || [])];
    const dir = sortState.direction === 'desc' ? -1 : 1;
    switch (sortState.column) {
      case 'id':
        arr.sort((a, b) => (a.ProductID - b.ProductID) * dir);
        break;
      case 'name':
        arr.sort((a, b) => String(a.ProductName).localeCompare(String(b.ProductName)) * dir);
        break;
      case 'price':
        arr.sort((a, b) => ((a.EffectivePrice ?? a.SalePrice ?? a.RegularPrice) - (b.EffectivePrice ?? b.SalePrice ?? b.RegularPrice)) * dir);
        break;
      case 'stock':
        arr.sort((a, b) => ((a.StockQuantity ?? 0) - (b.StockQuantity ?? 0)) * dir);
        break;
      case 'rating':
        arr.sort((a, b) => ((a.Rating ?? 0) - (b.Rating ?? 0)) * dir);
        break;
      case 'reviews':
        arr.sort((a, b) => ((a.ReviewCount ?? 0) - (b.ReviewCount ?? 0)) * dir);
        break;
      default:
        break;
    }
    return arr;
  }, [data.products, sortState]);

  return (
    <div className="space-y-4 rf-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Products</h1>
      </div>
      {message && <div className="text-primary">{message}</div>}
      {/* Delete Confirm Popup */}
      {confirm && !loading && !deleting && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40">
          <div className="rf-card w-full max-w-md p-6 shadow-xl">
            <h3 className="text-lg font-bold text-secondary mb-2">Delete Product</h3>
            <p className="text-sm text-gray-600">Are you sure you want to delete “{confirm.name}” (ID #{confirm.id})? This action will remove the product and all related data including cart items and order items referencing it.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button className="border border-border px-4 py-2 rounded-xl bg-white hover:bg-gray-50 transition" onClick={() => setConfirm(null)}>Cancel</button>
              <button
                className="rf-btn-secondary px-4 py-2 transition"
                onClick={async () => {
                  setDeleting(true);
                  const targetId = confirm.id;
                  setConfirm(null);
                  try {
                    await adminDeleteProduct(targetId);
                    window.dispatchEvent(new CustomEvent('toast:show', { detail: { type: 'success', message: 'Product deleted' } }));
                    await loadProducts({ nextPage: page });
                  } catch (e) {
                    window.dispatchEvent(new CustomEvent('toast:show', { detail: { type: 'error', message: e.response?.data?.message || 'Failed to delete' } }));
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Controls */}
      <div className="relative">
        <div className="flex flex-wrap items-center gap-3 justify-end">
          <div>
            <SearchField
              value={draftFilters.search}
              onChange={(e) => setDraftFilters({ ...draftFilters, search: e.target.value })}
              placeholder="Search by name or SKU"
              onSearch={() => {
                setAppliedFilters(draftFilters);
                setPage(1);
              }}
              inputWidthClassName="w-64"
            />
          </div>
          <div className="relative">
            <button
              className="flex items-center gap-2 border border-border rounded-xl px-3 py-2 bg-white hover:bg-gray-50 transition"
              onClick={() => {
                setShowFilter((v) => {
                  const next = !v;
                  if (next) setDraftFilters(appliedFilters);
                  return next;
                });
              }}
            >
              <FilterIcon className="h-5 w-5" />
              <span>Filter</span>
            </button>
            {showFilter && (
              <div className="absolute right-0 mt-2 top-full rf-card shadow-xl p-4 z-50 w-[320px] md:w-[480px] rf-soft-pop">
                <button className="absolute right-3 top-3 text-secondary hover:text-primary" onClick={() => setShowFilter(false)}>
                  <X className="h-5 w-5" />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <SelectDrop
                      value={draftFilters.category}
                      onChange={(val) => setDraftFilters({ ...draftFilters, category: val })}
                      options={(categories || []).map(c => ({ value: c.CategorySlug, label: c.CategoryName }))}
                      scroll={true}
                      placeholder="All"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Min Price</label>
                    <input
                      type="number"
                      value={draftFilters.minPrice}
                      onChange={(e) => setDraftFilters({ ...draftFilters, minPrice: e.target.value })}
                      className="rf-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Price</label>
                    <input
                      type="number"
                      value={draftFilters.maxPrice}
                      onChange={(e) => setDraftFilters({ ...draftFilters, maxPrice: e.target.value })}
                      className="rf-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Rating</label>
                    <SelectDrop
                      value={draftFilters.rating}
                      onChange={(val) => setDraftFilters({ ...draftFilters, rating: val })}
                      options={[
                        { value: '5', label: '5 ★' },
                        { value: '4', label: '4 ★' },
                        { value: '3', label: '3 ★' },
                        { value: '2', label: '2 ★' },
                        { value: '1', label: '1 ★' }
                      ]}
                      placeholder="All"
                    />
                  </div>
                </div>
                <div className="mt-3 flex gap-2 justify-end">
                  <button
                    className="rf-btn-primary px-4 py-2 transition"
                    onClick={() => {
                      setAppliedFilters(draftFilters);
                      setPage(1);
                      setShowFilter(false);
                    }}
                  >
                    Apply
                  </button>
                  <button
                    className="border border-border px-4 py-2 rounded-xl bg-white hover:bg-gray-50 transition"
                    onClick={() => {
                      clearFilters();
                      setShowFilter(false);
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
          <Link to="/admin/catalog/products/new" className="rf-btn-primary px-4 py-2 transition">Add Product</Link>
        </div>
      </div>
      <div className="rf-card p-0 overflow-x-auto shadow-xl">
        {loading ? (
          <div className="p-4 text-gray-500">Loading...</div>
        ) : (
          <table className="min-w-full">
            <thead>
              <tr className="text-left bg-white">
                <th className="px-4 py-3 border-b">
                  <div className="flex items-center gap-2">
                    <span>ID</span>
                    <button onClick={() => toggleColumnSort('id')}>
                      <ChevronUp className={`h-4 w-4 transition ${sortState.column === 'id' ? (sortState.direction === 'desc' ? 'rotate-180' : 'rotate-0') : 'opacity-50 rotate-0'}`} />
                    </button>
                  </div>
                </th>
                <th className="px-4 py-3 border-b">
                  <div className="flex items-center gap-2">
                    <span>Name</span>
                    <button onClick={() => toggleColumnSort('name')}>
                      <ChevronUp className={`h-4 w-4 transition ${sortState.column === 'name' ? (sortState.direction === 'desc' ? 'rotate-180' : 'rotate-0') : 'opacity-50 rotate-0'}`} />
                    </button>
                  </div>
                </th>
                <th className="px-4 py-3 border-b">Category</th>
                <th className="px-4 py-3 border-b">
                  <div className="flex items-center gap-2">
                    <span>Price</span>
                    <button onClick={() => toggleColumnSort('price')}>
                      <ChevronUp className={`h-4 w-4 transition ${sortState.column === 'price' ? (sortState.direction === 'desc' ? 'rotate-180' : 'rotate-0') : 'opacity-50 rotate-0'}`} />
                    </button>
                  </div>
                </th>
                <th className="px-4 py-3 border-b">
                  <div className="flex items-center gap-2">
                    <span>Stock</span>
                    <button onClick={() => toggleColumnSort('stock')}>
                      <ChevronUp className={`h-4 w-4 transition ${sortState.column === 'stock' ? (sortState.direction === 'desc' ? 'rotate-180' : 'rotate-0') : 'opacity-50 rotate-0'}`} />
                    </button>
                  </div>
                </th>
                <th className="px-4 py-3 border-b">
                  <div className="flex items-center gap-2">
                    <span>Rating</span>
                    <button onClick={() => toggleColumnSort('rating')}>
                      <ChevronUp className={`h-4 w-4 transition ${sortState.column === 'rating' ? (sortState.direction === 'desc' ? 'rotate-180' : 'rotate-0') : 'opacity-50 rotate-0'}`} />
                    </button>
                  </div>
                </th>
                <th className="px-4 py-3 border-b">
                  <div className="flex items-center gap-2">
                    <span>Reviews</span>
                    <button onClick={() => toggleColumnSort('reviews')}>
                      <ChevronUp className={`h-4 w-4 transition ${sortState.column === 'reviews' ? (sortState.direction === 'desc' ? 'rotate-180' : 'rotate-0') : 'opacity-50 rotate-0'}`} />
                    </button>
                  </div>
                </th>
                <th className="px-4 py-3 border-b">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {sortedProducts.map(p => (
                <tr
                  key={p.ProductID}
                  className="hover:bg-primary/10 cursor-pointer"
                  onClick={() => setSelected(p)}
                >
                  <td className="px-4 py-3 border-b">{p.ProductID}</td>
                  <td className="px-4 py-3 border-b">
                    <div className="font-semibold">{p.ProductName}</div>
                    <div className="text-xs text-gray-600">{p.ProductSlug}</div>
                  </td>
                  <td className="px-4 py-3 border-b">{p.CategoryName || '-'}</td>
                  <td className="px-4 py-3 border-b">
                    {(p.EffectivePrice ?? p.SalePrice ?? p.RegularPrice) != null
                      ? formatINR(p.EffectivePrice ?? p.SalePrice ?? p.RegularPrice)
                      : '-'}
                  </td>
                  <td className="px-4 py-3 border-b">{p.StockQuantity ?? '-'}</td>
                  <td className="px-4 py-3 border-b">{(p.Rating ?? 0).toFixed ? (p.Rating || 0).toFixed(1) : p.Rating || 0}</td>
                  <td className="px-4 py-3 border-b">{p.ReviewCount ?? 0}</td>
                  <td className="px-4 py-3 border-b">
                    <div className="flex items-center gap-2">
                      <button
                        className="p-2 rounded-xl border border-border hover:border-primary transition"
                        onClick={(e) => { e.stopPropagation(); navigate(`/admin/catalog/products/${p.ProductID}`); }}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2 rounded-xl border border-border text-secondary hover:border-primary transition"
                        onClick={(e) => { e.stopPropagation(); setConfirm({ id: p.ProductID, name: p.ProductName }); }}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && (
          <div className="px-4 pb-4">
            <PaginationBar
              page={page}
              pageSize={limit}
              totalCount={data.totalCount || 0}
              onPageChange={(next) => setPage(next)}
            />
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rf-card w-full max-w-2xl p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-lg font-bold text-secondary truncate">{selected.ProductName}</div>
                <div className="text-xs text-gray-600 mt-1">#{selected.ProductID} • {selected.ProductSlug}</div>
              </div>
              <button className="p-2 rounded-xl border border-border hover:border-primary transition" onClick={() => setSelected(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="rf-card p-4">
                <div className="text-xs text-gray-500">Category</div>
                <div className="font-semibold text-secondary">{selected.CategoryName || '-'}</div>
              </div>
              <div className="rf-card p-4">
                <div className="text-xs text-gray-500">Price</div>
                <div className="font-semibold text-primary">
                  {(selected.EffectivePrice ?? selected.SalePrice ?? selected.RegularPrice) != null
                    ? formatINR(selected.EffectivePrice ?? selected.SalePrice ?? selected.RegularPrice)
                    : '-'}
                </div>
                <div className="mt-3 text-xs text-gray-500">Stock</div>
                <div className="font-semibold text-secondary">{selected.StockQuantity ?? '-'}</div>
                <div className="mt-3 text-xs text-gray-500">Rating / Reviews</div>
                <div className="font-semibold text-secondary">
                  {(selected.Rating ?? 0).toFixed ? (selected.Rating || 0).toFixed(1) : selected.Rating || 0} • {selected.ReviewCount ?? 0}
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button className="border border-border px-4 py-2 rounded-xl bg-white hover:bg-gray-50 transition" onClick={() => setSelected(null)}>
                Close
              </button>
              <button className="rf-btn-primary px-4 py-2 transition" onClick={() => navigate(`/admin/catalog/products/${selected.ProductID}`)}>
                Edit Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProductsList;
