import React from 'react';
import { adminGetOrder, adminListOrders, adminUpdateOrderStatus } from '../../../services/api';
import { Eye, X, Filter as FilterIcon, Pencil, Trash2 } from 'lucide-react';
import { formatINR } from '../../../utils/formatINR';
import PaginationBar from '../../../components/PaginationBar';
import Modal from '../../../components/Modal';
import Popover from '../../../components/Popover';
import ProductImage from '../../../components/ProductImage';
import SearchField from '../../../components/SearchField';

const AdminOrders = () => {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [message, setMessage] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [sort, setSort] = React.useState('oldest');
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(10);
  const [totalCount, setTotalCount] = React.useState(0);
  const [showFilter, setShowFilter] = React.useState(false);
  const [tmpStatus, setTmpStatus] = React.useState('');
  const [tmpDateFrom, setTmpDateFrom] = React.useState('');
  const [tmpDateTo, setTmpDateTo] = React.useState('');
  const [tmpSort, setTmpSort] = React.useState('oldest');
  const filterBtnRef = React.useRef(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detail, setDetail] = React.useState(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editRow, setEditRow] = React.useState(null);
  const [editForm, setEditForm] = React.useState({ OrderNumber: '', UserEmail: '', TotalAmount: '', Status: 'Pending' });
  const [deleteConfirm, setDeleteConfirm] = React.useState(null);
  const load = async (opts = {}) => {
    const p = opts.page ?? page;
    const s = opts.search ?? search;
    const st = opts.status ?? status;
    const df = opts.dateFrom ?? dateFrom;
    const dt = opts.dateTo ?? dateTo;
    const so = opts.sort ?? sort;
    setLoading(true);
    try {
      const data = await adminListOrders({ page: p, limit, search: s, status: st || undefined, dateFrom: df || undefined, dateTo: dt || undefined, sort: so });
      const arr = Array.isArray(data) ? data : (data.orders || []);
      setItems(arr);
      setTotalCount(data.totalCount ?? arr.length);
    } catch (e) {
      void e;
      setMessage('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };
  React.useEffect(() => { load(); }, []);
  React.useEffect(() => { (async () => { await load(); })(); }, [page, sort]);
  const openDetail = async (id) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const data = await adminGetOrder(id);
      setDetail(data);
    } catch (e) {
      void e;
      setDetail(null);
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { type: 'error', message: 'Failed to load order' } }));
    } finally {
      setDetailLoading(false);
    }
  };
  const statusOptions = ['Pending','Processing','Packed','Shipped','OutForDelivery','Delivered','Cancelled'];

  const statusBadgeClass = (s) => {
    const v = String(s || '').toLowerCase();
    if (v === 'requested') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (v === 'approved') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (v === 'rejected') return 'bg-red-100 text-red-800 border-red-200';
    if (v === 'completed') return 'bg-green-100 text-green-800 border-green-200';
    if (v === 'pending') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (v === 'processing') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (v === 'packed') return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    if (v === 'shipped' || v === 'outfordelivery') return 'bg-sky-100 text-sky-800 border-sky-200';
    if (v === 'delivered') return 'bg-green-100 text-green-800 border-green-200';
    if (v === 'cancelled') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const openEdit = (row) => {
    setEditRow(row);
    setEditForm({
      OrderNumber: row.OrderNumber || '',
      UserEmail: row.UserEmail || 'Guest',
      TotalAmount: row.TotalAmount ?? '',
      Status: row.OrderStatus || 'Pending'
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editRow) return;
    const prev = editRow;
    const nextStatus = editForm.Status || prev.OrderStatus;
    const prevStatus = prev.OrderStatus;

    setItems((cur) => cur.map((x) => (x.OrderID === prev.OrderID ? { ...x, OrderStatus: nextStatus } : x)));
    setEditOpen(false);
    setEditRow(null);

    if (nextStatus === prevStatus) return;
    try {
      await adminUpdateOrderStatus(prev.OrderID, { status: nextStatus, remarks: null });
    } catch (e) {
      setItems((cur) => cur.map((x) => (x.OrderID === prev.OrderID ? prev : x)));
      const msg = e?.response?.data?.message || 'Update failed';
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { type: 'error', message: msg } }));
    }
  };

  const confirmDelete = (row) => setDeleteConfirm(row);
  const doDelete = () => {
    if (!deleteConfirm) return;
    const id = deleteConfirm.OrderID;
    setItems((cur) => cur.filter((x) => x.OrderID !== id));
    setTotalCount((c) => Math.max(0, (c || 0) - 1));
    setDeleteConfirm(null);
  };
  return (
    <div className="space-y-4 rf-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage Orders</h1>
      </div>
      {message && <div className="text-primary">{message}</div>}
      <div className="rf-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <SearchField
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order no or email…"
              onSearch={async () => {
                setPage(1);
                await load({ page: 1 });
              }}
              inputWidthClassName="w-64"
            />
          </div>
          <div className="flex items-center">
            <button
              className="inline-flex items-center gap-2 border border-border rounded-xl px-3 py-2 bg-white hover:border-primary transition"
              onClick={() => {
                setTmpStatus(status || '');
                setTmpDateFrom(dateFrom || '');
                setTmpDateTo(dateTo || '');
                setTmpSort(sort || 'oldest');
                setShowFilter(v => !v);
              }}
              title="Filter"
              ref={filterBtnRef}
            >
              <FilterIcon className="h-4 w-4" /> Filter
            </button>
          </div>
        </div>
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-600">
                <th className="px-4 py-3 border-b border-border">Order #</th>
                <th className="px-4 py-3 border-b border-border">Customer</th>
                <th className="px-4 py-3 border-b border-border">Total</th>
                <th className="px-4 py-3 border-b border-border">Status</th>
                <th className="px-4 py-3 border-b border-border">Created</th>
                <th className="px-4 py-3 border-b border-border w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(o => (
                <tr key={o.OrderID} className="border-b border-border hover:bg-primary/10 cursor-pointer" onClick={() => openDetail(o.OrderID)}>
                  <td className="px-4 py-3 font-semibold text-secondary">{o.OrderNumber}</td>
                  <td className="px-4 py-3">{o.UserEmail || 'Guest'}</td>
                  <td className="px-4 py-3">{formatINR(o.TotalAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${statusBadgeClass(o.OrderStatus)}`}>
                      {o.OrderStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">{o.CreatedAt ? String(o.CreatedAt).slice(0, 19).replace('T',' ') : ''}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="inline-flex p-2 rounded-xl border border-border hover:border-primary transition"
                        onClick={(e) => { e.stopPropagation(); openDetail(o.OrderID); }}
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex p-2 rounded-xl border border-border hover:border-primary transition"
                        onClick={(e) => { e.stopPropagation(); openEdit(o); }}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex p-2 rounded-xl border border-border hover:border-primary transition"
                        onClick={(e) => { e.stopPropagation(); confirmDelete(o); }}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">No orders found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      {!loading && (
        <PaginationBar
          page={page}
          pageSize={limit}
          totalCount={totalCount || 0}
          onPageChange={(next) => setPage(next)}
        />
      )}
      <Popover open={showFilter} anchorRef={filterBtnRef} onClose={() => setShowFilter(false)} width={520}>
        <div className="relative">
          <button className="absolute right-2 top-2 text-secondary hover:text-primary" onClick={() => setShowFilter(false)}>
            <X className="h-4 w-4" />
          </button>
          <div className="text-lg font-bold text-secondary mb-3">Filter Orders</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-secondary">Status</div>
              <select className="rf-input w-full" value={tmpStatus} onChange={(e) => setTmpStatus(e.target.value)}>
                <option value="">All Status</option>
                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-secondary">Sort</div>
              <select className="rf-input w-full" value={tmpSort} onChange={(e) => setTmpSort(e.target.value)}>
                <option value="oldest">Oldest</option>
                <option value="newest">Newest</option>
                <option value="amount-desc">Amount High→Low</option>
                <option value="amount-asc">Amount Low→High</option>
              </select>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-secondary">From</div>
              <input type="date" className="rf-input w-full" value={tmpDateFrom} onChange={(e) => setTmpDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-secondary">To</div>
              <input type="date" className="rf-input w-full" value={tmpDateTo} onChange={(e) => setTmpDateTo(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button className="border border-border px-4 py-2 rounded-xl bg-white hover:bg-gray-50 transition" onClick={() => setShowFilter(false)}>Cancel</button>
            <button
              className="rf-btn-primary px-4 py-2 transition"
              onClick={async () => {
                setStatus(tmpStatus || '');
                setSort(tmpSort || 'oldest');
                setDateFrom(tmpDateFrom || '');
                setDateTo(tmpDateTo || '');
                setPage(1);
                setShowFilter(false);
                await load({ page: 1, status: tmpStatus || '', sort: tmpSort || 'oldest', dateFrom: tmpDateFrom || '', dateTo: tmpDateTo || '' });
              }}
            >
              Apply
            </button>
          </div>
        </div>
      </Popover>

      <Modal
        open={detailOpen}
        title={detail?.order?.OrderNumber ? `Order ${detail.order.OrderNumber}` : 'Order Details'}
        onClose={() => { setDetailOpen(false); setDetail(null); }}
        maxWidthClassName="max-w-5xl"
      >
        {detailLoading ? (
          <div className="py-10 text-center text-secondary/70">Loading…</div>
        ) : detail?.order ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="rf-card p-4">
                <div className="text-xs text-secondary/70">Customer</div>
                <div className="font-semibold text-secondary mt-1">{detail.order.UserEmail || 'Guest'}</div>
                <div className="mt-3 text-xs text-secondary/70">Created</div>
                <div className="font-semibold text-secondary mt-1">{detail.order.CreatedAt ? String(detail.order.CreatedAt).slice(0, 19).replace('T', ' ') : '-'}</div>
              </div>
              <div className="rf-card p-4">
                <div className="text-xs text-secondary/70">Status</div>
                <div className="font-semibold text-secondary mt-1">{detail.order.OrderStatus}</div>
                <div className="mt-3 text-xs text-secondary/70">Shipping Status</div>
                <div className="font-semibold text-secondary mt-1">{detail.shipping?.ShippingStatus || '-'}</div>
              </div>
              <div className="rf-card p-4">
                <div className="text-xs text-secondary/70">Total</div>
                <div className="font-semibold text-primary mt-1">{formatINR(detail.order.TotalAmount)}</div>
                <div className="mt-3 text-xs text-secondary/70">SubTotal / Shipping</div>
                <div className="font-semibold text-secondary mt-1">{formatINR(detail.order.SubTotal)} • {formatINR(detail.order.ShippingAmount)}</div>
              </div>
            </div>

            <div className="rf-card p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="font-bold text-secondary">Items</div>
                <div className="text-sm text-secondary/70">{(detail.items || []).length} item(s)</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-secondary/70">
                      <th className="px-4 py-3 border-b border-border">Product</th>
                      <th className="px-4 py-3 border-b border-border">Variant</th>
                      <th className="px-4 py-3 border-b border-border">Qty</th>
                      <th className="px-4 py-3 border-b border-border">Unit</th>
                      <th className="px-4 py-3 border-b border-border">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.items || []).map(it => (
                      <tr key={it.OrderItemID} className="border-b border-border">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-xl border border-border overflow-hidden bg-gray-50 flex-shrink-0">
                              <ProductImage
                                src={it.ImageURL}
                                alt={it.ProductName}
                                category={it.CategoryName}
                                apiOnly={true}
                                showFallbackBrand={false}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div className="font-semibold text-secondary min-w-0 truncate">{it.ProductName}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{it.VariantName || '-'}</td>
                        <td className="px-4 py-3">{it.Quantity}</td>
                        <td className="px-4 py-3">{formatINR(it.UnitPrice)}</td>
                        <td className="px-4 py-3">{formatINR(it.TotalPrice)}</td>
                      </tr>
                    ))}
                    {(detail.items || []).length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-secondary/70">No items.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-secondary/70">No details.</div>
        )}
      </Modal>

      <Modal
        open={editOpen}
        title={editRow?.OrderNumber ? `Edit Order ${editRow.OrderNumber}` : 'Edit Order'}
        onClose={() => { setEditOpen(false); setEditRow(null); }}
        maxWidthClassName="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-secondary">Order #</div>
              <input className="rf-input w-full" value={editForm.OrderNumber} readOnly />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-secondary">User</div>
              <input className="rf-input w-full" value={editForm.UserEmail} readOnly />
            </div>
            <div className="space-y-1 md:col-span-2">
              <div className="text-sm font-semibold text-secondary">Status</div>
              <select className="rf-input w-full" value={editForm.Status} onChange={(e) => setEditForm((f) => ({ ...f, Status: e.target.value }))}>
                {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button className="border border-border px-4 py-2 rounded-xl bg-white hover:bg-gray-50 transition" onClick={() => { setEditOpen(false); setEditRow(null); }}>Cancel</button>
            <button className="rf-btn-primary px-4 py-2 transition" onClick={saveEdit}>Save</button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleteConfirm}
        title="Delete Record"
        onClose={() => setDeleteConfirm(null)}
        maxWidthClassName="max-w-md"
      >
        <div className="space-y-4">
          <div className="text-secondary">Are you sure you want to delete this record?</div>
          <div className="flex justify-end gap-2">
            <button className="border border-border px-4 py-2 rounded-xl bg-white hover:bg-gray-50 transition" onClick={() => setDeleteConfirm(null)}>Cancel</button>
            <button className="rf-btn-secondary px-4 py-2 transition" onClick={doDelete}>Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminOrders;
