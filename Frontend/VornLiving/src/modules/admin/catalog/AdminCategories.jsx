import React from 'react';
import api, { adminGetCategoriesAdmin, adminCreateCategory, adminUpdateCategory, adminDeleteCategory, adminUploadCategoryImage } from '../../../services/api';
import { Plus, Pencil, Trash2, ChevronDown } from 'lucide-react';
import PaginationBar from '../../../components/PaginationBar';
import SearchField from '../../../components/SearchField';
import Modal from '../../../components/Modal';

const AdminCategories = () => {
  const origin = React.useMemo(() => {
    try {
      const base = api?.defaults?.baseURL || import.meta.env.VITE_API_URL || '';
      if (base) {
        const u = new URL(base);
        return `${u.protocol}//${u.hostname}${u.port ? `:${u.port}` : ''}`;
      }
    } catch (e) { void e; }
    return '';
  }, []);
  const toAbsolute = (url) => {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    return origin ? `${origin}${url}` : url;
  };

  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [message, setMessage] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState('name-asc');
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(10);
  const [totalCount, setTotalCount] = React.useState(0);
  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [form, setForm] = React.useState({ CategoryName: '', ImageURL: '' });
  const [imageB64, setImageB64] = React.useState(null);
  const [confirm, setConfirm] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  const load = async (opts = {}) => {
    const p = opts.page ?? page;
    const s = opts.search ?? search;
    const so = opts.sort ?? sort;
    setLoading(true);
    try {
      const data = await adminGetCategoriesAdmin({ page: p, limit, search: s, sort: so });
      const cats = Array.isArray(data) ? data : (data.categories || []);
      setItems(cats);
      setTotalCount(data.totalCount ?? cats.length);
    } catch (e) {
      void e;
      setMessage('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };
  React.useEffect(() => { load(); }, []);
  React.useEffect(() => { (async () => { await load(); })(); }, [page, sort]);

  const openNew = () => {
    setEditing(null);
    setForm({ CategoryName: '', ImageURL: '' });
    setImageB64(null);
    setShowForm(true);
  };
  const openEdit = (c) => {
    setEditing(c);
    setForm({ CategoryName: c.CategoryName || '', ImageURL: c.ImageURL || '' });
    setImageB64(null);
    setShowForm(true);
  };

  const save = async () => {
    if (!form.CategoryName || !form.CategoryName.trim()) {
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { type: 'error', message: 'Category name is required' } }));
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await adminUpdateCategory(editing.CategoryID, { CategoryName: form.CategoryName });
        if (imageB64) {
          await adminUploadCategoryImage(editing.CategoryID, imageB64);
        } else if (form.ImageURL && form.ImageURL !== editing.ImageURL) {
          await adminUpdateCategory(editing.CategoryID, { ImageURL: form.ImageURL });
        }
        window.dispatchEvent(new CustomEvent('toast:show', { detail: { type: 'success', message: 'Category updated' } }));
      } else {
        const created = await adminCreateCategory({ CategoryName: form.CategoryName });
        if (imageB64) {
          await adminUploadCategoryImage(created.CategoryID, imageB64);
        } else if (form.ImageURL) {
          await adminUpdateCategory(created.CategoryID, { ImageURL: form.ImageURL });
        }
        window.dispatchEvent(new CustomEvent('toast:show', { detail: { type: 'success', message: 'Category created' } }));
      }
      setShowForm(false);
      await load();
    } catch (e) {
      const msg = e?.response?.status === 409 ? 'Duplicate category name' : (e?.response?.data?.message || 'Save failed');
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { type: 'error', message: msg } }));
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async (id) => {
    setBusy(true);
    try {
      await adminDeleteCategory(id);
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { type: 'success', message: 'Category deleted' } }));
      await load();
    } catch (e) {
      const msg = e?.response?.status === 409 ? 'Category is referenced by products' : (e?.response?.data?.message || 'Delete failed');
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { type: 'error', message: msg } }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 rf-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
        <button className="inline-flex items-center gap-2 rf-btn-primary px-4 py-2 transition" onClick={openNew}>
          <Plus className="h-4 w-4" /> New Category
        </button>
      </div>
      {message && <div className="text-primary">{message}</div>}
      <div className="rf-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="text-sm text-secondary">Manage categories used across products.</div>
          <div className="flex items-center gap-3">
            <SearchField
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories…"
              onSearch={async () => {
                setPage(1);
                await load({ page: 1 });
              }}
              inputWidthClassName="w-64"
            />
            <div className="relative">
              <select
                className="rf-input appearance-none pr-10"
                value={sort}
                onChange={async (e) => { setSort(e.target.value); setPage(1); }}
              >
                <option value="newest">Newest</option>
                <option value="name-asc">Name A→Z</option>
                <option value="name-desc">Name Z→A</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-secondary">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
            <button
              className="border border-border px-3 py-2 rounded-xl bg-white hover:bg-gray-50 transition"
              onClick={async () => {
                setSearch('');
                setSort('newest');
                setPage(1);
                await load({ page: 1, search: '', sort: 'newest' });
              }}
            >
              Clear
            </button>
          </div>
        </div>
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-600">
                <th className="px-4 py-3 border-b border-border">Image</th>
                <th className="px-4 py-3 border-b border-border">Name</th>
                <th className="px-4 py-3 border-b border-border w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.CategoryID} className="border-b border-border">
                  <td className="px-4 py-3">
                    {c.ImageURL ? (
                      <img src={toAbsolute(c.ImageURL)} alt={c.CategoryName} className="h-8 w-8 object-cover rounded" />
                    ) : (
                      <div className="h-8 w-8 rounded bg-gray-100 border border-border" />
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-secondary">{c.CategoryName}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button className="p-2 rounded-xl border border-border hover:border-primary" onClick={() => openEdit(c)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button className="p-2 rounded-xl border border-border text-secondary hover:border-primary transition" onClick={() => setConfirm(c)} title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-gray-500">No categories yet.</td>
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

      <Modal
        open={showForm}
        title={editing ? 'Edit Category' : 'New Category'}
        onClose={() => setShowForm(false)}
        maxWidthClassName="max-w-lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-secondary">Category Name</label>
            <input className="rf-input w-full" value={form.CategoryName} onChange={e => setForm({ ...form, CategoryName: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-secondary">Image</label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => setImageB64(ev.target.result);
                  reader.readAsDataURL(file);
                }}
                className="rf-input"
              />
              {(imageB64 || form.ImageURL) && (
                <img
                  src={imageB64 || toAbsolute(form.ImageURL)}
                  alt="Preview"
                  className="h-10 w-10 object-cover border border-border rounded"
                />
              )}
            </div>
            <div className="text-xs text-secondary/70">You can upload an image or paste a hosted Image URL.</div>
            <input
              className="rf-input w-full"
              value={form.ImageURL}
              onChange={e => setForm({ ...form, ImageURL: e.target.value })}
              placeholder="https://…"
            />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button className="border border-border px-4 py-2 rounded-xl bg-white hover:bg-gray-50 transition" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="rf-btn-primary px-4 py-2 transition disabled:opacity-60" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      {confirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40">
          <div className="rf-card w-full max-w-md p-6 shadow-xl">
            <h3 className="text-lg font-bold text-secondary mb-2">Delete Category</h3>
            <p className="text-sm text-gray-600">Delete “{confirm.CategoryName}”? This cannot be undone.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button className="border border-border px-4 py-2 rounded-xl bg-white hover:bg-gray-50 transition" onClick={() => setConfirm(null)}>Cancel</button>
              <button
                className="rf-btn-secondary px-4 py-2 transition"
                onClick={async () => {
                  const id = confirm.CategoryID;
                  setConfirm(null);
                  await doDelete(id);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategories;
