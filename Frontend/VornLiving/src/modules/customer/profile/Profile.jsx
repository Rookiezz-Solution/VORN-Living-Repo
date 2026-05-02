import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
    getProfileSummary, updateProfile,
    getOrders, getOrderDetails, cancelOrder, requestReplacement 
} from '../../../services/api';
import { useNotification } from '../../../context/NotificationContext';
import { formatINR } from '../../../utils/formatINR';
import { 
    User, Package, Heart, LogOut,
    Edit2, CheckCircle, Truck, XCircle 
} from 'lucide-react';
import { orderStatusBadgeClass } from '../../../utils/orderStatusBadge';

const Profile = () => {
    const { showNotification } = useNotification();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [summary, setSummary] = useState({ orders: 0, pendingOrders: 0, wishlist: 0 });
    
    // Data States
    const [orders, setOrders] = useState([]);
    const [ordersPage, setOrdersPage] = useState(1);
    const [ordersTotal, setOrdersTotal] = useState(0);
    const [selectedOrder, setSelectedOrder] = useState(null); // For order details modal/view
    const STATUS_STEPS = ['Pending', 'Processing', 'Packed', 'Shipped', 'OutForDelivery', 'Delivered'];

    // Edit Profile State
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({ fullName: '', email: '', phoneNumber: '' });

    const [cancelOrderId, setCancelOrderId] = useState(null);
    const [cancelReason, setCancelReason] = useState('');
    const [replaceOrderId, setReplaceOrderId] = useState(null);
    const [replacementForm, setReplacementForm] = useState({ orderItemId: null, reason: '', reasonCategory: '', imageUrl: '' });
    
    useEffect(() => {
        const open = !!selectedOrder;
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [selectedOrder]);

    useEffect(() => {
        const checkAuth = () => {
            const storedUser = localStorage.getItem('user');
            if (!storedUser) {
                navigate('/auth', { state: { from: '/profile' } });
                return;
            }
            setUser(JSON.parse(storedUser));
            fetchProfileData();
        };
        checkAuth();
    }, [navigate]);

    const fetchProfileData = async () => {
        setLoading(true);
        try {
            const data = await getProfileSummary();
            setSummary(data.counts);
            // Update user state with latest from DB
            if (data.user) {
                setUser(data.user);
                localStorage.setItem('user', JSON.stringify(data.user));
            }
        } catch (error) {
            console.error(error);
            // showNotification("Failed to load profile data", 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- Tab Handlers ---
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === 'orders' || tab === 'tracking') fetchOrders();
        if (tab === 'wishlist') navigate('/wishlist');
    };

    const fetchOrders = async (page = 1) => {
        try {
            const res = await getOrders(page, 10);
            if (page === 1) {
                setOrders(res.items || []);
            } else {
                setOrders(prev => [...prev, ...(res.items || [])]);
            }
            setOrdersPage(res.page || page);
            setOrdersTotal(res.totalCount || (res.items?.length || 0));
        } catch (error) {
            console.error("Fetch Orders Error:", error);
            showNotification("Failed to load orders", 'error');
        }
    };

    // --- Profile Actions ---
    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        try {
            const updated = await updateProfile(profileForm);
            setUser(updated.user);
            localStorage.setItem('user', JSON.stringify(updated.user));
            setIsEditingProfile(false);
            showNotification("Profile updated successfully", 'success');
        } catch (error) {
            console.error("Profile Update Error:", error);
            showNotification("Failed to update profile", 'error');
        }
    };

    const startEditProfile = () => {
        setProfileForm({
            fullName: user.FullName,
            email: user.Email,
            phoneNumber: user.PhoneNumber || ''
        });
        setIsEditingProfile(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token'); // If used
        window.dispatchEvent(new Event('userUpdated')); // Update Header
        showNotification("Logged out successfully", 'success');
        navigate('/');
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Profile...</div>;
    if (!user) return null;

    // --- Render Components ---

    const SidebarItem = ({ id, icon: Icon, label, danger = false }) => (
        <button
            onClick={() => id === 'logout' ? handleLogout() : handleTabChange(id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === id 
                ? 'bg-primary text-secondary shadow-sm border border-primary' 
                : danger 
                    ? 'text-red-500 hover:bg-red-50' 
                    : 'text-secondary hover:bg-background'
            }`}
        >
            {React.createElement(Icon, { size: 20 })}
            <span className="font-medium">{label}</span>
        </button>
    );

    const renderDashboard = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-6">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                    {user.FullName ? user.FullName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Hello, {user.FullName} 👋</h2>
                    <p className="text-gray-500">{user.Email}</p>
                    <p className="text-sm text-gray-400 mt-1">Member since {new Date(user.CreatedAt).toLocaleDateString()}</p>
                </div>
                <button onClick={() => setActiveTab('profile')} className="ml-auto px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">
                    Edit Profile
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Orders', value: summary.orders, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Pending', value: summary.pendingOrders, icon: Truck, color: 'text-orange-600', bg: 'bg-orange-50' },
                    { label: 'Wishlist', value: summary.wishlist, icon: Heart, color: 'text-red-600', bg: 'bg-red-50' },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
                        <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
                            {React.createElement(stat.icon, { size: 24 })}
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                            <p className="text-xs text-gray-500">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderProfile = () => (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Personal Information</h3>
                {!isEditingProfile && (
                    <button onClick={startEditProfile} className="flex items-center space-x-2 text-primary hover:text-primary/80">
                        <Edit2 size={16} /> <span>Edit</span>
                    </button>
                )}
            </div>

            {isEditingProfile ? (
                <form onSubmit={handleProfileUpdate} className="space-y-4 max-w-lg">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input type="text" required value={profileForm.fullName} onChange={e => setProfileForm({...profileForm, fullName: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input type="email" required value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <input type="tel" value={profileForm.phoneNumber} onChange={e => setProfileForm({...profileForm, phoneNumber: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" />
                    </div>
                    <div className="flex space-x-3 pt-4">
                        <button type="submit" className="px-6 py-2 rf-btn-primary rounded-lg transition">Save Changes</button>
                        <button type="button" onClick={() => setIsEditingProfile(false)} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                    </div>
                </form>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <p className="text-sm text-gray-500">Full Name</p>
                        <p className="font-medium text-gray-900">{user.FullName}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Email Address</p>
                        <p className="font-medium text-gray-900">{user.Email}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Phone Number</p>
                        <p className="font-medium text-gray-900">{user.PhoneNumber || 'Not set'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">User Type</p>
                        <p className="font-medium text-gray-900">{user.UserType}</p>
                    </div>
                </div>
            )}
        </div>
    );

    const fetchOrderDetails = async (orderId) => {
        try {
            const details = await getOrderDetails(orderId);
            setSelectedOrder(details);
        } catch (error) {
            console.error("Fetch Order Details Error:", error);
            showNotification("Failed to load order details", 'error');
        }
    };
    const renderTimeline = () => {
        const currentStatus = selectedOrder?.OrderStatus || 'Pending';
        const history = selectedOrder?.statusHistory || [];
        const completed = new Set(history.map(h => h.NewStatus));
        return (
            <div className="relative">
                <div className="grid grid-cols-6 gap-4">
                    {STATUS_STEPS.map((step, idx) => {
                        const isDone = completed.has(step) || STATUS_STEPS.indexOf(currentStatus) >= idx;
                        const entry = history.find(h => h.NewStatus === step);
                        return (
                            <div key={step} className="flex flex-col items-center text-center">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center border ${isDone ? 'bg-primary text-secondary border-primary' : 'bg-gray-100 text-gray-400 border-border'}`}>
                                    {isDone ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5 opacity-0" />}
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

    const renderOrders = () => (
        <div className="space-y-6 animate-fade-in">
            <h3 className="text-xl font-bold text-gray-800">My Orders</h3>
            <div className="space-y-4">
                {orders.map(order => (
                    <div key={order.OrderID} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 hover:border-primary/30 transition-colors">
                        <div>
                            <div className="flex items-center space-x-3">
                                <span className="font-bold text-lg text-gray-800">Order #{order.OrderNumber || order.OrderID}</span>
                                <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${orderStatusBadgeClass(order.OrderStatus)}`}>
                                    {order.OrderStatus}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">Placed on {new Date(order.CreatedAt).toLocaleDateString()}</p>
                            <p className="font-medium mt-2">Total: {formatINR(order.TotalAmount)}</p>
                        </div>
                        <button onClick={() => fetchOrderDetails(order.OrderID)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                            View Details
                        </button>
                    </div>
                ))}
                {orders.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <Package size={48} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500">No orders found.</p>
                        <button onClick={() => navigate('/shop')} className="mt-4 text-primary font-medium hover:underline">Start Shopping</button>
                    </div>
                )}
            </div>

            {orders.length < ordersTotal && (
                <div className="flex justify-center">
                    <button
                        onClick={() => fetchOrders(ordersPage + 1)}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                    >
                        Load More
                    </button>
                </div>
            )}

            {/* Order Details Modal */}
            {selectedOrder && createPortal(
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-xl animate-scale-up">
                        <div className="flex justify-between items-center mb-6 border-b pb-4">
                            <div>
                                <h3 className="text-xl font-bold">Order #{selectedOrder.OrderNumber || selectedOrder.OrderID}</h3>
                                <p className="text-sm text-gray-500">Placed on {new Date(selectedOrder.CreatedAt).toLocaleString()}</p>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-full"><XCircle size={24} /></button>
                        </div>
                        <div className="mb-6">
                            <h4 className="font-semibold text-gray-700 mb-2">Tracking</h4>
                            {renderTimeline()}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div>
                                <h4 className="font-semibold text-gray-700 mb-2">Shipping Address</h4>
                                {selectedOrder.shipping ? (
                                    <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                                        <p>{selectedOrder.shipping.CourierName}</p>
                                        <p>Tracking: {selectedOrder.shipping.TrackingNumber || 'Pending'}</p>
                                        <p>Status: {selectedOrder.shipping.ShippingStatus}</p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">Shipping details not available yet.</p>
                                )}
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-700 mb-2">Payment Summary</h4>
                                <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg space-y-1">
                                    <div className="flex justify-between"><span>Subtotal:</span> <span>{formatINR(selectedOrder.SubTotal)}</span></div>
                                    <div className="flex justify-between"><span>Shipping:</span> <span>{formatINR(selectedOrder.ShippingAmount)}</span></div>
                                    <div className="flex justify-between"><span>Tax:</span> <span>{formatINR(selectedOrder.TaxAmount)}</span></div>
                                    <div className="flex justify-between font-bold text-gray-900 pt-2 border-t mt-2"><span>Total:</span> <span>{formatINR(selectedOrder.TotalAmount)}</span></div>
                                </div>
                            </div>
                        </div>

                        <h4 className="font-semibold text-gray-700 mb-3">Items Ordered</h4>
                        <div className="space-y-3">
                            {selectedOrder.items && selectedOrder.items.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center space-x-4">
                                        <div className="h-12 w-12 bg-gray-100 rounded-md flex items-center justify-center">
                                            <Package size={20} className="text-gray-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{item.ProductName}</p>
                                            <p className="text-xs text-gray-500">Qty: {item.Quantity} | SKU: {item.SKU}</p>
                                        </div>
                                    </div>
                                    <p className="font-medium">{formatINR(item.TotalPrice)}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 flex justify-end gap-3">
                             <button onClick={() => setSelectedOrder(null)} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Close</button>
                             {selectedOrder.OrderStatus !== 'Cancelled' && selectedOrder.OrderStatus !== 'Delivered' && (
                                <button onClick={() => { setCancelOrderId(selectedOrder.OrderID); setCancelReason(''); }} className="px-6 py-2 rf-btn-secondary rounded-lg transition">Cancel Order</button>
                             )}
                             <button onClick={() => { setReplaceOrderId(selectedOrder.OrderID); setReplacementForm({ orderItemId: selectedOrder.items?.[0]?.OrderItemID || null, reason: '', reasonCategory: '', imageUrl: '' }); }} className="px-6 py-2 rf-btn-primary rounded-lg transition">Request Replacement</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {cancelOrderId && createPortal(
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-scale-up">
                        <h3 className="text-lg font-bold text-secondary">Cancel Order</h3>
                        <p className="text-sm text-gray-600 mt-2">Please provide a reason. Refunds are not supported; you may request a replacement instead.</p>
                        <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} className="mt-4 w-full border border-border rounded-xl p-3" placeholder="Reason"></textarea>
                        <div className="mt-6 flex justify-end gap-3">
                            <button type="button" onClick={() => setCancelOrderId(null)} className="px-4 py-2 border border-border rounded-xl">Close</button>
                            <button type="button" onClick={async () => {
                                try {
                                    await cancelOrder(cancelOrderId, cancelReason);
                                    showNotification('Order cancelled', 'success');
                                    setCancelOrderId(null);
                                    setSelectedOrder(null);
                                    fetchOrders();
                                } catch (err) {
                                    showNotification(err?.message || 'Failed to cancel order', 'error');
                                }
                            }} className="px-4 py-2 rf-btn-secondary rounded-xl transition">Confirm Cancel</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {replaceOrderId && createPortal(
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl animate-scale-up">
                        <h3 className="text-lg font-bold text-secondary">Request Replacement</h3>
                        <div className="grid grid-cols-1 gap-3 mt-4">
                            <div>
                                <label className="text-sm text-gray-600">Item</label>
                                <select value={replacementForm.orderItemId || ''} onChange={e => setReplacementForm({ ...replacementForm, orderItemId: Number(e.target.value) })} className="w-full border border-border rounded-xl p-2">
                                    {(selectedOrder?.items || []).map((it) => (
                                        <option key={it.OrderItemID} value={it.OrderItemID}>{it.ProductName} • Qty {it.Quantity}</option>
                                    ))}
                                </select>
                                {(!selectedOrder?.items || selectedOrder.items.length === 0) && (
                                    <p className="text-xs text-gray-600 mt-1">No items found for this order.</p>
                                )}
                            </div>
                            <div>
                                <label className="text-sm text-gray-600">Reason Category</label>
                                <select value={replacementForm.reasonCategory} onChange={e => setReplacementForm({ ...replacementForm, reasonCategory: e.target.value })} className="w-full border border-border rounded-xl p-2">
                                    <option value="">Select</option>
                                    <option value="Damaged">Damaged</option>
                                    <option value="Wrong Item">Wrong Item</option>
                                    <option value="Missing Parts">Missing Parts</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm text-gray-600">Reason</label>
                                <textarea value={replacementForm.reason} onChange={e => setReplacementForm({ ...replacementForm, reason: e.target.value })} className="w-full border border-border rounded-xl p-2" placeholder="Describe the issue"></textarea>
                            </div>
                            <div>
                                <label className="text-sm text-gray-600">Image Evidence (optional)</label>
                                <input type="file" accept="image/*" onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) { setReplacementForm({ ...replacementForm, imageBase64: '' }); return; }
                                    const reader = new FileReader();
                                    reader.onload = () => setReplacementForm({ ...replacementForm, imageBase64: reader.result });
                                    reader.readAsDataURL(file);
                                }} className="w-full border border-border rounded-xl p-2" />
                                <p className="text-xs text-gray-500 mt-1">You can also paste a URL if preferred.</p>
                                <input type="url" value={replacementForm.imageUrl || ''} onChange={e => setReplacementForm({ ...replacementForm, imageUrl: e.target.value })} className="mt-2 w-full border border-border rounded-xl p-2" placeholder="https://..." />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button type="button" onClick={() => setReplaceOrderId(null)} className="px-4 py-2 border border-border rounded-xl">Close</button>
                            <button type="button" onClick={async () => {
                                try {
                                    if (!replacementForm.orderItemId || !replacementForm.reasonCategory || !replacementForm.reason) {
                                        showNotification('Please fill all required fields', 'error');
                                        return;
                                    }
                                    await requestReplacement(replaceOrderId, replacementForm);
                                    showNotification('Replacement requested', 'success');
                                    setReplaceOrderId(null);
                                    setSelectedOrder(null);
                                    fetchOrders();
                                } catch (err) {
                                    showNotification(err?.message || 'Failed to request replacement', 'error');
                                }
                            }} className="px-4 py-2 rf-btn-primary rounded-xl transition">Submit Request</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
    const renderTracking = () => (
        <div className="space-y-6 animate-fade-in">
            <h3 className="text-xl font-bold text-gray-800">Order Tracking</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orders.map(o => (
                    <button
                        key={o.OrderID}
                        onClick={() => navigate(`/order/${o.OrderID}/track`)}
                        className="text-left p-4 rounded-xl border hover:border-primary transition"
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
            {orders.length < ordersTotal && (
                <div className="flex justify-center">
                    <button
                        onClick={() => fetchOrders(ordersPage + 1)}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                    >
                        Load More
                    </button>
                </div>
            )}
        </div>
    );

    

    return (
        <div className="min-h-screen rf-page py-8 px-4 sm:px-6 lg:px-8" data-reveal>
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-secondary mb-8">My Account</h1>
                
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="rf-card p-4 space-y-2 sticky top-24">
                            <SidebarItem id="dashboard" icon={User} label="Dashboard" />
                            <SidebarItem id="profile" icon={Edit2} label="Personal Information" />
                            <SidebarItem id="orders" icon={Package} label="My Orders" />
                            <SidebarItem id="tracking" icon={Truck} label="Order Tracking" />
                            <SidebarItem id="wishlist" icon={Heart} label="Wishlist" />
                            <div className="pt-4 mt-4 border-t border-border">
                                <SidebarItem id="logout" icon={LogOut} label="Logout" danger />
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3">
                        {activeTab === 'dashboard' && renderDashboard()}
                        {activeTab === 'profile' && renderProfile()}
                        {activeTab === 'orders' && renderOrders()}
                        {activeTab === 'tracking' && renderTracking()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
