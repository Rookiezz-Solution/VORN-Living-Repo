import React from 'react';
import { Eye, Trash2, Filter as FilterIcon } from 'lucide-react';
import { adminGetReview, adminListReviews, adminDeleteReview } from '../../../services/api';
import PaginationBar from '../../../components/PaginationBar';
import Modal from '../../../components/Modal';
import SearchField from '../../../components/SearchField';

const AdminReviews = () => {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [message, setMessage] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(10);
  const [totalCount, setTotalCount] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detail, setDetail] = React.useState(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmReview, setConfirmReview] = React.useState(null);
  const [confirmError, setConfirmError] = React.useState('');

  const load = async (opts = {}) => {
    const p = opts.page ?? page;
    const s = opts.search ?? search;
    setLoading(true);
    try {
      const data = await adminListReviews({ page: p, limit, search: s || undefined, sort: 'oldest' });
      const arr = Array.isArray(data) ? data : (data.reviews || []);
      setItems(arr);
      setTotalCount(data.totalCount ?? arr.length);
    } catch (e) {
      void e;
      setMessage('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };
  React.useEffect(() => { load(); }, []);
  React.useEffect(() => { (async () => { await load(); })(); }, [page]);
  const openDetail = async (id) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const data = await adminGetReview(id);
      setDetail(data);
    } catch (e) {
      void e;
      setDetail(null);
      setMessage('Failed to fetch review');
    } finally {
      setDetailLoading(false);
    }
  };

  const openDeleteConfirm = (review) => {
    setConfirmReview(review || null);
    setConfirmError('');
    setConfirmOpen(true);
  };
  const removeReview = async () => {
    if (!confirmReview?.ReviewID) return;
    setBusy(true);
    setConfirmError('');
    try {
      await adminDeleteReview(confirmReview.ReviewID);
      setConfirmOpen(false);
      setConfirmReview(null);
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: 'Review deleted', type: 'success' } }));
      await load();
    } catch (e) {
      void e;
      setConfirmError('Failed to delete review');
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: 'Failed to delete review', type: 'error' } }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 rf-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Product Reviews</h1>
      </div>
      {message && <div className="text-primary">{message}</div>}
      <div className="rf-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3">
          <SearchField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product or email…"
            onSearch={async () => {
              setPage(1);
              await load({ page: 1 });
            }}
            inputWidthClassName="w-80"
          />
          <button
            className="inline-flex items-center gap-2 border border-border rounded-xl px-3 py-2 bg-white hover:border-primary transition"
            onClick={async () => { setPage(1); await load({ page: 1 }); }}
            title="Apply"
          >
            <FilterIcon className="h-4 w-4" /> Apply
          </button>
        </div>
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-600">
                <th className="px-4 py-3 border-b border-border">Product</th>
                <th className="px-4 py-3 border-b border-border">User</th>
                <th className="px-4 py-3 border-b border-border">Rating</th>
                <th className="px-4 py-3 border-b border-border">Title</th>
                <th className="px-4 py-3 border-b border-border w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(r => (
                <tr key={r.ReviewID} className="border-b border-border hover:bg-primary/10">
                  <td className="px-4 py-3">{r.ProductName}</td>
                  <td className="px-4 py-3">{r.UserEmail || 'Guest'}</td>
                  <td className="px-4 py-3">{r.Rating}★</td>
                  <td className="px-4 py-3 truncate">{r.ReviewTitle || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="inline-flex p-2 rounded-xl border border-border hover:border-primary transition"
                        title="View"
                        onClick={() => openDetail(r.ReviewID)}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="p-2 rounded-xl border border-border hover:border-primary transition disabled:opacity-60" onClick={() => openDeleteConfirm(r)} title="Delete" disabled={busy}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">No reviews.</td></tr>
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

      <Modal
        open={detailOpen}
        title={detail?.ReviewID ? `Review #${detail.ReviewID}` : 'Review Details'}
        onClose={() => { setDetailOpen(false); setDetail(null); }}
        maxWidthClassName="max-w-3xl"
      >
        {detailLoading ? (
          <div className="py-10 text-center text-secondary/70">Loading…</div>
        ) : detail ? (
          <div className="space-y-4 text-sm">
            <div className="rf-card p-4">
              <div className="text-xs text-secondary/70">Product</div>
              <div className="font-semibold text-secondary mt-1">{detail.ProductName}</div>
              <div className="mt-3 text-xs text-secondary/70">User</div>
              <div className="font-semibold text-secondary mt-1">{detail.UserEmail || 'Guest'}</div>
            </div>
            <div className="rf-card p-4">
              <div className="text-xs text-secondary/70">Rating</div>
              <div className="font-semibold text-secondary mt-1">{detail.Rating}★</div>
              {detail.ReviewTitle ? (
                <>
                  <div className="mt-3 text-xs text-secondary/70">Title</div>
                  <div className="font-semibold text-secondary mt-1">{detail.ReviewTitle}</div>
                </>
              ) : null}
              {detail.ReviewBody ? (
                <>
                  <div className="mt-3 text-xs text-secondary/70">Body</div>
                  <div className="text-secondary/80 whitespace-pre-wrap mt-1">{detail.ReviewBody}</div>
                </>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-secondary/70">No details.</div>
        )}
      </Modal>

      <Modal
        open={confirmOpen}
        title="Delete Review"
        onClose={() => { if (!busy) { setConfirmOpen(false); setConfirmReview(null); setConfirmError(''); } }}
        maxWidthClassName="max-w-md"
      >
        <div className="space-y-4">
          <div className="text-sm text-secondary/80">Are you sure you want to delete this review?</div>
          {confirmReview ? (
            <div className="rf-card p-4 text-sm">
              <div className="text-xs text-secondary/70">Product</div>
              <div className="font-semibold text-secondary mt-1">{confirmReview.ProductName}</div>
              <div className="mt-3 text-xs text-secondary/70">User</div>
              <div className="font-semibold text-secondary mt-1">{confirmReview.UserEmail || 'Guest'}</div>
              <div className="mt-3 text-xs text-secondary/70">Rating</div>
              <div className="font-semibold text-secondary mt-1">{confirmReview.Rating}★</div>
            </div>
          ) : null}
          {confirmError ? (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{confirmError}</div>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="border border-border px-4 py-2 rounded-xl bg-white hover:bg-gray-50 transition disabled:opacity-60"
              onClick={() => { setConfirmOpen(false); setConfirmReview(null); setConfirmError(''); }}
              disabled={busy}
            >
              No
            </button>
            <button
              type="button"
              className="rf-btn-primary px-4 py-2 transition disabled:opacity-60"
              onClick={removeReview}
              disabled={busy}
            >
              {busy ? 'Deleting…' : 'Yes'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminReviews;
