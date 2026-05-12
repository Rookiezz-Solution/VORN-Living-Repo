import React from 'react';
import { adminGetReturn, adminListReturns, adminSetReturnStatus } from '../../../services/api';
import { Eye, X, Filter as FilterIcon, Pencil, Trash2 } from 'lucide-react';
import PaginationBar from '../../../components/PaginationBar';
import Modal from '../../../components/Modal';
import Popover from '../../../components/Popover';
import SearchField from '../../../components/SearchField';

const AdminReturns = () => {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [message, setMessage] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(10);
  const [totalCount, setTotalCount] = React.useState(0);
  const [showFilter, setShowFilter] = React.useState(false);
  const [tmpStatus, setTmpStatus] = React.useState('');
  const filterBtnRef = React.useRef(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detail, setDetail] = React.useState(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editRow, setEditRow] = React.useState(null);
  const [editForm, setEditForm] = React.useState({ OrderNumber: '', OrderItemID: '', UserEmail: '', ReplacementReason: '', Status: 'Requested' });
  const [deleteConfirm, setDeleteConfirm] = React.useState(null);

  const load = async (opts = {}) => {
    const p = opts.page ?? page;
    const s = opts.search ?? search;
    const st = opts.status ?? status;
    setLoading(true);
    try {
      const data = await adminListReturns({ page: p, limit, search: s, status: st || undefined, sort: 'oldest' });
      const arr = Array.isArray(data) ? data : (data.requests || []);
      setItems(arr);
      setTotalCount(data.totalCount ?? arr.length);
    } catch (e) {
      void e;
      setMessage('Failed to load return requests');
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
      const data = await adminGetReturn(id);
      setDetail(data);
    } catch (e) {
      void e;
      setDetail(null);
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { type: 'error', message: 'Failed to load request' } }));
    } finally {
      setDetailLoading(false);
    }
  };

  const statusBadgeClass = (s) => {
    const v = String(s || '').toLowerCase();
    if (v === 'requested') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (v === 'approved') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (v === 'rejected') return 'bg-red-100 text-red-800 border-red-200';
    if (v === 'completed') return 'bg-green-100 text-green-800 border-green-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const openEdit = (row) => {
    const st = row.DisplayStatus || row.Status || 'Requested';
    setEditRow(row);
    setEditForm({
      OrderNumber: row.OrderNumber || '',
      OrderItemID: row.OrderItemID || '',
      UserEmail: row.UserEmail || 'Guest',
      ReplacementReason: row.ReplacementReason || '',
      Status: st
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editRow) return;
    const prev = editRow;
    const nextStatus = editForm.Status || (prev.DisplayStatus || prev.Status);
    const prevStatus = prev.DisplayStatus || prev.Status;
    const nextReason = editForm.ReplacementReason;

    setItems((cur) => cur.map((x) => {
      if (x.RequestID !== prev.RequestID) return x;
      return { ...x, ReplacementReason: nextReason, Status: nextStatus, DisplayStatus: nextStatus };
    }));
    setEditOpen(false);
    setEditRow(null);

    const actionMap = { Approved: 'Approve', Rejected: 'Reject', Completed: 'Complete' };
    const action = actionMap[nextStatus];
    const needsServer = nextStatus !== prevStatus && !!action;
    if (!needsServer) return;

    try {
      await adminSetReturnStatus(prev.RequestID, action, nextReason || null);
    } catch (e) {
      setItems((cur) => cur.map((x) => (x.RequestID === prev.RequestID ? prev : x)));
      const msg = e?.response?.data?.message || 'Update failed';
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { type: 'error', message: msg } }));
    }
  };

  const confirmDelete = (row) => setDeleteConfirm(row);
  const doDelete = () => {
    if (!deleteConfirm) return;
    const id = deleteConfirm.RequestID;
    setItems((cur) => cur.filter((x) => x.RequestID !== id));
    setTotalCount((c) => Math.max(0, (c || 0) - 1));
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-4 rf-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Returns (Replacements)</h1>
      </div>
      {message && <div className="text-primary">{message}</div>}
      <div className="rf-card overflow-hidden bg-surface">
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
              className="inline-flex items-center gap-2 border border-border rounded-xl px-3 py-2 bg-surface hover:bg-surface-2 transition text-secondary"
              onClick={() => { setTmpStatus(status || ''); setShowFilter(v => !v); }}
              title="Filter"
              ref={filterBtnRef}
            >
              <FilterIcon className="h-4 w-4" /> Filter
            </button>
          </div>
        </div>
        {loading ? (
          <div className="p-6 text-center text-secondary/70">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-2 text-left text-secondary/70">
                <th className="px-4 py-3 border-b border-border">Order #</th>
                <th className="px-4 py-3 border-b border-border">Item</th>
                <th className="px-4 py-3 border-b border-border">User</th>
                <th className="px-4 py-3 border-b border-border">Reason</th>
                <th className="px-4 py-3 border-b border-border">Status</th>
                <th className="px-4 py-3 border-b border-border w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(r => (
                <tr key={r.RequestID} className="border-b border-border hover:bg-primary/5 cursor-pointer transition" onClick={() => openDetail(r.RequestID)}>
                  <td className="px-4 py-3 font-semibold text-secondary">{r.OrderNumber}</td>
                  <td className="px-4 py-3 text-secondary/70">#{r.OrderItemID}</td>
                  <td className="px-4 py-3 text-secondary/80">{r.UserEmail || 'Guest'}</td>
                  <td className="px-4 py-3 truncate max-w-[200px] text-secondary/80">{r.ReplacementReason}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${statusBadgeClass(r.DisplayStatus || r.Status)}`}>
                      {r.DisplayStatus || r.Status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="inline-flex p-2 rounded-xl border border-border bg-surface hover:bg-surface-2 transition text-secondary"
                        onClick={(e) => { e.stopPropagation(); openDetail(r.RequestID); }}
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex p-2 rounded-xl border border-border bg-surface hover:bg-surface-2 transition text-secondary"
                        onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex p-2 rounded-xl border border-border bg-surface hover:bg-surface-2 transition text-secondary"
                        onClick={(e) => { e.stopPropagation(); confirmDelete(r); }}
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
                  <td colSpan={6} className="px-4 py-10 text-center text-secondary/50">No return requests found.</td>
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
      <Popover open={showFilter} anchorRef={filterBtnRef} onClose={() => setShowFilter(false)} width={420}>
        <div className="relative">
          <button className="absolute right-2 top-2 text-secondary hover:text-primary" onClick={() => setShowFilter(false)}>
            <X className="h-4 w-4" />
          </button>
          <div className="text-lg font-bold text-secondary mb-3">Filter Returns</div>
          <div className="space-y-1">
            <div className="text-sm font-semibold text-secondary">Status</div>
            <select className="rf-input w-full bg-surface" value={tmpStatus} onChange={(e) => setTmpStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="Requested">Requested</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button className="border border-border px-4 py-2 rounded-xl bg-surface hover:bg-surface-2 transition text-secondary" onClick={() => setShowFilter(false)}>Cancel</button>
            <button
              className="rf-btn-primary px-4 py-2 transition"
              onClick={async () => {
                setStatus(tmpStatus || '');
                setPage(1);
                setShowFilter(false);
                await load({ page: 1, status: tmpStatus || '' });
              }}
            >
              Apply
            </button>
          </div>
        </div>
      </Popover>

      <Modal
        open={detailOpen}
        title={detail?.request?.RequestID ? `Return Request #${detail.request.RequestID}` : 'Request Details'}
        onClose={() => { setDetailOpen(false); setDetail(null); }}
        maxWidthClassName="max-w-4xl"
      >
        {detailLoading ? (
          <div className="py-10 text-center text-secondary/70">Loading…</div>
        ) : detail?.request ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="rf-card p-4 bg-surface md:col-span-2">
                <div className="text-xs text-secondary/70">Order / User</div>
                <div className="font-semibold text-secondary mt-1">#{detail.request.OrderNumber} • {detail.request.UserEmail || 'Guest'}</div>
                <div className="mt-3 text-xs text-secondary/70">Reason</div>
                <div className="font-semibold text-secondary mt-1">{detail.request.ReplacementReason || '-'}</div>
              </div>
              <div className="rf-card p-4 bg-surface">
                <div className="text-xs text-secondary/70">Status</div>
                <div className="font-semibold text-secondary mt-1">{detail.request.DisplayStatus || detail.request.Status}</div>
                <div className="mt-3 text-xs text-secondary/70">Order Item</div>
                <div className="font-semibold text-secondary mt-1">#{detail.request.OrderItemID}</div>
              </div>
            </div>
            {detail.request.ImageEvidenceURL && (
              <div className="rf-card p-4 bg-surface">
                <div className="text-sm font-semibold text-secondary">Evidence</div>
                <div className="mt-3 border border-border rounded-2xl overflow-hidden bg-gray-50">
                  <img src={detail.request.ImageEvidenceURL} alt="Evidence" className="w-full max-h-[520px] object-contain bg-white" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-10 text-center text-secondary/70">No details.</div>
        )}
      </Modal>

      <Modal
        open={editOpen}
        title={editRow?.RequestID ? `Edit Request #${editRow.RequestID}` : 'Edit Request'}
        onClose={() => { setEditOpen(false); setEditRow(null); }}
        maxWidthClassName="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-secondary">Order #</div>
              <input className="rf-input w-full bg-surface-2" value={editForm.OrderNumber} readOnly />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-secondary">Item</div>
              <input className="rf-input w-full bg-surface-2" value={editForm.OrderItemID ? `#${editForm.OrderItemID}` : ''} readOnly />
            </div>
            <div className="space-y-1 md:col-span-2">
              <div className="text-sm font-semibold text-secondary">User</div>
              <input className="rf-input w-full bg-surface-2" value={editForm.UserEmail} readOnly />
            </div>
            <div className="space-y-1 md:col-span-2">
              <div className="text-sm font-semibold text-secondary">Admin Remarks / Reason Adjustment</div>
              <textarea
                className="rf-input w-full bg-surface min-h-[100px]"
                value={editForm.ReplacementReason}
                onChange={(e) => setEditForm((f) => ({ ...f, ReplacementReason: e.target.value }))}
                placeholder="Enter remarks or update reason…"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <div className="text-sm font-semibold text-secondary">Status</div>
              <select className="rf-input w-full bg-surface" value={editForm.Status} onChange={(e) => setEditForm((f) => ({ ...f, Status: e.target.value }))}>
                <option value="Requested">Requested</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button className="border border-border px-4 py-2 rounded-xl bg-surface hover:bg-surface-2 transition text-secondary" onClick={() => { setEditOpen(false); setEditRow(null); }}>Cancel</button>
            <button className="rf-btn-primary px-4 py-2 transition" onClick={saveEdit}>Save</button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleteConfirm}
        title="Delete Request"
        onClose={() => setDeleteConfirm(null)}
        maxWidthClassName="max-w-md"
      >
        <div className="space-y-4">
          <div className="text-secondary">Are you sure you want to delete this return request?</div>
          <div className="flex justify-end gap-2">
            <button className="border border-border px-4 py-2 rounded-xl bg-surface hover:bg-surface-2 transition text-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
            <button className="rf-btn-secondary px-4 py-2 transition" onClick={doDelete}>Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminReturns;
