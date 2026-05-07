import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, ArrowLeft, Plus, Minus, ShoppingCart } from 'lucide-react';
import { getCart, updateCartItem, removeCartItem } from '../../../services/api';
import ProductImage from '../../../components/ProductImage';
import { formatINR } from '../../../utils/formatINR';
import { CheckoutPopup } from '../checkout/Checkout';

const CartPage = () => {
    const [cartItems, setCartItems] = useState([]);
    const [totals, setTotals] = useState({ subTotal: 0, shipping: 0, tax: 0, total: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [cartId, setCartId] = useState(null);
    const [checkoutOpen, setCheckoutOpen] = useState(false);

    const fetchCart = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const userId = user ? user.UserID : null;
            
            // Fetch cart (works for guest or logged in)
            const data = await getCart(userId);
            setCartItems(data.items || []);
            setTotals(data.totals || { subTotal: 0, shipping: 0, tax: 0, total: 0 });
            setCartId(data.cartId);
        } catch (error) {
            console.error("Failed to load cart", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCart();
    }, []);

    useEffect(() => {
        const onCartUpdated = () => fetchCart();
        window.addEventListener('cartUpdated', onCartUpdated);
        return () => window.removeEventListener('cartUpdated', onCartUpdated);
    }, []);

    

    const updateQuantity = async (cartItemId, newQuantity) => {
        if (newQuantity < 1) return;
        try {
            const cartIdToUse = cartId; 
            await updateCartItem(cartItemId, newQuantity, cartIdToUse);
            fetchCart(); 
        } catch (error) {
            console.error("Failed to update quantity", error);
        }
    };

    const removeItem = async (cartItemId) => {
        try {
            await removeCartItem(cartItemId, cartId);
            fetchCart();
        } catch (error) {
            console.error("Failed to remove item", error);
        }
    };

    if (isLoading) return <div className="min-h-[60vh] flex items-center justify-center text-gray-500">Loading Cart...</div>;

    return (
        <div className="container mx-auto px-4 py-10 animate-fade-in">
            <CheckoutPopup
                open={checkoutOpen}
                onClose={() => {
                    setCheckoutOpen(false);
                    fetchCart();
                }}
            />
            <div className="mb-8">
                <p className="text-sm text-gray-500">
                    <Link to="/" className="hover:text-primary">Home</Link> <span className="mx-2">/</span>
                    <span className="text-secondary font-medium">Cart</span>
                </p>
                <h1 className="text-3xl md:text-4xl font-bold text-secondary mt-2">Your Cart</h1>
                <p className="text-gray-500 mt-2">{cartItems.length} item(s)</p>
            </div>

            {cartItems.length > 0 ? (
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Cart Items */}
                    <div className="w-full lg:w-2/3 rf-card p-6 animate-slide-up">
                        <div className="hidden md:grid grid-cols-6 gap-4 text-gray-500 font-medium mb-4 pb-2 border-b">
                            <div className="col-span-3">Product</div>
                            <div className="col-span-1 text-center">Price</div>
                            <div className="col-span-1 text-center">Quantity</div>
                            <div className="col-span-1 text-right">Total</div>
                        </div>

                        {cartItems.map(item => (
                            <div key={item.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center py-5 border-b last:border-0">
                                <div className="col-span-3 flex items-center space-x-4">
                                    <div className="h-16 w-16 rounded-xl border border-border overflow-hidden bg-gray-50 flex-shrink-0">
                                        <ProductImage
                                            src={item.image}
                                            alt={item.name}
                                            category={item.category}
                                            showFallbackBrand={false}
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-secondary">
                                            <Link to={`/product/${item.productId}`} className="hover:text-primary transition">{item.name}</Link>
                                        </h3>
                                        <p className="text-sm text-gray-400">Category: {item.category}</p>
                                        {item.variantName && (
                                            <p className="text-xs text-gray-500 mt-1">Variant: {item.variantName}{item.variantSku ? ` • SKU ${item.variantSku}` : ''}</p>
                                        )}
                                        <button 
                                            type="button"
                                            onClick={() => removeItem(item.id)}
                                            className="text-red-500 text-sm flex items-center mt-1 hover:underline md:hidden"
                                        >
                                            <Trash2 className="h-3 w-3 mr-1" /> Remove
                                        </button>
                                    </div>
                                </div>
                                <div className="col-span-1 text-center font-medium md:block hidden">{formatINR(item.price)}</div>
                                <div className="col-span-1 flex justify-center items-center">
                                    <div className="flex items-center border border-border rounded-xl px-2 bg-background">
                                        <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-2 hover:text-primary transition"><Minus className="h-3 w-3" /></button>
                                        <span className="mx-2">{item.quantity}</span>
                                        <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-2 hover:text-primary transition"><Plus className="h-3 w-3" /></button>
                                    </div>
                                </div>
                                <div className="col-span-1 text-right font-bold text-primary">
                                    {formatINR(item.total)}
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => removeItem(item.id)}
                                    className="hidden md:block text-gray-400 hover:text-red-500 justify-self-end"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </div>
                        ))}

                        <Link to="/shop" className="inline-flex items-center text-primary mt-6 hover:underline">
                            <ArrowLeft className="h-4 w-4 mr-2" /> Continue Shopping
                        </Link>
                    </div>

                    {/* Order Summary */}
                    <div className="w-full lg:w-1/3">
                        <div className="lg:sticky lg:top-28 rf-card p-6 animate-slide-up">
                            <h2 className="text-xl font-bold mb-4 text-secondary">Order Summary</h2>
                            <div className="space-y-3 text-gray-600 mb-6 border-b pb-6">
                                <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span>{formatINR(totals.subTotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Shipping</span>
                                    <span>{totals.shipping === 0 ? 'Free' : formatINR(totals.shipping)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Tax (Estimated)</span>
                                    <span>{formatINR(totals.tax)}</span>
                                </div>
                                {totals.discount > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>Discount</span>
                                        <span>-{formatINR(totals.discount)}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-between text-xl font-bold text-secondary mb-6">
                                <span>Total</span>
                                <span>{formatINR(totals.total)}</span>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setCheckoutOpen(true)}
                                className="w-full rf-btn-primary py-3 transition"
                            >
                                Proceed to Pay
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 rf-card animate-fade-in">
                    <ShoppingCart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-400 mb-4">Your Cart is Empty</h2>
                    <Link to="/shop" className="rf-btn-primary px-6 py-3 transition inline-flex items-center">
                        Start Shopping
                    </Link>
                </div>
            )}
        </div>
    );
};

export default CartPage;
