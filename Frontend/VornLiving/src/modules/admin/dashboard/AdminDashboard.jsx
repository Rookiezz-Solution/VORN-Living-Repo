import React from 'react';
import {
  ResponsiveContainer,
  LineChart, Line,
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend
} from 'recharts';
import {
  adminListOrders,
  adminListReturns,
  adminListNewsletter,
  adminListReviews,
  adminDashboardSummary,
  adminDashboardTopProducts,
  adminDashboardLowStock
} from '../../../services/api';
import { formatINR } from '../../../utils/formatINR';

const EmptyState = ({ title }) => {
  return (
    <div className="h-[240px] flex items-center justify-center">
      <div className="text-center animate-scale-in">
        <div className="mx-auto h-16 w-16 rounded-2xl border border-border bg-surface-2 flex items-center justify-center shadow-sm">
          <span className="text-3xl leading-none inline-block animate-fade-in">📭</span>
        </div>
        <div className="mt-3 font-semibold text-secondary">{title}</div>
        <div className="mt-1 text-sm text-secondary/70">No records found</div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [loading, setLoading] = React.useState(true);
  const [orders, setOrders] = React.useState([]);
  const [returns, setReturns] = React.useState([]);
  const [subs, setSubs] = React.useState([]);
  const [reviews, setReviews] = React.useState([]);
  const [ops, setOps] = React.useState({ pendingOrders: 0, returnsRequested: 0, outForDeliveryCount: 0, shippedMissingTracking: 0 });
  const [topProducts, setTopProducts] = React.useState([]);
  const [lowStock, setLowStock] = React.useState({ products: [], variants: [] });

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const now = new Date();
        const dateTo = now.toISOString();
        const dateFrom = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();
        const ordersRes = await adminListOrders({ page: 1, limit: 500, dateFrom, dateTo, sort: 'newest' });
        setOrders(ordersRes.orders || []);
        const returnsRes = await adminListReturns({ page: 1, limit: 500 });
        setReturns(returnsRes.requests || returnsRes.returns || returnsRes.items || returnsRes || []); // adapt structure
        const subsRes = await adminListNewsletter({ page: 1, limit: 500 });
        setSubs(subsRes.subscribers || subsRes.items || subsRes || []);
        const reviewsRes = await adminListReviews({ page: 1, limit: 500 });
        setReviews(reviewsRes.reviews || reviewsRes.items || reviewsRes || []);
        // Ops summary and carrier mix / top products
        try {
          const opsRes = await adminDashboardSummary(30);
          setOps(opsRes || {});
        } catch (e) { void e; }
        try {
          const topRes = await adminDashboardTopProducts(30);
          setTopProducts(topRes.products || []);
        } catch (e) { void e; }
        try {
          const lsRes = await adminDashboardLowStock();
          setLowStock({ products: lsRes.products || [], variants: lsRes.variants || [] });
        } catch (e) { void e; }
      } catch (e) {
        void e;
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fmtDate = (iso) => {
    try {
      const d = new Date(iso);
      const m = d.getMonth() + 1;
      const day = d.getDate();
      return `${m}/${day}`;
    } catch {
      return iso;
    }
  };
  const groupByDay = (rows, dateKey, valueKey) => {
    const map = new Map();
    rows.forEach(r => {
      const k = fmtDate(r[dateKey]);
      const v = valueKey ? Number(r[valueKey] || 0) : 1;
      map.set(k, (map.get(k) || 0) + v);
    });
    return Array.from(map.entries()).map(([k, v]) => ({ day: k, value: v })).sort((a, b) => {
      const [am, ad] = a.day.split('/').map(Number);
      const [bm, bd] = b.day.split('/').map(Number);
      return am === bm ? ad - bd : am - bm;
    });
  };
  const ordersByDay = groupByDay(orders, 'CreatedAt', null);
  const revenueByDay = groupByDay(orders, 'CreatedAt', 'TotalAmount');
  const statusCounts = (() => {
    const m = new Map();
    orders.forEach(o => {
      const s = o.OrderStatus || 'Pending';
      m.set(s, (m.get(s) || 0) + 1);
    });
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  })();
  const returnsByStatus = (() => {
    const m = new Map();
    returns.forEach(r => {
      const s = r.Status || r.DisplayStatus || 'Requested';
      m.set(s, (m.get(s) || 0) + 1);
    });
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  })();
  const subsSplit = (() => {
    const active = subs.filter(s => s.IsActive).length;
    const inactive = subs.length - active;
    return [
      { name: 'Active', value: active },
      { name: 'Inactive', value: inactive }
    ];
  })();
  const reviewDist = [5,4,3,2,1].map(star => ({
    star,
    count: reviews.filter(r => Number(r.Rating) === star).length
  }));
  const isEmptyOrdersByDay = ordersByDay.length === 0 || ordersByDay.reduce((sum, r) => sum + Number(r.value || 0), 0) === 0;
  const isEmptyRevenueByDay = revenueByDay.length === 0 || revenueByDay.reduce((sum, r) => sum + Number(r.value || 0), 0) === 0;
  const isEmptyStatusCounts = statusCounts.length === 0 || statusCounts.reduce((sum, r) => sum + Number(r.value || 0), 0) === 0;
  const isEmptyReturnsByStatus = returnsByStatus.length === 0 || returnsByStatus.reduce((sum, r) => sum + Number(r.value || 0), 0) === 0;
  const isEmptySubs = subs.length === 0 || subsSplit.reduce((sum, r) => sum + Number(r.value || 0), 0) === 0;
  const isEmptyPaymentSplit = orders.length === 0;
  const isEmptyReviewDist = reviews.length === 0 || reviewDist.reduce((sum, r) => sum + Number(r.count || 0), 0) === 0;
  const isEmptyTopProducts = topProducts.length === 0;

  const ordersToday = orders.filter(o => {
    const d = new Date(o.CreatedAt);
    const n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
  }).length;
  const revenueMTD = orders.filter(o => {
    const d = new Date(o.CreatedAt);
    const n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
  }).reduce((sum, o) => sum + Number(o.TotalAmount || 0), 0);
  const avgOrderValue = orders.length ? (orders.reduce((sum, o) => sum + Number(o.TotalAmount || 0), 0) / orders.length) : 0;
  const palette = {
    gray: '#64748B',
    blue: '#2563EB',
    indigo: '#4F46E5',
    purple: '#7C3AED',
    green: '#16A34A',
    red: '#DC2626',
    amber: '#D97706',
    teal: '#0D9488',
    slateLight: '#CBD5E1'
  };
  const orderStatusColor = (s) => {
    const v = String(s || '').toLowerCase();
    if (v === 'delivered' || v === 'completed') return palette.green;
    if (v === 'cancelled' || v === 'canceled' || v === 'rejected') return palette.red;
    if (v === 'pending' || v === 'requested') return palette.amber;
    if (v === 'processing' || v === 'approved') return palette.blue;
    if (v === 'packed' || v === 'shipped') return palette.indigo;
    if (v === 'outfordelivery') return palette.purple;
    return palette.gray;
  };
  const paymentStatusColor = (s) => {
    const v = String(s || '').toLowerCase();
    if (v === 'paid') return palette.green;
    if (v === 'failed') return palette.red;
    if (v === 'pending') return palette.amber;
    return palette.gray;
  };
  return (
    <div className="space-y-6 rf-fade-in">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rf-card p-4 rf-hover-lift">
          <div className="text-sm text-gray-600">Orders (Today)</div>
          <div className="text-2xl font-bold">{ordersToday}</div>
        </div>
        <div className="rf-card p-4 rf-hover-lift">
          <div className="text-sm text-gray-600">Revenue (MTD)</div>
          <div className="text-2xl font-bold">{formatINR(Math.round(revenueMTD))}</div>
        </div>
        <div className="rf-card p-4 rf-hover-lift">
          <div className="text-sm text-gray-600">Avg Order Value</div>
          <div className="text-2xl font-bold">{formatINR(Math.round(avgOrderValue))}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rf-card p-4 rf-hover-lift">
          <div className="text-sm text-gray-600">Pending Orders</div>
          <div className="text-2xl font-bold">{ops.pendingOrders}</div>
        </div>
        <div className="rf-card p-4 rf-hover-lift">
          <div className="text-sm text-gray-600">Replacement Requested</div>
          <div className="text-2xl font-bold">{ops.returnsRequested}</div>
        </div>
        <div className="rf-card p-4 rf-hover-lift">
          <div className="text-sm text-gray-600">Out For Delivery</div>
          <div className="text-2xl font-bold">{ops.outForDeliveryCount}</div>
        </div>
        <div className="rf-card p-4 rf-hover-lift">
          <div className="text-sm text-gray-600">Shipped No Tracking</div>
          <div className="text-2xl font-bold">{ops.shippedMissingTracking}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rf-card p-5">
          <div className="text-sm text-gray-600 mb-3">Orders by Day (30 days)</div>
          {isEmptyOrdersByDay ? (
            <EmptyState title="Orders by Day" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={ordersByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="value" name="Orders" stroke={palette.blue} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="rf-card p-5">
          <div className="text-sm text-gray-600 mb-3">Revenue by Day (30 days)</div>
          {isEmptyRevenueByDay ? (
            <EmptyState title="Revenue by Day" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={revenueByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="value" name="Revenue" stroke={palette.green} fill={palette.green} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rf-card p-5">
          <div className="text-sm text-gray-600 mb-3">Order Status Split</div>
          {isEmptyStatusCounts ? (
            <EmptyState title="Order Status Split" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusCounts} dataKey="value" nameKey="name" outerRadius={90}>
                  {statusCounts.map((entry, index) => (
                    <Cell key={index} fill={orderStatusColor(entry.name)} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="rf-card p-5">
          <div className="text-sm text-gray-600 mb-3">Returns by Status</div>
          {isEmptyReturnsByStatus ? (
            <EmptyState title="Returns by Status" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={returnsByStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" name="Requests">
                  {returnsByStatus.map((entry, index) => (
                    <Cell key={index} fill={orderStatusColor(entry.name)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="rf-card p-5">
          <div className="text-sm text-gray-600 mb-3">Subscribers</div>
          {isEmptySubs ? (
            <EmptyState title="Subscribers" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={subsSplit} dataKey="value" nameKey="name" outerRadius={90}>
                  {subsSplit.map((entry, index) => (
                    <Cell key={index} fill={index === 0 ? palette.green : palette.slateLight} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6">
        <div className="rf-card p-5">
          <div className="text-sm text-gray-600 mb-3">Payment Status Split</div>
          {isEmptyPaymentSplit ? (
            <EmptyState title="Payment Status Split" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Paid', value: orders.filter(o => o.PaymentStatus === 'Paid').length },
                    { name: 'Pending', value: orders.filter(o => o.PaymentStatus === 'Pending').length },
                    { name: 'Failed', value: orders.filter(o => o.PaymentStatus === 'Failed').length },
                  ]}
                  dataKey="value" nameKey="name" outerRadius={90}
                >
                  <Cell fill={paymentStatusColor('Paid')} />
                  <Cell fill={paymentStatusColor('Pending')} />
                  <Cell fill={paymentStatusColor('Failed')} />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        {/* <div className="rf-card p-5">
          <div className="text-sm text-gray-600 mb-2">Carrier Mix</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              {(() => {
                const data = (carrierMix && carrierMix.length)
                  ? carrierMix.map(c => ({ name: c.Carrier || 'Unknown', value: Number(c.Cnt || 0) }))
                  : [{ name: 'No Data', value: 1 }];
                return (
                  <Pie data={data} dataKey="value" nameKey="name" outerRadius={90}>
                    {data.map((entry, index) => (
                      <Cell key={index} fill={carrierPalette[index % carrierPalette.length]} />
                    ))}
                  </Pie>
                );
              })()}
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div> */}
      </div>

      <div className="rf-card p-5">
        <div className="text-sm text-gray-600 mb-3">Review Distribution</div>
        {isEmptyReviewDist ? (
          <EmptyState title="Review Distribution" />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={reviewDist}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="star" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="Count" fill={palette.amber} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="rf-card p-5">
        <div className="text-sm text-gray-600 mb-3">Top Products (30 days)</div>
        {isEmptyTopProducts ? (
          <EmptyState title="Top Products" />
        ) : (
          (() => {
            const shorten = (s) => {
              if (!s) return '';
              const max = 28;
              return s.length > max ? s.slice(0, max - 1) + '…' : s;
            };
            const data = topProducts.map(p => ({
              nameFull: p.ProductName,
              nameShort: shorten(p.ProductName),
              qty: Number(p.Qty || 0)
            }));
            const chartHeight = Math.max(360, Math.min(12, data.length) * 48 + 120);
            return (
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart
                  data={data}
                  layout="vertical"
                  margin={{ left: 8, right: 16, top: 12, bottom: 12 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={palette.slateLight} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="nameShort"
                    width={180}
                    tick={{ fontSize: 12, fill: palette.gray }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [value, 'Qty']}
                    labelFormatter={(label, payload) =>
                      (payload && payload[0] && payload[0].payload?.nameFull) || label
                    }
                  />
                  <Legend />
                  <Bar dataKey="qty" name="Qty" fill={palette.blue} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            );
          })()
        )}
      </div>
      <div className="rf-card p-5">
        <div className="text-sm text-gray-600 mb-3">Low Stock Alerts</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-gray-600 mb-2">Products</div>
            {lowStock.products.length === 0 ? (
              <div className="text-sm text-gray-500">No products below threshold</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="px-2 py-1">Name</th>
                    <th className="px-2 py-1">SKU</th>
                    <th className="px-2 py-1">Qty</th>
                    <th className="px-2 py-1">Threshold</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.products.slice(0,10).map((p, idx) => (
                    <tr key={idx} className="border-t border-border">
                      <td className="px-2 py-1">{p.ProductName}</td>
                      <td className="px-2 py-1">{p.SKU}</td>
                      <td className="px-2 py-1">{p.StockQuantity}</td>
                      <td className="px-2 py-1">{p.LowStockThreshold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-2">Variants</div>
            {lowStock.variants.length === 0 ? (
              <div className="text-sm text-gray-500">No variants below threshold</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="px-2 py-1">Product</th>
                    <th className="px-2 py-1">Variant</th>
                    <th className="px-2 py-1">SKU</th>
                    <th className="px-2 py-1">Qty</th>
                    <th className="px-2 py-1">Threshold</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.variants.slice(0,10).map((v, idx) => (
                    <tr key={idx} className="border-t border-border">
                      <td className="px-2 py-1">{v.ProductName}</td>
                      <td className="px-2 py-1">{v.VariantName}</td>
                      <td className="px-2 py-1">{v.VariantSKU}</td>
                      <td className="px-2 py-1">{v.StockQuantity}</td>
                      <td className="px-2 py-1">{v.LowStockThreshold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {loading && <div className="text-sm text-gray-500">Loading metrics…</div>}
    </div>
  );
};

export default AdminDashboard;
