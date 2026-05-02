import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, MapPin, Plus, Trash2 } from 'lucide-react';
import { placeOrder, getCart, getAddresses, getProductById, createRazorpayOrder, verifyRazorpayPayment, deleteAddress } from '../../../services/api';
import { useNotification } from '../../../context/NotificationContext';
import { formatINR } from '../../../utils/formatINR';

function loadRazorpayScript() {
    return new Promise((resolve) => {
        if (document.getElementById('razorpay-script')) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.id = 'razorpay-script';
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
}

const computeCheckoutTotals = (items) => {
    const subTotal = (Array.isArray(items) ? items : []).reduce((acc, it) => {
        const qty = Number(it?.quantity || 0);
        const price = Number(it?.price || 0);
        if (!Number.isFinite(qty) || !Number.isFinite(price)) return acc;
        return acc + (price * qty);
    }, 0);
    const shipping = subTotal > 100 ? 0 : 15;
    const tax = 0;
    const total = subTotal + shipping + tax;
    return { subTotal, shipping, tax, total };
};

const Checkout = () => {
    const { showNotification } = useNotification();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '', phone: '', street: '', city: '', state: '', pincode: '', country: 'India'
    });
    const [savedAddresses, setSavedAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [showNewAddressForm, setShowNewAddressForm] = useState(false);
    const [orderInfo, setOrderInfo] = useState(null);
    const [orderItems, setOrderItems] = useState([]);
    const [totals, setTotals] = useState({ subTotal: 0, shipping: 0, tax: 0, total: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPayment, setSelectedPayment] = useState('cod'); // cod | online
    const [payBusy, setPayBusy] = useState(false);
    const [successOpen, setSuccessOpen] = useState(false);
    const [successData, setSuccessData] = useState({ orderNumber: '', paymentId: '' });
    const [failureOpen, setFailureOpen] = useState(false);
    const [failureReason, setFailureReason] = useState('');
    const [confirmDeleteAddress, setConfirmDeleteAddress] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    useEffect(() => {
        // Check login
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            showNotification("Please login to proceed to checkout", 'error');
            navigate('/auth', { state: { from: '/checkout' } }); // Redirect to login with state
            return;
        }

        const fetchData = async () => {
            try {
                // Fetch Cart and Addresses in parallel
                const [cartData, addressData] = await Promise.all([
                    getCart(user.UserID),
                    getAddresses(1, 10)
                ]);

                setTotals(cartData.totals || { subTotal: 0, shipping: 0, tax: 0, total: 0 });
                
                const buyNowProductId = searchParams.get('productId');
                const buyNowQty = Number(searchParams.get('qty') || '1');
                if (!buyNowProductId && (!cartData.items || cartData.items.length === 0)) {
                    showNotification("Your cart is empty", 'info');
                    navigate('/cart');
                    return;
                }

                const addressItems = Array.isArray(addressData) ? addressData : (addressData?.items || []);
                setSavedAddresses(addressItems);
                
                // Determine order items: buy-now vs full cart
                if (buyNowProductId) {
                    const p = await getProductById(buyNowProductId);
                    if (p) {
                        const itemsForBuyNow = [{
                            productId: p.ProductID,
                            name: p.ProductName,
                            sku: p.SKU || 'N/A',
                            quantity: buyNowQty,
                            price: p.SalePrice || p.RegularPrice
                        }];
                        setOrderItems(itemsForBuyNow);
                        setTotals(computeCheckoutTotals(itemsForBuyNow));
                    } else {
                        setOrderItems([]);
                    }
                } else {
                    const itemsFromCart = (cartData.items || []).map(it => ({
                        productId: it.productId,
                        name: it.name,
                        sku: it.variantSku || it.sku || 'N/A',
                        variantId: it.variantId || null,
                        variantName: it.variantName || null,
                        quantity: it.quantity,
                        price: it.price
                    }));
                    setOrderItems(itemsFromCart);
                    setTotals(cartData.totals || computeCheckoutTotals(itemsFromCart));
                }

                // Auto-select default/first address for convenience
                const defaultAddr = addressItems.find(a => a.IsDefault);
                if (defaultAddr) {
                    handleSelectSavedAddress(defaultAddr);
                } else if (addressItems.length > 0) {
                    handleSelectSavedAddress(addressItems[0]);
                } else {
                    setSelectedAddressId(null);
                    setShowNewAddressForm(true);
                }

            } catch (error) {
                console.error("Failed to load checkout data", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [navigate, showNotification, searchParams]);

    const handleSelectSavedAddress = (addr) => {
        setSelectedAddressId(addr.AddressID);
        setFormData({
            name: addr.FullName,
            phone: addr.PhoneNumber,
            street: (addr.StreetAddress1 || addr.AddressLine1 || '') + ((addr.StreetAddress2 || addr.AddressLine2) ? `, ${addr.StreetAddress2 || addr.AddressLine2}` : ''),
            city: addr.City,
            state: addr.State,
            pincode: addr.PostalCode || addr.PinCode || '',
            country: addr.Country || 'India'
        });
        setShowNewAddressForm(false);
    };

    const handleAddressSubmit = (e) => {
        e.preventDefault();
        if (!formData.name || !formData.street) {
            showNotification("Please select or enter a shipping address", 'error');
            return;
        }
        setStep(2);
    };

    const handleConfirmDeleteAddress = async () => {
        if (!confirmDeleteAddress || deleteBusy) return;
        const deletingId = confirmDeleteAddress.AddressID;
        setDeleteBusy(true);
        try {
            await deleteAddress(deletingId);
            const deletingIdStr = String(deletingId);
            setSavedAddresses((prev) => {
                const remaining = prev.filter((a) => String(a.AddressID) !== deletingIdStr);
                if (String(selectedAddressId) === deletingIdStr) {
                    const next = remaining.find((a) => a.IsDefault) || remaining[0] || null;
                    if (next) {
                        handleSelectSavedAddress(next);
                    } else {
                        setSelectedAddressId(null);
                        setShowNewAddressForm(true);
                        setFormData({ name: '', phone: '', street: '', city: '', state: '', pincode: '', country: 'India' });
                    }
                    setStep(1);
                }
                return remaining;
            });

            showNotification('Address deleted', 'success');
        } catch (e) {
            showNotification(e?.message || 'Failed to delete address', 'error');
        } finally {
            setDeleteBusy(false);
            setConfirmDeleteAddress(null);
        }
    };

    const startOnlinePayment = async ({ userId, user, orderItemsSnapshot, addressSnapshot, addressIdSnapshot }) => {
        if (!import.meta.env.VITE_RAZORPAY_KEY_ID) {
            throw new Error('VITE_RAZORPAY_KEY_ID is missing. Restart Vite after updating Frontend/VornLiving/.env');
        }

        const loaded = await loadRazorpayScript();
        if (!loaded) throw new Error('Razorpay failed to load. Check your internet connection.');

        const computed = computeCheckoutTotals(orderItemsSnapshot);
        const amountPaise = Math.max(1, Math.round(Number(computed.total || 0) * 100));
        const data = await createRazorpayOrder(amountPaise);
        if (!data?.order_id) throw new Error('Could not initiate payment. Please try again.');

        const prefillName = user?.FullName || user?.name || addressSnapshot?.name || '';
        const prefillEmail = user?.Email || user?.email || '';
        const prefillContact = user?.PhoneNumber || user?.phone || addressSnapshot?.phone || '';

        const options = {
            key: import.meta.env.VITE_RAZORPAY_KEY_ID,
            amount: data.amount,
            currency: data.currency || 'INR',
            order_id: data.order_id,
            name: 'VornLiving',
            description: 'Order Payment',
            theme: { color: '#C9A96E' },
            prefill: { name: prefillName, email: prefillEmail, contact: prefillContact },
            handler: async function (response) {
                try {
                    const verifyData = await verifyRazorpayPayment({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature
                    });

                    if (!verifyData?.success) {
                        setFailureReason('Payment verification failed. Contact support.');
                        setFailureOpen(true);
                        return;
                    }

                    const placed = await placeOrder({
                        items: orderItemsSnapshot,
                        address: addressSnapshot,
                        addressId: addressIdSnapshot || null,
                        paymentMethod: 'RAZORPAY',
                        payment: {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        },
                        userId: userId
                    });

                    setSuccessData({
                        orderNumber: placed?.orderNumber || '',
                        paymentId: response.razorpay_payment_id || ''
                    });
                    setSuccessOpen(true);
                } catch {
                    setFailureReason('Failed to place order. Please try again.');
                    setFailureOpen(true);
                } finally {
                    setPayBusy(false);
                }
            },
            modal: {
                ondismiss: function () {
                    showNotification("Payment was not completed. You can try again.", 'info');
                    setPayBusy(false);
                }
            }
        };

        if (!window?.Razorpay) throw new Error('Razorpay is not available after script load');
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
            setFailureReason(response?.error?.description || 'Payment failed. Please try again.');
            setFailureOpen(true);
            setPayBusy(false);
        });
        rzp.open();
    };

    const handlePlaceOrder = async () => {
        try {
            if (payBusy) return;
            setPayBusy(true);
            const user = JSON.parse(localStorage.getItem('user'));
            const userId = user ? user.UserID : null;

            if (!userId) {
                 showNotification("Please login to place order", 'error');
                 navigate('/auth');
                 setPayBusy(false);
                 return;
            }
            if (!selectedAddressId && (!formData.name || !formData.street)) {
                showNotification("Please select or enter a shipping address", 'error');
                setStep(1);
                setPayBusy(false);
                return;
            }

            if (selectedPayment === 'cod') {
                const response = await placeOrder({
                    items: orderItems,
                    address: formData,
                    addressId: selectedAddressId || null,
                    paymentMethod: 'COD',
                    userId: userId
                });

                setOrderInfo(response);
                setStep(3);
                showNotification("Order placed successfully!", 'success');
                setPayBusy(false);
                return;
            }

            await startOnlinePayment({
                userId,
                user,
                orderItemsSnapshot: orderItems,
                addressSnapshot: formData,
                addressIdSnapshot: selectedAddressId
            });
        } catch (e) {
            showNotification(e?.message || "Failed to place order. Please try again.", 'error');
            setPayBusy(false);
        }
    };

    if (isLoading) return <div className="min-h-[60vh] flex items-center justify-center text-gray-500">Loading Checkout...</div>;


    if (step === 3 && orderInfo) {
        return (
            <div className="container mx-auto px-4 py-20 text-center">
                <CheckCircle className="h-24 w-24 text-green-500 mx-auto mb-6" />
                <h1 className="text-3xl font-bold text-secondary mb-4">Order Confirmed!</h1>
                <p className="text-gray-600 mb-8">Thank you for your purchase. Your order ID is <span className="font-mono font-bold">#{orderInfo.orderNumber}</span>.</p>
                <div className="flex justify-center space-x-4">
                    <button onClick={() => navigate('/shop')} className="rf-btn-primary px-6 py-2 transition">
                        Continue Shopping
                    </button>
                    <button onClick={() => navigate(`/order/${orderInfo.orderId}/track`)} className="rf-btn-secondary px-6 py-2 transition">
                        Track Order
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-10 animate-fade-in" data-reveal>
            {successOpen && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" style={{ backdropFilter: 'blur(6px)' }} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg px-10 py-10">
                        <div className="flex justify-center">
                            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle className="h-10 w-10 text-green-600" />
                            </div>
                        </div>
                        <div className="mt-6 text-center">
                            <div className="text-2xl font-bold text-secondary">Payment Successful!</div>
                            <div className="mt-2 text-gray-600">Your order has been placed successfully.</div>
                            <div className="mt-6 space-y-1 text-sm text-secondary/80">
                                {successData.orderNumber ? <div>Order #{successData.orderNumber}</div> : null}
                                {successData.paymentId ? <div>Payment ID: {successData.paymentId}</div> : null}
                            </div>
                        </div>
                        <div className="mt-8 flex justify-center">
                            <button
                                type="button"
                                className="rf-btn-primary px-8 py-3 transition"
                                onClick={() => {
                                    setSuccessOpen(false);
                                    navigate('/shop');
                                }}
                            >
                                Continue Shopping
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {failureOpen && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" style={{ backdropFilter: 'blur(6px)' }} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg px-10 py-10">
                        <div className="flex justify-center">
                            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                                <XCircle className="h-10 w-10 text-red-600" />
                            </div>
                        </div>
                        <div className="mt-6 text-center">
                            <div className="text-2xl font-bold text-secondary">Payment Failed</div>
                            <div className="mt-2 text-red-600 text-sm">{failureReason}</div>
                        </div>
                        <div className="mt-8 flex justify-center gap-3">
                            <button
                                type="button"
                                className="rf-btn-primary px-6 py-3 transition"
                                onClick={async () => {
                                    setFailureOpen(false);
                                    setFailureReason('');
                                    const user = JSON.parse(localStorage.getItem('user'));
                                    const userId = user ? user.UserID : null;
                                    if (!userId) return;
                                    setPayBusy(true);
                                    await startOnlinePayment({
                                        userId,
                                        user,
                                        orderItemsSnapshot: orderItems,
                                        addressSnapshot: formData,
                                        addressIdSnapshot: selectedAddressId
                                    });
                                }}
                            >
                                Retry Payment
                            </button>
                            <button
                                type="button"
                                className="border border-border px-6 py-3 rounded-xl bg-white hover:bg-gray-50 transition"
                                onClick={() => {
                                    setFailureOpen(false);
                                    setFailureReason('');
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {confirmDeleteAddress && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" style={{ backdropFilter: 'blur(6px)' }} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md px-8 py-8">
                        <div className="text-xl font-bold text-secondary">Delete Address</div>
                        <div className="mt-2 text-gray-600">Are you sure delete the address?</div>
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                className="border border-border px-5 py-2.5 rounded-xl bg-white hover:bg-gray-50 transition"
                                onClick={() => setConfirmDeleteAddress(null)}
                                disabled={deleteBusy}
                            >
                                No
                            </button>
                            <button
                                type="button"
                                className="rf-btn-primary px-5 py-2.5 transition disabled:opacity-60"
                                onClick={handleConfirmDeleteAddress}
                                disabled={deleteBusy}
                            >
                                {deleteBusy ? 'Deleting…' : 'Yes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="mb-8">
                <p className="text-sm text-gray-500">
                    <button type="button" onClick={() => navigate('/')} className="hover:text-primary">Home</button>
                    <span className="mx-2">/</span>
                    <button type="button" onClick={() => navigate('/cart')} className="hover:text-primary">Cart</button>
                    <span className="mx-2">/</span>
                    <span className="text-secondary font-medium">Checkout</span>
                </p>
                <h1 className="text-3xl md:text-4xl font-bold text-secondary mt-2">Checkout</h1>
                <div className="flex items-center gap-2 mt-4">
                    <div className={`h-2 w-16 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-gray-200'}`} />
                    <div className={`h-2 w-16 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`} />
                    <div className={`h-2 w-16 rounded-full ${step >= 3 ? 'bg-primary' : 'bg-gray-200'}`} />
                </div>
            </div>
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Main Form Area */}
                <div className="w-full lg:w-2/3">
                    {step === 1 && (
                        <div className="space-y-6 animate-slide-up">
                            {savedAddresses.length > 0 && (
                                <div className="rf-card p-6">
                                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                        <MapPin className="h-5 w-5 text-primary" />
                                        Select Saved Address
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {savedAddresses.map((addr) => (
                                            <div
                                                key={addr.AddressID}
                                                onClick={() => handleSelectSavedAddress(addr)}
                                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                                    selectedAddressId === addr.AddressID
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-border hover:border-primary/50 bg-white'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="font-bold text-secondary">{addr.AddressLabel}</span>
                                                    <div className="flex items-center gap-2">
                                                        {addr.IsDefault && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Default</span>}
                                                        <button
                                                            type="button"
                                                            className="p-2 rounded-xl border border-border bg-white hover:border-primary transition"
                                                            title="Delete address"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setConfirmDeleteAddress(addr);
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-secondary" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-sm font-medium text-gray-800">{addr.FullName}</p>
                                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                                    {addr.StreetAddress1}{addr.StreetAddress2 ? `, ${addr.StreetAddress2}` : ''}, {addr.City}, {addr.State} - {addr.PostalCode}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">{addr.PhoneNumber}</p>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedAddressId(null);
                                                setShowNewAddressForm(true);
                                                setFormData({ name: '', phone: '', street: '', city: '', state: '', pincode: '', country: 'India' });
                                            }}
                                            className={`p-4 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-primary transition-all ${!selectedAddressId && showNewAddressForm ? 'border-primary bg-primary/5 text-primary' : ''}`}
                                        >
                                            <Plus className="h-6 w-6" />
                                            <span className="text-sm font-medium">Add New Address</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {(showNewAddressForm || savedAddresses.length === 0) && (
                                <div className="rf-card p-6">
                                    <h2 className="text-xl font-semibold mb-4">
                                        {savedAddresses.length === 0 ? 'Shipping Address' : 'Enter New Address'}
                                    </h2>
                                    <form onSubmit={handleAddressSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input
                                            type="text"
                                            placeholder="Full Name"
                                            required
                                            className="rf-input w-full"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                        <input
                                            type="tel"
                                            placeholder="Phone Number"
                                            required
                                            className="rf-input w-full"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Street Address"
                                            required
                                            className="rf-input w-full md:col-span-2"
                                            value={formData.street}
                                            onChange={e => setFormData({ ...formData, street: e.target.value })}
                                        />
                                        <input
                                            type="text"
                                            placeholder="City"
                                            required
                                            className="rf-input w-full"
                                            value={formData.city}
                                            onChange={e => setFormData({ ...formData, city: e.target.value })}
                                        />
                                        <input
                                            type="text"
                                            placeholder="State"
                                            required
                                            className="rf-input w-full"
                                            value={formData.state}
                                            onChange={e => setFormData({ ...formData, state: e.target.value })}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Pincode"
                                            required
                                            className="rf-input w-full"
                                            value={formData.pincode}
                                            onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Country"
                                            disabled
                                            className="rf-input w-full bg-background text-gray-500 cursor-not-allowed"
                                            value={formData.country}
                                        />
                                        <div className="md:col-span-2 flex justify-end mt-4">
                                            <button
                                                type="submit"
                                                className="rf-btn-primary px-10 py-3 transition"
                                            >
                                                Continue to Payment
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {!showNewAddressForm && selectedAddressId && (
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setStep(2)}
                                        className="rf-btn-primary px-10 py-3 transition"
                                    >
                                        Continue to Payment
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="rf-card p-6 animate-slide-up">
                            <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
                            <div className="space-y-4">
                                <label className={`border p-4 rounded-xl flex items-center cursor-pointer transition ${selectedPayment === 'online' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary'}`}>
                                    <input type="radio" name="payment" className="mr-3" checked={selectedPayment === 'online'} onChange={() => setSelectedPayment('online')} />
                                    <span>Pay Online (Card / UPI / Net Banking)</span>
                                </label>
                                <label className={`border p-4 rounded-xl flex items-center cursor-pointer transition ${selectedPayment === 'cod' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary'}`}>
                                    <input type="radio" name="payment" className="mr-3" checked={selectedPayment === 'cod'} onChange={() => setSelectedPayment('cod')} />
                                    <span>Cash on Delivery</span>
                                </label>
                            </div>
                            <div className="flex justify-between mt-6">
                                <button onClick={() => setStep(1)} className="rf-link text-sm">Back</button>
                                <button onClick={handlePlaceOrder} className="rf-btn-primary px-8 py-3 transition disabled:opacity-60" disabled={payBusy}>
                                    {payBusy ? 'Processing…' : 'Place Order'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Order Summary Sidebar */}
                <div className="w-full lg:w-1/3">
                    <div className="lg:sticky lg:top-28 rf-card p-6 animate-slide-up">
                        <h3 className="font-bold text-lg mb-4">Order Summary</h3>
                        <div className="space-y-2 mb-4 text-sm text-gray-600">
                                <div className="flex justify-between"><span>Subtotal</span><span>{formatINR(totals.subTotal)}</span></div>
                                <div className="flex justify-between"><span>Shipping</span><span>{totals.shipping === 0 ? 'Free' : formatINR(totals.shipping)}</span></div>
                                <div className="flex justify-between font-bold text-lg mt-3 pt-3 border-t text-secondary"><span>Total</span><span>{formatINR(totals.total)}</span></div>
                            </div>
                        <p className="text-xs text-gray-500">By placing your order, you agree to our Terms of Service and Privacy Policy.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
