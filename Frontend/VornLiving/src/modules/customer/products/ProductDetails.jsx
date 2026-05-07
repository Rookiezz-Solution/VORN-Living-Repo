import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Star, Truck, ShieldCheck, RefreshCw, Minus, Plus, Heart, ShoppingCart } from 'lucide-react';
import { getProductById, addToCart, addToWishlist, removeFromWishlist, checkWishlistStatus, checkProductAvailability, selectReplacement } from '../../../services/api';
import { useNotification } from '../../../context/NotificationContext';
import { formatINR } from '../../../utils/formatINR';
import ProductImage from '../../../components/ProductImage';
import { setSEO, setJSONLD } from '../../../utils/seo';

const ProductDetails = () => {
    const { showNotification } = useNotification();
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const replaceFor = searchParams.get('replaceFor'); // "orderId-orderItemId"
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [selectedImage, setSelectedImage] = useState('');
    const [pincode, setPincode] = useState('');
    const [deliveryDate, setDeliveryDate] = useState(null);
    const [isInWishlist, setIsInWishlist] = useState(false);
    const [availability, setAvailability] = useState(null);
  const [attributeOptions, setAttributeOptions] = useState({});
  const [selectedAttrs, setSelectedAttrs] = useState({});
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const productImages = useMemo(() => {
    if (!product) return [];
    const imgs = Array.isArray(product.images) && product.images.length ? product.images : (product.ImageURL ? [product.ImageURL] : []);
    return imgs.filter(Boolean);
  }, [product]);

    useEffect(() => {
        const loadProduct = async () => {
            const data = await getProductById(id);
            setProduct(data);
            if (data) {
                const firstImg = (data.images && data.images.length > 0) ? data.images[0] : data.ImageURL;
                setSelectedImage(firstImg);
                setCurrentImageIndex(0);
                const user = JSON.parse(localStorage.getItem('user'));
                if (user) {
                    const status = await checkWishlistStatus(user.UserID, data.ProductID);
                    setIsInWishlist(status);
                }
                // Initial availability (without pincode)
                try {
                    const info = await checkProductAvailability(data.ProductID, undefined);
                    setAvailability(info);
                } catch (e) {
                    console.error("Initial availability fetch failed", e);
                }
        // Build attribute options from variants
        if (Array.isArray(data.variants) && data.variants.length > 0) {
          const opts = {};
          for (const v of data.variants) {
            const attrs = v.Attributes || {};
            Object.keys(attrs).forEach(name => {
              opts[name] = opts[name] || [];
              if (!opts[name].includes(attrs[name])) {
                opts[name].push(attrs[name]);
              }
            });
          }
          setAttributeOptions(opts);
          // Initialize selection: pick first value for each attribute
          const initSel = {};
          Object.entries(opts).forEach(([name, values]) => {
            if (values.length > 0) initSel[name] = values[0];
          });
          setSelectedAttrs(initSel);
          // Find matching variant
          const match = findMatchingVariant(data.variants, initSel);
          setSelectedVariant(match || null);
        }
            }
            setLoading(false);
        };
        loadProduct();
    }, [id]);

    useEffect(() => {
        if (!productImages.length) return;
        const img = productImages[currentImageIndex] || '';
        if (img && selectedImage !== img) {
            setSelectedImage(img);
        }
    }, [currentImageIndex, productImages, selectedImage]);

    useEffect(() => {
        if (productImages.length <= 1) return;
        const intervalId = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % productImages.length);
        }, 3000);
        return () => clearInterval(intervalId);
    }, [productImages]);

    useEffect(() => {
        if (!product) return;
        const title = product.SEOTitle || product.ProductName || 'Product Details | Vorn Living';
        const description = product.MetaDescription || product.ShortDescription || 'Explore product details, specifications, pricing and verified customer reviews at Vorn Living.';
        const canonical = product.CanonicalURL || `${window.location.origin}/product/${product.ProductID}`;
        const image = (product.images && product.images[0]) || product.ImageURL || undefined;
        setSEO({
            title,
            description,
            canonical,
            image,
            type: 'product'
        });
        setJSONLD('product', {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.ProductName,
            description,
            image: image ? [image] : undefined,
            sku: product.SKU || undefined,
            offers: {
                '@type': 'Offer',
                priceCurrency: product.CurrencySetting || 'INR',
                price: Number(product.SalePrice || product.RegularPrice || 0),
                availability: Number(product.StockQuantity || 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                url: canonical
            }
        });
        return () => setJSONLD('product', null);
    }, [product]);

  const findMatchingVariant = (variants, sel) => {
    if (!Array.isArray(variants)) return null;
    return variants.find(v => {
      const attrs = v.Attributes || {};
      return Object.keys(sel).every(k => String(attrs[k] || '') === String(sel[k] || ''));
    }) || null;
  };

    const toggleWishlist = async () => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            showNotification("Please login to add to wishlist", 'error');
            navigate('/auth');
            return;
        }

        try {
            if (isInWishlist) {
                await removeFromWishlist(user.UserID, product.ProductID);
                setIsInWishlist(false);
                showNotification("Removed from wishlist", 'info');
            } else {
                await addToWishlist(user.UserID, product.ProductID);
                setIsInWishlist(true);
                showNotification("Added to wishlist!", 'success');
            }
        } catch (error) {
            console.error(error);
            showNotification("Failed to update wishlist", 'error');
        }
    };

    const handleAddToCart = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const userId = user ? user.UserID : null;
            // No login check needed for guest cart
            await addToCart(userId, product.ProductID, quantity, selectedVariant?.VariantID);
            showNotification("Item added to cart!", 'success');
        } catch (error) {
            console.error("Add to cart failed", error);
            showNotification("Failed to add item to cart.", 'error');
        }
    };

    const handleBuyNow = async () => {
        const user = JSON.parse(localStorage.getItem('user'));
        
        // 1. Add item to cart first
        try {
            const userId = user ? user.UserID : null;
            await addToCart(userId, product.ProductID, quantity, selectedVariant?.VariantID);
            
            // 2. Redirect to checkout directly (allow guest checkout)
            navigate('/checkout');
        } catch (error) {
            console.error("Buy Now failed", error);
            showNotification("Failed to process request.", 'error');
        }
    };

    const handleUseAsReplacement = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) {
                showNotification("Please login first", 'error');
                navigate('/auth', { state: { from: location.pathname + location.search } });
                return;
            }
            if (!replaceFor) return;
            const [orderIdStr, orderItemIdStr] = replaceFor.split('-');
            const orderId = parseInt(orderIdStr, 10);
            const orderItemId = parseInt(orderItemIdStr, 10);
            await selectReplacement(orderId, orderItemId, { productId: product.ProductID, variantId: selectedVariant?.VariantID || null });
            showNotification("Replacement applied to your order.", 'success');
            navigate(`/order/${orderId}/track`);
        } catch (error) {
            const msg = error?.response?.data?.message || 'Failed to apply replacement';
            showNotification(msg, 'error');
        }
    };

    const handleCheckDelivery = async () => {
        if (pincode.length !== 6) {
            showNotification("Please enter a valid 6-digit pincode", 'info');
            return;
        }
        try {
            const info = await (await import('../../../services/api')).checkProductAvailability(product.ProductID, pincode);
            setDeliveryDate(new Date(info.estimatedDeliveryDate).toDateString());
        } catch (err) {
            console.error("Check delivery failed", err);
            showNotification("Failed to fetch delivery info", 'error');
        }
    };

    if (loading) return <div className="min-h-[60vh] flex items-center justify-center text-gray-500">Loading...</div>;
    if (!product) return <div className="min-h-[60vh] flex items-center justify-center text-gray-500">Product Not Found</div>;

    return (
        <div className="container mx-auto px-4 py-10 animate-fade-in" data-reveal>
            {replaceFor && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-xl px-4 py-3">
                    You are choosing a replacement item for your approved request. Select variant if needed and click "Use as Replacement".
                </div>
            )}
            <div className="mb-6">
                <p className="text-sm text-gray-500">
                    <Link to="/" className="hover:text-primary">Home</Link> <span className="mx-2">/</span>
                    <Link to="/shop" className="hover:text-primary">Shop</Link> 
                    {product.CategoryName ? <><span className="mx-2">/</span><span className="text-secondary">{product.CategoryName}</span></> : null}
                    <span className="mx-2">/</span><span className="text-secondary font-medium">{product.ProductName}</span>
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
                    <div className="bg-section-gradient border border-border rounded-2xl overflow-hidden shadow-sm animate-scale-in">
                        <div className="h-[420px] md:h-[520px] bg-gray-50 dark:bg-gray-800 group">
                            <ProductImage
                                key={selectedImage || 'placeholder'}
                                src={selectedImage}
                                alt={product.ProductName}
                                category={product.CategoryName}
                                apiOnly={true}
                                fallbackText={product.ProductName}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            />
                        </div>
                    </div>
                    <div className="flex space-x-4 overflow-x-auto no-scrollbar pb-2">
                        {productImages.map((img, idx) => (
                            <button 
                                type="button"
                                key={idx} 
                                onClick={() => {
                                    setSelectedImage(img);
                                    setCurrentImageIndex(idx);
                                }}
                                className={`w-24 h-24 border rounded-xl overflow-hidden flex-shrink-0 bg-white dark:bg-gray-900 ${selectedImage === img ? 'border-primary' : 'border-border dark:border-gray-700 hover:border-primary/60'} transition`}
                            >
                                <ProductImage src={img} alt={`Thumb ${idx}`} category={product.CategoryName} apiOnly={true} fallbackText={product.ProductName} className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="bg-section-gradient border border-border rounded-2xl shadow-sm p-6 animate-slide-up">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <div className="text-sm text-gray-500 uppercase tracking-wider">
                                    {product.CategoryName}
                                </div>
                                <h1 className="text-3xl font-bold text-secondary mt-2 leading-snug">
                                    {product.ProductName}
                                </h1>
                            </div>
                            <button 
                                onClick={toggleWishlist}
                                className={`p-3 rounded-full shadow-sm border transition duration-300 flex-shrink-0 ${
                                    isInWishlist ? 'bg-red-50 border-red-200 text-red-500 hover:text-red-600' : 'bg-white border-border text-gray-400 hover:text-red-500 hover:border-red-200'
                                }`}
                            >
                                <Heart className={`h-6 w-6 ${isInWishlist ? 'fill-current' : ''}`} />
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4">
                            <div className="flex text-yellow-400">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={`h-4 w-4 ${i < Math.round((product.reviews?.avgRating ?? product.Rating) || 0) ? 'fill-current' : 'text-gray-300'}`} />
                                ))}
                            </div>
                            <span className="text-sm text-gray-500">{(product.reviews?.reviewCount ?? product.ReviewCount) || 0} Reviews</span>
                            <span className={`${availability?.inStock ? 'text-primary' : 'text-secondary'} text-sm font-semibold flex items-center`}>
                                <ShieldCheck className="h-4 w-4 mr-1" /> {availability?.inStock ? 'In Stock' : 'Out of Stock'}
                            </span>
                        </div>

                        <div className="border-t border-border mt-6 pt-6">
                            <div className="flex items-end flex-wrap gap-3">
                                <span className="text-4xl font-bold text-primary">
                                  {formatINR(selectedVariant?.SalePrice ?? selectedVariant?.RegularPrice ?? product.SalePrice ?? product.RegularPrice)}
                                </span>
                            {(selectedVariant?.SalePrice ?? product.SalePrice) && ((selectedVariant?.SalePrice ?? product.SalePrice) < (selectedVariant?.RegularPrice ?? product.RegularPrice)) && (
                                <>
                                    <span className="text-xl text-gray-400 line-through">
                                        {formatINR(selectedVariant?.RegularPrice ?? product.RegularPrice)}
                                    </span>
                                    <span className="badge-sale text-sm">
                                        {(() => {
                                          const reg = selectedVariant?.RegularPrice ?? product.RegularPrice;
                                          const sale = selectedVariant?.SalePrice ?? product.SalePrice;
                                          return `Save ${Math.round(((reg - sale) / reg) * 100)}%`;
                                        })()}
                                    </span>
                                </>
                            )}
                            </div>
                            {/* Variant selectors */}
                            {Object.keys(attributeOptions).length > 0 && (
                              <div className="mt-4 space-y-3">
                                {Object.entries(attributeOptions).map(([name, values]) => (
                                  <div key={name}>
                                    <div className="text-sm font-semibold text-secondary mb-1">{name}</div>
                                    <div className="flex flex-wrap gap-2">
                                      {values.map(val => (
                                        <button
                                          type="button"
                                          key={`${name}-${val}`}
                                          onClick={() => {
                                            const nextSel = { ...selectedAttrs, [name]: val };
                                            setSelectedAttrs(nextSel);
                                            const match = findMatchingVariant(product.variants, nextSel);
                                            setSelectedVariant(match || null);
                                          }}
                                          className={`px-3 py-1.5 rounded-xl border ${selectedAttrs[name] === val ? 'bg-primary text-secondary border-primary' : 'bg-white text-secondary border-border hover:border-primary'}`}
                                        >
                                          {val}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                                {selectedVariant && (
                                  <div className="text-sm text-gray-600 mt-2">
                                    Selected: {selectedVariant.VariantName} • Stock: {selectedVariant.StockQuantity ?? 0}
                                  </div>
                                )}
                              </div>
                            )}
                            {product.highlights && product.highlights.length > 0 && (
                                <ul className="mt-5 text-gray-700 space-y-1 list-disc pl-5">
                                    {product.highlights.map((h, idx) => <li key={idx}>{h}</li>)}
                                </ul>
                            )}
                        </div>

                        <div className={`grid gap-3 mt-6 ${replaceFor ? 'grid-cols-1 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'}`}>
                            <div className="flex items-center border border-border rounded-xl justify-between px-3 bg-background h-12">
                                <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 hover:text-primary transition"><Minus className="h-4 w-4" /></button>
                                <span className="font-semibold">{quantity}</span>
                                <button type="button" onClick={() => setQuantity(quantity + 1)} className="p-2 hover:text-primary transition"><Plus className="h-4 w-4" /></button>
                            </div>
                            <button 
                                type="button" 
                                onClick={handleAddToCart}
                                className="w-full bg-white border border-secondary text-secondary rounded-xl font-semibold hover:bg-gray-50 transition flex items-center justify-center h-12"
                                title="Add this item to your cart"
                            >
                                <ShoppingCart className="h-5 w-5 mr-2" /> <span className="text-sm md:text-base">Add to Cart</span>
                            </button>
                            <button 
                                type="button" 
                                onClick={handleBuyNow}
                                className="w-full rf-btn-primary transition flex items-center justify-center shadow-sm h-12"
                                title="Buy this item now"
                            >
                                <span className="text-sm md:text-base">Buy Now</span>
                            </button>
                            {replaceFor && (
                                <button 
                                    type="button"
                                    onClick={handleUseAsReplacement}
                                    className="w-full bg-secondary text-white rounded-xl font-semibold hover:bg-opacity-90 transition flex items-center justify-center h-12"
                                    title="Apply this product as your approved replacement"
                                >
                                    <span className="text-sm md:text-base">Use as Replacement</span>
                                </button>
                            )}
                        </div>

                        <div className="bg-surface-2 border border-border rounded-2xl p-6 mt-6">
                            <h4 className="font-semibold mb-3 flex items-center"><Truck className="h-5 w-5 mr-2 text-primary" /> Delivery Options</h4>
                            <div className="flex gap-2 mb-2">
                                <input 
                                    type="text" 
                                    placeholder="Enter Pincode" 
                                    value={pincode}
                                    onChange={(e) => setPincode(e.target.value)}
                                    className="border border-border dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/70 transition bg-white dark:bg-gray-900 dark:text-gray-200"
                                    maxLength={6}
                                />
                                <button 
                                    type="button"
                                    onClick={handleCheckDelivery}
                                    className="text-primary font-semibold text-sm px-3 hover:underline"
                                >
                                    Check
                                </button>
                            </div>
                            {deliveryDate && <p className="text-sm text-green-600">Expected delivery by {deliveryDate}</p>}
                            <div className="mt-4 text-sm text-gray-600 space-y-2">
                                {/* Replacement window derived from specifications if present */}
                                {product.specifications?.some(s => s.SpecKey.toLowerCase() === 'replacementwindowdays') && (
                                    <p className="flex items-center">
                                        <RefreshCw className="h-4 w-4 mr-2 text-primary" /> 
                                        {(() => {
                                            const days = product.specifications.find(s => s.SpecKey.toLowerCase() === 'replacementwindowdays')?.SpecValue;
                                            return `${days} Days Replacement Policy`;
                                        })()}
                                    </p>
                                )}
                                {/* Warranty derived from specifications */}
                                {product.specifications?.some(s => s.SpecKey.toLowerCase() === 'warranty') && (
                                    <p className="flex items-center">
                                        <ShieldCheck className="h-4 w-4 mr-2 text-primary" /> 
                                        {product.specifications.find(s => s.SpecKey.toLowerCase() === 'warranty')?.SpecValue}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Tabs: Description / Specifications / Reviews */}
                        <div className="mt-8">
                            <div className="flex gap-4 border-b border-border pb-2">
                                <button className="px-3 py-2 font-semibold text-secondary hover:text-primary">Description</button>
                                <button className="px-3 py-2 font-semibold text-secondary hover:text-primary">Specifications</button>
                                <button className="px-3 py-2 font-semibold text-secondary hover:text-primary">Reviews</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                {/* Description */}
                                <div className="bg-section-gradient border border-border rounded-2xl p-5">
                                    <h4 className="font-semibold mb-2">Description</h4>
                                    {product.descriptionHtml ? (
                                        <div className="prose prose-sm text-gray-700" dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />
                                    ) : product.description ? (
                                        <p className="text-gray-700 leading-relaxed">{product.description}</p>
                                    ) : null}
                                </div>
                                {/* Specs table */}
                                <div className="bg-section-gradient border border-border rounded-2xl p-5">
                                    <h4 className="font-semibold mb-2">Specifications</h4>
                                    <div className="text-sm">
                                        {(product.specifications || []).length === 0 ? <p className="text-gray-500">No specifications available.</p> : (
                                            <table className="w-full">
                                                <tbody>
                                                    {product.specifications.map((s, idx) => (
                                                        <tr key={idx} className="border-b border-border">
                                                            <td className="py-2 font-semibold text-secondary" style={{paddingRight:"10px"}}>{s.SpecKey}</td>
                                                            <td className="py-2 text-gray-700">{s.SpecValue}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {/* Reviews summary */}
                            <div className="mt-6 bg-section-gradient border border-border rounded-2xl p-5">
                                <h4 className="font-semibold mb-2">Ratings & Reviews</h4>
                                <div className="flex items-start gap-6">
                                    <div>
                                        <div className="text-4xl font-bold text-secondary">{(product.reviews?.avgRating || 0).toFixed(1)}</div>
                                        <div className="text-sm text-gray-600">Average • {(product.reviews?.reviewCount || 0)} ratings</div>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        {[5,4,3,2,1].map(star => {
                                            const count = product.reviews?.distribution?.find(d => d.Rating === star)?.Count || 0;
                                            const total = product.reviews?.reviewCount || 0;
                                            const pct = total ? Math.round((count / total) * 100) : 0;
                                            return (
                                                <div key={star} className="flex items-center gap-2 text-sm">
                                                    <span className="w-6">{star}★</span>
                                                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                        <div className="h-2 bg-primary rounded-full" style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <span className="w-10 text-right text-gray-600">{pct}%</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div
                                    className={`mt-4 space-y-4 pr-2 ${((product.reviews?.recent || []).length > 3) ? 'max-h-[340px] overflow-y-auto' : ''}`}
                                    style={((product.reviews?.recent || []).length > 3) ? { scrollbarGutter: 'stable' } : undefined}
                                >
                                    {(product.reviews?.recent || []).map(r => {
                                        const body = r.ReviewBody || '';
                                        const m = body.match(/PhotoURL:\s*(\S+)/i);
                                        const url = m ? m[1] : null;
                                        return (
                                            <div key={r.ReviewID} className="border border-border rounded-xl p-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="text-yellow-500">{'★'.repeat(r.Rating)}{'☆'.repeat(5 - r.Rating)}</div>
                                                    {r.IsVerifiedPurchase ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Verified Purchase</span> : null}
                                                    <span className="text-xs text-gray-500 ml-auto">{new Date(r.CreatedAt).toLocaleDateString()}</span>
                                                </div>
                                                {r.ReviewTitle && <div className="font-semibold mt-1">{r.ReviewTitle}</div>}
                                                {r.ReviewBody && <p className="text-sm text-gray-700 mt-1">{body.replace(/PhotoURL:\s*\S+/i, '').trim()}</p>}
                                                {url && <ProductImage src={url} alt="Review" fallbackText={product.ProductName} className="mt-2 h-24 w-24 object-cover rounded-xl border border-border" />}
                                            </div>
                                        );
                                    })}
                                    {(product.reviews?.recent || []).length === 0 && <p className="text-sm text-gray-500">No reviews yet.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetails;
