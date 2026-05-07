// import React, { useState, useEffect } from 'react';
// import { useNavigate, useSearchParams } from 'react-router-dom';
// import { CheckCircle, XCircle, MapPin, Plus, Trash2 } from 'lucide-react';
// import { placeOrder, getCart, getAddresses, getProductById, createRazorpayOrder, verifyRazorpayPayment, deleteAddress } from '../../../services/api';
// import { useNotification } from '../../../context/NotificationContext';
// import { formatINR } from '../../../utils/formatINR';

// function loadRazorpayScript() {
//     return new Promise((resolve) => {
//         if (document.getElementById('razorpay-script')) {
//             resolve(true);
//             return;
//         }
//         const script = document.createElement('script');
//         script.id = 'razorpay-script';
//         script.src = 'https://checkout.razorpay.com/v1/checkout.js';
//         script.onload = () => resolve(true);
//         script.onerror = () => resolve(false);
//         document.body.appendChild(script);
//     });
// }

// const computeCheckoutTotals = (items) => {
//     const subTotal = (Array.isArray(items) ? items : []).reduce((acc, it) => {
//         const qty = Number(it?.quantity || 0);
//         const price = Number(it?.price || 0);
//         if (!Number.isFinite(qty) || !Number.isFinite(price)) return acc;
//         return acc + (price * qty);
//     }, 0);
//     const shipping = subTotal > 100 ? 0 : 15;
//     const tax = 0;
//     const total = subTotal + shipping + tax;
//     return { subTotal, shipping, tax, total };
// };

// const Checkout = () => {
//     const { showNotification } = useNotification();
//     const navigate = useNavigate();
//     const [searchParams] = useSearchParams();
//     const [step, setStep] = useState(1);
//     const [formData, setFormData] = useState({
//         name: '', phone: '', street: '', city: '', state: '', pincode: '', country: 'India'
//     });
//     const [savedAddresses, setSavedAddresses] = useState([]);
//     const [selectedAddressId, setSelectedAddressId] = useState(null);
//     const [showNewAddressForm, setShowNewAddressForm] = useState(false);
//     const [orderInfo, setOrderInfo] = useState(null);
//     const [orderItems, setOrderItems] = useState([]);
//     const [totals, setTotals] = useState({ subTotal: 0, shipping: 0, tax: 0, total: 0 });
//     const [isLoading, setIsLoading] = useState(true);
//     const [selectedPayment, setSelectedPayment] = useState('cod'); // cod | online
//     const [payBusy, setPayBusy] = useState(false);
//     const [successOpen, setSuccessOpen] = useState(false);
//     const [successData, setSuccessData] = useState({ orderNumber: '', paymentId: '' });
//     const [failureOpen, setFailureOpen] = useState(false);
//     const [failureReason, setFailureReason] = useState('');
//     const [confirmDeleteAddress, setConfirmDeleteAddress] = useState(null);
//     const [deleteBusy, setDeleteBusy] = useState(false);
//     const [isGuest, setIsGuest] = useState(false);
//     const [guestEmail, setGuestEmail] = useState('');
//     const [saveDetails, setSaveDetails] = useState(false);
//     const [showSavePrompt, setShowSavePrompt] = useState(false);

//     const prefillGuestDetails = (email) => {
//         try {
//             const saved = localStorage.getItem('guest_' + email.trim().toLowerCase());
//             if (saved) {
//                 const data = JSON.parse(saved);
//                 setFormData(prev => ({ ...prev, ...data }));
//                 showNotification("We filled in your saved details!", 'success');
//             }
//         } catch {}
//     };

//     useEffect(() => {
//         const user = JSON.parse(localStorage.getItem('user'));
//         const guestMode = !user;
//         setIsGuest(guestMode);

//         const fetchData = async () => {
//             try {
//                 const userId = user ? user.UserID : null;
//                 const [cartData, addressData] = await Promise.all([
//                     getCart(userId),
//                     user ? getAddresses(1, 10) : Promise.resolve([])
//                 ]);

//                 setTotals(cartData.totals || { subTotal: 0, shipping: 0, tax: 0, total: 0 });

//                 const buyNowProductId = searchParams.get('productId');
//                 const buyNowQty = Number(searchParams.get('qty') || '1');
//                 if (!buyNowProductId && (!cartData.items || cartData.items.length === 0)) {
//                     showNotification("Your cart is empty", 'info');
//                     navigate('/cart');
//                     return;
//                 }

//                 const addressItems = Array.isArray(addressData) ? addressData : (addressData?.items || []);
//                 setSavedAddresses(addressItems);

//                 // Determine order items: buy-now vs full cart
//                 if (buyNowProductId) {
//                     const p = await getProductById(buyNowProductId);
//                     if (p) {
//                         const itemsForBuyNow = [{
//                             productId: p.ProductID,
//                             name: p.ProductName,
//                             sku: p.SKU || 'N/A',
//                             quantity: buyNowQty,
//                             price: p.SalePrice || p.RegularPrice
//                         }];
//                         setOrderItems(itemsForBuyNow);
//                         setTotals(computeCheckoutTotals(itemsForBuyNow));
//                     } else {
//                         setOrderItems([]);
//                     }
//                 } else {
//                     const itemsFromCart = (cartData.items || []).map(it => ({
//                         productId: it.productId,
//                         name: it.name,
//                         sku: it.variantSku || it.sku || 'N/A',
//                         variantId: it.variantId || null,
//                         variantName: it.variantName || null,
//                         quantity: it.quantity,
//                         price: it.price
//                     }));
//                     setOrderItems(itemsFromCart);
//                     setTotals(cartData.totals || computeCheckoutTotals(itemsFromCart));
//                 }

//                 // Auto-select default/first address for convenience
//                 const defaultAddr = addressItems.find(a => a.IsDefault);
//                 if (defaultAddr) {
//                     handleSelectSavedAddress(defaultAddr);
//                 } else if (addressItems.length > 0) {
//                     handleSelectSavedAddress(addressItems[0]);
//                 } else {
//                     setSelectedAddressId(null);
//                     setShowNewAddressForm(true);
//                 }

//             } catch (error) {
//                 console.error("Failed to load checkout data", error);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchData();
//     }, [navigate, showNotification, searchParams]);

//     const handleSelectSavedAddress = (addr) => {
//         setSelectedAddressId(addr.AddressID);
//         setFormData({
//             name: addr.FullName,
//             phone: addr.PhoneNumber,
//             street: (addr.StreetAddress1 || addr.AddressLine1 || '') + ((addr.StreetAddress2 || addr.AddressLine2) ? `, ${addr.StreetAddress2 || addr.AddressLine2}` : ''),
//             city: addr.City,
//             state: addr.State,
//             pincode: addr.PostalCode || addr.PinCode || '',
//             country: addr.Country || 'India'
//         });
//         setShowNewAddressForm(false);
//     };

//     const handleAddressSubmit = (e) => {
//         e.preventDefault();
//         if (!formData.name || !formData.street) {
//             showNotification("Please select or enter a shipping address", 'error');
//             return;
//         }
//         setStep(2);
//     };

//     const handleConfirmDeleteAddress = async () => {
//         if (!confirmDeleteAddress || deleteBusy) return;
//         const deletingId = confirmDeleteAddress.AddressID;
//         setDeleteBusy(true);
//         try {
//             await deleteAddress(deletingId);
//             const deletingIdStr = String(deletingId);
//             setSavedAddresses((prev) => {
//                 const remaining = prev.filter((a) => String(a.AddressID) !== deletingIdStr);
//                 if (String(selectedAddressId) === deletingIdStr) {
//                     const next = remaining.find((a) => a.IsDefault) || remaining[0] || null;
//                     if (next) {
//                         handleSelectSavedAddress(next);
//                     } else {
//                         setSelectedAddressId(null);
//                         setShowNewAddressForm(true);
//                         setFormData({ name: '', phone: '', street: '', city: '', state: '', pincode: '', country: 'India' });
//                     }
//                     setStep(1);
//                 }
//                 return remaining;
//             });

//             showNotification('Address deleted', 'success');
//         } catch (e) {
//             showNotification(e?.message || 'Failed to delete address', 'error');
//         } finally {
//             setDeleteBusy(false);
//             setConfirmDeleteAddress(null);
//         }
//     };

//     const startOnlinePayment = async ({ userId, user, orderItemsSnapshot, addressSnapshot, addressIdSnapshot }) => {
//         if (!import.meta.env.VITE_RAZORPAY_KEY_ID) {
//             throw new Error('VITE_RAZORPAY_KEY_ID is missing. Restart Vite after updating Frontend/VornLiving/.env');
//         }

//         const loaded = await loadRazorpayScript();
//         if (!loaded) throw new Error('Razorpay failed to load. Check your internet connection.');

//         const computed = computeCheckoutTotals(orderItemsSnapshot);
//         const amountPaise = Math.max(1, Math.round(Number(computed.total || 0) * 100));
//         const data = await createRazorpayOrder(amountPaise);
//         if (!data?.order_id) throw new Error('Could not initiate payment. Please try again.');

//         const prefillName = user?.FullName || user?.name || addressSnapshot?.name || '';
//         const prefillEmail = user?.Email || user?.email || '';
//         const prefillContact = user?.PhoneNumber || user?.phone || addressSnapshot?.phone || '';

//         const options = {
//             key: import.meta.env.VITE_RAZORPAY_KEY_ID,
//             amount: data.amount,
//             currency: data.currency || 'INR',
//             order_id: data.order_id,
//             name: 'VornLiving',
//             description: 'Order Payment',
//             theme: { color: '#C9A96E' },
//             prefill: { name: prefillName, email: prefillEmail, contact: prefillContact },
//             handler: async function (response) {
//                 try {
//                     const verifyData = await verifyRazorpayPayment({
//                         razorpay_order_id: response.razorpay_order_id,
//                         razorpay_payment_id: response.razorpay_payment_id,
//                         razorpay_signature: response.razorpay_signature
//                     });

//                     if (!verifyData?.success) {
//                         setFailureReason('Payment verification failed. Contact support.');
//                         setFailureOpen(true);
//                         return;
//                     }

//                     const placed = await placeOrder({
//                         items: orderItemsSnapshot,
//                         address: addressSnapshot,
//                         addressId: addressIdSnapshot || null,
//                         paymentMethod: 'RAZORPAY',
//                         payment: {
//                             razorpay_order_id: response.razorpay_order_id,
//                             razorpay_payment_id: response.razorpay_payment_id,
//                             razorpay_signature: response.razorpay_signature
//                         },
//                         userId: userId
//                     });

//                     setSuccessData({
//                         orderNumber: placed?.orderNumber || '',
//                         paymentId: response.razorpay_payment_id || ''
//                     });
//                     setSuccessOpen(true);
//                 } catch {
//                     setFailureReason('Failed to place order. Please try again.');
//                     setFailureOpen(true);
//                 } finally {
//                     setPayBusy(false);
//                 }
//             },
//             modal: {
//                 ondismiss: function () {
//                     showNotification("Payment was not completed. You can try again.", 'info');
//                     setPayBusy(false);
//                 }
//             }
//         };

//         if (!window?.Razorpay) throw new Error('Razorpay is not available after script load');
//         const rzp = new window.Razorpay(options);
//         rzp.on('payment.failed', function (response) {
//             setFailureReason(response?.error?.description || 'Payment failed. Please try again.');
//             setFailureOpen(true);
//             setPayBusy(false);
//         });
//         rzp.open();
//     };

//     const handlePlaceOrder = async () => {
//         try {
//             if (payBusy) return;
//             setPayBusy(true);
//             const user = JSON.parse(localStorage.getItem('user'));
//             const userId = user ? user.UserID : null;

//             // Guest checkout: require email
//             if (!userId && !guestEmail.trim()) {
//                 showNotification("Please enter your email to continue", 'error');
//                 setStep(1);
//                 setPayBusy(false);
//                 return;
//             }

//             // After placing order, prompt guest to save details
//             if (!userId && guestEmail.trim()) {
//                 setShowSavePrompt(true);
//             }
//             if (!selectedAddressId && (!formData.name || !formData.street)) {
//                 showNotification("Please select or enter a shipping address", 'error');
//                 setStep(1);
//                 setPayBusy(false);
//                 return;
//             }

//             if (selectedPayment === 'cod') {
//                 const response = await placeOrder({
//                     items: orderItems,
//                     address: formData,
//                     addressId: selectedAddressId || null,
//                     paymentMethod: 'COD',
//                     userId: userId
//                 });

//                 setOrderInfo(response);
//                 setStep(3);
//                 showNotification("Order placed successfully!", 'success');
//                 setPayBusy(false);
//                 return;
//             }

//             await startOnlinePayment({
//                 userId,
//                 user,
//                 orderItemsSnapshot: orderItems,
//                 addressSnapshot: formData,
//                 addressIdSnapshot: selectedAddressId
//             });
//         } catch (e) {
//             showNotification(e?.message || "Failed to place order. Please try again.", 'error');
//             setPayBusy(false);
//         }
//     };

//     if (isLoading) return <div className="min-h-[60vh] flex items-center justify-center text-gray-500">Loading Checkout...</div>;

//     if (step === 3 && orderInfo) {
//         return (
//             <div className="container mx-auto px-4 py-20 text-center">
//                 <CheckCircle className="h-24 w-24 text-green-500 mx-auto mb-6" />
//                 <h1 className="text-3xl font-bold text-secondary mb-4">Order Confirmed!</h1>
//                 <p className="text-gray-600 mb-8">Thank you for your purchase. Your order ID is <span className="font-mono font-bold">#{orderInfo.orderNumber}</span>.</p>
//                 <div className="flex justify-center space-x-4">
//                     <button onClick={() => navigate('/shop')} className="rf-btn-primary px-6 py-2 transition">
//                         Continue Shopping
//                     </button>
//                     <button onClick={() => navigate(`/order/${orderInfo.orderId}/track`)} className="rf-btn-secondary px-6 py-2 transition">
//                         Track Order
//                     </button>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="container mx-auto px-4 py-10 animate-fade-in" data-reveal>
//             {successOpen && (
//                 <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
//                     <div className="absolute inset-0 bg-black/40" style={{ backdropFilter: 'blur(6px)' }} />
//                     <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg px-10 py-10">
//                         <div className="flex justify-center">
//                             <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
//                                 <CheckCircle className="h-10 w-10 text-green-600" />
//                             </div>
//                         </div>
//                         <div className="mt-6 text-center">
//                             <div className="text-2xl font-bold text-secondary">Payment Successful!</div>
//                             <div className="mt-2 text-gray-600">Your order has been placed successfully.</div>
//                             <div className="mt-6 space-y-1 text-sm text-secondary/80">
//                                 {successData.orderNumber ? <div>Order #{successData.orderNumber}</div> : null}
//                                 {successData.paymentId ? <div>Payment ID: {successData.paymentId}</div> : null}
//                             </div>
//                         </div>
//                         <div className="mt-8 flex justify-center">
//                             <button
//                                 type="button"
//                                 className="rf-btn-primary px-8 py-3 transition"
//                                 onClick={() => {
//                                     setSuccessOpen(false);
//                                     navigate('/shop');
//                                 }}
//                             >
//                                 Continue Shopping
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Save details prompt for guest */}
//             {showSavePrompt && (
//                 <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
//                     <div className="absolute inset-0 bg-black/40" style={{ backdropFilter: 'blur(6px)' }} />
//                     <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md px-8 py-8">
//                         <div className="text-xl font-bold text-secondary">Save Your Details?</div>
//                         <div className="mt-2 text-gray-600 text-sm">Save your name, phone, and address for faster checkout next time — no account needed.</div>
//                         <div className="mt-6 flex justify-end gap-3">
//                             <button type="button" className="border border-border px-5 py-2.5 rounded-xl bg-white hover:bg-gray-50 transition"
//                                 onClick={() => setShowSavePrompt(false)}>
//                                 No Thanks
//                             </button>
//                             <button type="button" className="rf-btn-primary px-5 py-2.5 transition"
//                                 onClick={() => {
//                                     try {
//                                         const key = 'guest_' + guestEmail.trim().toLowerCase();
//                                         localStorage.setItem(key, JSON.stringify(formData));
//                                         showNotification('Details saved for next time!', 'success');
//                                     } catch {}
//                                     setShowSavePrompt(false);
//                                 }}>
//                                 Save Details
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {failureOpen && (
//                 <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
//                     <div className="absolute inset-0 bg-black/40" style={{ backdropFilter: 'blur(6px)' }} />
//                     <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg px-10 py-10">
//                         <div className="flex justify-center">
//                             <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
//                                 <XCircle className="h-10 w-10 text-red-600" />
//                             </div>
//                         </div>
//                         <div className="mt-6 text-center">
//                             <div className="text-2xl font-bold text-secondary">Payment Failed</div>
//                             <div className="mt-2 text-red-600 text-sm">{failureReason}</div>
//                         </div>
//                         <div className="mt-8 flex justify-center gap-3">
//                             <button
//                                 type="button"
//                                 className="rf-btn-primary px-6 py-3 transition"
//                                 onClick={async () => {
//                                     setFailureOpen(false);
//                                     setFailureReason('');
//                                     const user = JSON.parse(localStorage.getItem('user'));
//                                     const userId = user ? user.UserID : null;
//                                     if (!userId) return;
//                                     setPayBusy(true);
//                                     await startOnlinePayment({
//                                         userId,
//                                         user,
//                                         orderItemsSnapshot: orderItems,
//                                         addressSnapshot: formData,
//                                         addressIdSnapshot: selectedAddressId
//                                     });
//                                 }}
//                             >
//                                 Retry Payment
//                             </button>
//                             <button
//                                 type="button"
//                                 className="border border-border px-6 py-3 rounded-xl bg-white hover:bg-gray-50 transition"
//                                 onClick={() => {
//                                     setFailureOpen(false);
//                                     setFailureReason('');
//                                 }}
//                             >
//                                 Cancel
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {confirmDeleteAddress && (
//                 <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
//                     <div className="absolute inset-0 bg-black/40" style={{ backdropFilter: 'blur(6px)' }} />
//                     <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md px-8 py-8">
//                         <div className="text-xl font-bold text-secondary">Delete Address</div>
//                         <div className="mt-2 text-gray-600">Are you sure delete the address?</div>
//                         <div className="mt-6 flex justify-end gap-2">
//                             <button
//                                 type="button"
//                                 className="border border-border px-5 py-2.5 rounded-xl bg-white hover:bg-gray-50 transition"
//                                 onClick={() => setConfirmDeleteAddress(null)}
//                                 disabled={deleteBusy}
//                             >
//                                 No
//                             </button>
//                             <button
//                                 type="button"
//                                 className="rf-btn-primary px-5 py-2.5 transition disabled:opacity-60"
//                                 onClick={handleConfirmDeleteAddress}
//                                 disabled={deleteBusy}
//                             >
//                                 {deleteBusy ? 'Deleting…' : 'Yes'}
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             <div className="mb-8">
//                 <p className="text-sm text-gray-500">
//                     <button type="button" onClick={() => navigate('/')} className="hover:text-primary">Home</button>
//                     <span className="mx-2">/</span>
//                     <button type="button" onClick={() => navigate('/cart')} className="hover:text-primary">Cart</button>
//                     <span className="mx-2">/</span>
//                     <span className="text-secondary font-medium">Checkout</span>
//                 </p>
//                 <h1 className="text-3xl md:text-4xl font-bold text-secondary mt-2">Checkout</h1>
//                 <div className="flex items-center gap-2 mt-4">
//                     <div className={`h-2 w-16 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-gray-200'}`} />
//                     <div className={`h-2 w-16 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`} />
//                     <div className={`h-2 w-16 rounded-full ${step >= 3 ? 'bg-primary' : 'bg-gray-200'}`} />
//                 </div>
//             </div>
//             <div className="flex flex-col lg:flex-row gap-8">
//                 {/* Main Form Area */}
//                 <div className="w-full lg:w-2/3">
//                     {step === 1 && (
//                         <div className="space-y-6 animate-slide-up">
//                             {/* Guest Email + Returning Customer Prefill */}
//                             {isGuest && (
//                                 <div className="rf-card p-6">
//                                     <h2 className="text-xl font-semibold mb-1">Your Email</h2>
//                                     <p className="text-sm text-gray-500 mb-4">No account needed. Enter your email to continue — returning customers will have their details filled in automatically.</p>
//                                     <div className="flex flex-col sm:flex-row gap-3">
//                                         <input
//                                             type="email"
//                                             placeholder="Email address"
//                                             required
//                                             className="rf-input flex-1"
//                                             value={guestEmail}
//                                             onChange={e => setGuestEmail(e.target.value)}
//                                         />
//                                         <button
//                                             type="button"
//                                             className="rf-btn-primary px-6 py-2.5 transition whitespace-nowrap"
//                                             onClick={() => {
//                                                 if (guestEmail.trim()) prefillGuestDetails(guestEmail);
//                                                 else showNotification('Please enter a valid email', 'error');
//                                             }}
//                                         >
//                                             Continue as Guest
//                                         </button>
//                                     </div>
//                                     <p className="text-xs text-gray-400 mt-2">Already have an account? <a href="/auth" className="text-primary hover:underline">Sign in</a> for faster checkout.</p>
//                                 </div>
//                             )}

//                             {savedAddresses.length > 0 && (
//                                 <div className="rf-card p-6">
//                                     <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
//                                         <MapPin className="h-5 w-5 text-primary" />
//                                         Select Saved Address
//                                     </h2>
//                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                                         {savedAddresses.map((addr) => (
//                                             <div
//                                                 key={addr.AddressID}
//                                                 onClick={() => handleSelectSavedAddress(addr)}
//                                                 className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
//                                                     selectedAddressId === addr.AddressID
//                                                         ? 'border-primary bg-primary/5'
//                                                         : 'border-border hover:border-primary/50 bg-white'
//                                                 }`}
//                                             >
//                                                 <div className="flex justify-between items-start mb-2">
//                                                     <span className="font-bold text-secondary">{addr.AddressLabel}</span>
//                                                     <div className="flex items-center gap-2">
//                                                         {addr.IsDefault && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Default</span>}
//                                                         <button
//                                                             type="button"
//                                                             className="p-2 rounded-xl border border-border bg-white hover:border-primary transition"
//                                                             title="Delete address"
//                                                             onClick={(e) => {
//                                                                 e.stopPropagation();
//                                                                 setConfirmDeleteAddress(addr);
//                                                             }}
//                                                         >
//                                                             <Trash2 className="h-4 w-4 text-secondary" />
//                                                         </button>
//                                                     </div>
//                                                 </div>
//                                                 <p className="text-sm font-medium text-gray-800">{addr.FullName}</p>
//                                                 <p className="text-xs text-gray-500 mt-1 line-clamp-2">
//                                                     {addr.StreetAddress1}{addr.StreetAddress2 ? `, ${addr.StreetAddress2}` : ''}, {addr.City}, {addr.State} - {addr.PostalCode}
//                                                 </p>
//                                                 <p className="text-xs text-gray-500 mt-1">{addr.PhoneNumber}</p>
//                                             </div>
//                                         ))}
//                                         <button
//                                             type="button"
//                                             onClick={() => {
//                                                 setSelectedAddressId(null);
//                                                 setShowNewAddressForm(true);
//                                                 setFormData({ name: '', phone: '', street: '', city: '', state: '', pincode: '', country: 'India' });
//                                             }}
//                                             className={`p-4 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-primary transition-all ${!selectedAddressId && showNewAddressForm ? 'border-primary bg-primary/5 text-primary' : ''}`}
//                                         >
//                                             <Plus className="h-6 w-6" />
//                                             <span className="text-sm font-medium">Add New Address</span>
//                                         </button>
//                                     </div>
//                                 </div>
//                             )}

//                             {(showNewAddressForm || savedAddresses.length === 0) && (
//                                 <div className="rf-card p-6">
//                                     <h2 className="text-xl font-semibold mb-4">
//                                         {savedAddresses.length === 0 ? 'Shipping Address' : 'Enter New Address'}
//                                     </h2>
//                                     <form onSubmit={handleAddressSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                                         <input
//                                             type="text"
//                                             placeholder="Full Name"
//                                             required
//                                             className="rf-input w-full"
//                                             value={formData.name}
//                                             onChange={e => setFormData({ ...formData, name: e.target.value })}
//                                         />
//                                         <input
//                                             type="tel"
//                                             placeholder="Phone Number"
//                                             required
//                                             className="rf-input w-full"
//                                             value={formData.phone}
//                                             onChange={e => setFormData({ ...formData, phone: e.target.value })}
//                                         />
//                                         <input
//                                             type="text"
//                                             placeholder="Street Address"
//                                             required
//                                             className="rf-input w-full md:col-span-2"
//                                             value={formData.street}
//                                             onChange={e => setFormData({ ...formData, street: e.target.value })}
//                                         />
//                                         <input
//                                             type="text"
//                                             placeholder="City"
//                                             required
//                                             className="rf-input w-full"
//                                             value={formData.city}
//                                             onChange={e => setFormData({ ...formData, city: e.target.value })}
//                                         />
//                                         <input
//                                             type="text"
//                                             placeholder="State"
//                                             required
//                                             className="rf-input w-full"
//                                             value={formData.state}
//                                             onChange={e => setFormData({ ...formData, state: e.target.value })}
//                                         />
//                                         <input
//                                             type="text"
//                                             placeholder="Pincode"
//                                             required
//                                             className="rf-input w-full"
//                                             value={formData.pincode}
//                                             onChange={e => setFormData({ ...formData, pincode: e.target.value })}
//                                         />
//                                         <input
//                                             type="text"
//                                             placeholder="Country"
//                                             disabled
//                                             className="rf-input w-full bg-background text-gray-500 cursor-not-allowed"
//                                             value={formData.country}
//                                         />
//                                         <div className="md:col-span-2 flex justify-end mt-4">
//                                             <button
//                                                 type="submit"
//                                                 className="rf-btn-primary px-10 py-3 transition"
//                                             >
//                                                 Continue to Payment
//                                             </button>
//                                         </div>
//                                     </form>
//                                 </div>
//                             )}

//                             {!showNewAddressForm && selectedAddressId && (
//                                 <div className="flex justify-end">
//                                     <button
//                                         type="button"
//                                         onClick={() => setStep(2)}
//                                         className="rf-btn-primary px-10 py-3 transition"
//                                     >
//                                         Continue to Payment
//                                     </button>
//                                 </div>
//                             )}
//                         </div>
//                     )}

//                     {step === 2 && (
//                         <div className="rf-card p-6 animate-slide-up">
//                             <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
//                             <div className="space-y-4">
//                                 <label className={`border p-4 rounded-xl flex items-center cursor-pointer transition ${selectedPayment === 'online' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary'}`}>
//                                     <input type="radio" name="payment" className="mr-3" checked={selectedPayment === 'online'} onChange={() => setSelectedPayment('online')} />
//                                     <span>Pay Online (Card / UPI / Net Banking)</span>
//                                 </label>
//                                 <label className={`border p-4 rounded-xl flex items-center cursor-pointer transition ${selectedPayment === 'cod' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary'}`}>
//                                     <input type="radio" name="payment" className="mr-3" checked={selectedPayment === 'cod'} onChange={() => setSelectedPayment('cod')} />
//                                     <span>Cash on Delivery</span>
//                                 </label>
//                             </div>
//                             <div className="flex justify-between mt-6">
//                                 <button onClick={() => setStep(1)} className="rf-link text-sm">Back</button>
//                                 <button onClick={handlePlaceOrder} className="rf-btn-primary px-8 py-3 transition disabled:opacity-60" disabled={payBusy}>
//                                     {payBusy ? 'Processing…' : 'Place Order'}
//                                 </button>
//                             </div>
//                         </div>
//                     )}
//                 </div>

//                 {/* Order Summary Sidebar */}
//                 <div className="w-full lg:w-1/3">
//                     <div className="lg:sticky lg:top-28 rf-card p-6 animate-slide-up">
//                         <h3 className="font-bold text-lg mb-4">Order Summary</h3>
//                         <div className="space-y-2 mb-4 text-sm text-gray-600">
//                                 <div className="flex justify-between"><span>Subtotal</span><span>{formatINR(totals.subTotal)}</span></div>
//                                 <div className="flex justify-between"><span>Shipping</span><span>{totals.shipping === 0 ? 'Free' : formatINR(totals.shipping)}</span></div>
//                                 <div className="flex justify-between font-bold text-lg mt-3 pt-3 border-t text-secondary"><span>Total</span><span>{formatINR(totals.total)}</span></div>
//                             </div>
//                         <p className="text-xs text-gray-500">By placing your order, you agree to our Terms of Service and Privacy Policy.</p>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default Checkout;

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  CheckCircle,
  XCircle,
  MapPin,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import {
  placeOrder,
  getCart,
  getAddresses,
  getProductById,
  createRazorpayOrder,
  verifyRazorpayPayment,
  deleteAddress,
  updateCartItem,
  removeCartItem,
  listCoupons,
  validateCoupon,
  sendEmailOtp,
  verifyEmailOtp,
} from "../../../services/api";
import { useNotification } from "../../../context/NotificationContext";
import { formatINR } from "../../../utils/formatINR";
import Modal from "../../../components/Modal";
import ProductImage from "../../../components/ProductImage";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (document.getElementById("razorpay-script")) {
      resolve(true);
      return;
    }
    const s = document.createElement("script");
    s.id = "razorpay-script";
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const freeShippingThreshold = Number(import.meta.env.VITE_FREE_SHIPPING_THRESHOLD || 899);
const defaultShippingCharge = Number(import.meta.env.VITE_DEFAULT_SHIPPING_CHARGE || 50);

const computeTotals = (items) => {
  const subTotal = (Array.isArray(items) ? items : []).reduce((acc, it) => {
    const qty = Number(it?.quantity ?? 0);
    const price = Number(it?.price ?? 0);
    return Number.isFinite(qty) && Number.isFinite(price)
      ? acc + price * qty
      : acc;
  }, 0);
  const shipping = subTotal >= freeShippingThreshold ? 0 : defaultShippingCharge;
  return { subTotal, shipping, tax: 0, total: subTotal + shipping };
};

const blankForm = (email = "") => ({
  name: "",
  email,
  street: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
});

const Checkout = ({ embedded = false, onClose }) => {
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loggedInUser, setLoggedInUser] = useState(null);
  const [checkoutMode, setCheckoutMode] = useState(null);
  const [guestEmail, setGuestEmail] = useState("");

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(blankForm());
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [orderInfo, setOrderInfo] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [cartId, setCartId] = useState(null);
  const [totals, setTotals] = useState({
    subTotal: 0,
    shipping: 0,
    tax: 0,
    total: 0,
  });
  const [orderSummaryOpen, setOrderSummaryOpen] = useState(!embedded);
  const [addressMoreOpen, setAddressMoreOpen] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpProvider, setOtpProvider] = useState(null);
  const [otpError, setOtpError] = useState("");
  const [otpExpiresAt, setOtpExpiresAt] = useState(0);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);
  const [otpDebug, setOtpDebug] = useState("");
  const [contactVerified, setContactVerified] = useState(false);
  const [saveDetails, setSaveDetails] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState("cod");

  const [successOpen, setSuccessOpen] = useState(false);
  const [successData, setSuccessData] = useState({
    orderNumber: "",
    paymentId: "",
  });
  const [failureOpen, setFailureOpen] = useState(false);
  const [failureReason, setFailureReason] = useState("");
  const [confirmDeleteAddr, setConfirmDeleteAddr] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const scrollRef = useRef(null);
  const addressSectionRef = useRef(null);

  const couponCode = "";
  const couponBusy = false;
  const couponInfo = null;
  const couponMessage = "";
  const couponsOpen = false;
  const availableCoupons = [];

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (user?.UserID) {
      setLoggedInUser(user);
      setCheckoutMode("user");
      setContactVerified(true);
      setFormData(f => ({ ...f, email: user.Email || user.email || "" }));
      setStep(2); // Skip contact step for logged-in users
    } else {
      setCheckoutMode("guest");
    }
  }, []);

  useEffect(() => {
    if (!checkoutMode) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const userId = loggedInUser?.UserID ?? null;
        const [cartData, addressData] = await Promise.all([
          getCart(userId),
          loggedInUser ? getAddresses(1, 10) : Promise.resolve([]),
        ]);
        setCartId(cartData?.cartId ?? null);
        const buyNowId = searchParams.get("productId");
        const buyNowQty = Number(searchParams.get("qty") || "1");
        if (!buyNowId && (!cartData.items || cartData.items.length === 0)) {
          showNotification("Your cart is empty.", "info");
          navigate("/cart");
          return;
        }
        if (buyNowId) {
          const p = await getProductById(buyNowId);
          if (p) {
            const items = [
              {
                productId: p.ProductID,
                name: p.ProductName,
                sku: p.SKU || "N/A",
                quantity: buyNowQty,
                price: p.SalePrice || p.RegularPrice,
                image: Array.isArray(p.images) && p.images.length ? p.images[0] : p.ImageURL,
              },
            ];
            setOrderItems(items);
            setTotals(computeTotals(items));
          }
        } else {
          const items = (cartData.items || []).map((it) => ({
            cartItemId: it.id,
            productId: it.productId,
            name: it.name,
            sku: it.variantSku || it.sku || "N/A",
            variantId: it.variantId || null,
            variantName: it.variantName || null,
            quantity: it.quantity,
            price: it.price,
            image: it.image,
            category: it.category,
          }));
          setOrderItems(items);
          setTotals(cartData.totals || computeTotals(items));
        }
        const addrList = Array.isArray(addressData)
          ? addressData
          : addressData?.items || [];
        setSavedAddresses(addrList);
        const def = addrList.find((a) => a.IsDefault) || addrList[0] || null;
        if (def) applySavedAddress(def, formData.email);
        else {
          setSelectedAddressId(null);
          setShowNewAddressForm(true);
        }
      } catch (err) {
        console.error("Checkout load error", err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutMode, loggedInUser]);

  useEffect(() => {
    return () => {};
  }, []);

  const normalizeEmailKey = (value) => String(value || "").trim().toLowerCase();

  const tryPrefillFromStorage = useCallback(
    (emailValue) => {
      if (loggedInUser) return false;
      const emailKey = normalizeEmailKey(emailValue);
      const keys = [];
      if (emailKey) keys.push(`checkout_profile:email:${emailKey}`, `guest_${emailKey}`);
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        try {
          const data = JSON.parse(raw);
          if (data && typeof data === "object") {
            setFormData((prev) => ({
              ...prev,
              ...data,
              email: prev.email || data.email || emailValue || "",
            }));
            showNotification("Welcome back! Your details were auto-filled.", "success");
            return true;
          }
        } catch {
          continue;
        }
      }
      return false;
    },
    [loggedInUser, showNotification],
  );

  const refreshCart = useCallback(async () => {
    const userId = loggedInUser?.UserID ?? null;
    const cartData = await getCart(userId);
    setCartId(cartData?.cartId ?? null);
    const items = (cartData.items || []).map((it) => ({
      cartItemId: it.id,
      productId: it.productId,
      name: it.name,
      sku: it.variantSku || it.sku || "N/A",
      variantId: it.variantId || null,
      variantName: it.variantName || null,
      quantity: it.quantity,
      price: it.price,
      image: it.image,
      category: it.category,
    }));
    setOrderItems(items);
    setTotals(cartData.totals || computeTotals(items));
  }, [loggedInUser]);

  const computedDiscount = 0;
  const finalTotals = {
    ...totals,
    discount: 0,
    total: Math.max(0, Number(totals.total || 0)),
  };

  useEffect(() => {
    if (!otpExpiresAt) return;
    const tick = () => {
      const left = Math.max(0, Math.floor((otpExpiresAt - Date.now()) / 1000));
      setOtpSecondsLeft(left);
      if (left === 0 && otpRequested && !contactVerified) {
        setOtpSent(false);
        setOtpProvider(null);
        setOtpError("OTP expired. Please request a new OTP.");
      }
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [contactVerified, otpExpiresAt, otpRequested]);

  const handleSendOtp = async () => {
    const email = String(formData.email || guestEmail).trim();
    if (!email || !email.includes("@")) {
      setOtpRequested(true);
      setOtpSent(false);
      setOtpProvider(null);
      setOtpError("Please enter a valid email address.");
      showNotification("Please enter a valid email address.", "error");
      return;
    }
    setOtpRequested(true);
    setOtpBusy(true);
    setOtpError("");
    setOtpDebug("");
    try {
      const resp = await sendEmailOtp(email, "checkout");
      const ttlSeconds = Number(resp?.ttlSeconds || 300);
      setOtpProvider("api");
      setOtpSent(true);
      setContactVerified(false);
      setOtpCode("");
      setOtpExpiresAt(Date.now() + Math.max(1, ttlSeconds) * 1000);
      setOtpSecondsLeft(Math.max(0, Math.floor(ttlSeconds)));
      if (import.meta.env.DEV && resp?.debugOtp) {
        setOtpDebug(String(resp.debugOtp));
      }
      showNotification("OTP sent to your email", "success");
    } catch (e) {
      const msg = e?.message || "Could not send OTP. Please try again.";
      setOtpError(msg);
      showNotification(msg, "error");
      setOtpSent(false);
      setContactVerified(false);
      setOtpProvider(null);
      setOtpExpiresAt(0);
      setOtpSecondsLeft(0);
    } finally {
      setOtpBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    const email = String(formData.email || guestEmail).trim();
    if (!email || !email.includes("@")) {
      showNotification("Please enter a valid email address.", "error");
      return;
    }
    const code = String(otpCode || "").trim();
    if (!code) {
      showNotification("Enter the OTP.", "error");
      return;
    }
    if (!/^\d{4}$/.test(code)) {
      showNotification("Enter a valid 4-digit OTP.", "error");
      return;
    }
    if (!otpProvider) {
      showNotification("Please request OTP first.", "error");
      return;
    }
    if (otpExpiresAt && Date.now() > otpExpiresAt) {
      setOtpSent(false);
      setOtpProvider(null);
      setOtpError("OTP expired. Please request a new OTP.");
      showNotification("OTP expired. Please request a new OTP.", "error");
      return;
    }
    setOtpBusy(true);
    try {
      const res = await verifyEmailOtp(email, code, "checkout");
      if (res?.success === false)
        throw new Error(res?.message || "OTP verification failed");
      setContactVerified(true);
      setOtpError("");
      showNotification("Email verified", "success");
      
      // Navigate to next section (Shipping)
      setTimeout(() => {
        setStep(2);
      }, 500);
    } catch (e) {
      setContactVerified(false);
      const msg = String(e?.message || "Invalid OTP");
      setOtpError(msg);
      showNotification(msg, "error");
    } finally {
      setOtpBusy(false);
    }
  };

  const updateItemQuantity = async (item, nextQty) => {
    const qty = Number(nextQty || 0);
    if (!Number.isFinite(qty) || qty < 1) return;
    if (item?.cartItemId && cartId) {
      await updateCartItem(item.cartItemId, qty, cartId);
      await refreshCart();
      return;
    }
    setOrderItems((prev) => {
      const next = prev.map((it) =>
        String(it.productId) === String(item.productId) ? { ...it, quantity: qty } : it,
      );
      setTotals(computeTotals(next));
      return next;
    });
  };

  const removeItemLine = async (item) => {
    if (item?.cartItemId && cartId) {
      await removeCartItem(item.cartItemId, cartId);
      await refreshCart();
      return;
    }
    setOrderItems((prev) => {
      const next = prev.filter((it) => String(it.productId) !== String(item.productId));
      setTotals(computeTotals(next));
      return next;
    });
  };

  const applySavedAddress = useCallback((addr, currentEmail) => {
    setSelectedAddressId(addr.AddressID);
    setFormData({
      name: addr.FullName ?? "",
      email: currentEmail || "",
      street: [
        addr.StreetAddress1 || addr.AddressLine1,
        addr.StreetAddress2 || addr.AddressLine2,
      ]
        .filter(Boolean)
        .join(", "),
      city: addr.City ?? "",
      state: addr.State ?? "",
      pincode: addr.PostalCode || addr.PinCode || "",
      country: addr.Country || "India",
    });
    setShowNewAddressForm(false);
  }, []);

  const proceedToPayment = () => {
    const email = String(formData.email || guestEmail).trim();
    if (!email || !email.includes("@")) {
      showNotification("Please enter a valid email address.", "error");
      setStep(1);
      return false;
    }
    if (!contactVerified) {
      setOtpRequested(true);
      showNotification("Please verify your email to continue.", "error");
      setStep(1);
      return false;
    }

    if (step === 1) {
      setStep(2);
      return true;
    }

    if (step === 2) {
      if (!showNewAddressForm && selectedAddressId) {
        setStep(3);
        return true;
      }
      if (!formData.name.trim() || !formData.street.trim()) {
        showNotification("Please fill in your name and street address.", "error");
        return false;
      }
      setStep(3);
      return true;
    }
    
    return true;
  };

  const handleAddressSubmit = (e) => {
    e.preventDefault();
    proceedToPayment();
  };

  const handleConfirmDeleteAddress = async () => {
    if (!confirmDeleteAddr || deleteBusy) return;
    const id = confirmDeleteAddr.AddressID;
    setDeleteBusy(true);
    try {
      await deleteAddress(id);
      setSavedAddresses((prev) => {
        const remaining = prev.filter(
          (a) => String(a.AddressID) !== String(id),
        );
        if (String(selectedAddressId) === String(id)) {
          const next =
            remaining.find((a) => a.IsDefault) || remaining[0] || null;
          if (next) applySavedAddress(next, formData.email);
          else {
            setSelectedAddressId(null);
            setShowNewAddressForm(true);
            setFormData(blankForm(formData.email));
          }
          setStep(1);
        }
        return remaining;
      });
      showNotification("Address deleted.", "success");
    } catch (e) {
      showNotification(e?.message || "Failed to delete address.", "error");
    } finally {
      setDeleteBusy(false);
      setConfirmDeleteAddr(null);
    }
  };

  const startOnlinePayment = async ({
    userId,
    itemsSnap,
    addrSnap,
    addrIdSnap,
  }) => {
    try {
      if (!import.meta.env.VITE_RAZORPAY_KEY_ID)
        throw new Error("Razorpay key not configured.");
      const loaded = await loadRazorpayScript();
      if (!loaded)
        throw new Error("Could not load Razorpay. Check your connection.");
      const amountPaise = Math.max(100, Math.round(Number(finalTotals.total || 0) * 100));
      const data = await createRazorpayOrder(amountPaise);
      if (!data?.order_id)
        throw new Error("Could not create payment order. Please try again.");
      const effectiveEmail = addrSnap.email || guestEmail || "";
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency || "INR",
        order_id: data.order_id,
        name: "VornLiving",
        description: "Order Payment",
        theme: { color: "#C9A96E" },
        prefill: {
          name: addrSnap.name || "",
          email: effectiveEmail,
        },
        handler: async (response) => {
          try {
            const v = await verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (!v?.success) {
              setFailureReason("Payment verification failed.");
              setFailureOpen(true);
              return;
            }
            const placed = await placeOrder({
              items: itemsSnap,
              address: addrSnap,
              addressId: addrIdSnap || null,
              paymentMethod: "RAZORPAY",
              payment: response,
              userId: userId || null,
              guestEmail: effectiveEmail || null,
              couponCode: null,
              discount: computedDiscount || 0,
            });
            setSuccessData({
              orderNumber: placed?.orderNumber || "",
              paymentId: response.razorpay_payment_id || "",
            });
            setSuccessOpen(true);
            if (!userId) {
              const { clearGuestToken } = await import('../../../services/api');
              clearGuestToken();
              if (saveDetails) handleSaveGuestDetails();
            }
          } catch (e) {
            console.error("Order placement error", e);
            setFailureReason(
              "Order could not be saved after payment. Please contact support.",
            );
            setFailureOpen(true);
          }
        },
        modal: {
          ondismiss: function() {
            showNotification("Payment cancelled.", "info");
          },
          escape: true,
          backdropclose: false
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (r) => {
        setFailureReason(r?.error?.description || "Payment failed.");
        setFailureOpen(true);
      });
      rzp.open();
    } catch (e) {
      throw e;
    }
  };

  const handlePlaceOrder = async () => {
    try {
      const userId = loggedInUser?.UserID ?? null;
      const isGuest = !userId;
      const effectiveEmail = formData.email.trim() || guestEmail.trim() || "";
      if (!effectiveEmail || !effectiveEmail.includes("@")) {
        showNotification("Please enter a valid email address.", "error");
        setStep(1);
        return;
      }
      if (!contactVerified) {
        setOtpRequested(true);
        showNotification("Please verify your email to continue.", "error");
        setStep(1);
        return;
      }
      if (
        !selectedAddressId &&
        (!formData.name.trim() || !formData.street.trim())
      ) {
        showNotification("Please enter a shipping address.", "error");
        setStep(2);
        return;
      }
      const addrPayload = { ...formData, email: effectiveEmail };
      if (selectedPayment === "cod") {
        try {
          const response = await placeOrder({
            items: orderItems,
            address: addrPayload,
            addressId: selectedAddressId || null,
            paymentMethod: "COD",
            userId: userId || null,
            guestEmail: effectiveEmail || null,
            couponCode: null,
            discount: computedDiscount || 0,
          });
          setOrderInfo(response);
          setStep(4);
          if (isGuest) {
            const { clearGuestToken } = await import('../../../services/api');
            clearGuestToken();
            if (saveDetails) handleSaveGuestDetails();
          }
          showNotification("Order placed successfully!", "success");
        } catch (e) {
          showNotification(e?.message || "Failed to place order.", "error");
        }
        return;
      }
      await startOnlinePayment({
        userId,
        itemsSnap: orderItems,
        addrSnap: addrPayload,
        addrIdSnap: selectedAddressId,
      });
    } catch (e) {
      showNotification(e?.message || "Failed to place order.", "error");
    }
  };

  const handleSaveGuestDetails = () => {
    try {
      const emailKey = normalizeEmailKey(formData.email || guestEmail);
      const payload = {
        name: formData.name,
        email: formData.email || guestEmail || "",
        street: formData.street,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        country: formData.country,
      };
      if (emailKey) {
        localStorage.setItem(`checkout_profile:email:${emailKey}`, JSON.stringify(payload));
        localStorage.setItem(`guest_${emailKey}`, JSON.stringify(payload));
      }
    } catch {
      return;
    }
  };

  if (checkoutMode === null || isLoading)
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-500 text-lg bg-secondary-950 min-h-screen">
        Loading checkout…
      </div>
    );

  if (step === 4 && orderInfo)
    return (
      <div className="container mx-auto px-4 py-20 text-center bg-secondary-950 min-h-screen">
        <CheckCircle className="h-24 w-24 text-green-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-white mb-4">
          Order Confirmed!
        </h1>
        <p className="text-gray-400 mb-2">Thank you for your purchase.</p>
        <p className="text-gray-400 mb-8">
          Your order number is{" "}
          <span className="font-mono font-bold text-white">#{orderInfo.orderNumber}</span>.
        </p>
        {!loggedInUser && (
          <p className="text-sm text-gray-500 mb-6">
            Want to track your order?{" "}
            <Link to="/auth" className="text-primary hover:underline">
              Create a free account
            </Link>{" "}
            using the same email.
          </p>
        )}
        <div className="flex justify-center gap-4 flex-wrap">
          <button
            onClick={() => navigate("/shop")}
            className="rf-btn-primary px-6 py-2.5 transition">
            Continue Shopping
          </button>
          {loggedInUser && (
            <button
              onClick={() => navigate(`/order/${orderInfo.orderId}/track`)}
              className="rf-btn-secondary px-6 py-2.5 transition border-secondary-800 bg-secondary-900 text-white hover:bg-secondary-800">
              Track Order
            </button>
          )}
        </div>
      </div>
    );

  return (
    <div className={embedded ? "h-full bg-secondary-950" : "bg-secondary-950 min-h-screen"}>
      {successOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-secondary-900 border border-secondary-800 rounded-2xl shadow-2xl w-full max-w-lg px-10 py-10 text-center">
            <div className="h-16 w-16 rounded-full bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-white">
              Payment Successful!
            </div>
            <div className="mt-2 text-gray-400">
              Your order has been placed.
            </div>
            <div className="mt-4 space-y-1 text-sm text-gray-300">
              {successData.orderNumber && (
                <div>Order #{successData.orderNumber}</div>
              )}
              {successData.paymentId && (
                <div>Payment ID: {successData.paymentId}</div>
              )}
            </div>
            {!loggedInUser && (
              <p className="text-xs text-gray-500 mt-4">
                Want to track it?{" "}
                <Link to="/auth" className="text-primary hover:underline">
                  Create a free account
                </Link>
              </p>
            )}
            <button
              className="rf-btn-primary px-8 py-3 transition mt-6"
              onClick={() => {
                setSuccessOpen(false);
                navigate("/shop");
              }}>
              Continue Shopping
            </button>
          </div>
        </div>
      )}

      {failureOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-secondary-900 border border-secondary-800 rounded-2xl shadow-2xl w-full max-w-lg px-10 py-10 text-center">
            <div className="h-16 w-16 rounded-full bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-10 w-10 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-white">
              Payment Failed
            </div>
            <div className="mt-2 text-red-400 text-sm">{failureReason}</div>
            <div className="flex gap-3 justify-center mt-8">
              <button
                className="rf-btn-primary px-6 py-3 transition"
                onClick={async () => {
                  setFailureOpen(false);
                  setFailureReason("");
                  await startOnlinePayment({
                    userId: loggedInUser?.UserID ?? null,
                    itemsSnap: orderItems,
                    addrSnap: {
                      ...formData,
                      email: formData.email || guestEmail,
                    },
                    addrIdSnap: selectedAddressId,
                  });
                }}>
                Retry Payment
              </button>
              <button
                className="border border-secondary-800 px-6 py-3 rounded-xl bg-secondary-800 text-white hover:bg-secondary-700 transition"
                onClick={() => {
                  setFailureOpen(false);
                  setFailureReason("");
                }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteAddr && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !deleteBusy && setConfirmDeleteAddr(null)}
          />
          <div className="relative bg-secondary-900 border border-secondary-800 rounded-2xl shadow-2xl w-full max-w-md px-8 py-8">
            <div className="text-xl font-bold text-white">
              Delete Address
            </div>
            <div className="mt-2 text-gray-400">
              Are you sure you want to remove this address?
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                disabled={deleteBusy}
                onClick={() => setConfirmDeleteAddr(null)}
                className="border border-secondary-800 px-5 py-2.5 rounded-xl bg-secondary-800 text-white hover:bg-secondary-700 transition">
                No
              </button>
              <button
                disabled={deleteBusy}
                onClick={handleConfirmDeleteAddress}
                className="rf-btn-primary px-5 py-2.5 transition disabled:opacity-60">
                {deleteBusy ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={embedded ? "flex flex-col h-full bg-secondary-950" : "container mx-auto px-4 py-10 animate-fade-in"}>
        {embedded ? (
          <div className="flex items-center justify-between gap-3 px-4 py-4 border-b border-secondary-800 bg-secondary-900/90 backdrop-blur-sm sticky top-0 z-10">
              <button
                type="button"
                onClick={() => {
                  if (step === 2) setStep(1);
                  else if (step === 3) setStep(2);
                  else (onClose || (() => navigate("/cart")))();
                }}
                className="text-sm text-gray-400 hover:text-primary transition"
              >
                ←
              </button>
            <div className="font-bold text-white">Checkout</div>
            <button
              type="button"
              onClick={onClose || (() => navigate("/cart"))}
              className="p-2 rounded-xl border border-secondary-800 hover:border-primary transition"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        ) : (
          <div className="mb-8">
            <p className="text-sm text-gray-500">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="hover:text-primary"
              >
                Home
              </button>
              <span className="mx-2">/</span>
              <button
                type="button"
                onClick={() => navigate("/cart")}
                className="hover:text-primary"
              >
                Cart
              </button>
              <span className="mx-2">/</span>
              <span className="text-white font-medium">Checkout</span>
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-white mt-2">
              Checkout
            </h1>
            <div className="flex items-center gap-2 mt-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className={`h-2 w-16 rounded-full transition-colors ${
                    step >= n ? "bg-primary" : "bg-secondary-800"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        <div className={embedded ? "flex-1 overflow-y-auto px-4 py-5 pb-24" : ""}>
          <div className={embedded ? "" : "max-w-4xl mx-auto"}>
            <div className="rf-card p-5 bg-secondary-900 border-secondary-800">
              <button
                type="button"
                onClick={() => setOrderSummaryOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-4"
              >
                <div className="text-left">
                  <div className="font-bold text-white">Order Summary</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {orderItems.reduce((a, it) => a + Number(it.quantity || 0), 0)} item(s)
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-bold text-white">{formatINR(finalTotals.total)}</div>
                  {orderSummaryOpen ? (
                    <ChevronUp className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  )}
                </div>
              </button>

              {orderSummaryOpen && (
                <div className="mt-5 space-y-5">
                  <div className="space-y-4">
                    {orderItems.map((item) => (
                      <div
                        key={item.cartItemId || item.productId}
                        className="flex items-start gap-3"
                      >
                        <div className="h-14 w-14 rounded-xl border border-secondary-800 overflow-hidden bg-secondary-800 flex-shrink-0">
                          <ProductImage
                            src={item.image}
                            alt={item.name}
                            category={item.category}
                            fallbackSrc="/Living/image1.jpeg"
                            showFallbackBrand={false}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white truncate">
                            {item.name}
                          </div>
                          {item.variantName ? (
                            <div className="text-xs text-gray-500 mt-0.5 truncate">
                              {item.variantName}
                            </div>
                          ) : null}
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <div className="inline-flex items-center border border-secondary-800 rounded-xl bg-secondary-900">
                              <button
                                type="button"
                                onClick={() => updateItemQuantity(item, Number(item.quantity || 0) - 1)}
                                className="px-3 py-2 text-gray-400 hover:text-primary transition"
                              >
                                -
                              </button>
                              <div className="px-3 text-sm text-white">
                                {item.quantity}
                              </div>
                              <button
                                type="button"
                                onClick={() => updateItemQuantity(item, Number(item.quantity || 0) + 1)}
                                className="px-3 py-2 text-gray-400 hover:text-primary transition"
                              >
                                +
                              </button>
                            </div>
                            <div className="text-sm font-bold text-white">
                              {formatINR(Number(item.price || 0) * Number(item.quantity || 0))}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItemLine(item)}
                          className="p-2 rounded-xl border border-secondary-800 hover:border-red-900 transition text-gray-500 hover:text-red-500"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-secondary-800 pt-4">
                    {freeShippingThreshold > 0 ? (
                      <div className="mb-4">
                        {Number(totals.subTotal || 0) >= freeShippingThreshold ? (
                          <div className="text-xs text-green-500">
                            Free Shipping unlocked
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">
                            Shop for{" "}
                            <span className="font-semibold text-white">
                              {formatINR(Math.max(0, freeShippingThreshold - Number(totals.subTotal || 0)))}
                            </span>{" "}
                            more to unlock Free Shipping
                          </div>
                        )}
                        <div className="mt-2 h-2 rounded-full bg-secondary-800 overflow-hidden border border-secondary-800">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${Math.min(
                                100,
                                freeShippingThreshold > 0
                                  ? (Number(totals.subTotal || 0) / freeShippingThreshold) * 100
                                  : 100,
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ) : null}

                    <div className="space-y-2 text-sm text-gray-500">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{formatINR(totals.subTotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shipping</span>
                        <span>
                          {totals.shipping === 0 ? (
                            <span className="text-green-600 font-medium">Free</span>
                          ) : (
                            formatINR(totals.shipping)
                          )}
                        </span>
                      </div>
                      {computedDiscount > 0 ? (
                        <div className="flex justify-between text-green-700">
                          <span>Discount</span>
                          <span>-{formatINR(computedDiscount)}</span>
                        </div>
                      ) : null}
                      <div className="flex justify-between font-bold text-base pt-3 border-t border-secondary-800 text-white">
                        <span>Total</span>
                        <span>{formatINR(finalTotals.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {step === 1 ? (
              <div className="mt-6 space-y-6 animate-slide-up">
                <div className="rf-card p-6 bg-secondary-900 border-secondary-800">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-lg font-bold text-white">
                      Contact
                    </div>
                    {contactVerified ? (
                      <span className="text-[10px] bg-green-900/30 text-green-500 px-2 py-1 rounded-full font-bold uppercase tracking-wider border border-green-500/20">
                        Verified
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500">
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="Enter your email address"
                        className="rf-input w-full mt-1 bg-secondary-800 border-secondary-700 text-white placeholder:text-gray-600"
                        value={formData.email}
                        readOnly={checkoutMode === "user"}
                        onChange={(e) => {
                          if (checkoutMode === "user") return;
                          const v = e.target.value;
                          setFormData((f) => ({ ...f, email: v }));
                          setGuestEmail(v);
                          setContactVerified(false);
                          setOtpSent(false);
                          setOtpRequested(false);
                          setOtpProvider(null);
                          setOtpError("");
                          setOtpCode("");
                        }}
                        onBlur={(e) => tryPrefillFromStorage(e.target.value)}
                      />
                    </div>
                  </div>

                  {checkoutMode === "guest" ? (
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={otpBusy || !formData.email || !formData.email.includes("@")}
                        className="border border-secondary-800 px-4 py-2.5 rounded-xl bg-secondary-800 text-white hover:bg-secondary-700 transition text-sm disabled:opacity-60 inline-flex items-center gap-2"
                      >
                        {otpSent ? "Resend OTP" : "Get OTP"}
                      </button>
                      {otpRequested ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="• • • •"
                            className="rf-input w-36 bg-secondary-800 border-secondary-700 text-white placeholder:text-gray-600 text-center tracking-widest"
                            value={otpCode}
                            maxLength={4}
                            onChange={(e) => setOtpCode(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={handleVerifyOtp}
                            disabled={otpBusy || !otpSent}
                            className="rf-btn-primary px-4 py-2.5 transition text-sm disabled:opacity-60"
                          >
                            Verify
                          </button>
                        </div>
                      ) : null}
                      {otpError ? (
                        <div className="w-full text-xs text-red-500">
                          {otpError}
                        </div>
                      ) : null}
                      {otpSent && otpSecondsLeft > 0 ? (
                        <div className="w-full text-xs text-gray-500">
                          OTP expires in{" "}
                          {String(Math.floor(otpSecondsLeft / 60)).padStart(2, "0")}:
                          {String(otpSecondsLeft % 60).padStart(2, "0")}
                        </div>
                      ) : otpRequested && !contactVerified && otpExpiresAt ? (
                        <div className="w-full text-xs text-red-500">
                          OTP expired. Please request a new OTP.
                        </div>
                      ) : null}
                      <div className="text-xs text-gray-500">
                        Login is optional.{" "}
                        <Link to="/auth" className="text-primary hover:underline">
                          Sign in
                        </Link>{" "}
                        to redeem loyalty points.
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="rf-btn-primary px-10 py-3 transition"
                      >
                        Continue to Shipping
                      </button>
                    </div>
                  )}

                  {checkoutMode === "guest" && (
                    <label className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-secondary-800 bg-secondary-800 text-primary focus:ring-primary"
                        checked={saveDetails}
                        onChange={(e) => setSaveDetails(e.target.checked)}
                      />
                      Save my details for faster checkout next time
                    </label>
                  )}
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="mt-6 space-y-6 animate-slide-up">
                {savedAddresses.length > 0 ? (
                  <div className="rf-card p-6 bg-secondary-900 border-secondary-800">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      Saved Addresses
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {savedAddresses.map((addr) => (
                        <div
                          key={addr.AddressID}
                          onClick={() => applySavedAddress(addr, formData.email)}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedAddressId === addr.AddressID
                              ? "border-primary bg-primary/5"
                              : "border-secondary-800 hover:border-primary/50 bg-secondary-900"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-white">
                              {addr.AddressLabel}
                            </span>
                            <button
                              type="button"
                              className="p-1.5 rounded-lg border border-secondary-800 bg-secondary-800 hover:border-red-900 transition"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteAddr(addr);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                            </button>
                          </div>
                          <p className="text-sm font-medium text-gray-300">
                            {addr.FullName}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {addr.StreetAddress1}
                            {addr.StreetAddress2 ? `, ${addr.StreetAddress2}` : ""},{" "}
                            {addr.City}, {addr.State} – {addr.PostalCode}
                          </p>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAddressId(null);
                          setShowNewAddressForm(true);
                          setFormData((f) => ({ ...f, street: "", city: "", state: "", pincode: "" }));
                        }}
                        className={`p-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all ${
                          !selectedAddressId && showNewAddressForm
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-secondary-800"
                        }`}
                      >
                        <Plus className="h-6 w-6" />
                        <span className="text-sm font-medium">New Address</span>
                      </button>
                    </div>
                  </div>
                ) : null}

                {(showNewAddressForm || savedAddresses.length === 0) ? (
                  <div className="rf-card p-6 bg-secondary-900 border-secondary-800">
                    <h2 className="text-lg font-bold text-white mb-4">
                      Shipping Address
                    </h2>
                    <form onSubmit={handleAddressSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Full Name *"
                        className="rf-input w-full bg-secondary-800 border-secondary-700 text-white placeholder:text-gray-600"
                        value={formData.name}
                        onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                      />
                      <input
                        type="text"
                        placeholder="Pincode"
                        className="rf-input w-full bg-secondary-800 border-secondary-700 text-white placeholder:text-gray-600"
                        value={formData.pincode}
                        onChange={(e) => setFormData((f) => ({ ...f, pincode: e.target.value }))}
                      />
                      <input
                        type="text"
                        placeholder="Street Address *"
                        className="rf-input w-full md:col-span-2 bg-secondary-800 border-secondary-700 text-white placeholder:text-gray-600"
                        value={formData.street}
                        onChange={(e) => setFormData((f) => ({ ...f, street: e.target.value }))}
                      />

                      {addressMoreOpen ? (
                        <>
                          <input
                            type="text"
                            placeholder="City"
                            className="rf-input w-full bg-secondary-800 border-secondary-700 text-white placeholder:text-gray-600"
                            value={formData.city}
                            onChange={(e) => setFormData((f) => ({ ...f, city: e.target.value }))}
                          />
                          <input
                            type="text"
                            placeholder="State"
                            className="rf-input w-full bg-secondary-800 border-secondary-700 text-white placeholder:text-gray-600"
                            value={formData.state}
                            onChange={(e) => setFormData((f) => ({ ...f, state: e.target.value }))}
                          />
                        </>
                      ) : null}

                      <div className="md:col-span-2 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setAddressMoreOpen((v) => !v)}
                          className="text-sm text-gray-500 hover:text-primary transition"
                        >
                          {addressMoreOpen ? "Hide address details" : "Add city & state"}
                        </button>
                        {!embedded ? (
                          <button type="submit" className="rf-btn-primary px-10 py-3 transition">
                            Proceed to Payment
                          </button>
                        ) : null}
                      </div>
                    </form>
                  </div>
                ) : null}

                {!embedded && !showNewAddressForm && selectedAddressId ? (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => proceedToPayment()}
                      className="rf-btn-primary px-10 py-3 transition"
                    >
                      Proceed to Payment
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="mt-6 rf-card p-6 bg-secondary-900 border-secondary-800 animate-slide-up">
                <h2 className="text-lg font-bold text-white mb-5">
                  Payment Method
                </h2>
                <div className="bg-secondary-800 border border-secondary-700 rounded-xl p-4 mb-6 flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-gray-400">
                    <span className="font-semibold text-white">
                      {formData.name || "Shipping address"}
                    </span>
                    {" · "}
                    {formData.street}
                    {formData.city ? `, ${formData.city}` : ""}
                    {formData.state ? `, ${formData.state}` : ""}
                    {formData.pincode ? ` – ${formData.pincode}` : ""}
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="ml-2 text-primary text-xs hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    {
                      id: "online",
                      label: "Pay Online",
                      sub: "Card · UPI · Net Banking via Razorpay",
                    },
                    {
                      id: "cod",
                      label: "Cash on Delivery",
                      sub: "Pay when your order arrives",
                    },
                  ].map(({ id, label, sub }) => (
                    <label
                      key={id}
                      className={`border-2 p-4 rounded-xl flex items-center cursor-pointer transition ${
                        selectedPayment === id
                          ? "border-primary bg-primary/5"
                          : "border-secondary-800 hover:border-primary/40 bg-secondary-900"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        className="mr-3 accent-primary"
                        checked={selectedPayment === id}
                        onChange={() => setSelectedPayment(id)}
                      />
                      <div>
                        <div className="font-semibold text-white">
                          {label}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {sub}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                {!embedded ? (
                  <div className="flex justify-between items-center mt-6">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="text-sm text-gray-500 hover:text-primary transition"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={handlePlaceOrder}
                      className="rf-btn-primary px-8 py-3 transition"
                    >
                      {selectedPayment === "cod"
                        ? "Place Order"
                        : "Proceed to Payment"}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {!embedded ? (
              <p className="text-xs text-gray-500 mt-6">
                By proceeding, you agree to our{" "}
                <Link to="/terms" className="hover:text-primary underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="hover:text-primary underline">
                  Privacy Policy
                </Link>
                .
              </p>
            ) : null}
          </div>
        </div>

        {embedded ? (
          <div className="mt-auto border-t border-secondary-800 bg-secondary-900/90 backdrop-blur-sm px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs text-gray-500">You Pay</div>
                <div className="text-lg font-bold text-white">
                  {formatINR(finalTotals.total)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => (step < 3 ? proceedToPayment() : handlePlaceOrder())}
                className="rf-btn-primary px-8 py-3 transition"
              >
                {step < 3 ? "Proceed to Payment" : selectedPayment === "cod" ? "Place Order" : "Proceed to Payment"}
              </button>
            </div>
            <p className="text-[11px] text-gray-500 mt-2">
              By proceeding, you agree to our{" "}
              <Link to="/terms" className="hover:text-primary underline">
                Terms
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="hover:text-primary underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const CheckoutPopup = ({ open, onClose }) => (
  <Modal
    open={open}
    onClose={onClose}
    chromeless
    maxWidthClassName="max-w-3xl"
    panelClassName="p-0 overflow-hidden h-[90vh] flex flex-col bg-secondary-950"
  >
    <Checkout embedded onClose={onClose} />
  </Modal>
);

export default Checkout;
