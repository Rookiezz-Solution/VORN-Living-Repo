import React from 'react';
import { Filter as FilterIcon, Trash2, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { adminListNewsletter, adminToggleSubscriber, adminDeleteSubscriber } from '../../../services/api';
import PaginationBar from '../../../components/PaginationBar';
import SearchField from '../../../components/SearchField';
import Modal from '../../../components/Modal';

const AdminNewsletter = () => {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [message, setMessage] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(10);
  const [totalCount, setTotalCount] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [confirm, setConfirm] = React.useState({ open: false, id: null, email: '' });
  const [confirmError, setConfirmError] = React.useState('');

  const load = async (opts = {}) => {
    const p = opts.page ?? page;
    const s = opts.search ?? search;
    const st = opts.status ?? status;
    setLoading(true);
    try {
      const data = await adminListNewsletter({ page: p, limit, search: s || undefined, status: st || undefined, sort: 'oldest' });
      const arr = Array.isArray(data) ? data : (data.subscribers || []);
      setItems(arr);
      setTotalCount(data.totalCount ?? arr.length);
    } catch (e) {
      void e;
      setMessage('Failed to load subscribers');
    } finally {
      setLoading(false);
    }
  };
  React.useEffect(() => { load(); }, []);
  React.useEffect(() => { (async () => { await load(); })(); }, [page]);

  const toggle = async (id, active) => {
    setBusy(true);
    try {
      await adminToggleSubscriber(id, active);
      await load();
    } catch (e) { void e; } finally {
      setBusy(false);
    }
  };
  const askRemove = (id, email) => {
    setConfirmError('');
    setConfirm({ open: true, id, email });
  };
  const confirmRemove = async () => {
    if (!confirm.id) return;
    setBusy(true);
    setConfirmError('');
    try {
      await adminDeleteSubscriber(confirm.id);
      await load();
      setConfirm({ open: false, id: null, email: '' });
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: 'Subscriber removed', type: 'success' } }));
    } catch (e) {
      void e;
      setConfirmError('Failed to remove subscriber');
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: 'Failed to remove subscriber', type: 'error' } }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 rf-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Newsletter Subscribers</h1>
      </div>
      {message && <div className="text-primary">{message}</div>}
      <div className="rf-card overflow-hidden bg-surface">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <SearchField
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search email…"
              onSearch={async () => {
                setPage(1);
                await load({ page: 1 });
              }}
              inputWidthClassName="w-64"
            />
            <select className="rf-input bg-surface text-secondary" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <button
            className="inline-flex items-center gap-2 border border-border rounded-xl px-3 py-2 bg-surface hover:bg-surface-2 transition text-secondary"
            onClick={async () => { setPage(1); await load({ page: 1 }); }}
            title="Apply"
          >
            <FilterIcon className="h-4 w-4" /> Apply
          </button>
        </div>
        {loading ? (
          <div className="p-6 text-center text-secondary/70">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-2 text-left text-secondary/70">
                <th className="px-4 py-3 border-b border-border">Email</th>
                <th className="px-4 py-3 border-b border-border">Status</th>
                <th className="px-4 py-3 border-b border-border">Subscribed</th>
                <th className="px-4 py-3 border-b border-border w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(s => (
                <tr key={s.SubscriberID} className="border-b border-border hover:bg-primary/5 transition">
                  <td className="px-4 py-3 text-secondary font-medium">{s.Email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${s.IsActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {s.IsActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-secondary/70">{s.SubscribedAt ? new Date(s.SubscribedAt).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {s.IsActive ? (
                        <button className="p-2 rounded-xl border border-border bg-surface text-secondary hover:bg-surface-2 transition" onClick={() => toggle(s.SubscriberID, false)} title="Deactivate">
                          <ToggleLeft className="h-4 w-4" />
                        </button>
                      ) : (
                        <button className="p-2 rounded-xl border border-border bg-surface text-secondary hover:bg-surface-2 transition" onClick={() => toggle(s.SubscriberID, true)} title="Activate">
                          <ToggleRight className="h-4 w-4" />
                        </button>
                      )}
                      <button className="p-2 rounded-xl border border-border bg-surface text-secondary hover:bg-surface-2 transition" onClick={() => askRemove(s.SubscriberID, s.Email)} title="Remove">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-secondary/50">No subscribers found.</td></tr>
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
        open={confirm.open}
        title="Remove Subscriber"
        onClose={() => { if (!busy) { setConfirm({ open: false, id: null, email: '' }); setConfirmError(''); } }}
        maxWidthClassName="max-w-md"
      >
        <div className="space-y-4">
          <div className="text-sm text-secondary/80">Are you sure you want to remove this subscriber?</div>
          <div className="rf-card p-4 text-sm">
            <div className="text-xs text-secondary/70">Email</div>
            <div className="font-semibold text-secondary mt-1 break-all">{confirm.email || '—'}</div>
          </div>
          {confirmError ? (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{confirmError}</div>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="border border-border px-4 py-2 rounded-xl bg-white hover:bg-gray-50 transition disabled:opacity-60"
              onClick={() => { setConfirm({ open: false, id: null, email: '' }); setConfirmError(''); }}
              disabled={busy}
            >
              No
            </button>
            <button
              type="button"
              className="rf-btn-primary px-4 py-2 transition disabled:opacity-60"
              onClick={confirmRemove}
              disabled={busy}
            >
              {busy ? 'Removing…' : 'Yes'}
            </button>
          </div>
        </div>
      </Modal>
      <div className="mt-4">
        <button
          className="inline-flex items-center gap-2 border border-border rounded-xl px-3 py-2 bg-white hover:border-primary transition"
          onClick={async () => {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (status) params.set('status', status);
            const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/admin/newsletter/export?${params.toString()}`;
            try {
              const resp = await fetch(url, { headers: { 'x-admin-email': localStorage.getItem('adminEmail') || '' } });
              const blob = await resp.blob();
              const dlUrl = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = dlUrl;
              a.download = 'subscribers.csv';
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(dlUrl);
            } catch (e) { void e; }
          }}
          title="Export CSV"
        >
          Export CSV
        </button>
      </div>
    </div>
  );
};

export default AdminNewsletter;
