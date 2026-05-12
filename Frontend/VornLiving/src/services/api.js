import axios from "axios";
import { mockCategories, mockProducts, mockBanners } from "../data/mockData";

// Default backend port (see Backend/server.js)
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});


// Add interceptor to include User ID in headers and broadcast loading events
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("api:request-start"));
  }
  const user = localStorage.getItem("user");
  if (user) {
    try {
      const parsedUser = JSON.parse(user);
      if (parsedUser && parsedUser.UserID) {
        config.headers["x-user-id"] = parsedUser.UserID;
      }
    } catch (e) {
      console.error("Error parsing user from local storage", e);
    }
  }
  const adminEmail = localStorage.getItem("adminEmail");
  if (adminEmail) {
    config.headers["x-admin-email"] = adminEmail;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("api:request-end"));
    }
    return response;
  },
  (error) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("api:request-end"));
      const msg =
        error?.response?.data?.message ||
        error.message ||
        "Something went wrong";
      window.dispatchEvent(
        new CustomEvent("toast:show", {
          detail: { type: "error", message: msg },
        }),
      );
    }
    return Promise.reject(error);
  },
);

export const getCategories = async () => {
  try {
    const response = await api.get("/categories");
    const origin = (() => {
      try {
        const u = new URL(API_URL);
        return `${u.protocol}//${u.hostname}${u.port ? `:${u.port}` : ""}`;
      } catch {
        return "";
      }
    })();
    const toAbsolute = (url) => {
      if (!url) return url;
      if (url.startsWith("http://") || url.startsWith("https://")) return url;
      const withSlash = url.startsWith("/") ? url : `/${url}`;
      // Only prepend origin for backend-served paths
      if (withSlash.startsWith('/uploads/') || withSlash.startsWith('/images/') || withSlash.startsWith('/api/')) {
        return origin ? `${origin}${withSlash}` : withSlash;
      }
      return withSlash;
    };
    const cats = Array.isArray(response.data) ? response.data : [];
    return cats.map((c) => ({
      ...c,
      ImageURL: toAbsolute(c.ImageURL || c.ImageUrl || c.imageUrl || null),
    }));
  } catch (error) {
    console.warn(
      "API call to /categories failed. Using mock data.",
      error.message,
    );
    return mockCategories;
  }
};

// Normalize Product payload to consistent shape for frontend
const normalizeProduct = (p) => {
  if (!p) return p;
  const origin = (() => {
    try {
      const u = new URL(API_URL);
      return `${u.protocol}//${u.hostname}${u.port ? `:${u.port}` : ""}`;
    } catch {
      return "";
    }
  })();
  const toAbsolute = (url) => {
    if (!url) return url;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const withSlash = url.startsWith("/") ? url : `/${url}`;
    // Only prepend origin for backend-served paths
    if (withSlash.startsWith('/uploads/') || withSlash.startsWith('/images/') || withSlash.startsWith('/api/')) {
      return origin ? `${origin}${withSlash}` : withSlash;
    }
    return withSlash;
  };
  const images = (
    Array.isArray(p.images) ? p.images : p.ImageURL ? [p.ImageURL] : []
  ).map(toAbsolute);
  const descriptionHtml = p.FullDescription ?? p.DescriptionHTML ?? null;
  const descriptionText =
    p.ShortDescription ??
    p.Description ??
    p.ProductDescription ??
    p.LongDescription ??
    p.Details ??
    p.Overview ??
    "";
  return {
    ...p,
    images,
    ImageURL: toAbsolute(p.ImageURL),
    description: descriptionText,
    descriptionHtml,
  };
};

export const getProducts = async (options = {}) => {
  try {
    // If a string is passed, treat it as categorySlug (legacy support or simple call)
    const payload =
      typeof options === "string"
        ? { category: options }
        : {
            category: options.categorySlug,
            search: options.search,
            sort: options.sort,
            minPrice: options.minPrice,
            maxPrice: options.maxPrice,
            material: options.material,
            finish: options.finish,
            page: options.page || 1,
            limit: options.limit || 10,
          };

    // Use POST /products/filter as requested
    const response = await api.post("/products/filter", payload);

    // The new backend response structure is { products: [], totalCount: 0, page: 1, limit: 10 }
    // If the backend returns an array (legacy fallback), wrap it
    if (Array.isArray(response.data)) {
      return {
        products: response.data.map(normalizeProduct),
        totalCount: response.data.length,
        page: 1,
        limit: response.data.length,
      };
    }
    return {
      ...response.data,
      products: (response.data.products || []).map(normalizeProduct),
    };
  } catch (error) {
    console.warn(
      "API call to /products/filter failed. Using mock data.",
      error.message,
    );
    // Fallback for mock data pagination
    const page = options.page || 1;
    const limit = options.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;
    return {
      products: mockProducts.slice(start, end).map(normalizeProduct),
      totalCount: mockProducts.length,
      page,
      limit,
    };
  }
};

export const getRecentReviews = async (limit = 10) => {
  try {
    const response = await api.get("/reviews/recent", { params: { limit } });
    return response.data;
  } catch (error) {
    console.warn("API call to /reviews/recent failed.", error.message);
    return { reviews: [] };
  }
};

export const getProductById = async (id) => {
  try {
    const response = await api.get(`/products/${id}`);
    return normalizeProduct(response.data);
  } catch (error) {
    console.warn(
      `API call to /products/${id} failed. Using mock data.`,
      error.message,
    );
    const m = mockProducts.find((p) => p.id === parseInt(id)) || null;
    return normalizeProduct(m);
  }
};
export const getBanners = async () => {
  // Static banners, no API call
  return mockBanners;
};

// Auth APIs - Email OTP Flow
export const checkUserExists = async (email) => {
  try {
    const response = await api.post("/auth/check-user", { email });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message);
    }
    console.error("Auth Check Error:", error);
    throw error;
  }
};

export const sendEmailOtp = async (email, type) => {
  try {
    const response = await api.post("/auth/send-otp", { email, type });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message);
    }
    console.error("Send OTP Error:", error);
    throw error;
  }
};

export const verifyEmailOtp = async (email, otp, type) => {
  try {
    const response = await api.post("/auth/verify-otp", { email, otp, type });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message);
    }
    console.error("Verify OTP Error:", error);
    throw error;
  }
};

export const sendPhoneOtp = async (phone, type) => {
  const normalized = String(phone || "").trim();
  if (!normalized) throw new Error("Phone number is required");
  try {
    const response = await api.post("/auth/send-phone-otp", {
      phone: normalized,
      type,
    });
    return response.data;
  } catch (error) {
    if (error.response?.data?.message) throw new Error(error.response.data.message);
    throw error;
  }
};

export const verifyPhoneOtp = async (phone, otp, type) => {
  const normalized = String(phone || "").trim();
  const code = String(otp || "").trim();
  if (!normalized) throw new Error("Phone number is required");
  if (!code) throw new Error("OTP is required");
  try {
    const response = await api.post("/auth/verify-phone-otp", {
      phone: normalized,
      otp: code,
      type,
    });
    return response.data;
  } catch (error) {
    if (error.response?.data?.message) throw new Error(error.response.data.message);
    throw error;
  }
};

export const registerUser = async (userData) => {
  try {
    const response = await api.post("/auth/register", userData);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message);
    }
    console.error("Registration Error:", error);
    throw error;
  }
};

const fallbackCoupons = [
  {
    code: "SAVE10",
    title: "Save 10%",
    description: "10% off on orders above ₹999",
    minOrder: 999,
    type: "percent",
    value: 10,
    maxDiscount: 250,
  },
  {
    code: "SAVE100",
    title: "Flat ₹100 off",
    description: "₹100 off on orders above ₹799",
    minOrder: 799,
    type: "flat",
    value: 100,
  },
];

export const listCoupons = async () => {
  try {
    const response = await api.get("/coupons");
    const list = Array.isArray(response.data) ? response.data : response.data?.coupons;
    return Array.isArray(list) && list.length ? list : fallbackCoupons;
  } catch {
    return fallbackCoupons;
  }
};

export const validateCoupon = async ({ code, subTotal, shipping = 0 }) => {
  const normalized = String(code || "").trim().toUpperCase();
  const subtotalNum = Number(subTotal || 0);
  const shippingNum = Number(shipping || 0);
  if (!normalized) return { valid: false, discount: 0, message: "Enter a coupon code" };

  try {
    const response = await api.post("/coupons/validate", {
      code: normalized,
      subTotal: subtotalNum,
      shipping: shippingNum,
    });
    return response.data;
  } catch {
    const coupon = fallbackCoupons.find((c) => String(c.code).toUpperCase() === normalized);
    if (!coupon) return { valid: false, discount: 0, message: "Invalid coupon code" };
    if (subtotalNum < Number(coupon.minOrder || 0)) {
      return {
        valid: false,
        discount: 0,
        message: `Add ₹${Math.max(0, Number(coupon.minOrder || 0) - subtotalNum)} more to use this coupon`,
      };
    }
    let discount = 0;
    if (coupon.type === "percent") {
      discount = (subtotalNum * Number(coupon.value || 0)) / 100;
      const cap = Number(coupon.maxDiscount || 0);
      if (cap > 0) discount = Math.min(discount, cap);
    } else if (coupon.type === "flat") {
      discount = Number(coupon.value || 0);
    } else if (coupon.type === "shipping") {
      discount = Math.min(shippingNum, Number(coupon.value || shippingNum));
    }
    discount = Math.max(0, Math.round(discount));
    return { valid: true, discount, coupon, code: normalized };
  }
};

// Profile APIs
export const getProfileSummary = async () => {
  try {
    const response = await api.get("/profile");
    return response.data;
  } catch (error) {
    console.error("Profile API Error:", error);
    throw error;
  }
};

export const updateProfile = async (data) => {
  try {
    const response = await api.put("/profile", data);
    return response.data;
  } catch (error) {
    console.error("Profile Update API Error:", error);
    throw error;
  }
};

export const getAddresses = async (page = 1, limit = 10) => {
  try {
    const response = await api.get(
      `/profile/addresses?page=${page}&limit=${limit}`,
    );
    const data = response.data;
    if (Array.isArray(data)) {
      return {
        items: data,
        totalCount: data.length,
        page: 1,
        limit: data.length,
      };
    }
    return data;
  } catch (error) {
    console.error("Address API Error:", error);
    throw error;
  }
};

export const addAddress = async (data) => {
  try {
    const response = await api.post("/profile/addresses", data);
    return response.data;
  } catch (error) {
    console.error("Add Address API Error:", error);
    throw error;
  }
};

export const updateAddress = async (id, data) => {
  try {
    const response = await api.put(`/profile/addresses/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("Update Address API Error:", error);
    throw error;
  }
};

export const deleteAddress = async (id) => {
  try {
    const response = await api.delete(`/profile/addresses/${id}`);
    return response.data;
  } catch (error) {
    console.error("Delete Address API Error:", error);
    if (error.response && error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
};

export const getOrders = async (page = 1, limit = 10) => {
  try {
    const response = await api.get(
      `/profile/orders?page=${page}&limit=${limit}`,
    );
    const data = response.data;
    if (Array.isArray(data)) {
      return {
        items: data,
        totalCount: data.length,
        page: 1,
        limit: data.length,
      };
    }
    return data;
  } catch (error) {
    console.error("Orders API Error:", error);
    throw error;
  }
};

export const getOrderDetails = async (id) => {
  try {
    const response = await api.get(`/profile/orders/${id}`);
    return response.data;
  } catch (error) {
    console.error("Order Details API Error:", error);
    throw error;
  }
};

export const checkProductAvailability = async (productId, pincode) => {
  try {
    const response = await api.get(`/products/${productId}/availability`, {
      params: { pincode },
    });
    return response.data;
  } catch (error) {
    console.error("Availability API Error:", error);
    throw error;
  }
};

export const subscribeNewsletter = async (email) => {
  try {
    const response = await api.post("/newsletter/subscribe", { email });
    return response.data;
  } catch (error) {
    console.error("Newsletter API Error:", error);
    if (error.response && error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
};

const getGuestToken = () => {
  let token = localStorage.getItem("guest_token");
  if (!token) {
    token =
      "guest_" +
      Math.random().toString(36).substring(2, 9) +
      Date.now().toString(36);
    localStorage.setItem("guest_token", token);
  }
  return token;
};

export const clearGuestToken = () => {
  localStorage.removeItem("guest_token");
};

// Cart APIs
export const getCart = async (userId) => {
  try {
    const guestToken = !userId ? getGuestToken() : null;
    const params = userId ? { userId } : { guestToken };
    const response = await api.get("/cart", { params });
    return response.data;
  } catch (error) {
    console.error("Cart Error:", error);
    return { cartId: null, items: [], totals: { subTotal: 0, total: 0 } };
  }
};

export const mergeGuestCartIntoUserCart = async (userId) => {
  try {
    if (!userId) return { merged: false, reason: "missing_user" };

    const guestToken =
      typeof window !== "undefined"
        ? localStorage.getItem("guest_token")
        : null;
    if (!guestToken) return { merged: false, reason: "no_guest_token" };

    const mergeKey = `cart_merge_done:${guestToken}:${userId}`;
    if (
      typeof window !== "undefined" &&
      localStorage.getItem(mergeKey) === "1"
    ) {
      return { merged: false, reason: "already_merged" };
    }

    const guestCart = await getCart(null);
    const guestItems = Array.isArray(guestCart?.items) ? guestCart.items : [];
    if (!guestItems.length) {
      if (typeof window !== "undefined") localStorage.setItem(mergeKey, "1");
      return { merged: false, reason: "guest_empty" };
    }

    for (const item of guestItems) {
      const productId = item?.productId ?? item?.ProductID ?? item?.ProductId;
      const variantId =
        item?.variantId ?? item?.VariantID ?? item?.VariantId ?? null;
      const quantity = Number(item?.quantity ?? item?.Quantity ?? 1) || 1;
      if (!productId) continue;

      await api.post("/cart/add", {
        userId,
        guestToken: null,
        productId,
        quantity,
        variantId,
      });
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(mergeKey, "1");
      localStorage.removeItem("guest_token");
    }
    window.dispatchEvent(new Event("cartUpdated"));
    return { merged: true, mergedCount: guestItems.length };
  } catch (error) {
    console.error("Merge guest cart error:", error);
    return { merged: false, reason: "error" };
  }
};

export const addToCart = async (userId, productId, quantity, variantId) => {
  try {
    const guestToken = !userId ? getGuestToken() : null;
    const payload = { userId, guestToken, productId, quantity, variantId };
    const response = await api.post("/cart/add", payload);
    window.dispatchEvent(new Event("cartUpdated")); // Notify listeners
    return response.data;
  } catch (error) {
    console.error("Add to Cart Error:", error);
    throw error;
  }
};

export const updateCartItem = async (cartItemId, quantity, cartId) => {
  try {
    const response = await api.put(`/cart/item/${cartItemId}`, {
      quantity,
      cartId,
    });
    window.dispatchEvent(new Event("cartUpdated")); // Notify listeners
    return response.data;
  } catch (error) {
    console.error("Update Cart Item Error:", error);
    throw error;
  }
};

export const removeCartItem = async (cartItemId, cartId) => {
  try {
    const response = await api.delete(
      `/cart/item/${cartItemId}?cartId=${cartId}`,
    );
    window.dispatchEvent(new Event("cartUpdated")); // Notify listeners
    return response.data;
  } catch (error) {
    console.error("Remove Cart Item Error:", error);
    throw error;
  }
};

// Wishlist APIs
export const getWishlist = async (userId) => {
  try {
    const response = await api.get(`/wishlist?userId=${userId}`);
    return response.data;
  } catch (error) {
    console.error("Wishlist Error:", error);
    return [];
  }
};

export const addToWishlist = async (userId, productId) => {
  try {
    const response = await api.post("/wishlist/add", { userId, productId });
    return response.data;
  } catch (error) {
    console.error("Add to Wishlist Error:", error);
    throw error;
  }
};

export const removeFromWishlist = async (userId, productId) => {
  try {
    const response = await api.delete(
      `/wishlist/remove?userId=${userId}&productId=${productId}`,
    );
    return response.data;
  } catch (error) {
    console.error("Remove from Wishlist Error:", error);
    throw error;
  }
};

export const checkWishlistStatus = async (userId, productId) => {
  try {
    const response = await api.get(
      `/wishlist/check?userId=${userId}&productId=${productId}`,
    );
    return response.data.exists;
  } catch (error) {
    console.error(error);
    return false;
  }
};

// Order APIs
export const placeOrder = async (orderData) => {
  try {
    const data = { ...orderData };
    if (!data.userId) {
      data.guestToken = getGuestToken();
    }
    const response = await api.post("/orders", data);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cartUpdated"));
    }
    return response.data;
  } catch (error) {
    console.error("Order Error:", error);
    throw error;
  }
};

export const createRazorpayOrder = async (amount) => {
  try {
    const response = await api.post("/create-order", { amount });
    return response.data;
  } catch (error) {
    const msg =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      "Order creation failed";
    throw new Error(msg);
  }
};

export const verifyRazorpayPayment = async ({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}) => {
  try {
    const response = await api.post("/verify-payment", {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });
    return response.data;
  } catch (error) {
    const msg =
      error?.response?.data?.message ||
      error?.message ||
      "Payment verification failed";
    throw new Error(msg);
  }
};

export const cancelOrder = async (orderId, reason) => {
  try {
    const response = await api.post(`/orders/${orderId}/cancel`, { reason });
    return response.data;
  } catch (error) {
    console.error("Cancel Order API Error:", error);
    if (error.response?.data?.message)
      throw new Error(error.response.data.message);
    throw error;
  }
};

export const requestReplacement = async (orderId, payload) => {
  try {
    const response = await api.post(`/orders/${orderId}/replace`, payload);
    return response.data;
  } catch (error) {
    console.error("Replacement API Error:", error);
    if (error.response?.data?.message)
      throw new Error(error.response.data.message);
    throw error;
  }
};

export const adminCreateProduct = async (payload) => {
  const response = await api.post("/admin/products", payload);
  return response.data;
};

export const adminUpdateProduct = async (id, payload) => {
  const response = await api.put(`/admin/products/${id}`, payload);
  return response.data;
};

export const adminListProducts = async (options = {}) => {
  const present = (v) =>
    v === undefined || v === null || v === "" ? undefined : v;
  const params = {
    page: options.page || 1,
    limit: options.limit || 10,
    search: present(options.search),
    category: present(options.categorySlug ?? options.category),
    sort: present(options.sort),
    minPrice: present(options.minPrice),
    maxPrice: present(options.maxPrice),
    rating: present(options.rating),
    material: present(options.material),
    finish: present(options.finish),
  };
  const response = await api.get(`/admin/products`, { params });
  return response.data;
};

export const adminGetProduct = async (id) => {
  const response = await api.get(`/admin/products/${id}`);
  return response.data;
};

export const adminDeleteProduct = async (id) => {
  const response = await api.delete(`/admin/products/${id}`);
  return response.data;
};

export const adminAddProductImages = async (id, images, startOrder = 1) => {
  const response = await api.post(`/admin/products/${id}/images`, {
    images,
    startOrder,
  });
  return response.data;
};

export const adminAddProductVideos = async (id, videos) => {
  const response = await api.post(`/admin/products/${id}/videos`, { videos });
  return response.data;
};

export const adminReorderImage = async (imageId, displayOrder) => {
  const response = await api.put(`/admin/product-images/${imageId}/order`, {
    displayOrder,
  });
  return response.data;
};

export const adminDeleteImage = async (imageId) => {
  const response = await api.delete(`/admin/product-images/${imageId}`);
  return response.data;
};

export const adminAddProductHighlights = async (
  id,
  highlights,
  replace = false,
) => {
  const response = await api.post(`/admin/products/${id}/highlights`, {
    highlights,
    replace,
  });
  return response.data;
};

export const adminAddProductSpecifications = async (
  id,
  specifications,
  replace = false,
) => {
  const response = await api.post(`/admin/products/${id}/specifications`, {
    specifications,
    replace,
  });
  return response.data;
};

export const adminUploadProductImages = async (
  id,
  imagesBase64,
  startOrder = 1,
) => {
  const response = await api.post(`/admin/products/${id}/images/upload`, {
    imagesBase64,
    startOrder,
  });
  return response.data;
};

export const adminUploadProductVideos = async (id, videosBase64) => {
  const response = await api.post(`/admin/products/${id}/videos/upload`, {
    videosBase64,
  });
  return response.data;
};

export const adminAddProductAttributes = async (id, attributes) => {
  const response = await api.post(`/admin/products/${id}/attributes`, {
    attributes,
  });
  return response.data;
};

export const adminAddProductVariants = async (id, variants) => {
  const response = await api.post(`/admin/products/${id}/variants`, {
    variants,
  });
  return response.data;
};

// Admin Categories
export const adminGetCategoriesAdmin = async (options = {}) => {
  const params = {
    page: options.page || 1,
    limit: options.limit || 10,
    search: options.search || undefined,
    sort: options.sort || undefined,
  };
  const response = await api.get("/admin/categories", { params });
  return response.data; // { categories, totalCount, page, limit }
};
export const adminGetCategoryAdmin = async (id) => {
  const response = await api.get(`/admin/categories/${id}`);
  return response.data;
};
export const adminCreateCategory = async (payload) => {
  const response = await api.post("/admin/categories", payload);
  return response.data;
};
export const adminUpdateCategory = async (id, payload) => {
  const response = await api.put(`/admin/categories/${id}`, payload);
  return response.data;
};
export const adminDeleteCategory = async (id) => {
  const response = await api.delete(`/admin/categories/${id}`);
  return response.data;
};
export const adminUploadCategoryImage = async (id, imageBase64) => {
  const response = await api.post(`/admin/categories/${id}/image/upload`, {
    imageBase64,
  });
  return response.data;
};

export const adminListOrders = async (options = {}) => {
  const params = {
    page: options.page || 1,
    limit: options.limit || 10,
    search: options.search || undefined,
    status: options.status || undefined,
    dateFrom: options.dateFrom || undefined,
    dateTo: options.dateTo || undefined,
    sort: options.sort || undefined,
  };
  const response = await api.get("/admin/orders", { params });
  return response.data;
};
export const adminGetOrder = async (id) => {
  const response = await api.get(`/admin/orders/${id}`);
  return response.data;
};
export const adminUpdateOrderStatus = async (id, payload) => {
  const response = await api.put(`/admin/orders/${id}/status`, payload);
  return response.data;
};
export const adminUpdateOrderTracking = async (id, payload) => {
  const response = await api.put(`/admin/orders/${id}/tracking`, payload);
  return response.data;
};
export const adminDeleteOrder = async (id) => {
  const response = await api.delete(`/admin/orders/${id}`);
  return response.data;
};

// Admin Returns (Replacements)
export const adminListReturns = async (options = {}) => {
  const params = {
    page: options.page || 1,
    limit: options.limit || 10,
    search: options.search || undefined,
    status: options.status || undefined,
    sort: options.sort || undefined,
  };
  const response = await api.get("/admin/returns", { params });
  return response.data;
};
export const adminGetReturn = async (id) => {
  const response = await api.get(`/admin/returns/${id}`);
  return response.data;
};
export const adminSetReturnStatus = async (id, action, remarks) => {
  const response = await api.put(`/admin/returns/${id}/status`, {
    action,
    remarks,
  });
  return response.data;
};

// Customer replacement selection
export const selectReplacement = async (
  orderId,
  orderItemId,
  { productId, variantId, mode },
) => {
  const params = mode ? { mode } : undefined;
  const response = await api.post(
    `/profile/orders/${orderId}/items/${orderItemId}/replace-select`,
    { productId, variantId },
    { params },
  );
  return response.data;
};

// Admin Reviews
export const adminListReviews = async (options = {}) => {
  const params = {
    page: options.page || 1,
    limit: options.limit || 10,
    search: options.search || undefined,
    sort: options.sort || undefined,
  };
  const response = await api.get("/admin/reviews", { params });
  return response.data;
};
export const adminGetReview = async (id) => {
  const response = await api.get(`/admin/reviews/${id}`);
  return response.data;
};
export const adminDeleteReview = async (id) => {
  const response = await api.delete(`/admin/reviews/${id}`);
  return response.data;
};

// Admin Newsletter
export const adminListNewsletter = async (options = {}) => {
  const params = {
    page: options.page || 1,
    limit: options.limit || 10,
    search: options.search || undefined,
    status: options.status || undefined,
    sort: options.sort || undefined,
  };
  const response = await api.get("/admin/newsletter", { params });
  return response.data;
};
export const adminToggleSubscriber = async (id, active) => {
  const response = await api.put(`/admin/newsletter/${id}/toggle`, { active });
  return response.data;
};
export const adminDeleteSubscriber = async (id) => {
  const response = await api.delete(`/admin/newsletter/${id}`);
  return response.data;
};

// Customer submit review
export const submitOrderItemReview = async (
  orderId,
  orderItemId,
  { rating, title, description, photoBase64 },
) => {
  const response = await api.post(
    `/profile/orders/${orderId}/items/${orderItemId}/review`,
    { rating, title, description, photoBase64 },
  );
  return response.data;
};

// Settings tab removed per request

// Admin Dashboard summary
export const adminDashboardSummary = async (days = 30) => {
  const response = await api.get("/admin/dashboard/summary", {
    params: { days },
  });
  return response.data;
};
export const adminDashboardCarrierMix = async () => {
  const response = await api.get("/admin/dashboard/carriers");
  return response.data;
};
export const adminDashboardTopProducts = async (days = 30) => {
  const response = await api.get("/admin/dashboard/top-products", {
    params: { days },
  });
  return response.data;
};
export const adminDashboardLowStock = async () => {
  const response = await api.get("/admin/dashboard/low-stock");
  return response.data;
};

export default api;
