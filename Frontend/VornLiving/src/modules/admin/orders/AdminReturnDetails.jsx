import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminGetReturn, adminSetReturnStatus } from '../../../services/api';
import { formatINR } from '../../../utils/formatINR';

const AdminReturnDetails = () => {
  const { id } = useParams();
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGetReturn(id);
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  const setStatusAction = async (action) => {
    const requestId = data?.request?.RequestID;
    if (!requestId) return;
    setBusy(true);
    try {
      await adminSetReturnStatus(requestId, action, '');
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { type: 'success', message: 'Status updated' } }));
      await load();
    } catch (e) {
      void e;
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { type: 'error', message: 'Failed to update status' } }));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="rf-card p-6 text-secondary">Loading…</div>;
  }

  if (!data?.request) {
    return (
      <div className="rf-card p-6 text-secondary">
        <div className="font-semibold">Return request not found</div>
        <Link to="/admin/returns" className="link-underline text-primary">Back to Returns</Link>
      </div>
    );
  }

  const status = data.request.DisplayStatus || data.request.Status;

  return (
    <div className="space-y-4 rf-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-2xl font-bold text-secondary">Return #{data.request.RequestID}</div>
          <div className="text-sm text-secondary/70">Order {data.request.OrderNumber} • {data.request.UserEmail || 'Guest'}</div>
        </div>
        <Link to="/admin/returns" className="border border-border px-4 py-2 rounded-xl bg-white hover:bg-gray-50 transition">
          Back
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rf-card p-5 lg:col-span-2">
          <div className="text-lg font-bold text-secondary">Request</div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-secondary/70">Status</div>
              <div className="font-semibold text-secondary mt-1">{status}</div>
            </div>
            <div>
              <div className="text-xs text-secondary/70">Item</div>
              <div className="font-semibold text-secondary mt-1">#{data.request.OrderItemID}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-secondary/70">Reason</div>
              <div className="font-semibold text-secondary mt-1">{data.request.ReplacementReason}</div>
            </div>
            {data.request.ImageEvidenceURL ? (
              <div className="md:col-span-2">
                <div className="text-xs text-secondary/70">Evidence</div>
                <div className="mt-2 border border-border rounded-2xl overflow-hidden bg-gray-50">
                  <img src={data.request.ImageEvidenceURL} alt="Evidence" className="w-full h-64 object-cover" />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rf-card p-5">
          <div className="text-lg font-bold text-secondary">Actions</div>
          <div className="mt-4 space-y-3">
            <button
              className="w-full h-11 px-4 rounded-xl border border-border bg-white text-secondary hover:border-primary hover:bg-gray-50 transition disabled:opacity-60"
              onClick={() => setStatusAction('Approve')}
              disabled={busy || status !== 'Requested'}
            >
              Approve
            </button>
            <button
              className="w-full h-11 px-4 rounded-xl border border-border bg-white text-secondary hover:border-primary hover:bg-gray-50 transition disabled:opacity-60"
              onClick={() => setStatusAction('Reject')}
              disabled={busy || status !== 'Requested'}
            >
              Reject
            </button>
            <button
              className="w-full h-11 px-4 rf-btn-primary disabled:opacity-60"
              onClick={() => setStatusAction('Complete')}
              disabled={busy || !(status === 'Approved' || status === 'Rejected')}
            >
              Mark Completed
            </button>
          </div>
        </div>
      </div>

      <div className="rf-card p-5">
        <div className="text-lg font-bold text-secondary">Order Item</div>
        {data.item ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-secondary/70">SKU</div>
              <div className="font-semibold text-secondary mt-1">{data.item.SKU}</div>
            </div>
            <div>
              <div className="text-xs text-secondary/70">Quantity</div>
              <div className="font-semibold text-secondary mt-1">{data.item.Quantity}</div>
            </div>
            <div>
              <div className="text-xs text-secondary/70">Unit Price</div>
              <div className="font-semibold text-primary mt-1">{formatINR(data.item.UnitPrice)}</div>
            </div>
          </div>
        ) : (
          <div className="mt-3 text-sm text-secondary/70">Item not found</div>
        )}
      </div>
    </div>
  );
};

export default AdminReturnDetails;

