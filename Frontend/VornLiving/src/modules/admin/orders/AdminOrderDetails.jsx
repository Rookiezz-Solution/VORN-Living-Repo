import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminGetOrder, adminUpdateOrderStatus, adminUpdateOrderTracking } from '../../../services/api';
import { formatINR } from '../../../utils/formatINR';
import ProductImage from '../../../components/ProductImage';

const AdminOrderDetails = () => {
  const { id } = useParams();
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  const [carrier, setCarrier] = React.useState('');
  const [trackingNumber, setTrackingNumber] = React.useState('');
  const [shippedAt, setShippedAt] = React.useState('');
  const [statusValue, setStatusValue] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGetOrder(id);
      setData(res);
      const currentStatus = res?.shipping?.ShippingStatus === 'OutForDelivery'
        ? 'OutForDelivery'
        : (res?.shipping?.ShippingStatus === 'Packed' ? 'Packed' : res?.order?.OrderStatus);
      setStatusValue(currentStatus || '');
      setCarrier(res?.shipping?.Carrier || '');
      setTrackingNumber(res?.shipping?.TrackingNumber || '');
      setShippedAt(res?.shipping?.ShippedAt ? String(res.shipping.ShippedAt).slice(0, 16) : '');
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  const statusOptions = ['Pending', 'Processing', 'Packed', 'Shipped', 'OutForDelivery', 'Delivered', 'Cancelled'];

  const updateStatus = async () => {
    if (!data?.order?.OrderID) return;
    setBusy(true);
    try {
      await adminUpdateOrderStatus(data.order.OrderID, { status: statusValue });
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { type: 'success', message: 'Status updated' } }));
      await load();
    } catch (e) {
      void e;
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { type: 'error', message: 'Failed to update status' } }));
    } finally {
      setBusy(false);
    }
  };

  const updateTracking = async () => {
    if (!data?.order?.OrderID) return;
    setBusy(true);
    try {
      await adminUpdateOrderTracking(data.order.OrderID, {
        carrier: carrier || undefined,
        trackingNumber: trackingNumber || undefined,
        shippedAt: shippedAt || undefined
      });
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { type: 'success', message: 'Tracking updated' } }));
      await load();
    } catch (e) {
      void e;
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { type: 'error', message: 'Failed to update tracking' } }));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="rf-card p-6 text-secondary bg-surface">Loading…</div>;
  }

  if (!data?.order) {
    return (
      <div className="rf-card p-6 text-secondary bg-surface">
        <div className="font-semibold">Order not found</div>
        <Link to="/admin/orders" className="link-underline text-primary">Back to Orders</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 rf-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-2xl font-bold text-secondary">Order {data.order.OrderNumber}</div>
          <div className="text-sm text-secondary/70">#{data.order.OrderID} • {data.order.UserEmail || 'Guest'}</div>
        </div>
        <Link to="/admin/orders" className="border border-border px-4 py-2 rounded-xl bg-surface hover:bg-surface-2 transition text-secondary">
          Back
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rf-card p-5 space-y-3 lg:col-span-1 bg-surface">
          <div className="text-sm font-semibold text-secondary">Amounts</div>
          <div className="text-sm text-secondary/80">SubTotal: <span className="font-semibold">{formatINR(data.order.SubTotal)}</span></div>
          <div className="text-sm text-secondary/80">Shipping: <span className="font-semibold">{formatINR(data.order.ShippingAmount)}</span></div>
          <div className="text-sm text-secondary/80">Total: <span className="font-semibold text-primary">{formatINR(data.order.TotalAmount)}</span></div>

          <div className="pt-3 border-t border-border space-y-2">
            <div className="text-sm font-semibold text-secondary">Status</div>
            <select className="rf-input w-full bg-surface" value={statusValue} onChange={(e) => setStatusValue(e.target.value)} disabled={busy}>
              {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="rf-btn-primary px-4 py-2 w-full" disabled={busy} onClick={updateStatus}>
              Update Status
            </button>
          </div>
        </div>

        <div className="rf-card p-5 space-y-3 lg:col-span-1 bg-surface">
          <div className="text-sm font-semibold text-secondary">Tracking</div>
          <input className="rf-input w-full bg-surface" placeholder="Carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} disabled={busy} />
          <input className="rf-input w-full bg-surface" placeholder="Tracking Number" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} disabled={busy} />
          <input type="datetime-local" className="rf-input w-full bg-surface" value={shippedAt} onChange={(e) => setShippedAt(e.target.value)} disabled={busy} />
          <button className="border border-border px-4 py-2 rounded-xl bg-surface hover:bg-surface-2 transition text-secondary" disabled={busy} onClick={updateTracking}>
            Update Tracking
          </button>
        </div>

        <div className="rf-card p-5 space-y-3 lg:col-span-1 bg-surface">
          <div className="text-sm font-semibold text-secondary">History</div>
          <div className="border border-border rounded-xl p-3 max-h-56 overflow-auto text-sm text-secondary/80 bg-surface-2">
            {(data.statusHistory || []).length ? (data.statusHistory || []).map(h => (
              <div key={h.HistoryID} className="flex items-center justify-between gap-3 py-1">
                <div className="min-w-0 truncate">{h.OldStatus} → {h.NewStatus}</div>
                <div className="text-xs text-secondary/60">{h.ChangedAt ? String(h.ChangedAt).slice(0, 19).replace('T', ' ') : ''}</div>
              </div>
            )) : <div className="text-secondary/70">No history</div>}
          </div>
        </div>
      </div>

      <div className="rf-card overflow-hidden bg-surface">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="text-lg font-bold text-secondary">Items</div>
          <div className="text-sm text-secondary/70">{(data.items || []).length} item(s)</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-2 text-left text-secondary/70">
                <th className="px-4 py-3 border-b border-border">Product</th>
                <th className="px-4 py-3 border-b border-border">Variant</th>
                <th className="px-4 py-3 border-b border-border">SKU</th>
                <th className="px-4 py-3 border-b border-border">Qty</th>
                <th className="px-4 py-3 border-b border-border">Unit</th>
                <th className="px-4 py-3 border-b border-border">Total</th>
              </tr>
            </thead>
            <tbody>
              {(data.items || []).map(it => (
                <tr key={it.OrderItemID} className="border-b border-border hover:bg-primary/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl border border-border overflow-hidden bg-surface-2 flex-shrink-0">
                        <ProductImage
                          src={it.ImageURL}
                          alt={it.ProductName}
                          category={it.CategoryName}
                          showFallbackBrand={false}
                          apiOnly={true}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <a href={`/product/${it.ProductID}`} target="_blank" rel="noreferrer" className="text-secondary hover:text-primary transition font-medium">
                        {it.ProductName}
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-secondary/80">{it.VariantName || '-'}</td>
                  <td className="px-4 py-3 text-secondary/80">{it.SKU}</td>
                  <td className="px-4 py-3 text-secondary/80">{it.Quantity}</td>
                  <td className="px-4 py-3 text-secondary/80">{formatINR(it.UnitPrice)}</td>
                  <td className="px-4 py-3 font-medium text-secondary">{formatINR(it.TotalPrice)}</td>
                </tr>
              ))}
              {(data.items || []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-secondary/70">No items.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetails;
