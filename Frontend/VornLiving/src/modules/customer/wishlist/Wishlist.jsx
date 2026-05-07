import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ShoppingCart, Heart, ArrowRight } from 'lucide-react';
import { getWishlist, removeFromWishlist, addToCart } from '../../../services/api';
import { useNotification } from '../../../context/NotificationContext';
import ProductImage from '../../../components/ProductImage';
import { formatINR } from '../../../utils/formatINR';

const Wishlist = () => {
    const { showNotification } = useNotification();
    const navigate = useNavigate();
    const [wishlistItems, setWishlistItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchWishlist = useCallback(async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) {
                navigate('/auth', { state: { from: '/wishlist' } });
                return;
            }
            const items = await getWishlist(user.UserID);
            setWishlistItems(items);
        } catch (error) {
            console.error("Failed to load wishlist", error);
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchWishlist();
    }, [fetchWishlist]);

    const handleRemove = async (productId) => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            await removeFromWishlist(user.UserID, productId);
            showNotification("Removed from wishlist", 'info');
            fetchWishlist();
        } catch (error) {
            console.error(error);
            showNotification("Failed to remove item", 'error');
        }
    };

    const handleAddToCart = async (productId) => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const userId = user ? user.UserID : null;
            // Guest cart logic handled in api
            await addToCart(userId, productId, 1);
            showNotification("Added to cart!", 'success');
        } catch (error) {
            console.error(error);
            showNotification("Failed to add to cart", 'error');
        }
    };

    if (isLoading) return <div className="min-h-[60vh] flex items-center justify-center text-gray-500">Loading Wishlist...</div>;

    return (
        <div className="container mx-auto px-4 py-10 animate-fade-in" data-reveal>
            <div className="mb-8">
                <p className="text-sm text-gray-500">
                    <Link to="/" className="hover:text-primary">Home</Link> <span className="mx-2">/</span>
                    <span className="text-secondary font-medium">Wishlist</span>
                </p>
                <h1 className="text-3xl md:text-4xl font-bold text-secondary mt-2">My Wishlist</h1>
                <p className="text-gray-500 mt-2">{wishlistItems.length} item(s)</p>
            </div>

            {wishlistItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {wishlistItems.map((item) => (
                        <div key={item.WishlistID} data-tilt className="group rf-card overflow-hidden flex flex-col transition-all duration-300 rf-hover-lift rf-tilt-3d">
                            <div className="relative overflow-hidden aspect-[4/5]">
                                <ProductImage
                                    src={item.ImageURL}
                                    alt={item.ProductName}
                                    category={item.CategoryName}
                                    className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                                    fallbackText={item.ProductName}
                                />
                                <button 
                                    onClick={() => handleRemove(item.ProductID)}
                                    className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm text-red-500 hover:bg-red-50 transition z-10"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                            
                            <div className="p-4 flex flex-col flex-1">
                                <div className="text-xs text-gray-400 mb-1">{item.CategoryName}</div>
                                <h3 className="font-semibold text-secondary mb-1 truncate">
                                    <Link to={`/product/${item.ProductID}`} className="hover:text-primary transition">
                                        {item.ProductName}
                                    </Link>
                                </h3>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-lg font-bold text-primary">{formatINR(item.SalePrice || item.RegularPrice)}</span>
                                    {item.SalePrice && (
                                        <span className="text-sm text-gray-400 line-through">{formatINR(item.RegularPrice)}</span>
                                    )}
                                </div>
                                
                                <button 
                                    onClick={() => handleAddToCart(item.ProductID)}
                                    data-ripple
                                    className="mt-auto w-full py-2 rf-btn-primary transition flex items-center justify-center gap-2"
                                >
                                    <ShoppingCart className="h-4 w-4" /> Add to Cart
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 rf-card animate-fade-in">
                    <Heart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-400 mb-4">Your Wishlist is Empty</h2>
                    <p className="text-gray-500 mb-6">Save items you love to revisit them later.</p>
                    <Link to="/shop" className="rf-btn-primary px-6 py-3 transition inline-flex items-center">
                        Start Shopping
                    </Link>
                </div>
            )}
        </div>
    );
};

export default Wishlist;
