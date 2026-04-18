import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, Truck, CheckCircle, Clock, Star, X } from 'lucide-react';
import { getOrderDetails, getOrders, submitOrderItemReview } from '../../../services/api';
import { useNotification } from '../../../context/NotificationContext';
import { formatINR } from '../../../utils/formatINR';
import ProductImage from '../../../components/ProductImage';
import { orderStatusBadgeClass } from '../../../utils/orderStatusBadge';

const STATUS_STEPS = ['Pending', 'Processing', 'Packed', 'Shipped', 'OutForDelivery', 'Delivered'];

const OrderTracking = () => {
  const { showNotification } = useNotification();
  const { id } = useParams();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState({ open: false, orderItemId: null, rating: 5, description: '', photoBase64: '' });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
      showNotification('Please login to track orders', 'error');
      navigate('/auth');
      return;
    }
    const load = async () => {
      try {
        const list = await getOrders(1, 10);
        const items = Array.isArray(list) ? list : (list?.items || []);
        setOrders(items);
        if (id) {
          const d = await getOrderDetails(id);
          setDetails(d);
        }
      } catch {
        showNotification('Failed to load tracking data', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate, showNotification]);

  const shipStatus = details?.shipping?.ShippingStatus || null;
  const history = details?.statusHistory || [];
  const hasPacked = history?.some?.(h => h.NewStatus === 'Packed');
  const baseStatus = details?.OrderStatus || 'Pending';
  const currentStatus = baseStatus === 'Delivered'
    ? 'Delivered'
    : shipStatus === 'OutForDelivery'
      ? 'OutForDelivery'
      : (hasPacked && baseStatus === 'Processing' ? 'Packed' : baseStatus);
  

  const renderTimeline = () => {
    const completed = new Set(history.map(h => h.NewStatus));
    return (
      <div className="relative">
        <div className="grid grid-cols-6 gap-4">
          {STATUS_STEPS.map((step, idx) => {
            const isDone = completed.has(step) || STATUS_STEPS.indexOf(currentStatus) >= idx;
            const entry = history.find(h => h.NewStatus === step);
            return (
              <div key={step} className="flex flex-col items-center text-center">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center border ${isDone ? 'bg-primary text-secondary border-primary' : 'bg-background text-gray-400 border-border'}`}>
                  {isDone ? <CheckCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                </div>
                <div className="mt-2 text-sm font-semibold">{step}</div>
                <div className="mt-1 text-xs text-gray-500">{entry ? new Date(entry.ChangedAt).toLocaleString() : ''}</div>
              </div>
            );
          })}
        </div>
        <div className="mt-6 h-1 w-full bg-border rounded-full">
          <div
            className="h-1 bg-primary rounded-full transition-all"
            style={{ width: `${((STATUS_STEPS.indexOf(currentStatus) + 1) / STATUS_STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    );
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center text-gray-500">Loading tracking...</div>;

  return (
    <div className="container mx-auto px-4 py-10 animate-fade-in" data-reveal>
      <div className="mb-6">
        <p className="text-sm text-gray-500">
          <Link to="/" className="hover:text-primary">Home</Link> <span className="mx-2">/</span>
          <Link to="/profile" className="hover:text-primary">My Account</Link> <span className="mx-2">/</span>
          <span className="text-secondary font-medium">Track Order</span>
        </p>
        <h1 className="text-3xl md:text-4xl font-bold text-secondary mt-2">Track Order</h1>
      </div>

      {!details && (
        <div className="rf-card p-6">
          <h2 className="text-xl font-semibold mb-4">Select an order</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map(o => (
              <button
                key={o.OrderID}
                onClick={() => navigate(`/order/${o.OrderID}/track`)}
                className="text-left p-4 rounded-xl border border-border hover:border-primary transition bg-white"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-secondary">#{o.OrderNumber || o.OrderID}</div>
                  <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full border ${orderStatusBadgeClass(o.OrderStatus)}`}>{o.OrderStatus}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">Placed on {new Date(o.CreatedAt).toLocaleDateString()}</div>
                <div className="text-sm font-medium mt-1">Total: {formatINR(o.TotalAmount)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {details && (
        <div className="space-y-8">
          <div className="rf-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold">Order #{details.OrderNumber || details.OrderID}</div>
                <div className="text-sm text-gray-500">Placed on {new Date(details.CreatedAt).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${orderStatusBadgeClass(details.OrderStatus)}`}>{details.OrderStatus}</span>
                <span className="text-sm font-medium">{formatINR(details.TotalAmount)}</span>
              </div>
            </div>
            <div className="mt-6">{renderTimeline()}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rf-card p-6">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-secondary">Shipping</h3>
              </div>
              {details.shipping ? (
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Courier: {details.shipping.CourierName || details.shipping.Carrier || '—'}</div>
                  <div>Tracking #: {details.shipping.TrackingNumber || '—'}</div>
                  <div>Shipped At: {details.shipping.ShippedAt ? new Date(details.shipping.ShippedAt).toLocaleString() : (details.shipping.EstimatedDelivery ? new Date(details.shipping.EstimatedDelivery).toLocaleDateString() : '—')}</div>
                  <div>Status: {details.shipping.ShippingStatus || 'Pending'}</div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">Shipping details not available yet.</div>
              )}
            </div>
            <div className="rf-card p-6">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-secondary">Items</h3>
              </div>
              <div className="space-y-3">
                {(details.items || []).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl border border-border overflow-hidden bg-gray-50 flex-shrink-0">
                        <ProductImage
                          src={item.ImageURL}
                          alt={item.ProductName}
                          category={item.CategoryName}
                          apiOnly={true}
                          fallbackSrc="/Living/image1.jpeg"
                          showFallbackBrand={false}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="font-medium">{item.ProductName}</div>
                        <div className="text-xs text-gray-500">Qty: {item.Quantity} • SKU: {item.SKU}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="font-medium">{formatINR(item.TotalPrice)}</div>
                      {item.ReplaceAllowed && (
                        <button
                          type="button"
                          onClick={() => navigate(`/shop?replaceFor=${details.OrderID}-${item.OrderItemID}`)}
                          className="text-xs px-3 py-1.5 rounded-full border border-primary text-primary hover:bg-primary hover:text-secondary transition"
                          title="Choose another product for replacement"
                        >
                          Choose Replacement
                        </button>
                      )}
                      {String(details.OrderStatus || '') === 'Delivered' && item.ReviewAllowed && (
                        <button
                          type="button"
                          onClick={() => setReviewModal({ open: true, orderItemId: item.OrderItemID, rating: 5, description: '', photoBase64: '' })}
                          className="text-xs px-3 py-1.5 rounded-full border-2 border-[#545a67] text-secondary hover:border-primary hover:bg-gray-50 transition"
                          title="Write a review"
                        >
                          Write Review
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {reviewModal.open && (
            <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <div className="rf-card w-full max-w-lg p-6 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-lg font-bold text-secondary">Write a Review</div>
                  <button className="p-2 rounded-xl border border-border" onClick={() => setReviewModal({ open: false, orderItemId: null, rating: 5, description: '', photoBase64: '' })}><X className="h-4 w-4" /></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-semibold text-secondary mb-1">Rating</div>
                    <div className="flex items-center gap-2">
                      {[1,2,3,4,5].map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setReviewModal(m => ({ ...m, rating: n }))}
                          className={`p-2 rounded-full ${reviewModal.rating >= n ? 'text-yellow-500' : 'text-gray-300'}`}
                          title={`${n} star`}
                        >
                          <Star className="h-5 w-5" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-secondary mb-1">Description</div>
                    <textarea
                      className="w-full border border-border rounded-xl px-3 py-2 bg-white"
                      rows={4}
                      value={reviewModal.description}
                      onChange={(e) => setReviewModal(m => ({ ...m, description: e.target.value }))}
                      placeholder="Share your experience with the product"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-secondary mb-1">Photo (optional)</div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => setReviewModal(m => ({ ...m, photoBase64: reader.result }));
                        reader.readAsDataURL(file);
                      }}
                      className="w-full border border-border rounded-xl px-3 py-2 bg-white"
                    />
                    {reviewModal.photoBase64 && (
                      <img src={reviewModal.photoBase64} alt="Preview" className="mt-2 h-24 w-24 object-cover rounded-xl border border-border" />
                    )}
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button className="border border-border px-4 py-2 rounded-xl" onClick={() => setReviewModal({ open: false, orderItemId: null, rating: 5, description: '', photoBase64: '' })}>Cancel</button>
                  <button
                    className="rf-btn-primary px-4 py-2 transition border-2 border-secondary"
                    onClick={async () => {
                      try {
                        await submitOrderItemReview(details.OrderID, reviewModal.orderItemId, {
                          rating: reviewModal.rating,
                          title: '',
                          description: reviewModal.description,
                          photoBase64: reviewModal.photoBase64
                        });
                        setReviewModal({ open: false, orderItemId: null, rating: 5, description: '', photoBase64: '' });
                        const d = await getOrderDetails(details.OrderID);
                        setDetails(d);
                      } catch (e) { void e; }
                    }}
                  >
                    Submit Review
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderTracking;
